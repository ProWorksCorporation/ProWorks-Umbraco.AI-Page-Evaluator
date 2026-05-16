namespace ProWorks.Umbraco.AI.PageEvaluator.Controllers;

/// <summary>Response body for <c>POST /recommend</c>.</summary>
public sealed class RecommendResponse
{
    /// <summary>
    /// The AI-generated recommended value for the field, or null if a value could not be generated.
    /// For simple text property editors this is a plain string.
    /// </summary>
    public string? RecommendedValue { get; set; }
}
