using System.Text.Json.Nodes;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.TestData;

/// <summary>
/// Contract with the CMS: the value-schema shapes the recommend endpoint depends on. If a CMS update changes
/// one of these, this fails instead of a live recommendation silently changing behaviour.
/// </summary>
public class CmsValueSchemaContractTests
{
    private static string[] Types(JsonObject schema) => schema["type"] switch
    {
        JsonArray array => array.Select(n => n!.GetValue<string>()).ToArray(),
        JsonValue value => [value.GetValue<string>()],
        _ => [],
    };

    [Theory]
    [InlineData("Umbraco.TextBox")]
    [InlineData("Umbraco.TextArea")]
    [InlineData("Umbraco.MarkdownEditor")]
    public void TextEditors_PublishANullableStringSchema(string editorAlias)
    {
        JsonObject schema = CmsValueSchemas.For(editorAlias);

        Assert.Equal(new[] { "string", "null" }, Types(schema));
        Assert.False(schema.ContainsKey("maxLength"));
    }

    [Theory]
    [InlineData("Umbraco.TextBox")]
    [InlineData("Umbraco.TextArea")]
    public void TextEditors_PublishTheirConfiguredMaxLength(string editorAlias)
    {
        JsonObject schema = CmsValueSchemas.For(editorAlias, maxChars: 60);

        Assert.Equal(60, schema["maxLength"]!.GetValue<int>());
    }

    [Fact]
    public void Tags_PublishesANullableArrayOfStrings()
    {
        JsonObject schema = CmsValueSchemas.Tags();

        Assert.Equal(new[] { "array", "null" }, Types(schema));
        Assert.Equal("string", schema["items"]!["type"]!.GetValue<string>());
    }

    [Fact]
    public void RichText_PublishesTheMarkupAndBlocksStorageObject()
    {
        JsonObject schema = CmsValueSchemas.RichText();

        Assert.Contains("object", Types(schema));
        JsonObject properties = schema["properties"]!.AsObject();
        Assert.True(properties.ContainsKey("markup"));
        Assert.True(properties.ContainsKey("blocks"));
    }
}
