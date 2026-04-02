namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// Orchestrates an AI evaluation run for a content node.
/// Fetches the active EvaluatorConfiguration, composes the prompt, calls the AI provider,
/// and returns a structured EvaluationReport.
/// </summary>
public interface IPageEvaluationService
{
    /// <summary>
    /// Evaluates a page by sending its property values and the active evaluator prompt to the
    /// configured AI provider. Returns a structured report.
    /// </summary>
    /// <param name="nodeId">The Umbraco content node GUID being evaluated.</param>
    /// <param name="documentTypeAlias">The document type alias of the node.</param>
    /// <param name="properties">
    /// The current draft property values serialised as a JSON-compatible object map.
    /// Keys are property aliases; values are the current editor state (may include nested block lists).
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// An <see cref="EvaluationReport"/> with structured check results, or with
    /// <see cref="EvaluationReport.ParseFailed"/> set to true and <see cref="EvaluationReport.RawResponse"/>
    /// populated if the AI response could not be structured.
    /// </returns>
    /// <exception cref="InvalidOperationException">
    /// Thrown when no active EvaluatorConfiguration exists for the given document type alias.
    /// </exception>
    /// <exception cref="HttpRequestException">
    /// Thrown when the AI provider returns an error response.
    /// </exception>
    Task<EvaluationReport> EvaluateAsync(
        Guid nodeId,
        string documentTypeAlias,
        IReadOnlyDictionary<string, object?> properties,
        CancellationToken cancellationToken = default);
}
