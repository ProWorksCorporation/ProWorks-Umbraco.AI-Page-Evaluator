using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Events;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Application service for managing EvaluatorConfiguration records.
/// Thin wrapper over <see cref="IAIEvaluatorConfigRepository"/> that adds
/// business rule enforcement (active-one rule, validation).
/// Since 006 it also publishes <see cref="EvaluatorConfigSavedNotification"/> / <see cref="EvaluatorConfigDeletedNotification"/>
/// for every row whose stored state changed (siblings included), through <see cref="EvaluatorConfigChangeNotifier"/>
/// (research R10, data-model §2). Notifications are published after the change commits; a publishing failure is
/// logged and never thrown back into the operation.
/// </summary>
public sealed class AIEvaluatorConfigService : IAIEvaluatorConfigService
{
    // 32,768 characters ≈ 32 KB — prevents oversized prompts from bloating AI requests.
    private const int MaxPromptTextLength = 32_768;

    private readonly IAIEvaluatorConfigRepository _repository;
    private readonly IAIProfileService _profileService;
    private readonly IAIContextService _contextService;
    private readonly EvaluatorConfigChangeNotifier _notifier;

    public AIEvaluatorConfigService(
        IAIEvaluatorConfigRepository repository,
        IAIProfileService profileService,
        IAIContextService contextService,
        IEventAggregator eventAggregator,
        ILogger<AIEvaluatorConfigService> logger)
    {
        _repository = repository;
        _profileService = profileService;
        _contextService = contextService;
        _notifier = new EvaluatorConfigChangeNotifier(repository, eventAggregator, logger);
    }

    public Task<IReadOnlyList<AIEvaluatorConfig>> GetAllAsync(CancellationToken cancellationToken = default)
        => _repository.GetAllAsync(cancellationToken);

    public Task<AIEvaluatorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => _repository.GetByIdAsync(id, cancellationToken);

    public Task<AIEvaluatorConfig?> GetActiveForDocumentTypeAsync(
        string documentTypeAlias, CancellationToken cancellationToken = default)
        => _repository.GetActiveForDocumentTypeAsync(documentTypeAlias, cancellationToken);

    public async Task<AIEvaluatorConfig> CreateAsync(
        AIEvaluatorConfig config,
        Guid createdByUserId,
        CancellationToken cancellationToken = default)
    {
        ValidateConfig(config);
        await ValidateProfileAsync(config.ProfileId, cancellationToken);
        if (config.ContextId.HasValue)
            await ValidateContextAsync(config.ContextId.Value, cancellationToken);

        config.Id = Guid.NewGuid();
        config.DateCreated = DateTime.UtcNow;
        config.DateModified = DateTime.UtcNow;
        config.CreatedByUserId = createdByUserId;
        config.ModifiedByUserId = createdByUserId;
        config.IsActive = true;
        config.IsDeployManaged = false; // only a Deploy import marks a config as deploy-managed
        config.Version = 1;

        EvaluatorConfigChangeNotifier.Snapshot before = await _notifier.SnapshotAsync([config.DocumentTypeAlias], cancellationToken);
        await _repository.SaveAsync(config, cancellationToken);
        await _notifier.PublishChangesAsync(before, config, cancellationToken);
        return config;
    }

    public async Task<AIEvaluatorConfig> UpdateAsync(
        AIEvaluatorConfig config,
        Guid modifiedByUserId,
        CancellationToken cancellationToken = default)
    {
        ValidateConfig(config);

        // Check existence before calling profile/context services (fail fast on identity).
        AIEvaluatorConfig? existing = await _repository.GetByIdAsync(config.Id, cancellationToken)
            ?? throw new InvalidOperationException($"Evaluator configuration '{config.Id}' not found.");

        await ValidateProfileAsync(config.ProfileId, cancellationToken);
        if (config.ContextId.HasValue)
            await ValidateContextAsync(config.ContextId.Value, cancellationToken);

        config.DateCreated = existing.DateCreated;
        config.CreatedByUserId = existing.CreatedByUserId;

        if (config.Version == 0)
            throw new ArgumentException(
                "Version is required for update. Reload the configuration and try again.", nameof(config));

        config.DateModified = DateTime.UtcNow;
        config.ModifiedByUserId = modifiedByUserId;
        config.IsActive = existing.IsActive;
        config.IsDeployManaged = existing.IsDeployManaged; // never edited in the backoffice

        // An update may move the row to another document type, where saving it active deactivates siblings.
        EvaluatorConfigChangeNotifier.Snapshot before = await _notifier.SnapshotAsync([existing.DocumentTypeAlias, config.DocumentTypeAlias], cancellationToken);
        await _repository.SaveAsync(config, cancellationToken);
        config.Version += 1; // Reflect what ApplyToEntity committed to the DB (domain.Version + 1).
        await _notifier.PublishChangesAsync(before, config, cancellationToken);
        return config;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? existing = await _repository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
        {
            await _repository.DeleteAsync(id, cancellationToken); // no-op in the repository; nothing to publish
            return;
        }

        EvaluatorConfigChangeNotifier.Snapshot before = await _notifier.SnapshotAsync([existing.DocumentTypeAlias], cancellationToken);
        await _repository.DeleteAsync(id, cancellationToken);
        await _notifier.PublishChangesAsync(before, target: null, cancellationToken);
    }

    public async Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? existing = await _repository.GetByIdAsync(id, cancellationToken);
        if (existing is null)
        {
            await _repository.SetActiveAsync(id, cancellationToken); // no-op in the repository; nothing to publish
            return;
        }

        EvaluatorConfigChangeNotifier.Snapshot before = await _notifier.SnapshotAsync([existing.DocumentTypeAlias], cancellationToken);
        await _repository.SetActiveAsync(id, cancellationToken);
        // Activating the already-active row changes nothing, so it isn't forced: only real changes are published.
        await _notifier.PublishChangesAsync(before, target: null, cancellationToken);
    }

    // -------------------------------------------------------------------------
    // Validation helpers
    // -------------------------------------------------------------------------

    private static void ValidateConfig(AIEvaluatorConfig config)
    {
        if (string.IsNullOrWhiteSpace(config.Name))
            throw new ArgumentException("Evaluator configuration name is required.", nameof(config));

        if (string.IsNullOrWhiteSpace(config.DocumentTypeAlias))
            throw new ArgumentException("Document type alias is required.", nameof(config));

        if (config.ProfileId == Guid.Empty)
            throw new ArgumentException("Profile ID is required.", nameof(config));

        if (string.IsNullOrWhiteSpace(config.PromptText))
            throw new ArgumentException("Prompt text is required.", nameof(config));

        if (config.PromptText.Length > MaxPromptTextLength)
            throw new ArgumentException(
                $"Prompt text must not exceed {MaxPromptTextLength:N0} characters.", nameof(config));
    }

    private async Task ValidateProfileAsync(Guid profileId, CancellationToken cancellationToken)
    {
        var profile = await _profileService.GetProfileAsync(profileId, cancellationToken);
        if (profile is null)
            throw new ArgumentException($"AI profile '{profileId}' not found.", "config");
    }

    private async Task ValidateContextAsync(Guid contextId, CancellationToken cancellationToken)
    {
        var context = await _contextService.GetContextAsync(contextId, cancellationToken);
        if (context is null)
            throw new ArgumentException($"AI context '{contextId}' not found.", "config");
    }
}
