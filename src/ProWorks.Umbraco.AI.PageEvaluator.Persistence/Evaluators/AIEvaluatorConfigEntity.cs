using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;

/// <summary>
/// EFCore entity mapping to the <c>umbracoAIEvaluatorConfig</c> table.
/// Mapped to/from the domain model <c>AIEvaluatorConfig</c> by <c>AIEvaluatorConfigEntityFactory</c>.
/// </summary>
[Table("umbracoAIEvaluatorConfig")]
public sealed class AIEvaluatorConfigEntity
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(255)]
    public required string Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    [MaxLength(255)]
    public required string DocumentTypeAlias { get; set; }

    /// <summary>Soft FK to <c>umbracoAIProfile.Id</c>. No database constraint.</summary>
    public required Guid ProfileId { get; set; }

    /// <summary>Optional soft FK to <c>umbracoAIContext.Id</c>. No database constraint.</summary>
    public Guid? ContextId { get; set; }

    [Required]
    public required string PromptText { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime DateCreated { get; set; }

    public DateTime DateModified { get; set; }

    public Guid? CreatedByUserId { get; set; }

    public Guid? ModifiedByUserId { get; set; }

    /// <summary>Incremented on every save. Used for optimistic concurrency and audit history.</summary>
    public int Version { get; set; } = 1;

    /// <summary>
    /// JSON-serialized list of property aliases to include in evaluations.
    /// Null means all properties are sent.
    /// </summary>
    public string? PropertyAliases { get; set; }

    /// <summary>
    /// Whether this evaluator asks the AI for dimensional scoring (overall + axis scores).
    /// Default false; pre-existing rows are backfilled with false by the migration default.
    /// </summary>
    public bool ScoringEnabled { get; set; }
}
