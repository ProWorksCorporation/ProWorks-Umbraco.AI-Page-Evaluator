namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// The structured result of a single AI evaluation run.
/// Transient — never persisted. Returned by <see cref="IPageEvaluationService"/> and
/// serialised as the response body of <c>POST /page-evaluator/evaluate</c>.
/// </summary>
public sealed class EvaluationReport
{
    /// <summary>
    /// True when the AI response could not be parsed into structured form.
    /// When true, <see cref="RawResponse"/> is populated and <see cref="Score"/>/<see cref="Checks"/>
    /// should be treated as empty.
    /// </summary>
    public bool ParseFailed { get; init; }

    /// <summary>Pass/total counts. Null when <see cref="ParseFailed"/> is true.</summary>
    public EvaluationScore? Score { get; init; }

    /// <summary>Ordered list of individual check results.</summary>
    public IReadOnlyList<CheckResult> Checks { get; init; } = [];

    /// <summary>Free-text suggestions block from the AI response. May be null.</summary>
    public string? Suggestions { get; init; }

    /// <summary>
    /// Original AI response text. Populated only when <see cref="ParseFailed"/> is true
    /// so the front-end can display it beneath the warning banner (FR-015).
    /// </summary>
    public string? RawResponse { get; init; }

    /// <summary>Creates a successfully parsed report.</summary>
    public static EvaluationReport Parsed(EvaluationScore score, IReadOnlyList<CheckResult> checks, string? suggestions) =>
        new() { Score = score, Checks = checks, Suggestions = suggestions };

    /// <summary>Creates a parse-failure report containing only the raw response text.</summary>
    public static EvaluationReport Failed(string rawResponse) =>
        new() { ParseFailed = true, RawResponse = rawResponse };
}
