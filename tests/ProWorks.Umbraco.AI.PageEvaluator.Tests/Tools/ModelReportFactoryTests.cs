using System.Text.Json;
using System.Text.Json.Nodes;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Tools;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Tools;

/// <summary>
/// The server's model-facing report (006 contracts/model-report.md) must match the client's
/// <c>toModelReport</c> for the same report, key order included. Both are pinned by the shared fixture in
/// <c>src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/fixtures/model-report/</c>; the server tool differs only in
/// <c>recommendable: []</c> and <c>outOfDateReasons</c> coming from <c>savedSinceEvaluation</c> alone.
/// </summary>
public class ModelReportFactoryTests
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private static string FixtureDirectory()
    {
        // Walk up from the test output folder to the repository root (the folder with the solution file).
        for (DirectoryInfo? dir = new(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, "ProWorks.Umbraco.AI.PageEvaluator.sln")))
                return Path.Combine(dir.FullName, "src", "ProWorks.Umbraco.AI.PageEvaluator.Client", "tests", "fixtures", "model-report");
        }

        throw new DirectoryNotFoundException("Could not find the repository root (ProWorks.Umbraco.AI.PageEvaluator.sln).");
    }

    private static string Fixture(string name) => File.ReadAllText(Path.Combine(FixtureDirectory(), name));

    /// <summary>The fixture's report and context, as the server's <see cref="ContentEvaluationResult"/>.</summary>
    private static (Guid NodeId, ContentEvaluationResult Result) FixtureResult(Func<EvaluationReport, EvaluationReport>? change = null, bool? scoringEnabled = null)
    {
        EvaluationReport report = JsonSerializer.Deserialize<EvaluationReport>(Fixture("report-response.json"), Web)!;
        report = change?.Invoke(report) ?? report;
        JsonNode context = JsonNode.Parse(Fixture("context.json"))!;
        JsonNode page = context["page"]!;

        var result = new ContentEvaluationResult
        {
            Status = ContentEvaluationStatus.Ok,
            Report = report,
            Culture = report.Culture,
            CachedAt = report.CachedAt,
            FromCache = context["fromCache"]!.GetValue<bool>(),
            SavedSinceEvaluation = report.SavedSinceEvaluation,
            Config = new AIEvaluatorConfig
            {
                Name = context["configName"]!.GetValue<string>(),
                DocumentTypeAlias = page["documentTypeAlias"]!.GetValue<string>(),
                ProfileId = Guid.NewGuid(),
                PromptText = "Evaluate.",
                ScoringEnabled = scoringEnabled ?? context["scoringEnabled"]!.GetValue<bool>(),
            },
            DocumentTypeAlias = page["documentTypeAlias"]!.GetValue<string>(),
            ContentName = page["name"]!.GetValue<string>(),
        };
        return (Guid.Parse(page["nodeId"]!.GetValue<string>()), result);
    }

    [Fact]
    public void Create_ProducesTheSharedFixture_KeyOrderIncluded_ExceptTheServerToolDifferences()
    {
        // The client fixture's context has unsavedChanges (Copilot only) and recommendable entries (Copilot only).
        JsonObject expected = JsonNode.Parse(Fixture("expected-model-report.json"))!.AsObject();
        expected["recommendable"] = new JsonArray();
        expected["outOfDateReasons"] = new JsonArray("savedSinceEvaluation");
        (Guid nodeId, ContentEvaluationResult result) = FixtureResult();

        JsonObject actual = ModelReportFactory.Create(nodeId, result);

        Assert.Equal(expected.ToJsonString(), actual.ToJsonString());
    }

    [Fact]
    public void Create_FreshEvaluation_IsNotOutOfDate_AndHasNoNote()
    {
        (Guid nodeId, ContentEvaluationResult result) = FixtureResult(r => r.WithSavedSinceEvaluation(false));
        result = With(result, savedSinceEvaluation: false, fromCache: false);

        JsonObject actual = ModelReportFactory.Create(nodeId, result);

        Assert.False(actual["outOfDate"]!.GetValue<bool>());
        Assert.Empty(actual["outOfDateReasons"]!.AsArray());
        Assert.False(actual["fromCache"]!.GetValue<bool>());
        Assert.False(actual.ContainsKey("note"));
    }

    [Fact]
    public void Create_ParseFailed_HasNoChecksOrScoring_AndTheParseFailedNote()
    {
        (Guid nodeId, ContentEvaluationResult result) = FixtureResult(r => r with { ParseFailed = true, RawResponse = "secret raw text" });

        JsonObject actual = ModelReportFactory.Create(nodeId, result);

        Assert.True(actual["parseFailed"]!.GetValue<bool>());
        Assert.Empty(actual["checks"]!.AsArray());
        Assert.Null(actual["scoring"]);
        Assert.True(actual.ContainsKey("scoring"));
        // Both notes, parse failure first (as the client joins them).
        Assert.Equal(ModelReportFactory.ParseFailedNote + " " + ModelReportFactory.OutOfDateNote, actual["note"]!.GetValue<string>());
        Assert.DoesNotContain("secret raw text", actual.ToJsonString());
    }

    [Fact]
    public void Create_ScoringDisabled_HasNullScoring()
    {
        (Guid nodeId, ContentEvaluationResult result) = FixtureResult(scoringEnabled: false);

        JsonObject actual = ModelReportFactory.Create(nodeId, result);

        Assert.True(actual.ContainsKey("scoring"));
        Assert.Null(actual["scoring"]);
    }

    [Fact]
    public void Create_LeavesOutTheExcludedFields()
    {
        (Guid nodeId, ContentEvaluationResult result) = FixtureResult();

        string json = ModelReportFactory.Create(nodeId, result).ToJsonString();

        foreach (string excluded in new[] { "samplingSettingsIgnored", "rawResponse", "propertyEditorAliases", "propertyNames", "additionalRecommendableEditorAliases", "Umbraco.TextArea" })
            Assert.DoesNotContain(excluded, json);
    }

    [Fact]
    public void Create_FormatsEvaluatedAtLikeJavaScriptToIsoString_FromAnUnspecifiedKind()
    {
        // Providers read DateTime back as Unspecified; it is UTC (CLAUDE.md "Evaluation Cache").
        var unspecified = new DateTime(2026, 11, 3, 10, 15, 0, 123, DateTimeKind.Unspecified);
        (Guid nodeId, ContentEvaluationResult result) = FixtureResult(r => r with { CachedAt = unspecified });

        JsonObject actual = ModelReportFactory.Create(nodeId, result);

        Assert.Equal("2026-11-03T10:15:00.123Z", actual["evaluatedAt"]!.GetValue<string>());
    }

    [Fact]
    public void Failure_HasTheErrorShape()
    {
        JsonObject failure = ModelReportFactory.Failure("notFound", "The page doesn't exist.");

        Assert.Equal("{\"success\":false,\"error\":{\"code\":\"notFound\",\"message\":\"The page doesn\\u0027t exist.\"}}", failure.ToJsonString());
    }

    private static ContentEvaluationResult With(ContentEvaluationResult r, bool savedSinceEvaluation, bool fromCache) => new()
    {
        Status = r.Status,
        Report = r.Report,
        Culture = r.Culture,
        CachedAt = r.CachedAt,
        FromCache = fromCache,
        SavedSinceEvaluation = savedSinceEvaluation,
        Config = r.Config,
        DocumentTypeAlias = r.DocumentTypeAlias,
        ContentName = r.ContentName,
    };
}
