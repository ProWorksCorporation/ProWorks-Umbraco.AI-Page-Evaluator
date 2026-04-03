namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// Domain model representing a cached evaluation result for a content node.
/// </summary>
public sealed class EvaluationCacheEntry
{
    /// <summary>The Umbraco content node GUID this cache entry belongs to.</summary>
    public Guid NodeId { get; init; }

    /// <summary>The document type alias at the time of caching.</summary>
    public string DocumentTypeAlias { get; init; } = string.Empty;

    /// <summary>The cached evaluation report.</summary>
    public EvaluationReport Report { get; init; } = null!;

    /// <summary>UTC timestamp when this result was cached.</summary>
    public DateTime CachedAt { get; init; }
}
