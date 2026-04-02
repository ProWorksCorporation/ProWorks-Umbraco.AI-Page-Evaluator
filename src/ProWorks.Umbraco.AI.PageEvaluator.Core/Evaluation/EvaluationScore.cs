namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// Value object representing the overall pass/total score of an evaluation run.
/// </summary>
public sealed record EvaluationScore(int Passed, int Total)
{
    /// <summary>Human-readable score string, e.g. "14/17 checks passed".</summary>
    public string DisplayText => $"{Passed}/{Total} checks passed";
}
