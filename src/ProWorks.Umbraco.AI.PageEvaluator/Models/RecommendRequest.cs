namespace ProWorks.Umbraco.AI.PageEvaluator.Controllers;

/// <summary>Request body for <c>POST /recommend</c>.</summary>
public sealed class RecommendRequest
{
    /// <summary>The Umbraco content node GUID.</summary>
    public Guid NodeId { get; set; }

    /// <summary>The property aliases to generate recommendations for (one alias → one AI call).</summary>
    public IReadOnlyList<string> PropertyAliases { get; set; } = [];

    /// <summary>The check label (e.g. "Meta description is missing").</summary>
    public string CheckLabel { get; set; } = string.Empty;

    /// <summary>The check explanation from the evaluation report, or null.</summary>
    public string? CheckExplanation { get; set; }

    /// <summary>
    /// Current page property values (already cleaned plain-text strings from the evaluation).
    /// Keys are property aliases; values are the cleaned property values.
    /// </summary>
    public Dictionary<string, string> Properties { get; set; } = [];
}
