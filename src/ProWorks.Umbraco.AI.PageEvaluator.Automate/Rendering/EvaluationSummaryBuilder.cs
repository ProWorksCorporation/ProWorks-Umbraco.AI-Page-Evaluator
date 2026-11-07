using System.Globalization;
using System.Text.RegularExpressions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;

/// <summary>
/// Builds the step's one-line, plain-text <c>summary</c> output (contracts/automate-step.md §6).
/// </summary>
/// <remarks>
/// Plain text is not HTML-encoded: it is meant for subjects, logs and notifications. Bind <c>reportHtml</c> in an
/// HTML email body instead.
/// </remarks>
public static partial class EvaluationSummaryBuilder
{
    /// <summary>The maximum length of the summary.</summary>
    public const int MaxLength = 500;

    /// <summary>Builds the summary in <see cref="EvaluationReportView.Language"/>.</summary>
    public static string Build(IPageEvaluatorTextService text, EvaluationReportView view)
    {
        string language = view.Language;
        EvaluationReport report = view.Report;

        var tokens = new Dictionary<string, string?>
        {
            ["page"] = OneLine(view.PageName),
        };

        string key;
        if (report.ParseFailed)
        {
            key = "summaryParseFailed";
        }
        else
        {
            if (view.ScoringEnabled && report.OverallScore is { } score)
            {
                key = "summaryScored";
                tokens["score"] = view.FormatScore(score);
            }
            else
            {
                key = "summaryUnscored";
            }

            tokens["passed"] = view.Count(CheckStatus.Pass).ToString(CultureInfo.InvariantCulture);
            tokens["failed"] = view.Count(CheckStatus.Fail).ToString(CultureInfo.InvariantCulture);
            tokens["warnings"] = view.Count(CheckStatus.Warn).ToString(CultureInfo.InvariantCulture);
        }

        tokens["verdict"] = text.Localize(view.VerdictKey, language);

        return Truncate(OneLine(text.Localize(key, language, tokens)));
    }

    private static string OneLine(string value) => Whitespace().Replace(value, " ").Trim();

    private static string Truncate(string value)
        => value.Length <= MaxLength ? value : value[..(MaxLength - 1)].TrimEnd() + "…";

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();
}
