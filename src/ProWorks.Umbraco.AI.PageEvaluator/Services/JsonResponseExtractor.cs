using System.Text.Json;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Finds the JSON object in an AI reply, for both the evaluation report and recommendations
/// (005-upgrade-cms-17-8-ai-17-6 FR-015, research R5, contracts/prompts-and-parsing.md §1).
/// </summary>
/// <remarks>
/// <para>
/// Since Umbraco.AI 17.5, <c>AIProfileSystemPromptChatMiddleware</c> sends a profile's own system prompt
/// ahead of the evaluator's instructions, so a "friendly" profile can make the model add a preamble,
/// closing remarks that contain braces, or an example code block before the real answer. Where the
/// provider enforces the response schema the reply is pure JSON; this matters on the no-schema fallback
/// path and for providers that don't enforce schemas.
/// </para>
/// <para>
/// Candidates are tried in order, and the first that parses as a JSON object and satisfies the caller's
/// predicate wins: (1) the content of every fenced code block (<c>```json</c> in any case, or a bare
/// <c>```</c>), in order of appearance; (2) every balanced top-level <c>{…}</c> span, scanning left to
/// right. The scan is string-aware, so braces inside JSON string literals and escaped quotes are ignored.
/// </para>
/// </remarks>
internal static class JsonResponseExtractor
{
    private const string Fence = "```";

    /// <summary>
    /// Extracts the first JSON object in <paramref name="text"/> for which <paramref name="predicate"/>
    /// returns <see langword="true"/>.
    /// </summary>
    /// <param name="text">The raw AI reply.</param>
    /// <param name="predicate">Shape check on the parsed root object (e.g. "has a <c>checks</c> property").</param>
    /// <param name="json">The matching object's JSON text, or <see cref="string.Empty"/> when none matched.</param>
    /// <returns><see langword="true"/> when a matching object was found.</returns>
    public static bool TryExtractObject(string text, Func<JsonElement, bool> predicate, out string json)
    {
        json = string.Empty;
        if (string.IsNullOrWhiteSpace(text))
            return false;

        foreach (string candidate in FencedBlocks(text).Concat(BalancedObjects(text)))
        {
            if (Matches(candidate, predicate))
            {
                json = candidate;
                return true;
            }
        }

        return false;
    }

    private static bool Matches(string candidate, Func<JsonElement, bool> predicate)
    {
        try
        {
            using JsonDocument doc = JsonDocument.Parse(candidate);
            return doc.RootElement.ValueKind == JsonValueKind.Object && predicate(doc.RootElement);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    /// <summary>The trimmed content of each fenced code block, in order of appearance.</summary>
    private static IEnumerable<string> FencedBlocks(string text)
    {
        int searchFrom = 0;
        while (searchFrom < text.Length)
        {
            int open = text.IndexOf(Fence, searchFrom, StringComparison.Ordinal);
            if (open < 0)
                yield break;

            // The opener runs to the end of its line (e.g. "```json", "```JSON", "```html").
            int contentStart = text.IndexOf('\n', open);
            if (contentStart < 0)
                yield break;
            contentStart++;

            int close = text.IndexOf(Fence, contentStart, StringComparison.Ordinal);
            if (close < 0)
                yield break;

            yield return text[contentStart..close].Trim();
            searchFrom = close + Fence.Length;
        }
    }

    /// <summary>Each balanced top-level <c>{…}</c> span, ignoring braces inside JSON strings.</summary>
    private static IEnumerable<string> BalancedObjects(string text)
    {
        int depth = 0;
        int start = -1;
        bool inString = false;
        bool escaped = false;

        for (int i = 0; i < text.Length; i++)
        {
            char c = text[i];

            if (inString)
            {
                if (escaped)
                    escaped = false;
                else if (c == '\\')
                    escaped = true;
                else if (c == '"')
                    inString = false;
                continue;
            }

            switch (c)
            {
                case '"' when depth > 0:
                    inString = true;
                    break;
                case '{':
                    if (depth == 0)
                        start = i;
                    depth++;
                    break;
                case '}' when depth > 0:
                    depth--;
                    if (depth == 0 && start >= 0)
                    {
                        yield return text[start..(i + 1)];
                        start = -1;
                    }
                    break;
            }
        }
    }
}
