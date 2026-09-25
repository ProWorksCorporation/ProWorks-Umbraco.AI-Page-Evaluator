namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// Domain model representing a cached evaluation result for a content node.
/// </summary>
public sealed class EvaluationCacheEntry
{
    /// <summary>The Umbraco content node GUID this cache entry belongs to.</summary>
    public Guid NodeId { get; init; }

    /// <summary>
    /// The culture this entry covers: lower-cased ISO code (e.g. <c>"da-dk"</c>) for culture-varying
    /// documents, or <see cref="string.Empty"/> for invariant documents and for rows cached before
    /// entries became culture-scoped (FR-018d).
    /// </summary>
    public string Culture { get; init; } = string.Empty;

    /// <summary>The document type alias at the time of caching.</summary>
    public string DocumentTypeAlias { get; init; } = string.Empty;

    /// <summary>The cached evaluation report.</summary>
    public required EvaluationReport Report { get; init; }

    /// <summary>UTC timestamp when this result was cached.</summary>
    public DateTime CachedAt { get; init; }
}
