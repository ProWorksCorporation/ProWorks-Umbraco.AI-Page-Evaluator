using System.Text.Json;
using System.Text.Json.Nodes;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>The shape of the value a recommendation asks the model for.</summary>
public enum RecommendationValueKind
{
    /// <summary>Plain text (TextBox, TextArea, Markdown, additional editors).</summary>
    Text,

    /// <summary>Rich text as an HTML markup string.</summary>
    RichText,

    /// <summary>A list of tag strings.</summary>
    Tags,

    /// <summary>A value described by the property editor's own JSON Schema.</summary>
    EditorSchema,
}

/// <summary>
/// Provider-enforced response schemas for evaluations and recommendations (FR-017,
/// specs/003-upgrade-umbraco-17-6/contracts/chat-schemas.md).
/// </summary>
/// <remarks>
/// Every schema has an object root with <c>properties</c> and a <c>required</c> list naming every
/// property, <c>additionalProperties: false</c>, and typed nodes — the shape both the Anthropic
/// (<c>output_config.format</c>) and OpenAI (strict <c>json_schema</c>) adapters accept. Anthropic
/// silently drops a schema whose root lacks <c>properties</c>/<c>required</c> (research R6).
/// Range checks (scores 1–5) stay in the parser; providers move <c>minimum</c>/<c>maximum</c> into
/// descriptions anyway.
/// </remarks>
internal static class ChatSchemas
{
    private static readonly Lazy<JsonElement> EvaluationReportPlain = new(() => BuildEvaluationReport(scoringEnabled: false));
    private static readonly Lazy<JsonElement> EvaluationReportScored = new(() => BuildEvaluationReport(scoringEnabled: true));

    /// <summary>The evaluation-report schema (<c>pageEvaluatorReport</c> / <c>pageEvaluatorReportScored</c>).</summary>
    public static JsonElement EvaluationReport(bool scoringEnabled)
        => scoringEnabled ? EvaluationReportScored.Value : EvaluationReportPlain.Value;

    /// <summary>
    /// The recommendation schema <c>{ "recommendedValue": … }</c>, or <see langword="null"/> when nothing
    /// should be enforced (an editor schema that a strict provider would reject, or none supplied).
    /// </summary>
    public static JsonElement? Recommendation(RecommendationValueKind kind, JsonObject? editorSchema)
    {
        JsonNode? value = kind switch
        {
            RecommendationValueKind.Text => Nullable("string"),
            RecommendationValueKind.RichText => new JsonObject
            {
                ["type"] = new JsonArray("string", "null"),
                ["description"] = "HTML markup",
            },
            RecommendationValueKind.Tags => new JsonObject
            {
                ["type"] = new JsonArray("array", "null"),
                ["items"] = Type("string"),
            },
            RecommendationValueKind.EditorSchema => editorSchema is not null && StrictSchemaCompatibility.IsStrictRepresentable(editorSchema)
                ? editorSchema.DeepClone()
                : null,
            _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, "Unknown recommendation value kind."),
        };

        if (value is null)
            return null;

        return ToElement(StrictObject("pageEvaluatorRecommendation", ("recommendedValue", value)));
    }

    private static JsonElement BuildEvaluationReport(bool scoringEnabled)
    {
        JsonObject check = StrictObject(null,
            ("checkNumber", Type("integer")),
            ("status", new JsonObject { ["type"] = "string", ["enum"] = new JsonArray("Pass", "Fail", "Warn") }),
            ("label", Type("string")),
            ("explanation", Nullable("string")),
            ("propertyAliases", new JsonObject { ["type"] = new JsonArray("array", "null"), ["items"] = Type("string") }));

        var properties = new List<(string, JsonNode)>
        {
            ("score", StrictObject(null, ("passed", Type("integer")), ("total", Type("integer")))),
            ("checks", new JsonObject { ["type"] = "array", ["items"] = check }),
            ("suggestions", Nullable("string")),
        };

        if (scoringEnabled)
        {
            properties.Add(("overallScore", new JsonObject
            {
                ["type"] = new JsonArray("number", "null"),
                ["description"] = "Overall score from 1 to 5; decimals allowed.",
            }));
            properties.Add(("axisScores", new JsonObject
            {
                ["type"] = new JsonArray("array", "null"),
                ["items"] = StrictObject(null,
                    ("name", Type("string")),
                    ("score", new JsonObject { ["type"] = "integer", ["description"] = "Integer score from 1 to 5." }),
                    ("feedback", Nullable("string"))),
            }));
        }

        return ToElement(StrictObject(scoringEnabled ? "pageEvaluatorReportScored" : "pageEvaluatorReport", [.. properties]));
    }

    private static JsonObject StrictObject(string? title, params (string Name, JsonNode Schema)[] properties)
    {
        var schema = new JsonObject();
        if (title is not null)
            schema["title"] = title;
        schema["type"] = "object";
        schema["additionalProperties"] = false;
        schema["required"] = new JsonArray(properties.Select(p => (JsonNode)JsonValue.Create(p.Name)!).ToArray());
        var props = new JsonObject();
        foreach ((string name, JsonNode propertySchema) in properties)
            props[name] = propertySchema;
        schema["properties"] = props;
        return schema;
    }

    private static JsonObject Type(string type) => new() { ["type"] = type };

    private static JsonObject Nullable(string type) => new() { ["type"] = new JsonArray(type, "null") };

    private static JsonElement ToElement(JsonNode node)
    {
        using JsonDocument document = JsonDocument.Parse(node.ToJsonString());
        return document.RootElement.Clone();
    }
}
