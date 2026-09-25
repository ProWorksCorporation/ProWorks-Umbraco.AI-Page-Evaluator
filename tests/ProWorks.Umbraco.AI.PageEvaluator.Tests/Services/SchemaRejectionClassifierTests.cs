using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Providers.Errors;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Only a provider rejecting the enforced response schema triggers the one-shot fallback (FR-017).
/// </summary>
public class SchemaRejectionClassifierTests
{
    private static AIProviderException Error(AIProviderErrorCategory category, string raw, string? providerCode = "400")
        => new(new AIProviderErrorInfo(category, "user message", providerCode, raw));

    [Theory]
    [InlineData("Invalid schema for response_format 'pageEvaluatorReport'")]
    [InlineData("Invalid value: 'json_schema' is not supported with this model.")]
    [InlineData("text.format: unsupported for this model")]
    [InlineData("output_config.format is not supported on this model")]
    [InlineData("The provided SCHEMA contains unsupported keywords")]
    public void IsSchemaRejection_ForInvalidRequestMentioningTheSchema(string rawMessage)
        => Assert.True(SchemaRejectionClassifier.IsSchemaRejection(Error(AIProviderErrorCategory.InvalidRequest, rawMessage)));

    [Fact]
    public void IsSchemaRejection_ForTheInvalidJsonSchemaProviderCode()
        => Assert.True(SchemaRejectionClassifier.IsSchemaRejection(
            Error(AIProviderErrorCategory.InvalidRequest, "Bad request", providerCode: "invalid_json_schema")));

    [Theory]
    [InlineData("max_tokens is too large for this model")]
    [InlineData("messages: text content blocks must be non-empty")]
    public void IsNotSchemaRejection_ForUnrelatedInvalidRequests(string rawMessage)
        => Assert.False(SchemaRejectionClassifier.IsSchemaRejection(Error(AIProviderErrorCategory.InvalidRequest, rawMessage)));

    [Theory]
    [InlineData(AIProviderErrorCategory.Transient)]
    [InlineData(AIProviderErrorCategory.RateLimited)]
    [InlineData(AIProviderErrorCategory.Authentication)]
    [InlineData(AIProviderErrorCategory.Unknown)]
    public void IsNotSchemaRejection_ForOtherCategories_EvenWhenTheMessageMentionsASchema(AIProviderErrorCategory category)
        => Assert.False(SchemaRejectionClassifier.IsSchemaRejection(Error(category, "response_format schema problem")));
}
