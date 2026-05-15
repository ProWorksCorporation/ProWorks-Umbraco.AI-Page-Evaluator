using System.Collections.Generic;
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
        var checks = new List<CheckResult> { new(1, CheckStatus.Pass, "Title", null, null) };
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
    // WithPropertyEditorAliases
    // ---------------------------------------------------------------------------

    [Fact]
    public void WithPropertyEditorAliases_ReturnsCopyWithAliasesSet()
    {
        var report = EvaluationReport.Parsed(new EvaluationScore(2, 3), [], null);
        var aliases = new Dictionary<string, string> { ["title"] = "Umbraco.TextBox" };

        var result = report.WithPropertyEditorAliases(aliases);

        Assert.NotNull(result.PropertyEditorAliases);
        Assert.Equal("Umbraco.TextBox", result.PropertyEditorAliases["title"]);
        Assert.Equal(report.Score, result.Score);
        Assert.Equal(report.Checks, result.Checks);
    }

    [Fact]
    public void WithPropertyEditorAliases_DoesNotMutateOriginal()
    {
        var report = EvaluationReport.Parsed(new EvaluationScore(1, 1), [], null);
        var aliases = new Dictionary<string, string> { ["title"] = "Umbraco.TextBox" };

        _ = report.WithPropertyEditorAliases(aliases);

        Assert.Null(report.PropertyEditorAliases);
    }

    [Fact]
    public void WithPropertyEditorAliases_WorksOnFailedReport()
    {
        var report = EvaluationReport.Failed("raw output");
        var aliases = new Dictionary<string, string>();

        var result = report.WithPropertyEditorAliases(aliases);

        Assert.NotNull(result.PropertyEditorAliases);
        Assert.Empty(result.PropertyEditorAliases);
        Assert.True(result.ParseFailed);
    }

    // ---------------------------------------------------------------------------
    // WithPropertyNames
    // ---------------------------------------------------------------------------

    [Fact]
    public void WithPropertyNames_ReturnsCopyWithNamesSet()
    {
        var report = EvaluationReport.Parsed(new EvaluationScore(2, 3), [], null);
        var names = new Dictionary<string, string> { ["metaDescription"] = "Meta Description" };

        var result = report.WithPropertyNames(names);

        Assert.NotNull(result.PropertyNames);
        Assert.Equal("Meta Description", result.PropertyNames["metaDescription"]);
        Assert.Equal(report.Score, result.Score);
        Assert.Equal(report.Checks, result.Checks);
    }

    [Fact]
    public void WithPropertyNames_DoesNotMutateOriginal()
    {
        var report = EvaluationReport.Parsed(new EvaluationScore(1, 1), [], null);
        var names = new Dictionary<string, string> { ["title"] = "Page Title" };

        _ = report.WithPropertyNames(names);

        Assert.Null(report.PropertyNames);
    }

    [Fact]
    public void WithPropertyNames_WorksOnFailedReport()
    {
        var report = EvaluationReport.Failed("raw output");
        var names = new Dictionary<string, string>();

        var result = report.WithPropertyNames(names);

        Assert.NotNull(result.PropertyNames);
        Assert.Empty(result.PropertyNames);
        Assert.True(result.ParseFailed);
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

    // ---------------------------------------------------------------------------
    // EvaluationScore.DisplayText
    // ---------------------------------------------------------------------------

    [Fact]
    public void EvaluationScore_DisplayText_FormatsAsPassedSlashTotal()
    {
        var score = new EvaluationScore(3, 5);
        Assert.Equal("3/5 checks passed", score.DisplayText);
    }
}
