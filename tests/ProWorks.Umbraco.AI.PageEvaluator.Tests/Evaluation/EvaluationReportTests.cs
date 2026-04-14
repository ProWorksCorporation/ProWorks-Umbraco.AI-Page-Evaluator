using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Evaluation;

public class EvaluationReportTests
{
    // ---------------------------------------------------------------------------
    // WithCachedAt
    // ---------------------------------------------------------------------------

    [Fact]
    public void WithCachedAt_ReturnsCopyWithCachedAtSet()
    {
        var score = new EvaluationScore(3, 4);
        var checks = new List<CheckResult> { new(1, CheckStatus.Pass, "Title", null) };
        var original = EvaluationReport.Parsed(score, checks, "Good job.");

        var cachedAt = new DateTime(2026, 4, 2, 12, 0, 0, DateTimeKind.Utc);
        var copy = original.WithCachedAt(cachedAt);

        Assert.Equal(cachedAt, copy.CachedAt);
        Assert.False(copy.ParseFailed);
        Assert.Equal(3, copy.Score!.Passed);
        Assert.Equal(4, copy.Score.Total);
        Assert.Single(copy.Checks);
        Assert.Equal("Good job.", copy.Suggestions);
        Assert.Null(copy.RawResponse);
    }

    [Fact]
    public void WithCachedAt_DoesNotMutateOriginal()
    {
        var original = EvaluationReport.Parsed(new EvaluationScore(1, 1), [], null);
        var cachedAt = DateTime.UtcNow;

        _ = original.WithCachedAt(cachedAt);

        Assert.Null(original.CachedAt);
    }

    [Fact]
    public void WithCachedAt_WorksOnFailedReport()
    {
        var original = EvaluationReport.Failed("Could not parse.");
        var cachedAt = DateTime.UtcNow;

        var copy = original.WithCachedAt(cachedAt);

        Assert.Equal(cachedAt, copy.CachedAt);
        Assert.True(copy.ParseFailed);
        Assert.Equal("Could not parse.", copy.RawResponse);
    }

    // ---------------------------------------------------------------------------
    // Scoring fields (OverallScore / AxisScores) — additive, default null
    // ---------------------------------------------------------------------------

    [Fact]
    public void Parsed_WithoutScoringArgs_HasNullScoreFields()
    {
        var report = EvaluationReport.Parsed(new EvaluationScore(1, 1), [], null);

        Assert.Null(report.OverallScore);
        Assert.Null(report.AxisScores);
    }

    [Fact]
    public void Parsed_WithScoringArgs_PreservesValuesVerbatim()
    {
        var axis = new List<AxisScore>
        {
            new("Specificity", 4, "Good detail"),
            new("Clarity", 3, null),
        };

        var report = EvaluationReport.Parsed(
            new EvaluationScore(2, 3),
            [],
            null,
            overallScore: 3.8,
            axisScores: axis);

        Assert.Equal(3.8, report.OverallScore);
        Assert.NotNull(report.AxisScores);
        Assert.Equal(2, report.AxisScores!.Count);
        Assert.Equal("Specificity", report.AxisScores[0].Name);
        Assert.Equal(4, report.AxisScores[0].Score);
        Assert.Equal("Good detail", report.AxisScores[0].Feedback);
        Assert.Null(report.AxisScores[1].Feedback);
    }

    [Fact]
    public void Failed_HasNullScoreFields()
    {
        var report = EvaluationReport.Failed("nope");

        Assert.Null(report.OverallScore);
        Assert.Null(report.AxisScores);
    }

    [Fact]
    public void WithCachedAt_PreservesScoreFields()
    {
        var axis = new List<AxisScore> { new("A", 5, null) };
        var original = EvaluationReport.Parsed(
            new EvaluationScore(1, 1), [], null,
            overallScore: 4.2, axisScores: axis);

        var copy = original.WithCachedAt(DateTime.UtcNow);

        Assert.Equal(4.2, copy.OverallScore);
        Assert.Same(axis, copy.AxisScores);
    }
}
