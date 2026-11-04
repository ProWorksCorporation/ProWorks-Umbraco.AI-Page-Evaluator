using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ProWorks.Umbraco.AI.PageEvaluator.Configuration;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <inheritdoc cref="IContentEvaluationService" />
/// <remarks>
/// Moved out of <c>PageEvaluatorApiController</c> in 006 (research R1) so the endpoints, the <c>evaluate_page</c>
/// server tool and the Automate step share one set of rules. The cache write happens before any response-time
/// decoration, so only the plain report (plus <see cref="EvaluationReport.SamplingSettingsIgnored"/>) is stored.
/// </remarks>
public sealed class ContentEvaluationService : IContentEvaluationService
{
    private readonly IContentService _contentService;
    private readonly ILanguageService _languageService;
    private readonly IAIEvaluatorConfigService _configService;
    private readonly IPageEvaluationService _evaluationService;
    private readonly IEvaluationCacheRepository _cacheRepository;
    private readonly IContentTypeService _contentTypeService;
    private readonly IUmbracoContextFactory _umbracoContextFactory;
    private readonly IOptions<PageEvaluatorOptions> _options;
    private readonly ILogger<ContentEvaluationService> _logger;

    public ContentEvaluationService(
        IContentService contentService,
        ILanguageService languageService,
        IAIEvaluatorConfigService configService,
        IPageEvaluationService evaluationService,
        IEvaluationCacheRepository cacheRepository,
        IContentTypeService contentTypeService,
        IUmbracoContextFactory umbracoContextFactory,
        IOptions<PageEvaluatorOptions> options,
        ILogger<ContentEvaluationService> logger)
    {
        _contentService = contentService;
        _languageService = languageService;
        _configService = configService;
        _evaluationService = evaluationService;
        _cacheRepository = cacheRepository;
        _contentTypeService = contentTypeService;
        _umbracoContextFactory = umbracoContextFactory;
        _options = options;
        _logger = logger;
    }

    public async Task<ContentEvaluationResult> GetCachedAsync(
        Guid nodeId,
        string? culture,
        Func<Guid, CancellationToken, Task<bool>> authorize,
        CancellationToken cancellationToken = default)
    {
        (ContentEvaluationResult? rejected, IContent? content, string cacheCulture) =
            await CheckNodeAsync(nodeId, culture, authorize, cancellationToken);
        if (rejected is not null)
            return rejected;

        // Legacy '' rows are never returned for culture-varying documents: the lookup is by exact culture.
        EvaluationCacheEntry? entry = await _cacheRepository.GetAsync(nodeId, cacheCulture, cancellationToken);
        if (entry is null)
            return Rejected(ContentEvaluationStatus.NotCached, content!, cacheCulture, $"No cached evaluation for node '{nodeId}'.");

        AIEvaluatorConfig? config = await _configService.GetActiveForDocumentTypeAsync(entry.DocumentTypeAlias, cancellationToken);
        return CachedResult(content!, cacheCulture, entry, config);
    }

    public async Task<ContentEvaluationResult> EvaluateDraftValuesAsync(
        Guid nodeId,
        string? culture,
        IReadOnlyDictionary<string, object?> properties,
        Func<Guid, CancellationToken, Task<bool>> authorize,
        Func<AIEvaluatorConfig, CancellationToken, Task>? beforeAiCall = null,
        CancellationToken cancellationToken = default)
    {
        (ContentEvaluationResult? rejected, IContent? content, string cacheCulture) =
            await CheckNodeAsync(nodeId, culture, authorize, cancellationToken);
        if (rejected is not null)
            return rejected;

        // The canonical alias from the content node, never a client-supplied value.
        string documentTypeAlias = content!.ContentType.Alias;
        AIEvaluatorConfig? config = await _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, cancellationToken);
        if (config is null)
            return NoActiveConfig(content, cacheCulture);

        if (beforeAiCall is not null)
            await beforeAiCall(config, cancellationToken);

        EvaluationReport report = await _evaluationService.EvaluateAsync(
            nodeId, documentTypeAlias, properties, ContentCultureRules.NullIfInvariant(cacheCulture), cancellationToken);

        // On-screen values: no source marker, so the saved-draft path never reuses this result (research R3).
        DateTime cachedAt = await SaveAsync(nodeId, cacheCulture, documentTypeAlias, report, sourceUpdateDate: null, cancellationToken);

