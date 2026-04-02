using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Application service for managing EvaluatorConfiguration records.
/// Thin wrapper over <see cref="IAIEvaluatorConfigRepository"/> that adds
/// business rule enforcement (active-one rule, validation).
/// </summary>
public sealed class AIEvaluatorConfigService : IAIEvaluatorConfigService
{
    private readonly IAIEvaluatorConfigRepository _repository;
    private readonly IAIProfileService _profileService;
    private readonly IAIContextService _contextService;

    public AIEvaluatorConfigService(
        IAIEvaluatorConfigRepository repository,
        IAIProfileService profileService,
        IAIContextService contextService)
    {
        _repository = repository;
        _profileService = profileService;
        _contextService = contextService;
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
        config.Version = 1;

        await _repository.SaveAsync(config, cancellationToken);
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
        config.DateModified = DateTime.UtcNow;
        config.ModifiedByUserId = modifiedByUserId;
        config.IsActive = true;

        await _repository.SaveAsync(config, cancellationToken);
        return config;
    }

    public Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        => _repository.DeleteAsync(id, cancellationToken);

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
