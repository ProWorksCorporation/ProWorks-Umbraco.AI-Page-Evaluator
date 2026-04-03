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
}
