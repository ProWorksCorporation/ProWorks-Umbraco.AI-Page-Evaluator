namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluators;

/// <summary>
/// Domain model representing a saved AI Page Evaluator configuration.
/// Mapped to/from <c>AIEvaluatorConfigEntity</c> by <c>AIEvaluatorConfigEntityFactory</c>.
/// Not persisted directly — use <see cref="IAIEvaluatorConfigRepository"/> for persistence.
/// </summary>
public sealed class AIEvaluatorConfig
{
    public Guid Id { get; set; }

    /// <summary>Display name shown in the configuration list.</summary>
    public required string Name { get; set; }

    /// <summary>Optional description shown in the configuration list.</summary>
    public string? Description { get; set; }

    /// <summary>Umbraco document type alias. Used to match content nodes.</summary>
    public required string DocumentTypeAlias { get; set; }

    /// <summary>
    /// Soft FK to <c>umbracoAIProfile.Id</c>. Resolved at evaluation time via
    /// <c>IAIProfileService</c>. The <c>&lt;uai-profile-picker&gt;</c> returns this Guid.
    /// </summary>
    public required Guid ProfileId { get; set; }

    /// <summary>
    /// Optional soft FK to <c>umbracoAIContext.Id</c>. When set, context instructions
    /// are merged into the AI request at evaluation time. The <c>&lt;uai-context-picker&gt;</c>
    /// returns this Guid.
    /// </summary>
    public Guid? ContextId { get; set; }

    /// <summary>The full evaluation prompt text sent to the AI provider.</summary>
    public required string PromptText { get; set; }

    /// <summary>
    /// True only for the most recently saved configuration for a given <see cref="DocumentTypeAlias"/>.
    /// Managed automatically by the repository — do not set manually.
    /// </summary>
    public bool IsActive { get; set; }

    public DateTime DateCreated { get; set; }
    public DateTime DateModified { get; set; }

    /// <summary>Umbraco user Guid of the creator. Null when created by a system process.</summary>
    public Guid? CreatedByUserId { get; set; }

    /// <summary>Umbraco user Guid of the last editor. Null when modified by a system process.</summary>
    public Guid? ModifiedByUserId { get; set; }

    /// <summary>Incremented on every save. Used for optimistic concurrency and audit history.</summary>
    public int Version { get; set; }
}
