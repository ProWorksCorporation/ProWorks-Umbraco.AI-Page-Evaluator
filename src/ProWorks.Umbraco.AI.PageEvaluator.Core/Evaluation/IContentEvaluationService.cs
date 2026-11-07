using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;

namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// The node → permission → culture → cache → evaluate flow shared by <c>GET /evaluate/cached</c>,
/// <c>POST /evaluate</c>, the <c>evaluate_page</c> server tool and the Automate step (006 research R1).
/// It owns the evaluation cache read/write (including the legacy invariant-row clean-up and the
/// <see cref="EvaluationCacheEntry.SourceUpdateDate"/> marker) and the response-time decoration of the report.
/// </summary>
/// <remarks>
/// Every method checks, in order: the node exists (<see cref="ContentEvaluationStatus.NodeNotFound"/>), then calls
/// <c>authorize</c> (<see cref="ContentEvaluationStatus.Forbidden"/>), then normalises the culture
/// (<see cref="ContentEvaluationStatus.InvalidCulture"/> / <see cref="ContentEvaluationStatus.CultureNotCreated"/>).
/// Each caller supplies its own permission model through <c>authorize</c>. AI errors
/// (<c>AIProviderException</c>, <c>AIGuardrailBlockedException</c>) and anything thrown by <c>beforeAiCall</c>
/// propagate to the caller.
/// </remarks>
public interface IContentEvaluationService
{
    /// <summary>
    /// Returns the cached report for the node and culture, decorated for the response
    /// (<see cref="ContentEvaluationStatus.NotCached"/> when there is none).
    /// </summary>
    /// <param name="nodeId">The content node key.</param>
    /// <param name="culture">The requested culture; ignored for invariant document types.</param>
    /// <param name="authorize">Called with the node key after the node-exists check; <see langword="false"/> → Forbidden.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<ContentEvaluationResult> GetCachedAsync(
        Guid nodeId,
        string? culture,
        Func<Guid, CancellationToken, Task<bool>> authorize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Evaluates the editor's on-screen values (overlaid on the resolved content), caches the result with
    /// no source marker and returns it decorated.
    /// </summary>
    /// <param name="nodeId">The content node key.</param>
    /// <param name="culture">The requested culture; ignored for invariant document types.</param>
    /// <param name="properties">The editor's current values, keyed by property alias.</param>
    /// <param name="authorize">Called with the node key after the node-exists check; <see langword="false"/> → Forbidden.</param>
    /// <param name="beforeAiCall">
    /// Optional gate called with the active configuration immediately before the AI call. Throwing aborts the
    /// evaluation without an AI call (e.g. the per-user rate limit); the exception propagates.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<ContentEvaluationResult> EvaluateDraftValuesAsync(
        Guid nodeId,
        string? culture,
        IReadOnlyDictionary<string, object?> properties,
        Func<Guid, CancellationToken, Task<bool>> authorize,
        Func<AIEvaluatorConfig, CancellationToken, Task>? beforeAiCall = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Evaluates the node's latest saved draft. With <paramref name="reuseCache"/>, a cached saved-draft result
    /// whose <see cref="EvaluationCacheEntry.SourceUpdateDate"/> equals the node's current <c>UpdateDate</c>
    /// (to the millisecond) is returned instead, with <see cref="ContentEvaluationResult.FromCache"/> set; results
    /// of on-screen evaluations are never reused. A fresh result is cached with the node's <c>UpdateDate</c>
    /// captured before the properties were resolved.
    /// </summary>
    /// <param name="nodeId">The content node key.</param>
    /// <param name="culture">The requested culture; ignored for invariant document types.</param>
    /// <param name="reuseCache">Whether a matching saved-draft result may be reused.</param>
    /// <param name="authorize">Called with the node key after the node-exists check; <see langword="false"/> → Forbidden.</param>
    /// <param name="beforeAiCall">
    /// Optional gate called with the active configuration immediately before the AI call (not when a cached result
    /// is reused). Throwing aborts the evaluation without an AI call; the exception propagates.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<ContentEvaluationResult> EvaluateSavedAsync(
        Guid nodeId,
        string? culture,
        bool reuseCache,
        Func<Guid, CancellationToken, Task<bool>> authorize,
        Func<AIEvaluatorConfig, CancellationToken, Task>? beforeAiCall = null,
        CancellationToken cancellationToken = default);
}

/// <summary>Outcome of an <see cref="IContentEvaluationService"/> call.</summary>
public enum ContentEvaluationStatus
{
    /// <summary>A report is available in <see cref="ContentEvaluationResult.Report"/>.</summary>
    Ok,

    /// <summary>The content node doesn't exist.</summary>
    NodeNotFound,

    /// <summary>The caller's <c>authorize</c> delegate refused access to the node.</summary>
    Forbidden,

    /// <summary>A culture-varying document was requested without a culture, or with one that isn't configured.</summary>
    InvalidCulture,

    /// <summary>The requested culture is configured but the node has no content in it yet.</summary>
    CultureNotCreated,

    /// <summary>No active evaluator configuration exists for the node's document type.</summary>
    NoActiveConfig,

    /// <summary>There is no cached report for the node and culture (<see cref="IContentEvaluationService.GetCachedAsync"/> only).</summary>
    NotCached,
}

/// <summary>Result of an <see cref="IContentEvaluationService"/> call.</summary>
public sealed class ContentEvaluationResult
{
    /// <summary>The outcome; the other members are only meaningful for the statuses noted on them.</summary>
    public required ContentEvaluationStatus Status { get; init; }

    /// <summary>
    /// The report decorated for the response (cachedAt, culture, editor aliases, property names, recommendations
    /// flag, additional editors, savedSinceEvaluation). Set when <see cref="Status"/> is <see cref="ContentEvaluationStatus.Ok"/>.
    /// </summary>
    public EvaluationReport? Report { get; init; }

    /// <summary>The normalised culture (lower-cased ISO code), or <see langword="null"/> for invariant documents.</summary>
    public string? Culture { get; init; }

    /// <summary>UTC time the report was cached (now, for a fresh evaluation).</summary>
    public DateTime? CachedAt { get; init; }

    /// <summary><see langword="true"/> when the report came from the cache rather than a new AI call.</summary>
    public bool FromCache { get; init; }

    /// <summary>
    /// <see langword="true"/> when the page was saved after this report was produced (data-model §1).
    /// Computed at response time; never cached.
    /// </summary>
    public bool SavedSinceEvaluation { get; init; }

    /// <summary>The active evaluator configuration, when one was found.</summary>
    public AIEvaluatorConfig? Config { get; init; }

    /// <summary>The node's document type alias (set once the node is found).</summary>
    public string? DocumentTypeAlias { get; init; }

    /// <summary>The node's name in the evaluated culture, falling back to its invariant name (set once the node is found).</summary>
    public string? ContentName { get; init; }

    /// <summary>English explanation for a non-<see cref="ContentEvaluationStatus.Ok"/> status (log/fallback text; not localized).</summary>
    public string? Message { get; init; }
}
