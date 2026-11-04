using System.Text.Json;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// 005-upgrade-cms-17-8-ai-17-6 FR-015 (contracts/prompts-and-parsing.md §1, cases P1–P9).
/// Since Umbraco.AI 17.5 a profile's own system prompt is sent ahead of the evaluator's instructions,
/// so a "friendly" profile can wrap the JSON in prose or extra code blocks. The extractor must still
/// find the right object.
/// </summary>
public class JsonResponseExtractorTests
{
    private static bool HasChecks(JsonElement root) => root.TryGetProperty("checks", out _);

    private static bool HasRecommendedValue(JsonElement root) => root.TryGetProperty("recommendedValue", out _);

    private static string Extract(string text, Func<JsonElement, bool> predicate)
    {
        Assert.True(JsonResponseExtractor.TryExtractObject(text, predicate, out string json), "Expected a JSON object to be extracted.");
        return json;
    }

    private static string RecommendedValueOf(string json)
    {
        using JsonDocument doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("recommendedValue").GetString()!;
    }

    [Fact] // P1
    public void PureJson_IsReturned()
    {
        string json = Extract("""{"checks":[],"suggestions":null}""", HasChecks);

        Assert.Equal("""{"checks":[],"suggestions":null}""", json);
    }

    [Fact] // P2
    public void FriendlyPreambleBeforeBareJson_IsIgnored()
    {
        string json = Extract("Sure! Here's my evaluation:\n{\"checks\":[{\"checkNumber\":1}]}", HasChecks);

        Assert.StartsWith("{\"checks\"", json);
    }

    [Fact] // P3 — failed with the old first-'{' to last-'}' heuristic
    public void TrailingProseContainingBraces_IsNotSwallowed()
    {
        string json = Extract(
            "{\"recommendedValue\":\"A better title\"}\n\nLet me know if you need {more} help!",
            HasRecommendedValue);

        Assert.Equal("A better title", RecommendedValueOf(json));
    }

    [Fact] // P4
    public void PreambleFenceAndClosingRemarks_AreHandled()
    {
        string text = "Here you go:\n```json\n{\"checks\":[]}\n```\nHope that helps!";

        Assert.Equal("{\"checks\":[]}", Extract(text, HasChecks));
    }

    [Fact] // P5 — failed with the old "first fence only" logic
    public void NonJsonFenceBeforeTheJsonFence_IsSkipped()
    {
        string text = "An example:\n```html\n<p>{not json}</p>\n```\nThe answer:\n```json\n{\"recommendedValue\":\"Ny tekst\"}\n```";

        Assert.Equal("Ny tekst", RecommendedValueOf(Extract(text, HasRecommendedValue)));
    }

    [Fact] // P6
    public void UppercaseJsonFence_IsRecognised()
    {
        string text = "```JSON\n{\"checks\":[]}\n```";

        Assert.Equal("{\"checks\":[]}", Extract(text, HasChecks));
    }

    [Fact] // P7
    public void BracesAndEscapedQuotesInsideStrings_DoNotBreakTheScan()
    {
        string text = "Result: {\"recommendedValue\":\"<p class=\\\"x\\\">Use {braces} and } here</p>\"} — done {";

        Assert.Equal("<p class=\"x\">Use {braces} and } here</p>", RecommendedValueOf(Extract(text, HasRecommendedValue)));
    }

    [Fact] // P8
    public void ProseOnly_ReturnsFalse()
    {
        bool found = JsonResponseExtractor.TryExtractObject(
            "Your page looks great overall! I would suggest tightening the introduction.",
            HasChecks,
            out string json);

        Assert.False(found);
        Assert.Equal(string.Empty, json);
    }

    [Fact] // P9
    public void FirstObjectWithoutTheRequiredProperty_IsSkipped()
    {
        string text = "Context: {\"note\":\"ignore me\"}\nAnswer: {\"recommendedValue\":\"Second\"}";

        Assert.Equal("Second", RecommendedValueOf(Extract(text, HasRecommendedValue)));
    }

    [Fact]
    public void JsonArrayAtTheRoot_YieldsTheFirstMatchingObjectInside()
    {
        // Same outcome as the pre-005 first-'{'-to-last-'}' heuristic for a single-element array.
        Assert.Equal("{\"checks\":[]}", Extract("[{\"checks\":[]}]", HasChecks));
    }

    [Fact]
    public void UnbalancedBraces_DoNotThrow()
    {
        Assert.False(JsonResponseExtractor.TryExtractObject("{\"checks\": [ {", HasChecks, out _));
    }

    [Fact]
    public void EmptyText_ReturnsFalse()
    {
        Assert.False(JsonResponseExtractor.TryExtractObject(string.Empty, HasChecks, out _));
    }
}
