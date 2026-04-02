namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluators;

/// <summary>
/// Application service for managing EvaluatorConfiguration records.
/// Wraps the repository and enforces business rules (validation, active-one rule).
/// </summary>
public interface IAIEvaluatorConfigService
{
    Task<IReadOnlyList<AIEvaluatorConfig>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<AIEvaluatorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<AIEvaluatorConfig?> GetActiveForDocumentTypeAsync(string documentTypeAlias, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a new EvaluatorConfiguration. The new record immediately becomes active for its
    /// document type; all prior configurations for that alias are deactivated.
    /// Throws <see cref="ArgumentException"/> if validation fails.
    /// </summary>
    Task<AIEvaluatorConfig> CreateAsync(AIEvaluatorConfig config, Guid createdByUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing EvaluatorConfiguration. Saving promotes this record to active for its
    /// document type.
    /// Throws <see cref="ArgumentException"/> if validation fails.
    /// Throws <see cref="InvalidOperationException"/> if the config is not found.
    /// </summary>
    Task<AIEvaluatorConfig> UpdateAsync(AIEvaluatorConfig config, Guid modifiedByUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes an EvaluatorConfiguration. If the deleted record was active, the next most recently
    /// modified configuration for the same document type is promoted to active.
    /// </summary>
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
