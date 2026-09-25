using System.Text.Json.Nodes;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Decides whether a JSON Schema can be sent as a <em>strict</em> structured-output schema.
/// </summary>
/// <remarks>
/// Mirrors Umbraco.AI.Prompt's internal <c>AIPromptSchemaCompatibility</c> (Umbraco.AI 17.3.4) so both
/// packages treat property-editor schemas the same way. Only nodes a strict provider genuinely cannot
/// repair are rejected: a boolean schema, a node with no resolvable <c>type</c> (the block editors'
/// "any value" <c>{}</c>), and an array without <c>items</c>. <c>additionalProperties: false</c> and
/// "every property required" are not demanded, because M.E.AI normalises those itself, and the Anthropic
/// adapter rewrites <c>oneOf</c> to <c>anyOf</c> (research R6).
/// </remarks>
internal static class StrictSchemaCompatibility
{
    private static readonly string[] Combinators = ["anyOf", "oneOf", "allOf"];

    public static bool IsStrictRepresentable(JsonNode? schema) => IsNodeRepresentable(schema);

    private static bool IsNodeRepresentable(JsonNode? node)
    {
        if (node is not JsonObject schema)
            return false;

        // A $ref stands in for a named definition; assume it resolves to a representable schema.
        if (schema.ContainsKey("$ref"))
            return true;

        foreach (string combinator in Combinators)
        {
            if (schema[combinator] is JsonArray branches)
                return branches.All(IsNodeRepresentable);
        }

        // enum/const pin the value to literals, so a missing type is fine.
        if (schema.ContainsKey("enum") || schema.ContainsKey("const"))
            return true;

        if (!TryGetTypes(schema, out HashSet<string> types))
            return false;

        if (types.Contains("object") && schema["properties"] is JsonObject properties
            && properties.Any(property => !IsNodeRepresentable(property.Value)))
        {
            return false;
        }

        if (types.Contains("array"))
            return schema["items"] is JsonNode items && IsNodeRepresentable(items);

        return true;
    }

    // `type` may be a single string ("string") or an array of strings (["object", "null"]).
    private static bool TryGetTypes(JsonObject schema, out HashSet<string> types)
    {
        types = new HashSet<string>(StringComparer.Ordinal);
        switch (schema["type"])
        {
            case JsonValue value when value.TryGetValue(out string? single) && single is not null:
                types.Add(single);
                return true;
            case JsonArray array:
                foreach (JsonNode? entry in array)
                {
                    if (entry is JsonValue v && v.TryGetValue(out string? name) && name is not null)
                        types.Add(name);
                }
                return types.Count > 0;
            default:
                return false;
        }
    }
}
