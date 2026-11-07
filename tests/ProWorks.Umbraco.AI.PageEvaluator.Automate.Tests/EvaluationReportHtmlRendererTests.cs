using System.Text.RegularExpressions;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// The email-ready HTML report (006 spec FR-023, research R8, contracts/automate-step.md §5).
/// </summary>
public class EvaluationReportHtmlRendererTests
{
    private const string Link = "https://www.example.com/umbraco/section/content/workspace/document/edit/3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7/da-DK";

    private readonly EvaluationReportHtmlRenderer _sut = new(TestText.Real());

    private static EvaluationReport ScoredReport() => EvaluationReport.Parsed(
        new EvaluationScore(1, 3),
        [
            new CheckResult(1, CheckStatus.Pass, "Has a clear title", "The title says what the page is about.", ["title"]),
            new CheckResult(2, CheckStatus.Fail, "Meta description length", "The description is 300 characters.", ["metaDescription"]),
            new CheckResult(3, CheckStatus.Warn, "Reading level", "Some sentences are long.", null),
        ],
        suggestions: "Shorten the description.",
        overallScore: 3.8,
        axisScores: [new AxisScore("Clarity", 4, "Clear."), new AxisScore("SEO", 3, null)]);

    private static EvaluationReportView View(
        EvaluationReport? report = null,
        string language = "en",
        string pageName = "Home",
        string? culture = "da-dk",
        string? link = Link,
        bool scoringEnabled = true,
        bool? passed = false,
        decimal? threshold = 3.5m,
        bool fromCache = false) => new()
        {
            Report = report ?? ScoredReport(),
            PageName = pageName,
            Culture = culture,
            Language = language,
            BackofficeLink = link,
            ConfigName = "Home Page Scoring Test",
            EvaluatedAt = new DateTime(2026, 11, 3, 14, 5, 0, DateTimeKind.Utc),
            FromCache = fromCache,
            ScoringEnabled = scoringEnabled,
            Passed = passed,
            Threshold = threshold,
        };

    [Fact]
    public void Render_ContainsThePageCultureConfigAndTime()
    {
        string html = _sut.Render(View());

        Assert.Contains("Home", html);
        Assert.Contains("da-dk", html);
        Assert.Contains("Home Page Scoring Test", html);
        Assert.Contains("2026-11-03 14:05 UTC", html);
        Assert.Contains("Page Evaluation", html);
    }

    [Fact]
    public void Render_InvariantPage_ShowsTheAllLanguagesLabel()
    {
        Assert.Contains("All languages", _sut.Render(View(culture: null)));
    }

    [Fact]
    public void Render_ScoringOn_ShowsTheScoreOutOfFive_AndTheVerdict()
    {
        string html = _sut.Render(View());

        Assert.Contains("Overall Score", html);
        Assert.Contains("3.8 / 5", html);
        Assert.Contains("Not passed", html);
    }

    [Fact]
    public void Render_ScoreUsesTheReportLanguagesDecimalSeparator()
    {
        Assert.Contains("3,8 / 5", _sut.Render(View(language: "de")));
    }

    [Fact]
    public void Render_ScoringOff_OmitsTheScore()
    {
        EvaluationReport report = ScoredReport() with { OverallScore = null, AxisScores = null };

        string html = _sut.Render(View(report, scoringEnabled: false, threshold: null, passed: true));

        Assert.DoesNotContain("Overall Score", html);
        Assert.DoesNotContain("/ 5", html);
        Assert.Contains("Passed", html);
    }

    [Fact]
    public void Render_ThresholdWithMissingScore_SaysTheScoreIsMissing()
    {
        EvaluationReport report = ScoredReport() with { OverallScore = null };

        Assert.Contains("the AI gave no overall score", _sut.Render(View(report, passed: false)));
    }

    [Fact]
    public void Render_NoRule_SaysNoPassRule()
    {
        Assert.Contains("No pass rule set", _sut.Render(View(passed: null, threshold: null)));
    }

