using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.DeliveryApi;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Resolves a content node's properties into LLM-friendly Delivery API values for one culture
/// (FR-018a, research R3).
/// </summary>
public interface ICultureAwareContentPropertyResolver
{
    /// <summary>
    /// Returns the node's properties as Delivery API values for <paramref name="culture"/>
    /// (<see langword="null"/> for invariant content), overlaid with the editor's unsaved simple-text drafts.
    /// Falls back to <paramref name="draftProperties"/> when the node is in neither the published nor the draft cache.
    /// </summary>
    IReadOnlyDictionary<string, object?> Resolve(Guid nodeId, string? culture, IReadOnlyDictionary<string, object?> draftProperties);
}

/// <inheritdoc cref="ICultureAwareContentPropertyResolver" />
/// <remarks>
/// <list type="bullet">
/// <item>Reads the <b>published</b> version when the node is published in the culture, otherwise the <b>draft</b>
/// (<c>preview: true</c>). <c>preview</c> is always passed explicitly, so a <c>UMB_PREVIEW</c> cookie on the
/// management request can't change what is evaluated.</item>
/// <item>Maps properties with <see cref="IOutputExpansionStrategy.MapContentProperties"/> rather than
/// <see cref="IApiContentBuilder.Build"/>, because <c>Build</c> returns <see langword="null"/> whenever the node
/// isn't routable in the culture (unpublished variants, never-published drafts). Nested pickers still go
/// through the decorated <see cref="IApiContentBuilder"/>, so <see cref="CycleDetectingApiContentBuilder"/>
/// still breaks self/ancestor cycles.</item>
/// <item><see cref="IVariationContextAccessor.VariationContext"/> lives in the <b>request</b> cache
/// (<c>HybridVariationContextAccessor</c>), so it is set for the mapping only and always restored in
/// <c>finally</c>. Never resolve several cultures in parallel within one request.</item>
/// <item>Invariant properties on a culture-varying document resolve to their invariant value automatically.</item>
/// </list>
/// Mirrors CMS 17.6's <c>ExtendedContentWebhookEventBase.BuildCultureProperties</c>.
/// </remarks>
internal sealed class CultureAwareContentPropertyResolver : ICultureAwareContentPropertyResolver
{
    private readonly IPublishedContentCache _contentCache;
    private readonly IVariationContextAccessor _variationContextAccessor;
    private readonly IOutputExpansionStrategyAccessor _outputExpansionStrategyAccessor;
    private readonly ILogger<CultureAwareContentPropertyResolver> _logger;

    public CultureAwareContentPropertyResolver(
        IPublishedContentCache contentCache,
        IVariationContextAccessor variationContextAccessor,
        IOutputExpansionStrategyAccessor outputExpansionStrategyAccessor,
        ILogger<CultureAwareContentPropertyResolver> logger)
    {
        _contentCache = contentCache;
        _variationContextAccessor = variationContextAccessor;
        _outputExpansionStrategyAccessor = outputExpansionStrategyAccessor;
        _logger = logger;
    }

    public IReadOnlyDictionary<string, object?> Resolve(
        Guid nodeId,
        string? culture,
        IReadOnlyDictionary<string, object?> draftProperties)
    {
        IPublishedContent? content = _contentCache.GetById(false, nodeId);
        if (content is null || !content.IsPublished(culture))
            content = _contentCache.GetById(true, nodeId);

        if (content is null)
        {
            _logger.LogDebug("[PageEvaluator] Node {NodeId} not in the published or draft cache — using raw draft properties.", nodeId);
            return draftProperties;
        }

        IDictionary<string, object?> resolved = MapForCulture(content, culture);
        var merged = new Dictionary<string, object?>(resolved);

        // Overlay simple draft text values so unsaved editor changes reach the AI.
        // Complex draft values (media pickers, blocks) stay as the Delivery-API-resolved form.
        int draftOverrides = 0;
        foreach ((string alias, object? value) in draftProperties)
        {
            if (IsSimpleTextDraft(value))
            {
                merged[alias] = value;
                draftOverrides++;
            }
        }

        _logger.LogDebug(
            "[PageEvaluator] Resolved {Resolved} properties for node {NodeId} (culture {Culture}); {Draft} draft overrides applied.",
            resolved.Count, nodeId, culture ?? "invariant", draftOverrides);

        return merged;
    }

    private IDictionary<string, object?> MapForCulture(IPublishedContent content, string? culture)
    {
        VariationContext? original = _variationContextAccessor.VariationContext;
        try
        {
            _variationContextAccessor.VariationContext = new VariationContext(culture);

            if (_outputExpansionStrategyAccessor.TryGetValue(out IOutputExpansionStrategy? strategy))
                return strategy.MapContentProperties(content);

            return content.Properties.ToDictionary(
                property => property.Alias,
                property => property.GetDeliveryApiValue(false, culture));
        }
        finally
        {
            _variationContextAccessor.VariationContext = original;
        }
    }

    /// <summary>
    /// <see langword="true"/> for a plain string that doesn't look like serialised JSON or a UDI —
    /// the only draft values worth overlaying on the resolved content.
    /// </summary>
    private static bool IsSimpleTextDraft(object? value)
    {
        if (value is not string s) return false;
        string trimmed = s.TrimStart();
        return trimmed.Length > 0
            && trimmed[0] != '{'
            && trimmed[0] != '['
            && !trimmed.StartsWith("umb://", StringComparison.OrdinalIgnoreCase);
    }
}
