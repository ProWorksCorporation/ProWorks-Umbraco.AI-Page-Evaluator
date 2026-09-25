namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// Repository interface for persisting and querying cached evaluation results.
/// Implemented by EFCoreEvaluationCacheRepository in the Persistence project.
/// </summary>
public interface IEvaluationCacheRepository
{
    /// <summary>
    /// Returns the cached evaluation for a node and culture (<see cref="string.Empty"/> = invariant), or null.
    /// Rows for other cultures are never returned.
    /// </summary>
    Task<EvaluationCacheEntry?> GetAsync(Guid nodeId, string culture, CancellationToken cancellationToken = default);

    /// <summary>Upserts a cache entry keyed on (NodeId, Culture) — inserts on first evaluation, replaces on re-run.</summary>
    Task SaveAsync(EvaluationCacheEntry entry, CancellationToken cancellationToken = default);

    /// <summary>Deletes the cache entry for one node and culture, if any.</summary>
    Task DeleteAsync(Guid nodeId, string culture, CancellationToken cancellationToken = default);

    /// <summary>Deletes every culture's cache entry for a node.</summary>
    Task DeleteAllCulturesAsync(Guid nodeId, CancellationToken cancellationToken = default);

    /// <summary>Deletes all cache entries for a given document type alias.</summary>
    Task DeleteByDocumentTypeAliasAsync(string documentTypeAlias, CancellationToken cancellationToken = default);
}
