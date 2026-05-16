namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// The structured result of a single AI evaluation run.
/// Serialised as the response body of <c>POST /page-evaluator/evaluate</c>.
/// Results are cached in <c>umbracoAIEvaluationCache</c>.
/// </summary>
public sealed record EvaluationReport
{
    /// <summary>
    /// True when the AI response could not be parsed into structured form.
    /// When true, <see cref="RawResponse"/> is populated and <see cref="Score"/>/<see cref="Checks"/>
    /// should be treated as empty.
    /// </summary>
    public bool ParseFailed { get; init; }

    /// <summary>Pass/total counts. Null when <see cref="ParseFailed"/> is true.</summary>
    public EvaluationScore? Score { get; init; }

    /// <summary>Ordered list of individual check results.</summary>
    public IReadOnlyList<CheckResult> Checks { get; init; } = [];

    /// <summary>Free-text suggestions block from the AI response. May be null.</summary>
    public string? Suggestions { get; init; }

    /// <summary>
    /// Original AI response text. Populated only when <see cref="ParseFailed"/> is true
    /// so the front-end can display it beneath the warning banner (FR-015).
    /// </summary>
    public string? RawResponse { get; init; }

    /// <summary>
    /// UTC timestamp when this result was cached. Null when freshly computed and not yet persisted.
    /// Populated by the API controller after saving to cache.
    /// </summary>
    public DateTime? CachedAt { get; init; }

    /// <summary>
    /// Overall page score (1-5, decimal allowed) when the config has scoring enabled and the AI
    /// returned a valid value. Null when scoring is disabled, the AI omitted the field, or the
    /// value was outside [1.0, 5.0].
    /// </summary>
    public double? OverallScore { get; init; }

    /// <summary>
    /// Per-dimension axis scores when the config has scoring enabled and the AI returned a
    /// valid array. Null when scoring is disabled or the AI omitted the field.
    /// </summary>
    public IReadOnlyList<AxisScore>? AxisScores { get; init; }

    /// <summary>
    /// Maps each property alias to its Umbraco property editor alias (e.g. "Umbraco.TextBox").
    /// Populated by the API controller at response time — never stored in the evaluation cache.
    /// Null when unavailable (e.g. the document type was deleted after evaluation).
    /// </summary>
    public IReadOnlyDictionary<string, string>? PropertyEditorAliases { get; init; }

    /// <summary>
    /// Maps each property alias to its human-readable name as configured in Umbraco (e.g. "Meta Description").
    /// Populated by the API controller at response time — never stored in the evaluation cache.
    /// Null when unavailable (e.g. the document type was deleted after evaluation).
    /// </summary>
    public IReadOnlyDictionary<string, string>? PropertyNames { get; init; }

    /// <summary>
    /// Whether recommendations are enabled for the active evaluator configuration.
    /// Populated by the API controller at response time — never stored in the evaluation cache.
    /// Defaults to true (recommendations shown) when the config is unavailable.
    /// </summary>
    public bool RecommendationsEnabled { get; init; } = true;

    /// <summary>Creates a successfully parsed report.</summary>
    public static EvaluationReport Parsed(
        EvaluationScore? score,
        IReadOnlyList<CheckResult> checks,
        string? suggestions,
        double? overallScore = null,
        IReadOnlyList<AxisScore>? axisScores = null) =>
        new()
        {
            Score = score,
            Checks = checks,
            Suggestions = suggestions,
            OverallScore = overallScore,
            AxisScores = axisScores,
        };

    /// <summary>Creates a parse-failure report containing only the raw response text.</summary>
    public static EvaluationReport Failed(string rawResponse) =>
        new() { ParseFailed = true, RawResponse = rawResponse };

    /// <summary>Returns a copy of this report with the specified <see cref="CachedAt"/> timestamp.</summary>
    public EvaluationReport WithCachedAt(DateTime cachedAt) => this with { CachedAt = cachedAt };

    /// <summary>
    /// Returns a copy of this report with the specified <see cref="PropertyEditorAliases"/> map attached.
    /// Call this in the controller just before returning — do not store the map in the cache.
    /// </summary>
    public EvaluationReport WithPropertyEditorAliases(IReadOnlyDictionary<string, string> aliases) =>
        this with { PropertyEditorAliases = aliases };

    /// <summary>
    /// Returns a copy of this report with the specified <see cref="PropertyNames"/> map attached.
    /// Call this in the controller just before returning — do not store the map in the cache.
    /// </summary>
    public EvaluationReport WithPropertyNames(IReadOnlyDictionary<string, string> names) =>
        this with { PropertyNames = names };

    /// <summary>
    /// Returns a copy of this report with <see cref="RecommendationsEnabled"/> set to the given value.
    /// Call this in the controller just before returning — do not store in the cache.
    /// </summary>
    public EvaluationReport WithRecommendationsEnabled(bool enabled) =>
        this with { RecommendationsEnabled = enabled };
}
