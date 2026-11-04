using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Unicode;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;

/// <summary>
/// Renders the step's <c>reportHtml</c> output: a self-contained HTML fragment that is safe to bind into Automate's
/// Send Email body, which inserts bound values raw (006 spec FR-023, research R8, contracts/automate-step.md §5).
/// </summary>
/// <remarks>
/// <list type="bullet">
/// <item>Table layout with inline <c>style</c> attributes only: email clients strip <c>&lt;style&gt;</c> blocks and
/// ignore CSS custom properties, so the backoffice design tokens can't be used (plan Complexity Tracking).</item>
/// <item>No scripts, images, stylesheets, web fonts or external URLs other than the backoffice link.</item>
/// <item>Every dynamic string, including localized text (sites can override it), is HTML-encoded. The encoder allows
/// all Unicode ranges so Hindi or Danish text stays readable; the HTML-sensitive characters are always encoded.</item>
/// <item>Fixed colours with at least WCAG AA contrast on white, and the status is always a word as well as a colour.</item>
/// </list>
/// </remarks>
public sealed class EvaluationReportHtmlRenderer
{
    // Contrast on #FFFFFF: text 17.4:1, muted 8.9:1, pass 5.4:1, fail 6.5:1, warn 6.0:1, link 6.6:1.
    private const string TextColour = "#1B1B1B";
    private const string MutedColour = "#4A4A4A";
    private const string BorderColour = "#D0D0D0";
    private const string HeaderBackground = "#F3F3F3";
    private const string PassColour = "#1E7B34";
    private const string FailColour = "#B3261E";
    private const string WarnColour = "#8A5300";
    private const string LinkColour = "#0B57D0";
    private const string FontStack = "Arial, Helvetica, sans-serif";

    private const string CellStyle = $"padding:6px 8px;border-bottom:1px solid {BorderColour};vertical-align:top;text-align:left;";
    private const string HeaderCellStyle = $"padding:6px 8px;border-bottom:1px solid {BorderColour};background-color:{HeaderBackground};vertical-align:top;text-align:left;font-weight:bold;color:{TextColour};";
    private const string SectionHeadingStyle = $"padding:16px 0 6px 0;font-size:16px;font-weight:bold;color:{TextColour};";

    private static readonly HtmlEncoder Encoder = HtmlEncoder.Create(UnicodeRanges.All);

    private readonly IPageEvaluatorTextService _text;

    public EvaluationReportHtmlRenderer(IPageEvaluatorTextService text)
    {
        _text = text;
    }

    /// <summary>Renders the report in <see cref="EvaluationReportView.Language"/>.</summary>
    public string Render(EvaluationReportView view)
    {
        var html = new StringBuilder(4096);

        html.Append($"<table role=\"presentation\" width=\"100%\" style=\"border-collapse:collapse;font-family:{FontStack};font-size:14px;line-height:1.5;color:{TextColour};background-color:#FFFFFF;\" cellpadding=\"0\" cellspacing=\"0\">");

        // 1. Heading: the page name.
        Row(html, $"padding:16px 0 0 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:{MutedColour};", T(view, "reportTitle"));
        Row(html, $"padding:2px 0 8px 0;font-size:22px;font-weight:bold;color:{TextColour};", Encode(view.PageName));

        // 2. Meta line.
        Row(html, $"padding:0 0 12px 0;font-size:13px;color:{MutedColour};", Meta(view));

        // 3. Score and verdict.
        Row(html, "padding:4px 0 8px 0;", Verdict(view));

        // 4. Axis scores.
        if (view.ScoringEnabled && view.Report.AxisScores is { Count: > 0 } axes)
            AxisTable(html, view, axes);

        // 6. Parse failure.
        if (view.Report.ParseFailed)
            Row(html, $"padding:8px 12px;border:1px solid {WarnColour};color:{TextColour};", T(view, "reportParseFailed"));

        // 5. Checks.
        if (view.Report.Checks.Count > 0)
            ChecksTable(html, view);

        // 7. Backoffice link.
        if (!string.IsNullOrEmpty(view.BackofficeLink))
        {
            html.Append("<tr><td style=\"padding:16px 0 8px 0;\">")
                .Append($"<a href=\"{Encode(view.BackofficeLink)}\" style=\"color:{LinkColour};font-weight:bold;text-decoration:underline;\">")
                .Append(T(view, "reportOpenInUmbraco"))
                .Append("</a></td></tr>");
        }

        html.Append("</table>");
        return html.ToString();
    }