    [Fact]
    public void Render_ShowsTheAxisTable()
    {
        string html = _sut.Render(View());

        Assert.Contains("Score Breakdown", html);
        Assert.Contains("Clarity", html);
        Assert.Contains("SEO", html);
        Assert.Contains("4 / 5", html);
        Assert.Contains("Clear.", html);
    }

    [Fact]
    public void Render_ListsEveryCheck_WithALocalizedStatusWord_AndItsExplanation()
    {
        string html = _sut.Render(View(language: "da"));

        Assert.Contains("Bestået", html);
        Assert.Contains("Fejlet", html);
        Assert.Contains("Advarsel", html);
        Assert.Contains("Has a clear title", html);
        Assert.Contains("Meta description length", html);
        Assert.Contains("The description is 300 characters.", html);
        Assert.Contains("Sideevaluering", html);
    }

    [Fact]
    public void Render_StatusIsShownAsTextAndColour()
    {
        string html = _sut.Render(View());

        Assert.Matches(new Regex(@"color:#[0-9A-Fa-f]{6}[^""]*""[^>]*>\s*Fail\s*<"), html);
    }

    [Fact]
    public void Render_IncludesTheBackofficeLink()
    {
        string html = _sut.Render(View());

        Assert.Contains($"href=\"{Link}\"", html);
        Assert.Contains("Open in Umbraco", html);
    }

    [Fact]
    public void Render_NoLink_OmitsIt()
    {
        string html = _sut.Render(View(link: null));

        Assert.DoesNotContain("href=", html);
        Assert.DoesNotContain("Open in Umbraco", html);
    }

    [Fact]
    public void Render_FromCache_SaysSo()
    {
        Assert.Contains("Reused from an earlier evaluation", _sut.Render(View(fromCache: true)));
        Assert.DoesNotContain("Reused from an earlier evaluation", _sut.Render(View(fromCache: false)));
    }

    [Fact]
    public void Render_ParseFailure_ShowsTheNotice()
    {
        string html = _sut.Render(View(EvaluationReport.Failed("not json"), passed: false));

        Assert.Contains("could not be formatted as a structured report", html);
        Assert.DoesNotContain("not json", html);
    }

    [Fact]
    public void Render_EncodesPageAndAiText()
    {
        EvaluationReport report = EvaluationReport.Parsed(
            null,
            [
                new CheckResult(1, CheckStatus.Fail, "Title \" onerror=\"alert(1)", "<script>alert('x')</script>", null),
            ],
            null,
            axisScores: [new AxisScore("<b>Axis</b>", 2, "<img src=x onerror=alert(1)>")]);

        string html = _sut.Render(View(report, pageName: "<img src=x onerror=alert(1)>", scoringEnabled: true));

        Assert.DoesNotContain("<script", html);
        Assert.DoesNotContain("<img", html);
        Assert.DoesNotContain("<b>", html);
        Assert.DoesNotContain("\" onerror=\"", html);
        Assert.Contains("&lt;script&gt;", html);
    }

    [Theory]
    [InlineData("en")]
    [InlineData("hi")]
    public void Render_UsesNoForbiddenMarkup(string language)
    {
        string html = _sut.Render(View(language: language)).ToLowerInvariant();

        foreach (string forbidden in new[] { "<style", "<script", "<img", "<link", "var(--", "url(", "class=", "@import", "<iframe" })
            Assert.DoesNotContain(forbidden, html);
    }

    [Fact]
    public void Render_IsOneOuterPresentationTable_WithInlineStylesOnly()
    {
        string html = _sut.Render(View());

        Assert.StartsWith("<table role=\"presentation\" width=\"100%\" style=\"", html);
        Assert.EndsWith("</table>", html);

        // Every element that carries presentation has its own inline style.
        var unstyled = Regex.Matches(html, @"<(table|td|th|p|a|span|div|h1|h2)\b(?![^>]*\bstyle="")[^>]*>")
            .Select(m => m.Value)
            .ToArray();
        Assert.Empty(unstyled);
        Assert.Contains("font-family:Arial, Helvetica, sans-serif", html);
    }
}
