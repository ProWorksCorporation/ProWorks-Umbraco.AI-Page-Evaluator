using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Configuration;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Guardrails;
using Umbraco.AI.Core.Guardrails.Evaluators;
using Umbraco.AI.Core.Providers.Errors;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// The node → permission → culture → cache → evaluate flow shared by the endpoints, the <c>evaluate_page</c>
/// server tool and the Automate step (006 research R1, R3; data-model §1).
/// </summary>
public class ContentEvaluationServiceTests
{
    private const string Alias = "blogPost";

    private readonly IContentService _contentService = Substitute.For<IContentService>();
    private readonly ILanguageService _languageService = Substitute.For<ILanguageService>();
    private readonly IAIEvaluatorConfigService _configService = Substitute.For<IAIEvaluatorConfigService>();
    private readonly IPageEvaluationService _evaluationService = Substitute.For<IPageEvaluationService>();
    private readonly IEvaluationCacheRepository _cache = Substitute.For<IEvaluationCacheRepository>();
    private readonly IContentTypeService _contentTypeService = Substitute.For<IContentTypeService>();
    private readonly IUmbracoContextFactory _umbracoContextFactory = Substitute.For<IUmbracoContextFactory>();
    private readonly IUmbracoContextAccessor _umbracoContextAccessor = Substitute.For<IUmbracoContextAccessor>();
    private readonly PageEvaluatorOptions _options = new() { AdditionalRecommendableEditorAliases = ["Our.Editor"] };
    private readonly Guid _nodeId = Guid.NewGuid();
    private readonly IContent _content;
    private readonly ContentEvaluationService _sut;

    private static readonly Func<Guid, CancellationToken, Task<bool>> Allow = (_, _) => Task.FromResult(true);
    private static readonly Func<Guid, CancellationToken, Task<bool>> Deny = (_, _) => Task.FromResult(false);

    private static readonly DateTime UpdateDate = new(2026, 11, 3, 9, 0, 0, 250, DateTimeKind.Utc);

    public ContentEvaluationServiceTests()
    {
        _content = GivenContent(varies: false);
        _configService.GetActiveForDocumentTypeAsync(Alias, Arg.Any<CancellationToken>()).Returns(Config());
        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(Report("fresh"));
        _evaluationService.EvaluateSavedAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(Report("fresh saved"));
        _umbracoContextFactory.EnsureUmbracoContext()
            .Returns(_ => new UmbracoContextReference(Substitute.For<IUmbracoContext>(), true, _umbracoContextAccessor));

        var title = Substitute.For<IPropertyType>();
        title.Alias.Returns("title");
        title.Name.Returns("Title");
        title.PropertyEditorAlias.Returns("Umbraco.TextBox");
        var contentType = Substitute.For<IContentType>();
        contentType.CompositionPropertyTypes.Returns(new[] { title });
        _contentTypeService.Get(Alias).Returns(contentType);

        _sut = new ContentEvaluationService(
            _contentService, _languageService, _configService, _evaluationService, _cache, _contentTypeService,
            _umbracoContextFactory, Options.Create(_options), NullLogger<ContentEvaluationService>.Instance);
    }

    private IContent GivenContent(bool varies, params string[] availableCultures)
    {
        var content = Substitute.For<IContent>();
        var contentType = Substitute.For<ISimpleContentType>();
        contentType.Alias.Returns(Alias);
        contentType.Variations.Returns(varies ? ContentVariation.Culture : ContentVariation.Nothing);
        content.ContentType.Returns(contentType);
        content.Key.Returns(_nodeId);
        content.Name.Returns("My page");
        content.UpdateDate.Returns(UpdateDate);
        content.IsCultureAvailable(Arg.Any<string>())
            .Returns(call => availableCultures.Contains(call.Arg<string>(), StringComparer.OrdinalIgnoreCase));
        _contentService.GetById(_nodeId).Returns(content);
        return content;
    }