    private string Meta(EvaluationReportView view)
    {
        string culture = view.Culture is null ? T(view, "reportInvariant") : Encode(view.Culture);
        string evaluatedAt = Encode(view.EvaluatedAt.ToUniversalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) + " UTC");

        var parts = new List<string>
        {
            $"{T(view, "reportLanguage")}: {culture}",
            $"{T(view, "reportConfiguration")}: {Encode(view.ConfigName)}",
            $"{T(view, "reportEvaluatedAt")}: {evaluatedAt}",
        };
        if (view.FromCache)
            parts.Add(T(view, "reportFromCache"));

        return string.Join(" &#183; ", parts);
    }

    private string Verdict(EvaluationReportView view)
    {
        string colour = view.Passed switch
        {
            true => PassColour,
            false => FailColour,
            null => MutedColour,
        };
        string verdict = $"<span style=\"font-weight:bold;color:{colour};\">{T(view, view.VerdictKey)}</span>";

        if (!view.ScoringEnabled)
            return verdict;

        string score = view.Report.OverallScore is { } overall
            ? T(view, "reportScoreOutOf", new Dictionary<string, string?> { ["score"] = view.FormatScore(overall) })
            : "&#8212;";

        return $"<span style=\"color:{MutedColour};\">{T(view, "reportOverallScore")}:</span> "
               + $"<span style=\"font-size:20px;font-weight:bold;color:{TextColour};\">{score}</span> &#160; "
               + verdict;
    }

    private void AxisTable(StringBuilder html, EvaluationReportView view, IReadOnlyList<AxisScore> axes)
    {
        Row(html, SectionHeadingStyle, T(view, "reportAxisScores"));
        html.Append("<tr><td style=\"padding:0;\">")
            .Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;\">");

        foreach (AxisScore axis in axes)
        {
            string score = T(view, "reportScoreOutOf", new Dictionary<string, string?> { ["score"] = view.FormatScore(axis.Score) });
            html.Append("<tr>")
                .Append($"<td style=\"{CellStyle}font-weight:bold;\">{Encode(axis.Name)}</td>")
                .Append($"<td style=\"{CellStyle}white-space:nowrap;\">{score}</td>")
                .Append($"<td style=\"{CellStyle}color:{MutedColour};\">{Encode(axis.Feedback ?? string.Empty)}</td>")
                .Append("</tr>");
        }

        html.Append("</table></td></tr>");
    }

    private void ChecksTable(StringBuilder html, EvaluationReportView view)
    {
        Row(html, SectionHeadingStyle, T(view, "reportChecks"));
        html.Append("<tr><td style=\"padding:0;\">")
            .Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;\">");

        foreach (CheckResult check in view.Report.Checks)
        {
            (string key, string colour) = check.Status switch
            {
                CheckStatus.Pass => ("reportStatusPass", PassColour),
                CheckStatus.Fail => ("reportStatusFail", FailColour),
                _ => ("reportStatusWarn", WarnColour),
            };

            html.Append("<tr>")
                .Append($"<td style=\"{CellStyle}font-weight:bold;color:{colour};white-space:nowrap;\">{T(view, key)}</td>")
                .Append($"<td style=\"{CellStyle}\"><span style=\"font-weight:bold;color:{TextColour};\">{Encode(check.Label)}</span>");

            if (!string.IsNullOrWhiteSpace(check.Explanation))
                html.Append($"<br><span style=\"color:{MutedColour};\">{Encode(check.Explanation)}</span>");

            html.Append("</td></tr>");
        }

        html.Append("</table></td></tr>");
    }

    private static void Row(StringBuilder html, string style, string content)
        => html.Append($"<tr><td style=\"{style}\">").Append(content).Append("</td></tr>");

    private string T(EvaluationReportView view, string key, IDictionary<string, string?>? tokens = null)
        => Encode(_text.Localize(key, view.Language, tokens));

    private static string Encode(string value) => Encoder.Encode(value);
}
