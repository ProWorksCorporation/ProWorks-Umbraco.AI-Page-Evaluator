namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// One per-user budget for AI evaluation work, shared by <c>POST /evaluate</c>, <c>POST /recommend</c> and the
/// <c>evaluate_page</c> server tool: 10 per minute per key, no queue (006 research R4). The Automate step does not
/// use it. The key is the backoffice user key; callers with no user fall back to the client IP.
/// </summary>
public interface IEvaluationRateLimiter
{
    /// <summary>
    /// Takes one permit from <paramref name="key"/>'s current window.
    /// Returns <see langword="false"/> (without waiting) when the window is exhausted.
    /// </summary>
    bool TryAcquire(string key);
}
