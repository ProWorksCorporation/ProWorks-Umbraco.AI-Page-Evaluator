namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluators;

/// <summary>
/// Repository interface for persisting and querying EvaluatorConfiguration records.
/// Implemented by EFCoreAIEvaluatorConfigRepository in the Persistence project.
/// </summary>
public interface IAIEvaluatorConfigRepository
{
    /// <summary>Returns a single configuration by its primary key, or null if not found.</summary>
    Task<AIEvaluatorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Returns all configurations for a given document type alias, ordered by DateModified descending.</summary>
    Task<IReadOnlyList<AIEvaluatorConfig>> GetByDocumentTypeAliasAsync(string documentTypeAlias, CancellationToken cancellationToken = default);

    /// <summary>Returns all configurations across all document types, ordered by DocumentTypeAlias then DateModified descending.</summary>
    Task<IReadOnlyList<AIEvaluatorConfig>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns the single active configuration for a document type alias, or null if none is configured.</summary>
    Task<AIEvaluatorConfig?> GetActiveForDocumentTypeAsync(string documentTypeAlias, CancellationToken cancellationToken = default);

    /// <summary>
    /// Persists a configuration. Enforces the active-one rule:
    /// if the saved config is active, all other configs for the same DocumentTypeAlias are set inactive
    /// within the same transaction.
    /// </summary>
    Task SaveAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a configuration by id. If the deleted record was the active one, the next
    /// most recently modified configuration for the same document type (if any) is promoted to active.
    /// </summary>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Returns true if at least one configuration exists for the given document type alias.</summary>
    Task<bool> AliasExistsAsync(string documentTypeAlias, CancellationToken cancellationToken = default);
}
