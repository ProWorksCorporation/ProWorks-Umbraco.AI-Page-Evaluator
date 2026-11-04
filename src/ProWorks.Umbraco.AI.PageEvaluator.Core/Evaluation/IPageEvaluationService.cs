using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;

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
        string? culture = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Evaluates the node's <b>latest saved draft</b> for <paramref name="culture"/> (no on-screen values): used by
    /// the <c>evaluate_page</c> server tool and the Automate step (006 research R2). Shares the property filter,
    /// cleaning and AI call with <see cref="EvaluateAsync"/>.
    /// </summary>
    /// <param name="nodeId">The Umbraco content node GUID being evaluated.</param>
    /// <param name="documentTypeAlias">The document type alias of the node.</param>
    /// <param name="culture">Lower-cased ISO culture, or <see langword="null"/> for invariant documents.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <exception cref="InvalidOperationException">
    /// Thrown when no active EvaluatorConfiguration exists for the given document type alias.
    /// </exception>
    Task<EvaluationReport> EvaluateSavedAsync(
        Guid nodeId,
        string documentTypeAlias,
        string? culture,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Evaluates using a pre-resolved config and properties, returning raw strings alongside the
    /// structured report. Useful for test transcripts and diagnostic tooling.
    /// </summary>
    /// <param name="config">The active evaluator configuration to use.</param>
    /// <param name="properties">Already-resolved and cleaned property values to evaluate.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// An <see cref="EvaluationRawResult"/> containing the parsed report together with the system
    /// prompt, user message, and raw AI response text.
    /// </returns>
    Task<EvaluationRawResult> EvaluateWithConfigAsync(
        AIEvaluatorConfig config,
        IReadOnlyDictionary<string, object?> properties,
        CancellationToken cancellationToken = default);
}
