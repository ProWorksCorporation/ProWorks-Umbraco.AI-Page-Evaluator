namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// Repository interface for persisting and querying cached evaluation results.
/// Implemented by EFCoreEvaluationCacheRepository in the Persistence project.
/// </summary>
public interface IEvaluationCacheRepository
{
    /// <summary>Returns the cached evaluation entry for a node, or null if no entry exists.</summary>
    Task<EvaluationCacheEntry?> GetAsync(Guid nodeId, CancellationToken cancellationToken = default);

    /// <summary>Upserts a cache entry — inserts on first evaluation, replaces on re-run.</summary>
    Task SaveAsync(EvaluationCacheEntry entry, CancellationToken cancellationToken = default);

    /// <summary>Deletes the cache entry for a node, if any.</summary>
    Task DeleteAsync(Guid nodeId, CancellationToken cancellationToken = default);

    /// <summary>Deletes all cache entries for a given document type alias.</summary>
    Task DeleteByDocumentTypeAliasAsync(string documentTypeAlias, CancellationToken cancellationToken = default);
}