    private void GivenLanguages(params string[] isoCodes)
    {
        ILanguage[] languages = isoCodes.Select(code =>
        {
            var language = Substitute.For<ILanguage>();
            language.IsoCode.Returns(code);
            return language;
        }).ToArray();
        _languageService.GetAllAsync().Returns(languages);
    }

    private static AIEvaluatorConfig Config(bool recommendationsEnabled = true) => new()
    {
        Id = Guid.NewGuid(),
        Name = "Blog",
        DocumentTypeAlias = Alias,
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        IsActive = true,
        RecommendationsEnabled = recommendationsEnabled,
    };

    private static AIGuardrailBlockedException Blocked() => new(new AIGuardrailEvaluationResult
    {
        Action = AIGuardrailAction.Block,
        Phase = AIGuardrailPhase.PreGenerate,
        RuleResults = [],
    });

    private static EvaluationReport Report(string suggestions)
        => EvaluationReport.Parsed(new EvaluationScore(1, 2), [], suggestions);

    private EvaluationCacheEntry Entry(string culture, DateTime cachedAt, DateTime? sourceUpdateDate, string suggestions = "cached")
        => new()
        {
            NodeId = _nodeId,
            Culture = culture,
            DocumentTypeAlias = Alias,
            Report = Report(suggestions),
            CachedAt = cachedAt,
            SourceUpdateDate = sourceUpdateDate,
        };

    private static readonly IReadOnlyDictionary<string, object?> NoValues = new Dictionary<string, object?>();

    // ---------------------------------------------------------------------------
    // Order of checks: 404 → authorize (403) → culture (400)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task NodeNotFound_BeforeAuthorize()
    {
        _contentService.GetById(_nodeId).Returns((IContent?)null);
        bool authorizeCalled = false;

        ContentEvaluationResult result = await _sut.GetCachedAsync(_nodeId, null,
            (_, _) => { authorizeCalled = true; return Task.FromResult(true); });

        Assert.Equal(ContentEvaluationStatus.NodeNotFound, result.Status);
        Assert.False(authorizeCalled);
    }

    [Fact]
    public async Task Forbidden_BeforeTheCultureCheck()
    {
        GivenContent(varies: true);
        GivenLanguages("en-US");

        ContentEvaluationResult result = await _sut.EvaluateDraftValuesAsync(_nodeId, null, NoValues, Deny);

        Assert.Equal(ContentEvaluationStatus.Forbidden, result.Status);
        await _languageService.DidNotReceive().GetAllAsync();
    }

    [Fact]
    public async Task Authorize_ReceivesTheNodeId()
    {
        Guid? authorized = null;

        await _sut.GetCachedAsync(_nodeId, null, (id, _) => { authorized = id; return Task.FromResult(true); });

        Assert.Equal(_nodeId, authorized);
    }

    [Theory]
    [InlineData(null, ContentEvaluationStatus.InvalidCulture)]
    [InlineData("", ContentEvaluationStatus.InvalidCulture)]
    [InlineData("fr-FR", ContentEvaluationStatus.InvalidCulture)]
    [InlineData("sv-SE", ContentEvaluationStatus.CultureNotCreated)]
    public async Task VaryingDocument_RejectsMissingUnknownOrNotCreatedCultures(string? culture, ContentEvaluationStatus expected)
    {
        GivenContent(varies: true, "da-DK");
        GivenLanguages("en-US", "da-DK", "sv-SE");

        ContentEvaluationResult draft = await _sut.EvaluateDraftValuesAsync(_nodeId, culture, NoValues, Allow);
        ContentEvaluationResult saved = await _sut.EvaluateSavedAsync(_nodeId, culture, reuseCache: true, Allow);
        ContentEvaluationResult cached = await _sut.GetCachedAsync(_nodeId, culture, Allow);

        Assert.Equal(expected, draft.Status);
        Assert.Equal(expected, saved.Status);
        Assert.Equal(expected, cached.Status);
        Assert.False(string.IsNullOrWhiteSpace(draft.Message));
        await _evaluationService.DidNotReceiveWithAnyArgs().EvaluateAsync(default, default!, default!, default, default);
        await _evaluationService.DidNotReceiveWithAnyArgs().EvaluateSavedAsync(default, default!, default, default);
    }

