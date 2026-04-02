using System.Text.Json.Serialization;

namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>Result status for a single evaluation check.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CheckStatus
{
    Pass,
    Fail,
    Warn,
}

/// <summary>
/// Value object representing a single check within an <see cref="EvaluationReport"/>.
/// </summary>
public sealed record CheckResult(
    int CheckNumber,
    CheckStatus Status,
    string Label,
    string? Explanation);
