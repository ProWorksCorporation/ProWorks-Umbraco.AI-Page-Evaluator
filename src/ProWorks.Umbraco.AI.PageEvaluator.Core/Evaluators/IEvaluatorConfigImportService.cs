namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluators;

/// <summary>
/// Deploy-only write path for evaluator configurations (006 contracts/deploy-artifact.md §1.2). Used only by the
/// <c>ProWorks.Umbraco.AI.PageEvaluator.Deploy</c> add-on's connector; the backoffice API never calls it.
/// Every method publishes <c>EvaluatorConfigSavedNotification</c>/<c>EvaluatorConfigDeletedNotification</c> for each
/// row whose stored state changed, and clears the evaluation cache best-effort where the contract says so.
/// </summary>
public interface IEvaluatorConfigImportService
{
    /// <summary>
    /// Upserts a deployed configuration by <see cref="AIEvaluatorConfig.Id"/>.
    /// <para><b>Existing:</b> copies the deployable fields onto the target, keeping its <c>DateCreated</c>,
    /// <c>CreatedByUserId</c> and current <c>IsActive</c>; <c>DateModified</c> = now, <c>ModifiedByUserId</c> = null;
    /// saved through the repository's normal save with the target's own <c>Version</c> as the concurrency original
    /// (so <c>Version</c> + 1). <b>New:</b> inserted under the incoming id with <c>Version</c> = 1, dates = now, users = null.
    /// Source record fields (<c>Version</c>, dates, users) are never copied. Both: <c>IsDeployManaged</c> = true.</para>
    /// <para>Then sets activation exactly: active → activates it (siblings deactivated); inactive → deactivates this
    /// row only.</para>
    /// Throws <see cref="InvalidOperationException"/> when the profile (or the context, if set) does not exist.
    /// </summary>
    Task<AIEvaluatorConfig> ImportAsync(AIEvaluatorConfig incoming, CancellationToken cancellationToken = default);

    /// <summary>
    /// Configurations for the same document type alias (case-insensitive) whose trimmed name equals the trimmed
    /// <paramref name="name"/>, ignoring case: the candidates a first deploy may adopt.
    /// </summary>
    Task<IReadOnlyList<AIEvaluatorConfig>> FindAdoptionCandidatesAsync(string documentTypeAlias, string name, CancellationToken cancellationToken = default);

    /// <summary>
    /// Re-keys <paramref name="existingId"/> to <paramref name="newId"/> in one transaction (all fields copied, the copy
    /// marked deploy-managed, the original deleted without promotion). Publishes Deleted(existingId) and Saved(newId).
    /// Throws <see cref="InvalidOperationException"/> when <paramref name="newId"/> already exists or
    /// <paramref name="existingId"/> does not.
    /// </summary>
    Task<AIEvaluatorConfig> AdoptAsync(Guid existingId, Guid newId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes the configuration only if it exists <b>and</b> is deploy-managed: without promotion, clearing its
    /// document type's cache (best-effort) and publishing Deleted. Returns false and changes nothing otherwise.
    /// </summary>
    Task<bool> DeleteManagedAsync(Guid id, CancellationToken cancellationToken = default);
}