    [Fact]
    public async Task InvariantDocument_IgnoresTheSuppliedCulture()
    {
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, DateTime.UtcNow, null));

        ContentEvaluationResult result = await _sut.GetCachedAsync(_nodeId, "da-DK", Allow);

        Assert.Equal(ContentEvaluationStatus.Ok, result.Status);
        Assert.Null(result.Culture);
        Assert.Null(result.Report!.Culture);
        await _languageService.DidNotReceive().GetAllAsync();
    }

    [Fact]
    public async Task VaryingDocument_NormalisesTheCultureToLowerCase()
    {
        GivenContent(varies: true, "da-DK");
        GivenLanguages("en-US", "da-DK");
        _cache.GetAsync(_nodeId, "da-dk", Arg.Any<CancellationToken>())
            .Returns(Entry("da-dk", DateTime.UtcNow, null));

        ContentEvaluationResult result = await _sut.GetCachedAsync(_nodeId, "DA-dk", Allow);

        Assert.Equal("da-dk", result.Culture);
        Assert.Equal("da-dk", result.Report!.Culture);
    }

    // ---------------------------------------------------------------------------
    // GetCachedAsync
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetCachedAsync_NotCached()
    {
        ContentEvaluationResult result = await _sut.GetCachedAsync(_nodeId, null, Allow);

        Assert.Equal(ContentEvaluationStatus.NotCached, result.Status);
        Assert.Null(result.Report);
    }

    [Fact]
    public async Task GetCachedAsync_ReturnsTheDecoratedReport()
    {
        var cachedAt = new DateTime(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc);
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>()).Returns(Entry(string.Empty, cachedAt, null));
        _configService.GetActiveForDocumentTypeAsync(Alias, Arg.Any<CancellationToken>()).Returns(Config(recommendationsEnabled: false));

        ContentEvaluationResult result = await _sut.GetCachedAsync(_nodeId, null, Allow);

        Assert.Equal(ContentEvaluationStatus.Ok, result.Status);
        Assert.True(result.FromCache);
        Assert.Equal(cachedAt, result.CachedAt);
        Assert.Equal(Alias, result.DocumentTypeAlias);
        Assert.Equal("My page", result.ContentName);
        Assert.NotNull(result.Config);
        EvaluationReport report = result.Report!;
        Assert.Equal("cached", report.Suggestions);
        Assert.Equal(cachedAt, report.CachedAt);
        Assert.Equal("Umbraco.TextBox", report.PropertyEditorAliases!["title"]);
        Assert.Equal("Title", report.PropertyNames!["title"]);
        Assert.False(report.RecommendationsEnabled);
        Assert.Equal(["Our.Editor"], report.AdditionalRecommendableEditorAliases);
    }

    [Fact]
    public async Task GetCachedAsync_WithoutAnActiveConfig_StillReturnsTheEntry_WithRecommendationsEnabled()
    {
        _configService.GetActiveForDocumentTypeAsync(Alias, Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>()).Returns(Entry(string.Empty, DateTime.UtcNow, null));

        ContentEvaluationResult result = await _sut.GetCachedAsync(_nodeId, null, Allow);

        Assert.Equal(ContentEvaluationStatus.Ok, result.Status);
        Assert.True(result.Report!.RecommendationsEnabled);
    }

    // ---------------------------------------------------------------------------
    // savedSinceEvaluation (data-model §1, response time only)
    // ---------------------------------------------------------------------------

    [Theory]
    [InlineData(-1, true)]   // cached a minute before the last save
    [InlineData(1, false)]   // cached after the last save
    public async Task SavedSinceEvaluation_ForAnOnScreenEntry_ComparesUpdateDateWithCachedAt(int cachedMinutesAfterSave, bool expected)
    {
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, UpdateDate.AddMinutes(cachedMinutesAfterSave), sourceUpdateDate: null));

        ContentEvaluationResult result = await _sut.GetCachedAsync(_nodeId, null, Allow);

        Assert.Equal(expected, result.SavedSinceEvaluation);
        Assert.Equal(expected, result.Report!.SavedSinceEvaluation);
    }

    [Fact]
    public async Task SavedSinceEvaluation_ForASavedDraftEntry_ComparesUpdateDateWithSourceUpdateDate()
    {
        // Cached long after the save, but from an older saved version: still out of date.
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, UpdateDate.AddHours(1), sourceUpdateDate: UpdateDate.AddMinutes(-5)));

        ContentEvaluationResult stale = await _sut.GetCachedAsync(_nodeId, null, Allow);

        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, UpdateDate.AddHours(1), sourceUpdateDate: UpdateDate));
        ContentEvaluationResult current = await _sut.GetCachedAsync(_nodeId, null, Allow);

        Assert.True(stale.SavedSinceEvaluation);
        Assert.False(current.SavedSinceEvaluation);
    }

    // ---------------------------------------------------------------------------
    // EvaluateDraftValuesAsync (POST /evaluate, Copilot evaluate tool)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateDraftValuesAsync_EvaluatesTheSuppliedValues_AndCachesWithoutASourceMarker()
    {
        var values = new Dictionary<string, object?> { ["title"] = "On screen" };

        ContentEvaluationResult result = await _sut.EvaluateDraftValuesAsync(_nodeId, null, values, Allow);

        Assert.Equal(ContentEvaluationStatus.Ok, result.Status);
        Assert.False(result.FromCache);
        Assert.False(result.SavedSinceEvaluation);
        Assert.Equal("fresh", result.Report!.Suggestions);
        Assert.NotNull(result.Report.CachedAt);
        Assert.Equal(result.CachedAt, result.Report.CachedAt);
        Assert.Equal("Umbraco.TextBox", result.Report.PropertyEditorAliases!["title"]);
        await _evaluationService.Received(1).EvaluateAsync(_nodeId, Alias, values, null, Arg.Any<CancellationToken>());
        await _cache.Received(1).SaveAsync(
            Arg.Is<EvaluationCacheEntry>(e => e.NodeId == _nodeId && e.Culture == string.Empty
                && e.DocumentTypeAlias == Alias && e.SourceUpdateDate == null
                && e.Report.PropertyEditorAliases == null && e.Report.CachedAt == null),
            Arg.Any<CancellationToken>());
        await _cache.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateDraftValuesAsync_VaryingDocument_DeletesTheLegacyInvariantRow()
    {
        GivenContent(varies: true, "da-DK");
        GivenLanguages("da-DK");

        ContentEvaluationResult result = await _sut.EvaluateDraftValuesAsync(_nodeId, "da-DK", NoValues, Allow);

        Assert.Equal("da-dk", result.Culture);
        await _evaluationService.Received(1).EvaluateAsync(_nodeId, Alias, NoValues, "da-dk", Arg.Any<CancellationToken>());
        await _cache.Received(1).SaveAsync(Arg.Is<EvaluationCacheEntry>(e => e.Culture == "da-dk"), Arg.Any<CancellationToken>());
        await _cache.Received(1).DeleteAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateDraftValuesAsync_NoActiveConfig()
    {
        _configService.GetActiveForDocumentTypeAsync(Alias, Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);

        ContentEvaluationResult result = await _sut.EvaluateDraftValuesAsync(_nodeId, null, NoValues, Allow);

        Assert.Equal(ContentEvaluationStatus.NoActiveConfig, result.Status);
        Assert.Contains(Alias, result.Message);
        await _evaluationService.DidNotReceiveWithAnyArgs().EvaluateAsync(default, default!, default!, default, default);
    }

    [Fact]
    public async Task EvaluateDraftValuesAsync_CallsTheGateWithTheConfig_BeforeTheAiCall()
    {
        var order = new List<string>();
        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(_ => { order.Add("ai"); return Report("fresh"); });
        AIEvaluatorConfig? gated = null;

        await _sut.EvaluateDraftValuesAsync(_nodeId, null, NoValues, Allow,
            (config, _) => { gated = config; order.Add("gate"); return Task.CompletedTask; });

        Assert.Equal(["gate", "ai"], order);
        Assert.Equal(Alias, gated!.DocumentTypeAlias);
    }

    [Fact]
    public async Task EvaluateDraftValuesAsync_AThrowingGateAbortsWithoutAnAiCall()
    {
        await Assert.ThrowsAsync<TimeoutException>(() => _sut.EvaluateDraftValuesAsync(_nodeId, null, NoValues, Allow,
            (_, _) => throw new TimeoutException("limited")));

        await _evaluationService.DidNotReceiveWithAnyArgs().EvaluateAsync(default, default!, default!, default, default);
        await _cache.DidNotReceiveWithAnyArgs().SaveAsync(default!, default);
    }

    [Fact]
    public async Task EvaluateDraftValuesAsync_PropagatesProviderAndGuardrailErrors()
    {
        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new AIProviderException(new AIProviderErrorInfo(AIProviderErrorCategory.RateLimited, "busy", "429", "busy")));
        await Assert.ThrowsAsync<AIProviderException>(() => _sut.EvaluateDraftValuesAsync(_nodeId, null, NoValues, Allow));

        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(Blocked());
        await Assert.ThrowsAsync<AIGuardrailBlockedException>(() => _sut.EvaluateDraftValuesAsync(_nodeId, null, NoValues, Allow));

        await _cache.DidNotReceiveWithAnyArgs().SaveAsync(default!, default);
    }

    // ---------------------------------------------------------------------------
    // EvaluateSavedAsync (evaluate_page server tool, Automate step)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateSavedAsync_StoresTheUpdateDateCapturedBeforeResolving()
    {
        // A save during the AI call must make the result stale, not wrongly fresh.
        DateTime savedDuringTheCall = UpdateDate.AddSeconds(30);
        _evaluationService.EvaluateSavedAsync(_nodeId, Alias, null, Arg.Any<CancellationToken>())
            .Returns(_ => { _content.UpdateDate.Returns(savedDuringTheCall); return Report("fresh saved"); });

        ContentEvaluationResult result = await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: false, Allow);

        Assert.Equal(ContentEvaluationStatus.Ok, result.Status);
        Assert.False(result.FromCache);
        Assert.Equal("fresh saved", result.Report!.Suggestions);
        await _cache.Received(1).SaveAsync(
            Arg.Is<EvaluationCacheEntry>(e => e.SourceUpdateDate == UpdateDate && e.Culture == string.Empty),
            Arg.Any<CancellationToken>());
        Assert.True(result.SavedSinceEvaluation);
    }

    [Fact]
    public async Task EvaluateSavedAsync_ReusesASavedDraftEntry_WhenSourceUpdateDateMatchesToTheMillisecond()
    {
        // Providers round-trip with different sub-millisecond precision.
        DateTime roundTripped = UpdateDate.AddTicks(4321);
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, UpdateDate.AddMinutes(1), roundTripped, "reused"));
        bool gateCalled = false;

        ContentEvaluationResult result = await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: true, Allow,
            (_, _) => { gateCalled = true; return Task.CompletedTask; });

        Assert.Equal(ContentEvaluationStatus.Ok, result.Status);
        Assert.True(result.FromCache);
        Assert.False(result.SavedSinceEvaluation);
        Assert.Equal("reused", result.Report!.Suggestions);
        Assert.Equal(UpdateDate.AddMinutes(1), result.Report.CachedAt);
        Assert.False(gateCalled);
        await _evaluationService.DidNotReceiveWithAnyArgs().EvaluateSavedAsync(default, default!, default, default);
        await _cache.DidNotReceiveWithAnyArgs().SaveAsync(default!, default);
    }

    [Fact]
    public async Task EvaluateSavedAsync_DoesNotReuse_WhenTheNodeWasSavedSince()
    {
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, UpdateDate, UpdateDate.AddMilliseconds(-1)));

        ContentEvaluationResult result = await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: true, Allow);

        Assert.False(result.FromCache);
        await _evaluationService.Received(1).EvaluateSavedAsync(_nodeId, Alias, null, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateSavedAsync_NeverReusesAnOnScreenEntry()
    {
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, UpdateDate.AddMinutes(1), sourceUpdateDate: null));

        ContentEvaluationResult result = await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: true, Allow);

        Assert.False(result.FromCache);
        await _evaluationService.Received(1).EvaluateSavedAsync(_nodeId, Alias, null, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateSavedAsync_WithoutReuse_IgnoresAMatchingEntry()
    {
        _cache.GetAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>())
            .Returns(Entry(string.Empty, UpdateDate.AddMinutes(1), UpdateDate));

        ContentEvaluationResult result = await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: false, Allow);

        Assert.False(result.FromCache);
        await _evaluationService.Received(1).EvaluateSavedAsync(_nodeId, Alias, null, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateSavedAsync_VaryingDocument_UsesTheCulture_AndDeletesTheLegacyRow()
    {
        GivenContent(varies: true, "da-DK");
        GivenLanguages("da-DK");

        ContentEvaluationResult result = await _sut.EvaluateSavedAsync(_nodeId, "da-DK", reuseCache: true, Allow);

        Assert.Equal("da-dk", result.Culture);
        await _evaluationService.Received(1).EvaluateSavedAsync(_nodeId, Alias, "da-dk", Arg.Any<CancellationToken>());
        await _cache.Received(1).SaveAsync(Arg.Is<EvaluationCacheEntry>(e => e.Culture == "da-dk"), Arg.Any<CancellationToken>());
        await _cache.Received(1).DeleteAsync(_nodeId, string.Empty, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateSavedAsync_CallsTheGateBeforeTheAiCall_AndAThrowingGateAborts()
    {
        AIEvaluatorConfig? gated = null;
        await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: false, Allow,
            (config, _) => { gated = config; return Task.CompletedTask; });
        Assert.NotNull(gated);

        _evaluationService.ClearReceivedCalls();
        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: false, Allow,
            (_, _) => throw new InvalidOperationException("Scoring is required.")));
        await _evaluationService.DidNotReceiveWithAnyArgs().EvaluateSavedAsync(default, default!, default, default);
    }

    [Fact]
    public async Task EvaluateSavedAsync_ResolvesInsideAnUmbracoContext()
    {
        bool contextActiveDuringEvaluation = false;
        _evaluationService.EvaluateSavedAsync(_nodeId, Alias, null, Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                _umbracoContextFactory.Received(1).EnsureUmbracoContext();
                contextActiveDuringEvaluation = _umbracoContextAccessor.ReceivedCalls().All(c => c.GetMethodInfo().Name != "Clear");
                return Report("fresh saved");
            });

        await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: false, Allow);

        Assert.True(contextActiveDuringEvaluation);
        _umbracoContextAccessor.Received(1).Clear(); // the root reference is disposed afterwards
    }

    [Fact]
    public async Task EvaluateSavedAsync_NoActiveConfig()
    {
        _configService.GetActiveForDocumentTypeAsync(Alias, Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);

        ContentEvaluationResult result = await _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: true, Allow);

        Assert.Equal(ContentEvaluationStatus.NoActiveConfig, result.Status);
        await _evaluationService.DidNotReceiveWithAnyArgs().EvaluateSavedAsync(default, default!, default, default);
    }

    [Fact]
    public async Task EvaluateSavedAsync_PropagatesProviderAndGuardrailErrors()
    {
        _evaluationService.EvaluateSavedAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new AIProviderException(new AIProviderErrorInfo(AIProviderErrorCategory.Authentication, "bad key", "401", "bad key")));
        await Assert.ThrowsAsync<AIProviderException>(() => _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: false, Allow));

        _evaluationService.EvaluateSavedAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(Blocked());
        await Assert.ThrowsAsync<AIGuardrailBlockedException>(() => _sut.EvaluateSavedAsync(_nodeId, null, reuseCache: false, Allow));
    }
}
