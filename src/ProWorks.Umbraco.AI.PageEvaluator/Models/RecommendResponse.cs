namespace ProWorks.Umbraco.AI.PageEvaluator.Controllers;

/// <summary>Response body for <c>POST /recommend</c>.</summary>
public sealed class RecommendResponse
{
    /// <summary>
    /// AI-generated recommended values, keyed by property alias.
    /// A null value for an alias means the AI could not generate a recommendation for that field.
    /// </summary>
    public Dictionary<string, string?> RecommendedValues { get; set; } = [];
}
