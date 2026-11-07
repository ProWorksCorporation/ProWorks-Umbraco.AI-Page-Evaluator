using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Deploy;
using Umbraco.Deploy.Infrastructure.Artifacts;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.Artifacts;

/// <summary>
/// Deploy artifact for an evaluator configuration (006 contracts/deploy-artifact.md §2.2, spec FR-034). It carries the
/// deployable fields only: never <c>Version</c>, dates, creator/modifier, <c>IsDeployManaged</c> or cached
/// evaluations. <see cref="ArtifactBase{TUdi}.Name"/> is the configuration's name and
/// <see cref="ArtifactBase{TUdi}.Alias"/> its document type alias.
/// </summary>
public sealed class EvaluatorConfigArtifact(GuidUdi udi, IEnumerable<ArtifactDependency>? dependencies = null)
    : DeployArtifactBase<GuidUdi>(udi, dependencies)
{
    /// <summary>The Umbraco document type alias the configuration evaluates.</summary>
    public required string DocumentTypeAlias { get; init; }

    /// <summary>Optional description shown in the configuration list.</summary>
    public string? Description { get; init; }

    /// <summary>The AI profile (<c>umbraco-ai-profile</c>), also a <c>Match</c> dependency.</summary>
    public required GuidUdi ProfileUdi { get; init; }

    /// <summary>The optional AI context (<c>umbraco-ai-context</c>), also a <c>Match</c> dependency when set.</summary>
    public GuidUdi? ContextUdi { get; init; }

    /// <summary>The evaluation prompt.</summary>
    public required string PromptText { get; init; }

    /// <summary>The selected property aliases; null or empty means all properties.</summary>
    public IReadOnlyList<string>? PropertyAliases { get; init; }

    /// <summary>Whether the configuration asks the AI for scores.</summary>
    public bool ScoringEnabled { get; init; }

    /// <summary>Whether the report offers recommendations.</summary>
    public bool RecommendationsEnabled { get; init; }

    /// <summary>The source's active state; the import applies it exactly (spec FR-037).</summary>
    public bool IsActive { get; init; }
}
