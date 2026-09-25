using System.Text.Json;
using System.Text.Json.Nodes;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Parity with Umbraco.AI.Prompt's internal <c>AIPromptSchemaCompatibility</c>: only nodes a strict
/// provider genuinely cannot repair are rejected (untyped / <c>{}</c> nodes, boolean schemas, arrays
/// without <c>items</c>). M.E.AI normalises <c>additionalProperties</c>/<c>required</c> itself.
/// </summary>
public class StrictSchemaCompatibilityTests
{
    private static JsonNode Parse(string json) => JsonNode.Parse(json)!;

    [Theory]
    [InlineData("""{"type":"string"}""")]
    [InlineData("""{"type":["string","null"]}""")]
    [InlineData("""{"type":"object","properties":{"value":{"type":"string"},"label":{"type":"string"}}}""")]
    [InlineData("""{"type":"array","items":{"type":"string"}}""")]
    [InlineData("""{"enum":["a","b"]}""")]
    [InlineData("""{"anyOf":[{"type":"string"},{"type":"null"}]}""")]
    [InlineData("""{"$ref":"#/$defs/x"}""")]
    public void AcceptsStrictRepresentableSchemas(string json)
        => Assert.True(StrictSchemaCompatibility.IsStrictRepresentable(Parse(json)));

    [Theory]
    [InlineData("""{}""")]
    [InlineData("""{"description":"no type"}""")]
    [InlineData("""{"type":"array"}""")]
    [InlineData("""{"type":"object","properties":{"values":{"type":"array","items":{}}}}""")]
    [InlineData("""{"anyOf":[{"type":"string"},{}]}""")]
    [InlineData("""true""")]
    public void RejectsSchemasAStrictProviderCannotRepresent(string json)
        => Assert.False(StrictSchemaCompatibility.IsStrictRepresentable(Parse(json)));

    [Fact]
    public void RejectsNull()
        => Assert.False(StrictSchemaCompatibility.IsStrictRepresentable(null));

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void AcceptsThePackagesOwnEvaluationSchemas(bool scoringEnabled)
    {
        JsonElement schema = ChatSchemas.EvaluationReport(scoringEnabled);
        Assert.True(StrictSchemaCompatibility.IsStrictRepresentable(JsonNode.Parse(schema.GetRawText())));
    }
}
