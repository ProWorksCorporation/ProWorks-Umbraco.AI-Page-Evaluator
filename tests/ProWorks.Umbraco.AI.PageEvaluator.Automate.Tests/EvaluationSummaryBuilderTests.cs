using ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// The plain-text <c>summary</c> output (contracts/automate-step.md §6).
/// </summary>
public class EvaluationSummaryBuilderTests
{
    private static readonly IReadOnlyList<CheckResult> Checks =
    [
        new(1, CheckStatus.Pass, "A", null, null),
        new(2, CheckStatus.Pass, "B", null, null),
        new(3, CheckStatus.Pass, "C", null, null),
        new(4, CheckStatus.Fail, "D", null, null),
        new(5, CheckStatus.Warn, "E", null, null),
    ];

    private static EvaluationReportView View(
        EvaluationReport report,
        string pageName = "Home",
        string language = "en",
        bool scoringEnabled = true,
        bool? passed = false,
        decimal? threshold = 3.5m) => new()
        {
            Report = report,
            PageName = pageName,
            Culture = null,
            Language = language,
            ConfigName = "Config",
            EvaluatedAt = DateTime.UtcNow,
            ScoringEnabled = scoringEnabled,
            Passed = passed,
            Threshold = threshold,
        };

    [Fact]
    public void Build_Scored_UsesSummaryScored()
    {
        string summary = EvaluationSummaryBuilder.Build(TestText.Real(),
            View(EvaluationReport.Parsed(null, Checks, null, overallScore: 4)));

        Assert.Equal("Home: overall score 4/5; 3 passed, 1 failed, 1 warnings. Not passed.", summary);
    }

    [Fact]
    public void Build_Unscored_UsesSummaryUnscored()
    {
        string summary = EvaluationSummaryBuilder.Build(TestText.Real(),
            View(EvaluationReport.Parsed(null, Checks, null), scoringEnabled: false, passed: null, threshold: null));

        Assert.Equal("Home: 3 passed, 1 failed, 1 warnings. No pass rule set.", summary);
    }

    [Fact]
    public void Build_ParseFailed_UsesSummaryParseFailed()
    {
        string summary = EvaluationSummaryBuilder.Build(TestText.Real(), View(EvaluationReport.Failed("raw")));

        Assert.Equal("Home: the AI response could not be read as a report. Not passed.", summary);
    }

    [Fact]
    public void Build_ThresholdWithMissingScore_SaysTheScoreIsMissing()
    {
        string summary = EvaluationSummaryBuilder.Build(TestText.Real(),
            View(EvaluationReport.Parsed(null, Checks, null, overallScore: null), passed: false));

        Assert.Equal("Home: 3 passed, 1 failed, 1 warnings. Not passed: the AI gave no overall score.", summary);
    }

    [Fact]
    public void Build_PassesTheTokensAndLanguage()
    {
        string summary = EvaluationSummaryBuilder.Build(new TestText.Echo(),
            View(EvaluationReport.Parsed(null, Checks, null, overallScore: 3.5), language: "da", passed: true));

        Assert.Equal(
            "da:summaryScored[page=Home;score=3,5;passed=3;failed=1;warnings=1;verdict=da:reportVerdictPassed]",
            summary);
    }

    [Fact]
    public void Build_IsLocalized()
    {
        string summary = EvaluationSummaryBuilder.Build(TestText.Real(),
            View(EvaluationReport.Parsed(null, Checks, null, overallScore: 4), language: "de", passed: true));

        Assert.Equal("Home: Gesamtbewertung 4/5; 3 bestanden, 1 fehlgeschlagen, 1 Warnungen. Bestanden.", summary);
    }

    [Fact]
    public void Build_IsAtMost500Characters()
    {
        string summary = EvaluationSummaryBuilder.Build(TestText.Real(),
            View(EvaluationReport.Parsed(null, Checks, null, overallScore: 4), pageName: new string('x', 800)));

        Assert.Equal(500, summary.Length);
        Assert.EndsWith("…", summary);
    }

    [Fact]
    public void Build_IsOnePlainTextLine()
    {
        string summary = EvaluationSummaryBuilder.Build(TestText.Real(),
            View(EvaluationReport.Parsed(null, Checks, null, overallScore: 4), pageName: "Home\r\n  page"));

        Assert.Equal("Home page: overall score 4/5; 3 passed, 1 failed, 1 warnings. Not passed.", summary);
        Assert.DoesNotContain("<", summary);
        Assert.DoesNotContain("&", summary);
    }
}
