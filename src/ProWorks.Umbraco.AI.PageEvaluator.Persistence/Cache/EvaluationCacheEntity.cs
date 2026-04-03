using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Cache;

/// <summary>
/// EFCore entity mapping to the <c>umbracoAIEvaluationCache</c> table.
/// One row per content node — keyed on NodeId. Upserted on each (re-)evaluation.
/// </summary>
[Table("umbracoAIEvaluationCache")]
public sealed class EvaluationCacheEntity
{
    [Key]
    public Guid NodeId { get; set; }

    [Required]
    [MaxLength(255)]
    public required string DocumentTypeAlias { get; set; }

    /// <summary>
    /// JSON-serialised <c>EvaluationReport</c>.
    /// Uses camelCase property names to match the API response convention.
    /// </summary>
    [Required]
    public required string ReportJson { get; set; }

    public DateTime CachedAt { get; set; }
}
