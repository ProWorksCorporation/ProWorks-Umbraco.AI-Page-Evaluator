using Json.Schema.Generation;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;

/// <summary>
/// Output of the "Evaluate Page" step (contracts/automate-step.md §3), bound by later steps as
/// <c>${ steps.&lt;alias&gt;.&lt;property&gt; }</c> (camelCase).
/// </summary>
public sealed class EvaluatePageOutput
{
    [Description("Overall score on the report's 1–5 scale; null when scoring is off or the AI gave none.")]
    public decimal? OverallScore { get; init; }

    [Description("True/false against the threshold and 'Fail on any failed check'; null when neither is set.")]
    public bool? Passed { get; init; }

    [Description("The pass threshold used, if any.")]
    public decimal? Threshold { get; init; }

    [Description("Number of checks that passed.")]
    public int PassedChecks { get; init; }

    [Description("Number of checks that failed.")]
    public int FailedChecks { get; init; }

    [Description("Number of checks with a warning.")]
    public int WarningChecks { get; init; }

    [Description("Titles of the failed checks.")]
    public IReadOnlyList<string> FailedCheckTitles { get; init; } = [];

    [Description("Short plain-text summary in the report language.")]
    public string Summary { get; init; } = "";

    [Description("Email-ready HTML report (inline styles, no scripts or external assets).")]
    public string ReportHtml { get; init; } = "";

    [Description("Key of the evaluated page.")]
    public Guid ContentKey { get; init; }

    [Description("Culture evaluated (lower-case ISO code), or null for invariant pages.")]
    public string? Culture { get; init; }

    [Description("Name of the evaluator configuration used.")]
    public string ConfigName { get; init; } = "";

    [Description("When the evaluation was produced (UTC).")]
    public DateTime EvaluatedAt { get; init; }

    [Description("True when an up-to-date cached result was reused without calling the AI.")]
    public bool FromCache { get; init; }

    [Description("True when the AI response could not be read as a report.")]
    public bool ParseFailed { get; init; }
}