        return Ok(content, cacheCulture, config, report, cachedAt, fromCache: false, savedSinceEvaluation: false);
    }

    public async Task<ContentEvaluationResult> EvaluateSavedAsync(
        Guid nodeId,
        string? culture,
        bool reuseCache,
        Func<Guid, CancellationToken, Task<bool>> authorize,
        Func<AIEvaluatorConfig, CancellationToken, Task>? beforeAiCall = null,
        CancellationToken cancellationToken = default)
    {
        (ContentEvaluationResult? rejected, IContent? content, string cacheCulture) =
            await CheckNodeAsync(nodeId, culture, authorize, cancellationToken);
        if (rejected is not null)
            return rejected;

        string documentTypeAlias = content!.ContentType.Alias;
        AIEvaluatorConfig? config = await _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, cancellationToken);
        if (config is null)
            return NoActiveConfig(content, cacheCulture);

        // Captured BEFORE the properties are resolved: a save during the AI call makes the result stale,
        // never wrongly fresh (research R3).
        DateTime sourceUpdateDate = AsUtc(content.UpdateDate);

        if (reuseCache)
        {
            EvaluationCacheEntry? entry = await _cacheRepository.GetAsync(nodeId, cacheCulture, cancellationToken);
            // Only saved-draft results are reusable; on-screen results (no source marker) never are.
            if (entry?.SourceUpdateDate is { } cachedSource && SameMillisecond(cachedSource, sourceUpdateDate))
            {
                _logger.LogDebug(
                    "[PageEvaluator] Reusing the cached saved-draft evaluation of node {NodeId} ({Culture}).",
                    nodeId, cacheCulture.Length == 0 ? "invariant" : cacheCulture);
                return CachedResult(content, cacheCulture, entry, config);
            }
        }

        if (beforeAiCall is not null)
            await beforeAiCall(config, cancellationToken);

        EvaluationReport report;
        // No HTTP request in an Automate run: value converters and the published cache need an UmbracoContext,
        // as Automate's built-in content actions do (research R2).
        using (_umbracoContextFactory.EnsureUmbracoContext())
        {
            report = await _evaluationService.EvaluateSavedAsync(
                nodeId, documentTypeAlias, ContentCultureRules.NullIfInvariant(cacheCulture), cancellationToken);
        }

        DateTime cachedAt = await SaveAsync(nodeId, cacheCulture, documentTypeAlias, report, sourceUpdateDate, cancellationToken);

        // The page may have been saved while the AI call was running.
        DateTime? currentUpdateDate = _contentService.GetById(nodeId)?.UpdateDate;
        bool savedSince = currentUpdateDate is { } current && !SameMillisecond(AsUtc(current), sourceUpdateDate);

        return Ok(content, cacheCulture, config, report, cachedAt, fromCache: false, savedSinceEvaluation: savedSince);
    }

    // ---------------------------------------------------------------------------
    // Shared steps
    // ---------------------------------------------------------------------------

    /// <summary>404 → authorize (403) → culture (400), in that order for every caller.</summary>
    private async Task<(ContentEvaluationResult? Rejected, IContent? Content, string CacheCulture)> CheckNodeAsync(
        Guid nodeId,
        string? culture,
        Func<Guid, CancellationToken, Task<bool>> authorize,
        CancellationToken cancellationToken)
    {
        IContent? content = _contentService.GetById(nodeId);
        if (content is null)
        {
            return (new ContentEvaluationResult
            {
                Status = ContentEvaluationStatus.NodeNotFound,
                Message = $"Content node '{nodeId}' not found.",
            }, null, string.Empty);
        }

        if (!await authorize(nodeId, cancellationToken))
            return (Rejected(ContentEvaluationStatus.Forbidden, content, null, "Access to this content node was denied."), content, string.Empty);

        ContentCultureRules.Normalised normalised = await ContentCultureRules.NormaliseAsync(content, culture, _languageService);
        if (normalised.Status != ContentEvaluationStatus.Ok)
            return (Rejected(normalised.Status, content, null, normalised.Message), content, string.Empty);

        return (null, content, normalised.Culture!);
    }

    private async Task<DateTime> SaveAsync(
        Guid nodeId,
        string cacheCulture,
        string documentTypeAlias,
        EvaluationReport report,
        DateTime? sourceUpdateDate,
        CancellationToken cancellationToken)
    {
        DateTime cachedAt = DateTime.UtcNow;
        await _cacheRepository.SaveAsync(new EvaluationCacheEntry
        {
            NodeId = nodeId,
            Culture = cacheCulture,
            DocumentTypeAlias = documentTypeAlias,
            Report = report,
            CachedAt = cachedAt,
            SourceUpdateDate = sourceUpdateDate,
        }, cancellationToken);

        // A pre-upgrade row has no culture; it's never shown for a culture-varying document, so
        // discard it as soon as a culture-specific result exists (003 data-model.md §1).
        if (cacheCulture.Length > 0)
            await _cacheRepository.DeleteAsync(nodeId, string.Empty, cancellationToken);

        return cachedAt;
    }

    private ContentEvaluationResult CachedResult(
        IContent content, string cacheCulture, EvaluationCacheEntry entry, AIEvaluatorConfig? config)
    {
        DateTime updateDate = AsUtc(content.UpdateDate);
        bool savedSince = entry.SourceUpdateDate is { } source
            ? !SameMillisecond(updateDate, source)
            : updateDate > entry.CachedAt;

        // Decorate with the alias the entry was cached under (its editors/names), as before 006.
        return Ok(content, cacheCulture, config, entry.Report, entry.CachedAt, fromCache: true, savedSince, entry.DocumentTypeAlias);
    }

    private ContentEvaluationResult Ok(
        IContent content,
        string cacheCulture,
        AIEvaluatorConfig? config,
        EvaluationReport report,
        DateTime cachedAt,
        bool fromCache,
        bool savedSinceEvaluation,
        string? decorationAlias = null)
    {
        string documentTypeAlias = decorationAlias ?? content.ContentType.Alias;
        string? culture = ContentCultureRules.NullIfInvariant(cacheCulture);

        EvaluationReport decorated = report
            .WithCachedAt(cachedAt)
            .WithCulture(culture)
            .WithPropertyEditorAliases(BuildPropertyEditorAliases(documentTypeAlias))
            .WithPropertyNames(BuildPropertyNames(documentTypeAlias))
            .WithRecommendationsEnabled(config?.RecommendationsEnabled ?? true)
            .WithAdditionalRecommendableEditorAliases(_options.Value.AdditionalRecommendableEditorAliases)
            .WithSavedSinceEvaluation(savedSinceEvaluation);

        return new ContentEvaluationResult
        {
            Status = ContentEvaluationStatus.Ok,
            Report = decorated,
            Culture = culture,
            CachedAt = cachedAt,
            FromCache = fromCache,
            SavedSinceEvaluation = savedSinceEvaluation,
            Config = config,
            DocumentTypeAlias = content.ContentType.Alias,
            ContentName = ContentName(content, culture),
        };
    }

    private static ContentEvaluationResult NoActiveConfig(IContent content, string cacheCulture)
        => Rejected(ContentEvaluationStatus.NoActiveConfig, content, ContentCultureRules.NullIfInvariant(cacheCulture),
            $"No active evaluator configuration found for document type '{content.ContentType.Alias}'.");

    private static ContentEvaluationResult Rejected(ContentEvaluationStatus status, IContent content, string? culture, string? message)
        => new()
        {
            Status = status,
            Culture = culture,
            DocumentTypeAlias = content.ContentType.Alias,
            ContentName = ContentName(content, culture),
            Message = message,
        };

    private static string? ContentName(IContent content, string? culture)
        => (culture is null ? null : content.GetCultureName(culture)) ?? content.Name;

    private IReadOnlyDictionary<string, string> BuildPropertyEditorAliases(string documentTypeAlias)
    {
        IContentType? contentType = _contentTypeService.Get(documentTypeAlias);
        if (contentType is null)
            return new Dictionary<string, string>();

        return contentType.CompositionPropertyTypes
            .ToDictionary(p => p.Alias, p => p.PropertyEditorAlias);
    }

    private IReadOnlyDictionary<string, string> BuildPropertyNames(string documentTypeAlias)
    {
        IContentType? contentType = _contentTypeService.Get(documentTypeAlias);
        if (contentType is null)
            return new Dictionary<string, string>();

        return contentType.CompositionPropertyTypes
            .ToDictionary(p => p.Alias, p => p.Name);
    }

    /// <summary>CMS 17 system dates are UTC; normalise the <see cref="DateTimeKind"/> so comparisons are exact.</summary>
    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    /// <summary>SQLite and SQL Server round-trip different sub-millisecond precision (research R3).</summary>
    private static bool SameMillisecond(DateTime a, DateTime b)
        => a.Ticks / TimeSpan.TicksPerMillisecond == b.Ticks / TimeSpan.TicksPerMillisecond;
}
