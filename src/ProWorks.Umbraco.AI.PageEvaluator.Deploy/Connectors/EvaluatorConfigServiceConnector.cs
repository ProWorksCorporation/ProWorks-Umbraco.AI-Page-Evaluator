using System.Runtime.CompilerServices;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Deploy.Artifacts;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.AI.Core.Profiles;
using Umbraco.AI.Deploy;
using Umbraco.AI.Deploy.Configuration;
using Umbraco.AI.Deploy.Connectors.ServiceConnectors;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Deploy;
using Umbraco.Cms.Core.Services;
using Umbraco.Deploy.Core.Connectors.ServiceConnectors;
using Umbraco.Extensions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.Connectors;

/// <summary>
/// Umbraco Deploy service connector for evaluator configurations (006 contracts/deploy-artifact.md §2.3, research R10),
/// modelled on Umbraco.AI.Prompt.Deploy. Processed in pass 3, after AI connections, profiles and contexts (spec FR-035).
/// On top of Umbraco.AI's base it:
/// <list type="bullet">
///   <item>adopts a single hand-made target config with the same document type and name on the first deploy (FR-036);</item>
///   <item>imports through <see cref="IEvaluatorConfigImportService"/>, which applies the source's active state exactly,
///   keeps the target's record fields and clears the cache (FR-037, FR-039);</item>
///   <item>implements <see cref="IDeletableServiceConnector"/> for Deploy's schema clean-up, deleting only
///   deploy-managed configs (FR-038).</item>
/// </list>
/// Connectors are singletons (Deploy's connector collection), so the scoped config and import services are resolved
/// through a DI scope per call.
/// </summary>
[UdiDefinition(PageEvaluatorDeployConstants.UdiEntityType.EvaluatorConfig, UdiType.GuidUdi)]
public sealed class EvaluatorConfigServiceConnector(
    IServiceScopeFactory scopeFactory,
    IContentTypeService contentTypeService,
    IAIProfileService profileService,
    UmbracoAIDeploySettingsAccessor settingsAccessor,
    ILogger<EvaluatorConfigServiceConnector> logger)
    : UmbracoAIProfileDependentEntityServiceConnectorBase<EvaluatorConfigArtifact, AIEvaluatorConfig>(profileService, settingsAccessor),
      IDeletableServiceConnector
{
    /// <inheritdoc />
    protected override string[] ValidOpenSelectors => ["this", "this-and-descendants", "descendants"];

    /// <inheritdoc />
    protected override string OpenUdiName => "All Page Evaluator configurations";

    /// <inheritdoc />
    public override string UdiEntityType => PageEvaluatorDeployConstants.UdiEntityType.EvaluatorConfig;

    /// <inheritdoc />
    public override async Task<AIEvaluatorConfig?> GetEntityAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<IAIEvaluatorConfigService>().GetByIdAsync(id, cancellationToken);
    }

    /// <inheritdoc />
    public override async IAsyncEnumerable<AIEvaluatorConfig> GetEntitiesAsync([EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        IReadOnlyList<AIEvaluatorConfig> configs;
        await using (AsyncServiceScope scope = scopeFactory.CreateAsyncScope())
        {
            configs = await scope.ServiceProvider.GetRequiredService<IAIEvaluatorConfigService>().GetAllAsync(cancellationToken);
        }

        foreach (AIEvaluatorConfig config in configs)
            yield return config;
    }

    /// <inheritdoc />
    public override string GetEntityName(AIEvaluatorConfig entity) => $"{entity.Name} ({entity.DocumentTypeAlias})";

    /// <summary>
    /// Builds the artifact from the config's deployable fields (spec FR-034). Never throws and never looks anything up:
    /// Deploy's schema clean-up builds an artifact for every target entity, including configs whose profile is gone.
    /// </summary>
    public override Task<EvaluatorConfigArtifact?> GetArtifactAsync(GuidUdi udi, AIEvaluatorConfig? entity, CancellationToken cancellationToken = default)
    {
        if (entity is null)
            return Task.FromResult<EvaluatorConfigArtifact?>(null);

        var dependencies = new ArtifactDependencyCollection();
        GuidUdi profileUdi = AddProfileDependency(entity.ProfileId, dependencies)!;

        GuidUdi? contextUdi = null;
        if (entity.ContextId is Guid contextId)
        {
            contextUdi = new GuidUdi(UmbracoAIConstants.UdiEntityType.Context, contextId);
            dependencies.Add(new UmbracoAIArtifactDependency(contextUdi, ArtifactDependencyMode.Match));
        }

        var artifact = new EvaluatorConfigArtifact(udi, dependencies)
        {
            Name = entity.Name,
            Alias = entity.DocumentTypeAlias,
            DocumentTypeAlias = entity.DocumentTypeAlias,
            Description = entity.Description,
            ProfileUdi = profileUdi,
            ContextUdi = contextUdi,
            PromptText = entity.PromptText,
            PropertyAliases = entity.PropertyAliases is { Count: > 0 } aliases ? aliases.ToList() : null,
            ScoringEnabled = entity.ScoringEnabled,
            RecommendationsEnabled = entity.RecommendationsEnabled,
            IsActive = entity.IsActive,
        };

        return Task.FromResult<EvaluatorConfigArtifact?>(artifact);
    }

    /// <summary>
    /// Matches the target config by id; when there is none, adopts a single hand-made config with the same document
    /// type and name by re-keying it to the artifact's id, so later deploys (and the schema clean-up) match it by id
    /// (spec FR-036). With several candidates none is adopted, a warning is logged and the config is created new.
    /// </summary>
    public override async Task<ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig>> ProcessInitAsync(
        EvaluatorConfigArtifact artifact,
        IDeployContext context,
        CancellationToken cancellationToken = default)
    {
        EnsureType(artifact.Udi);

        AIEvaluatorConfig? entity = await GetEntityAsync(artifact.Udi.Guid, cancellationToken);
        if (entity is null)
        {
            await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
            var importService = scope.ServiceProvider.GetRequiredService<IEvaluatorConfigImportService>();
            IReadOnlyList<AIEvaluatorConfig> candidates =
                await importService.FindAdoptionCandidatesAsync(artifact.DocumentTypeAlias, artifact.Name, cancellationToken);

            if (candidates.Count == 1)
            {
                AIEvaluatorConfig candidate = candidates[0];
                entity = await importService.AdoptAsync(candidate.Id, artifact.Udi.Guid, cancellationToken);
                logger.LogInformation(
                    "[PageEvaluator] Deploy adopted the existing evaluator configuration {CandidateId} ('{Name}', document type {DocumentTypeAlias}) as {ConfigId}.",
                    candidate.Id, artifact.Name, artifact.DocumentTypeAlias, artifact.Udi.Guid);
            }
            else if (candidates.Count > 1)
            {
                logger.LogWarning(
                    "[PageEvaluator] Deploy found {Count} evaluator configurations named '{Name}' for document type {DocumentTypeAlias} ({CandidateIds}); none was adopted and {ConfigId} is added as a new configuration.",
                    candidates.Count, artifact.Name, artifact.DocumentTypeAlias,
                    string.Join(", ", candidates.Select(c => c.Id)), artifact.Udi.Guid);
            }
        }

        return ArtifactDeployState.Create(artifact, entity, this, ProcessPasses[0]);
    }

    /// <inheritdoc />
    public override async Task ProcessAsync(
        ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig> state,
        IDeployContext context,
        int pass,
        CancellationToken cancellationToken = default)
    {
        state.NextPass = GetNextPass(pass);

        if (pass == 3)
            await Pass3Async(state, cancellationToken);
    }

    private async Task Pass3Async(ArtifactDeployState<EvaluatorConfigArtifact, AIEvaluatorConfig> state, CancellationToken cancellationToken)
    {
        EvaluatorConfigArtifact artifact = state.Artifact;

        // The profile is a Match dependency; if it still isn't on the target, fail this item so Deploy reports it.
        Guid profileId = await ResolveProfileIdAsync(artifact.ProfileUdi, cancellationToken)
            ?? throw new InvalidOperationException(
                $"Evaluator configuration '{artifact.Name}' ({artifact.Udi.Guid}) depends on AI profile {artifact.ProfileUdi.Guid}, which doesn't exist on this environment. Deploy the profile first.");

        artifact.ContextUdi?.EnsureType(UmbracoAIConstants.UdiEntityType.Context);

        // Spec FR-040: a config for a document type that doesn't exist here still deploys.
        if (contentTypeService.Get(artifact.DocumentTypeAlias) is null)
        {
            logger.LogWarning(
                "[PageEvaluator] Deployed evaluator configuration '{Name}' ({ConfigId}) is for document type {DocumentTypeAlias}, which doesn't exist on this environment; it won't be used until that document type exists.",
                artifact.Name, artifact.Udi.Guid, artifact.DocumentTypeAlias);
        }

        var config = new AIEvaluatorConfig
        {
            Id = artifact.Udi.Guid,
            Name = artifact.Name,
            Description = artifact.Description,
            DocumentTypeAlias = artifact.DocumentTypeAlias,
            ProfileId = profileId,
            ContextId = artifact.ContextUdi?.Guid,
            PromptText = artifact.PromptText,
            PropertyAliases = artifact.PropertyAliases is { Count: > 0 } aliases ? aliases.ToList() : null,
            ScoringEnabled = artifact.ScoringEnabled,
            RecommendationsEnabled = artifact.RecommendationsEnabled,
            IsActive = artifact.IsActive,
        };

        await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
        state.Entity = await scope.ServiceProvider.GetRequiredService<IEvaluatorConfigImportService>().ImportAsync(config, cancellationToken);
    }

    // -------------------------------------------------------------------------
    // IDeletableServiceConnector: only Deploy's schema clean-up deletes (CleanSchema, a deploy-clean trigger or a
    // schema-dashboard delete), and only deploy-managed configs are removed (spec FR-038).
    // -------------------------------------------------------------------------

    /// <inheritdoc />
    public async Task DeleteAsync(Udi udi, IDeployContext context, CancellationToken cancellationToken = default)
    {
        EnsureType(udi);
        await DeleteManagedAsync(((GuidUdi)udi).Guid, cancellationToken);
    }

    /// <inheritdoc />
    public async Task DeleteAsync(object entity, IDeployContext context, CancellationToken cancellationToken = default)
    {
        if (entity is not AIEvaluatorConfig config)
            throw new ArgumentException("Invalid type.", nameof(entity));

        await DeleteManagedAsync(config.Id, cancellationToken);
    }

    private async Task DeleteManagedAsync(Guid id, CancellationToken cancellationToken)
    {
        await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
        bool deleted = await scope.ServiceProvider.GetRequiredService<IEvaluatorConfigImportService>().DeleteManagedAsync(id, cancellationToken);
        if (!deleted)
        {
            logger.LogInformation(
                "[PageEvaluator] Deploy's schema clean-up skipped evaluator configuration {ConfigId}: it wasn't created or adopted by a deploy (or no longer exists).",
                id);
        }
    }
}
