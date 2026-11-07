using System.Globalization;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;

/// <summary>
/// Everything the step's <c>summary</c> and <c>reportHtml</c> show (contracts/automate-step.md §5–6).
/// </summary>
public sealed record EvaluationReportView
{
    /// <summary>The evaluation report.</summary>
    public required EvaluationReport Report { get; init; }

    /// <summary>The page's name in the evaluated culture.</summary>
    public required string PageName { get; init; }

    /// <summary>The evaluated culture (lower-case ISO code), or <see langword="null"/> for an invariant page.</summary>
    public string? Culture { get; init; }

    /// <summary>The report language (one of <see cref="ReportLanguageResolver.Supported"/>).</summary>
    public required string Language { get; init; }

    /// <summary>The absolute backoffice link to the page, or <see langword="null"/> to omit it.</summary>
    public string? BackofficeLink { get; init; }

    /// <summary>The evaluator configuration's name.</summary>
    public required string ConfigName { get; init; }

    /// <summary>When the evaluation was produced (UTC).</summary>
    public required DateTime EvaluatedAt { get; init; }

    /// <summary>Whether an up-to-date cached result was reused.</summary>
    public bool FromCache { get; init; }

    /// <summary>Whether the configuration has scoring enabled (the score section is omitted otherwise).</summary>
    public bool ScoringEnabled { get; init; }

    /// <summary>The pass verdict (<see langword="null"/> when no rule is set).</summary>
    public bool? Passed { get; init; }

    /// <summary>The pass threshold, if any.</summary>
    public decimal? Threshold { get; init; }

    internal int Count(CheckStatus status) => Report.Checks.Count(c => c.Status == status);

    /// <summary>The verdict key: "score missing" when a threshold failed only for lack of a score.</summary>
    internal string VerdictKey => Passed switch
    {
        true => "reportVerdictPassed",
        false when Threshold is not null && Report.OverallScore is null && !Report.ParseFailed => "reportVerdictScoreMissing",
        false => "reportVerdictFailed",
        null => "reportVerdictNone",
    };

    /// <summary>Formats a score in the report language's number format (e.g. <c>3.8</c> / <c>3,8</c>).</summary>
    internal string FormatScore(double score)
        => score.ToString("0.##", CultureInfo.GetCultureInfo(ReportLanguageResolver.FileCulture(Language)));
}
