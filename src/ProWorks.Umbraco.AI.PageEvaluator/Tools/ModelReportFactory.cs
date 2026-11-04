using System.Globalization;
using System.Text.Json.Nodes;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tools;

/// <summary>
/// Builds the model-facing report (006 contracts/model-report.md) for the <c>evaluate_page</c> server tool. It must
/// produce the same JSON as the client's <c>toModelReport</c> (<c>src/copilot/model-report.ts</c>) for the same
/// report, key order included; the shared fixture in the client's <c>tests/fixtures/model-report/</c> pins both. The
/// server tool differs only where the contract says so: <c>recommendable</c> is always empty and
/// <c>outOfDateReasons</c> comes from <c>savedSinceEvaluation</c> alone (there is no open editor).
/// Never included: <c>samplingSettingsIgnored</c>, <c>rawResponse</c>, property values, editor aliases, property
/// names and the additional-editor list.
/// </summary>
internal static class ModelReportFactory
{
    /// <summary>Model-facing hint for an out-of-date report (English; identical to the client's <c>OUT_OF_DATE_NOTE</c>).</summary>
    public const string OutOfDateNote =
        "This report may not reflect the latest changes. Offer to run a fresh evaluation before recommending.";

    /// <summary>Model-facing hint for an unreadable AI response (identical to the client's <c>PARSE_FAILED_NOTE</c>).</summary>
    public const string ParseFailedNote = "The AI response couldn't be read as a report. A fresh evaluation may help.";

    private const string SavedSinceEvaluationReason = "savedSinceEvaluation";

    /// <summary>The success report for an <see cref="ContentEvaluationStatus.Ok"/> result.</summary>
    public static JsonObject Create(Guid nodeId, ContentEvaluationResult result)
    {
        EvaluationReport report = result.Report
            ?? throw new ArgumentException("The evaluation result has no report.", nameof(result));

        var outOfDateReasons = new JsonArray();
        if (result.SavedSinceEvaluation || report.SavedSinceEvaluation)
            outOfDateReasons.Add(SavedSinceEvaluationReason);
        bool outOfDate = outOfDateReasons.Count > 0;

        bool parseFailed = report.ParseFailed;
        bool scoringEnabled = result.Config?.ScoringEnabled ?? false;

        JsonObject? scoring = scoringEnabled && !parseFailed
            ? new JsonObject
            {
                ["overallScore"] = report.OverallScore,
                ["axisScores"] = new JsonArray((report.AxisScores ?? [])
                    .Select(axis => (JsonNode?)new JsonObject
                    {
                        ["name"] = axis.Name,
                        ["score"] = axis.Score,
                        ["feedback"] = axis.Feedback,
                    })
                    .ToArray()),
            }
            : null;

        var checks = new JsonArray();
        if (!parseFailed)
        {
            foreach (CheckResult check in report.Checks)
            {
                checks.Add(new JsonObject
                {
                    ["id"] = check.CheckNumber,
                    ["title"] = check.Label,
                    ["status"] = check.Status.ToString(),
                    ["explanation"] = check.Explanation,
                    ["propertyAliases"] = new JsonArray((check.PropertyAliases ?? []).Select(a => (JsonNode?)a).ToArray()),
                });
            }
        }

        var notes = new List<string>();
        if (parseFailed) notes.Add(ParseFailedNote);
        if (outOfDate) notes.Add(OutOfDateNote);

        var model = new JsonObject
        {
            ["success"] = true,
            ["page"] = new JsonObject
            {
                ["nodeId"] = nodeId.ToString("D"),
                ["name"] = result.ContentName,
                ["documentTypeAlias"] = result.DocumentTypeAlias,
                ["culture"] = report.Culture ?? result.Culture?.ToLowerInvariant(),
            },
            ["configName"] = result.Config?.Name,
            ["evaluatedAt"] = ToIsoUtc(report.CachedAt ?? result.CachedAt),
            ["fromCache"] = result.FromCache,
            ["outOfDate"] = outOfDate,
            ["outOfDateReasons"] = outOfDateReasons,
            ["parseFailed"] = parseFailed,
            ["scoring"] = scoring,
            ["checks"] = checks,
            ["suggestions"] = report.Suggestions,
            ["recommendationsEnabled"] = report.RecommendationsEnabled,
            // The Copilot tool lists recommendable fields from the open editor; the server tool has none (contract).
            ["recommendable"] = new JsonArray(),
        };

        if (notes.Count > 0)
            model["note"] = string.Join(' ', notes);

        return model;
    }

    /// <summary><c>{ success: false, error: { code, message } }</c> (contracts/model-report.md "Failure").</summary>
    public static JsonObject Failure(string code, string message) => new()
    {
        ["success"] = false,
        ["error"] = new JsonObject
        {
            ["code"] = code,
            ["message"] = message,
        },
    };

    /// <summary>Like JavaScript's <c>toISOString()</c>: UTC, milliseconds, <c>Z</c>. Unspecified kinds are UTC.</summary>
    private static string? ToIsoUtc(DateTime? value)
    {
        if (value is not DateTime time)
            return null;

        DateTime utc = time.Kind switch
        {
            DateTimeKind.Local => time.ToUniversalTime(),
            DateTimeKind.Unspecified => DateTime.SpecifyKind(time, DateTimeKind.Utc),
            _ => time,
        };
        return utc.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);
    }
}
