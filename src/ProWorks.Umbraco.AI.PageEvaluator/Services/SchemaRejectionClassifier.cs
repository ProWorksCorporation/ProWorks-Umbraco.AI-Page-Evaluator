using Umbraco.AI.Core.Providers.Errors;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Recognises a provider rejecting the enforced response schema (FR-017, contracts/chat-schemas.md §4).
/// </summary>
/// <remarks>
/// Umbraco.AI reports every 4xx as <see cref="AIProviderErrorCategory.InvalidRequest"/> and has no
/// dedicated "schema unsupported" signal, so this matches the provider code OpenAI uses and the
/// wording both providers use in the raw message. Keep the keyword list here so it can be tested
/// and extended in one place.
/// </remarks>
internal static class SchemaRejectionClassifier
{
    private static readonly string[] RawMessageKeywords =
    [
        "json_schema",
        "response_format",
        "text.format",
        "output_config",
        "schema",
    ];

    public static bool IsSchemaRejection(AIProviderException ex)
    {
        if (ex.Category != AIProviderErrorCategory.InvalidRequest)
            return false;

        if (string.Equals(ex.ProviderCode, "invalid_json_schema", StringComparison.OrdinalIgnoreCase))
            return true;

        string raw = ex.Info.RawMessage ?? string.Empty;
        return RawMessageKeywords.Any(keyword => raw.Contains(keyword, StringComparison.OrdinalIgnoreCase));
    }
}
