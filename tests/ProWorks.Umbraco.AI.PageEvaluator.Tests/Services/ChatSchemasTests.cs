using System.Text.Json;
using System.Text.Json.Nodes;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Enforced response schemas (FR-017, contracts/chat-schemas.md).
/// </summary>
public class ChatSchemasTests
{
    private static JsonObject AsObject(JsonElement element) => JsonNode.Parse(element.GetRawText())!.AsObject();

    private static string[] Required(JsonObject schema)
        => schema["required"]!.AsArray().Select(n => n!.GetValue<string>()).ToArray();

    private static string[] PropertyNames(JsonObject schema)
        => schema["properties"]!.AsObject().Select(p => p.Key).ToArray();

    [Fact]
    public void EvaluationReport_WithoutScoring_HasScoreChecksAndSuggestions_AllRequired()
    {
        JsonObject schema = AsObject(ChatSchemas.EvaluationReport(scoringEnabled: false));

        Assert.Equal("object", schema["type"]!.GetValue<string>());
        Assert.False(schema["additionalProperties"]!.GetValue<bool>());
        Assert.Equal(new[] { "score", "checks", "suggestions" }, PropertyNames(schema));
        Assert.Equal(PropertyNames(schema).OrderBy(x => x), Required(schema).OrderBy(x => x));
    }

    [Fact]
    public void EvaluationReport_WithScoring_AddsOverallScoreAndAxisScores()
    {
        JsonObject schema = AsObject(ChatSchemas.EvaluationReport(scoringEnabled: true));

        Assert.Contains("overallScore", PropertyNames(schema));
        Assert.Contains("axisScores", PropertyNames(schema));
        Assert.Equal(PropertyNames(schema).OrderBy(x => x), Required(schema).OrderBy(x => x));
    }

    [Fact]
    public void EvaluationReport_CheckStatus_IsTheEnumTheParserUnderstands()
    {
        JsonObject schema = AsObject(ChatSchemas.EvaluationReport(scoringEnabled: false));
        JsonObject check = schema["properties"]!["checks"]!["items"]!.AsObject();

        var statuses = check["properties"]!["status"]!["enum"]!.AsArray().Select(n => n!.GetValue<string>());
        Assert.Equal(new[] { "Pass", "Fail", "Warn" }, statuses);
        Assert.Equal(
            new[] { "checkNumber", "status", "label", "explanation", "propertyAliases" }.OrderBy(x => x),
            Required(check).OrderBy(x => x));
    }

    [Theory]
    [InlineData(RecommendationValueKind.Text, "string")]
    [InlineData(RecommendationValueKind.RichText, "string")]
    [InlineData(RecommendationValueKind.Tags, "array")]
    public void Recommendation_WrapsTheValueInARequiredRecommendedValue(RecommendationValueKind kind, string expectedType)
    {
        JsonElement? element = ChatSchemas.Recommendation(kind, editorSchema: null);

        Assert.NotNull(element);
        JsonObject schema = AsObject(element!.Value);
        Assert.Equal(new[] { "recommendedValue" }, Required(schema));
        Assert.False(schema["additionalProperties"]!.GetValue<bool>());
        var types = schema["properties"]!["recommendedValue"]!["type"]!.AsArray().Select(n => n!.GetValue<string>()).ToArray();
        Assert.Equal(new[] { expectedType, "null" }, types);
    }

    [Fact]
    public void Recommendation_EmbedsAStrictRepresentableEditorSchema()
    {
        var editorSchema = JsonNode.Parse("""{"type":"object","properties":{"value":{"type":"string"}}}""")!.AsObject();

        JsonElement? element = ChatSchemas.Recommendation(RecommendationValueKind.EditorSchema, editorSchema);

        Assert.NotNull(element);
        JsonObject schema = AsObject(element!.Value);
        Assert.Equal("object", schema["properties"]!["recommendedValue"]!["type"]!.GetValue<string>());
    }

    [Fact]
    public void Recommendation_ReturnsNull_ForAnEditorSchemaAStrictProviderWouldReject()
    {
        var blockListSchema = JsonNode.Parse("""{"type":"object","properties":{"contentData":{"type":"array","items":{}}}}""")!.AsObject();

        Assert.Null(ChatSchemas.Recommendation(RecommendationValueKind.EditorSchema, blockListSchema));
    }

    [Fact]
    public void Recommendation_ReturnsNull_ForEditorSchemaKindWithoutASchema()
        => Assert.Null(ChatSchemas.Recommendation(RecommendationValueKind.EditorSchema, editorSchema: null));
}
