namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;

/// <summary>
/// Computes the step's <c>passed</c> output (006 spec FR-021, data-model §6).
/// </summary>
public static class PassRule
{
    /// <summary>
    /// Evaluates the pass rule.
    /// </summary>
    /// <param name="threshold">The pass threshold on the 1–5 scale, or <see langword="null"/>.</param>
    /// <param name="failOnAnyFailedCheck">Whether any failed check fails the page (warnings never do).</param>
    /// <param name="overallScore">The report's overall score, or <see langword="null"/>.</param>
    /// <param name="failedChecks">Number of checks with Fail status.</param>
    /// <param name="parseFailed">Whether the AI response couldn't be read as a report.</param>
    /// <returns>
    /// <see langword="null"/> when neither rule is set; otherwise <see langword="true"/> only when every set rule
    /// holds. A threshold with no overall score never passes, and neither does an unreadable report (it has no
    /// checks, so "no failed checks" would otherwise let it through).
    /// </returns>
    public static bool? Evaluate(decimal? threshold, bool failOnAnyFailedCheck, decimal? overallScore, int failedChecks, bool parseFailed)
    {
        if (threshold is null && !failOnAnyFailedCheck)
            return null;

        if (parseFailed)
            return false;

        if (threshold is not null && overallScore is null)
            return false;

        bool fails = failOnAnyFailedCheck && failedChecks > 0;
        return !fails && (threshold is null || overallScore >= threshold);
    }
}
