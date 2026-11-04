using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Events;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Deploy-only write path for evaluator configurations (006 contracts/deploy-artifact.md §1.2, data-model §2,
/// spec FR-034–FR-039). Called by the Deploy add-on's connector, never by the backoffice API. Reads happen in their
/// own repository scopes before each write, and every repository write it calls starts with its write (CLAUDE.md
/// "Evaluation Cache": no read-then-write inside one SQLite transaction), notifications go through the shared
/// <see cref="EvaluatorConfigChangeNotifier"/>, and cache clearing is best-effort (logged, never thrown).
/// </summary>
public sealed class EvaluatorConfigImportService : IEvaluatorConfigImportService
{
    private readonly IAIEvaluatorConfigRepository _repository;
    private readonly IEvaluationCacheRepository _cacheRepository;
    private readonly IAIProfileService _profileService;
    private readonly IAIContextService _contextService;
    private readonly ILogger<EvaluatorConfigImportService> _logger;
    private readonly EvaluatorConfigChangeNotifier _notifier;

    public EvaluatorConfigImportService(
        IAIEvaluatorConfigRepository repository,
        IEvaluationCacheRepository cacheRepository,
        IAIProfileService profileService,
        IAIContextService contextService,
        IEventAggregator eventAggregator,
        ILogger<EvaluatorConfigImportService> logger)
    {
        _repository = repository;
        _cacheRepository = cacheRepository;
        _profileService = profileService;
        _contextService = contextService;
        _logger = logger;
        _notifier = new EvaluatorConfigChangeNotifier(repository, eventAggregator, logger);
    }

    public async Task<AIEvaluatorConfig> ImportAsync(AIEvaluatorConfig incoming, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(incoming);
        if (incoming.Id == Guid.Empty)
            throw new ArgumentException("A deployed configuration needs its id.", nameof(incoming));

        // Missing dependencies throw before anything is written; the connector reports them as missing dependencies.
        if (await _profileService.GetProfileAsync(incoming.ProfileId, cancellationToken) is null)
            throw new InvalidOperationException($"AI profile '{incoming.ProfileId}' used by evaluator configuration '{incoming.Name}' does not exist.");
        if (incoming.ContextId is Guid contextId && await _contextService.GetContextAsync(contextId, cancellationToken) is null)
            throw new InvalidOperationException($"AI context '{contextId}' used by evaluator configuration '{incoming.Name}' does not exist.");

        AIEvaluatorConfig? existing = await _repository.GetByIdAsync(incoming.Id, cancellationToken);
        string[] aliases = existing is null
            ? [incoming.DocumentTypeAlias]
            : [existing.DocumentTypeAlias, incoming.DocumentTypeAlias];
        EvaluatorConfigChangeNotifier.Snapshot before = await _notifier.SnapshotAsync(aliases, cancellationToken);

        DateTime now = DateTime.UtcNow;
        AIEvaluatorConfig target;
        if (existing is not null)
        {
            bool sameDocumentType = string.Equals(existing.DocumentTypeAlias, incoming.DocumentTypeAlias, StringComparison.Ordinal);
            target = CopyDeployableFields(incoming);
            target.DateCreated = existing.DateCreated;
            target.CreatedByUserId = existing.CreatedByUserId;
            target.DateModified = now;
            target.ModifiedByUserId = null; // a system change
            target.Version = existing.Version; // concurrency original: the target's own Version, never the source's
            // A single write-first UPDATE (no read inside its transaction, so it is safe against Umbraco.AI's background
            // commits on SQLite). It keeps the target's active state; a row moving to another document type is stored
            // inactive, so that type never has two active configs. The exact state is applied below.
            await _repository.UpdateDeployedFieldsAsync(target, cancellationToken);
            target.IsActive = existing.IsActive && sameDocumentType;
            target.Version += 1; // what the update committed (as any edit)
        }
        else
        {
            target = CopyDeployableFields(incoming);
            target.DateCreated = now;
            target.DateModified = now;
            target.CreatedByUserId = null;
            target.ModifiedByUserId = null;
            target.Version = 1;
            target.IsActive = false; // activation is applied exactly below
            await _repository.InsertWithIdAsync(target, cancellationToken);
        }

        // Activation, exactly as in the source. Neither call changes Version or DateModified (FR-037).
        if (incoming.IsActive)
            await _repository.SetActiveAsync(target.Id, cancellationToken);
        else
            await _repository.SetInactiveAsync(target.Id, cancellationToken);
        target.IsActive = incoming.IsActive;

        await ClearCacheSafelyAsync(aliases, cancellationToken);

        EvaluatorConfigChangeNotifier.Snapshot? after = await _notifier.PublishChangesAsync(before, target, cancellationToken);
        return after?.Rows.GetValueOrDefault(target.Id) ?? target;
    }

    public async Task<IReadOnlyList<AIEvaluatorConfig>> FindAdoptionCandidatesAsync(
        string documentTypeAlias, string name, CancellationToken cancellationToken = default)
    {
        string wantedName = (name ?? string.Empty).Trim();
        IReadOnlyList<AIEvaluatorConfig> all = await _repository.GetAllAsync(cancellationToken);
        return all
            .Where(c => string.Equals(c.DocumentTypeAlias, documentTypeAlias, StringComparison.OrdinalIgnoreCase)
                && string.Equals(c.Name?.Trim(), wantedName, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    public async Task<AIEvaluatorConfig> AdoptAsync(Guid existingId, Guid newId, CancellationToken cancellationToken = default)
    {
        if (await _repository.GetByIdAsync(newId, cancellationToken) is not null)
            throw new InvalidOperationException($"Cannot adopt evaluator configuration '{existingId}' as '{newId}': '{newId}' already exists.");

        AIEvaluatorConfig existing = await _repository.GetByIdAsync(existingId, cancellationToken)
            ?? throw new InvalidOperationException($"Evaluator configuration '{existingId}' not found.");

        EvaluatorConfigChangeNotifier.Snapshot before = await _notifier.SnapshotAsync([existing.DocumentTypeAlias], cancellationToken);
        AIEvaluatorConfig adopted = await _repository.ReplaceIdAsync(existingId, newId, cancellationToken);

        // Deleted(existingId) + Saved(newId): the new row is "new" in the diff.
        EvaluatorConfigChangeNotifier.Snapshot? after = await _notifier.PublishChangesAsync(before, target: null, cancellationToken);
        return after?.Rows.GetValueOrDefault(newId) ?? adopted;
    }

    public async Task<bool> DeleteManagedAsync(Guid id, CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? existing = await _repository.GetByIdAsync(id, cancellationToken);
        if (existing is null || !existing.IsDeployManaged)
            return false; // hand-made target configs are never removed by Deploy's schema clean-up (FR-038)

        EvaluatorConfigChangeNotifier.Snapshot before = await _notifier.SnapshotAsync([existing.DocumentTypeAlias], cancellationToken);
        await _repository.DeleteWithoutPromotionAsync(id, cancellationToken);
        await ClearCacheSafelyAsync([existing.DocumentTypeAlias], cancellationToken);
        await _notifier.PublishChangesAsync(before, target: null, cancellationToken);
        return true;
    }

    /// <summary>A new config carrying only the deployable fields (spec FR-034) of <paramref name="source"/>.</summary>
    private static AIEvaluatorConfig CopyDeployableFields(AIEvaluatorConfig source) => new()
    {
        Id = source.Id,
        Name = source.Name,
        Description = source.Description,
        DocumentTypeAlias = source.DocumentTypeAlias,
        ProfileId = source.ProfileId,
        ContextId = source.ContextId,
        PromptText = source.PromptText,
        PropertyAliases = source.PropertyAliases?.ToList(),
        ScoringEnabled = source.ScoringEnabled,
        RecommendationsEnabled = source.RecommendationsEnabled,
        IsDeployManaged = true,
    };

    private async Task ClearCacheSafelyAsync(IEnumerable<string> aliases, CancellationToken cancellationToken)
    {
        foreach (string alias in aliases.Distinct(StringComparer.Ordinal))
        {
            try
            {
                await _cacheRepository.DeleteByDocumentTypeAliasAsync(alias, cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Best-effort (FR-039): a stale cache must not fail the deploy; the config change is committed.
                _logger.LogWarning(ex,
                    "[PageEvaluator] Could not clear cached evaluations for document type {DocumentTypeAlias} after a deploy change.",
                    alias);
            }
        }
    }
}
