using ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// The pass rule (006 spec FR-021, data-model §6, User Story 3).
/// </summary>
public class PassRuleTests
{
    // threshold, failOnAnyFailedCheck, overallScore, failedChecks, expected
    public static TheoryData<decimal?, bool, decimal?, int, bool?> Table => new()
    {
        // Threshold only: at or above passes.
        { 3.5m, false, 4m, 0, true },
        { 3.5m, false, 3.5m, 0, true },
        { 3.5m, false, 3.49m, 0, false },
        { 3.5m, false, 3m, 0, false },
        // Threshold only: failed checks don't matter.
        { 3.5m, false, 4m, 2, true },
        // "Fail on any failed check" only.
        { null, true, null, 0, true },
        { null, true, 2m, 0, true },
        { null, true, 5m, 1, false },
        // Both: both rules apply.
        { 3.5m, true, 4m, 0, true },
        { 3.5m, true, 4m, 1, false },
        { 3.5m, true, 3m, 0, false },
        { 3.5m, true, 3m, 3, false },
        // Neither: no verdict.
        { null, false, 4m, 0, null },
        { null, false, null, 5, null },
        // A threshold with no score never passes.
        { 3.5m, false, null, 0, false },
        { 1m, true, null, 0, false },
    };

    [Theory]
    [MemberData(nameof(Table))]
    public void Evaluate_FollowsTheTable(decimal? threshold, bool failOnAnyFailedCheck, decimal? overallScore, int failedChecks, bool? expected)
    {
        Assert.Equal(expected, PassRule.Evaluate(threshold, failOnAnyFailedCheck, overallScore, failedChecks, parseFailed: false));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(3.0, false)]
    [InlineData(3.0, true)]
    public void Evaluate_WarningsNeverFail(double? threshold, bool failOnAnyFailedCheck)
    {
        // Warnings aren't failed checks: a report of only warnings has failedChecks == 0.
        decimal? t = threshold is null ? null : (decimal)threshold.Value;

        Assert.True(PassRule.Evaluate(t, failOnAnyFailedCheck, overallScore: 3m, failedChecks: 0, parseFailed: false));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(3.0, false)]
    public void Evaluate_UnreadableReport_NeverPasses_WhenARuleIsSet(double? threshold, bool failOnAnyFailedCheck)
    {
        // An unreadable AI response has no checks; "no failed checks" must not let it through.
        decimal? t = threshold is null ? null : (decimal)threshold.Value;

        Assert.False(PassRule.Evaluate(t, failOnAnyFailedCheck, overallScore: null, failedChecks: 0, parseFailed: true));
    }

    [Fact]
    public void Evaluate_UnreadableReport_WithNoRule_HasNoVerdict()
    {
        Assert.Null(PassRule.Evaluate(null, false, null, 0, parseFailed: true));
    }
}
