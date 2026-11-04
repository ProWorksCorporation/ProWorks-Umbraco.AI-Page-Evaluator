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

    /// <summary>
    /// Sets the specified configuration as the active one for its document type.
    /// All other configurations for the same document type are set inactive.
    /// Does nothing if the configuration does not exist. Write-only (no read before the first write), so the deploy
    /// import can use it safely on SQLite.
    /// </summary>
    Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>Returns true if at least one configuration exists for the given document type alias.</summary>
    Task<bool> AliasExistsAsync(string documentTypeAlias, CancellationToken cancellationToken = default);

    // -------------------------------------------------------------------------
    // Deploy import (006 contracts/deploy-artifact.md §1.2). Used only by IEvaluatorConfigImportService.
    // Each is a single write (no read-then-write inside one transaction: CLAUDE.md "Evaluation Cache").
    // -------------------------------------------------------------------------

    /// <summary>
    /// Sets <see cref="AIEvaluatorConfig.IsActive"/> to false on this configuration only. No other row changes (nothing
    /// is promoted) and neither <see cref="AIEvaluatorConfig.Version"/> nor <see cref="AIEvaluatorConfig.DateModified"/>
    /// changes. Does nothing if the configuration does not exist.
    /// </summary>
    Task SetInactiveAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Overwrites the deployable fields of an existing configuration (Name, Description, DocumentTypeAlias, ProfileId,
    /// ContextId, PromptText, PropertyAliases, ScoringEnabled, RecommendationsEnabled, IsDeployManaged) and its
    /// ModifiedByUserId with <paramref name="config"/>'s, sets DateModified to now and increments Version — in one
    /// UPDATE guarded by <c>Version = config.Version</c>. DateCreated and CreatedByUserId are kept. IsActive is kept,
    /// except that a row moving to another document type is stored inactive (activation is the caller's next step).
    /// Throws a concurrency exception (EF Core's <c>DbUpdateConcurrencyException</c>) if no row has that Id and Version.
    /// </summary>
    Task UpdateDeployedFieldsAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Inserts a new configuration under its own (non-empty) <see cref="AIEvaluatorConfig.Id"/>, exactly as given:
    /// <see cref="AIEvaluatorConfig.IsActive"/> is not forced and siblings are not touched.
    /// </summary>
    Task InsertWithIdAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a configuration without promoting another one to active. Returns false if it did not exist.
    /// </summary>
    Task<bool> DeleteWithoutPromotionAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Re-keys a configuration for Deploy adoption: in one transaction, inserts a copy of <paramref name="existingId"/>
    /// with every field unchanged under <paramref name="newId"/> (marked <see cref="AIEvaluatorConfig.IsDeployManaged"/>)
    /// and deletes <paramref name="existingId"/> without promotion. Nothing changes if either step fails (e.g.
    /// <paramref name="newId"/> already exists). Throws <see cref="InvalidOperationException"/> if
    /// <paramref name="existingId"/> does not exist. Returns the stored copy.
    /// </summary>
    Task<AIEvaluatorConfig> ReplaceIdAsync(Guid existingId, Guid newId, CancellationToken cancellationToken = default);
}
