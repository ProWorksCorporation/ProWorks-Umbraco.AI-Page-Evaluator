using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Cache;

/// <summary>
/// EFCore entity mapping to the <c>umbracoAIEvaluationCache</c> table.
/// One row per (content node, culture) — composite key (NodeId, Culture), configured in
/// <c>UmbracoAIPageEvaluatorDbContext</c>. Upserted on each (re-)evaluation.
/// </summary>
[Table("umbracoAIEvaluationCache")]
public sealed class EvaluationCacheEntity
{
    public Guid NodeId { get; set; }

    /// <summary>
    /// Lower-cased ISO culture code for culture-varying documents; <see cref="string.Empty"/> for invariant
    /// documents and for rows cached before the (NodeId, Culture) key was introduced.
    /// </summary>
    [Required(AllowEmptyStrings = true)]
    [MaxLength(64)]
    public string Culture { get; set; } = string.Empty;

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
