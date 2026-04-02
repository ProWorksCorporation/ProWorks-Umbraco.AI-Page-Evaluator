using System.Text.RegularExpressions;
using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.AI.Core.Chat;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Blocks;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.Strings;
using Umbraco.Cms.Core.Web;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Orchestrates an AI evaluation run for a content page.
/// Fetches the active evaluator configuration, composes the prompt with profile/context
/// instructions and property data, calls <see cref="IChatClient"/>, and returns a
/// structured <see cref="EvaluationReport"/>.
/// </summary>
public sealed partial class PageEvaluationService : IPageEvaluationService
{
    private readonly IAIEvaluatorConfigService _configService;
    private readonly IAIProfileService _profileService;
    private readonly IAIContextService _contextService;
    private readonly IAIChatClientFactory _chatClientFactory;
    private readonly IUmbracoContextAccessor _umbracoContextAccessor;
    private readonly ILogger<PageEvaluationService> _logger;

    public PageEvaluationService(
        IAIEvaluatorConfigService configService,
        IAIProfileService profileService,
        IAIContextService contextService,
        IAIChatClientFactory chatClientFactory,
        IUmbracoContextAccessor umbracoContextAccessor,
        ILogger<PageEvaluationService> logger)
    {
        _configService = configService;
        _profileService = profileService;
        _contextService = contextService;
        _chatClientFactory = chatClientFactory;
        _umbracoContextAccessor = umbracoContextAccessor;
        _logger = logger;
    }

    public async Task<EvaluationReport> EvaluateAsync(
        Guid nodeId,
        string documentTypeAlias,
        IReadOnlyDictionary<string, object?> properties,
        CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? config = await _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, cancellationToken);
        if (config is null)
            throw new InvalidOperationException($"No active evaluator configuration found for document type '{documentTypeAlias}'.");

        AIProfile? profile = await _profileService.GetProfileAsync(config.ProfileId, cancellationToken);
        if (profile is null)
            throw new InvalidOperationException($"AI profile '{config.ProfileId}' not found.");

        IChatClient chatClient = await _chatClientFactory.CreateClientAsync(profile, cancellationToken);

        IReadOnlyDictionary<string, object?> resolvedProperties = ResolveProperties(nodeId, properties);

        string systemPrompt = await BuildSystemPromptAsync(config, cancellationToken);
        string userMessage = BuildUserMessage(nodeId, documentTypeAlias, resolvedProperties);

        List<ChatMessage> messages =
        [
            new ChatMessage(ChatRole.System, systemPrompt),
            new ChatMessage(ChatRole.User, userMessage),
        ];

        // Pass an explicit empty Tools list so the Umbraco.AI context-retrieval tool
        // (get_context_resource) is not registered on this request. Context content is
        // already injected into the system prompt above; tool-based retrieval would
        // fail due to an argument-type mismatch in the current Umbraco.AI build.
        // MaxOutputTokens: pages with many checks generate large JSON responses; set a
        // generous ceiling to avoid truncated output (default varies by provider/model).
        ChatOptions chatOptions = new() { Tools = [], MaxOutputTokens = 16384 };
        ChatResponse response = await chatClient.GetResponseAsync(messages, chatOptions, cancellationToken);
        string responseText = response.Text ?? string.Empty;

        _logger.LogInformation(
            "[PageEvaluator] Raw AI response for node {NodeId} / {Alias} ({Length} chars):\n{ResponseText}",
            nodeId, documentTypeAlias, responseText.Length, responseText);

        EvaluationReport result = TryParseJson(responseText)
            ?? TryParseMarkdown(responseText)
            ?? EvaluationReport.Failed(responseText);

        if (result.ParseFailed)
            _logger.LogWarning(
                "[PageEvaluator] Parse failed for node {NodeId} / {Alias}. Response was not valid JSON or Markdown checklist.",
                nodeId, documentTypeAlias);
        else
            _logger.LogInformation(
                "[PageEvaluator] Parse succeeded for node {NodeId} / {Alias}. Score: {Passed}/{Total}.",
                nodeId, documentTypeAlias, result.Score?.Passed, result.Score?.Total);

        return result;
    }

    // ---------------------------------------------------------------------------
    // Property resolution
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Returns an LLM-friendly property dictionary for the given content node.
    ///
    /// Strategy:
    ///   1. Fetch the <em>published</em> version of the node via the Umbraco published
    ///      cache and use <see cref="FormatValueForAi"/> to resolve each property —
    ///      the same approach used by Umbraco.AI.Agent internally. This resolves media
    ///      pickers to meaningful metadata (name, alt text, file type), strips HTML from
    ///      rich-text fields, and recursively surfaces Block List / Block Grid / MNTP
    ///      content in a form the AI can understand.
    ///   2. Overlay <em>draft</em> values sent by the back-office for simple text
    ///      properties (non-JSON strings) so that unsaved edits in text boxes / textareas
    ///      are still included in the evaluation.
    ///   3. Fall back to raw draft values when the published cache is unavailable
    ///      or the node has never been published.
    /// </summary>
    private IReadOnlyDictionary<string, object?> ResolveProperties(
        Guid nodeId,
        IReadOnlyDictionary<string, object?> draftProperties)
    {
        if (!_umbracoContextAccessor.TryGetUmbracoContext(out IUmbracoContext? ctx) || ctx.Content is null)
        {
            _logger.LogDebug("[PageEvaluator] No UmbracoContext available — using raw draft properties.");
            return draftProperties;
        }

        IPublishedContent? publishedContent = ctx.Content.GetById(nodeId);
        if (publishedContent is null)
        {
            _logger.LogDebug("[PageEvaluator] Node {NodeId} not found in published cache — using raw draft properties.", nodeId);
            return draftProperties;
        }

        var merged = new Dictionary<string, object?>();

        foreach (IPublishedProperty prop in publishedContent.Properties)
        {
            try
            {
                merged[prop.Alias] = FormatValueForAi(prop.GetValue());
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "[PageEvaluator] Skipping property '{Alias}' — value resolution failed.", prop.Alias);
            }
        }

        // Overlay simple draft text values (e.g. unsaved edits to text boxes, textareas).
        // JSON-shaped values (media pickers, blocks, MNTP) are intentionally left as the
        // resolved published values because the raw editor format is not AI-readable.
        int draftOverrides = 0;
        foreach ((string alias, object? value) in draftProperties)
        {
            if (IsSimpleTextDraft(value))
            {
                merged[alias] = value;
                draftOverrides++;
            }
        }

        _logger.LogDebug("[PageEvaluator] Resolved {Resolved} published properties; {Draft} draft text overrides applied.",
            merged.Count - draftOverrides, draftOverrides);

        return merged;
    }

    // ---------------------------------------------------------------------------
    // LLM property formatting — mirrors what Umbraco.AI.Core.PropertyValueFormatter
    // does internally but using only public Umbraco APIs.
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Converts a typed Umbraco property value into a plain, JSON-serialisable
    /// object that is easy for an LLM to read.
    /// </summary>
    private static object? FormatValueForAi(object? value, int depth = 0)
    {
        if (value is null) return null;
        if (depth > 5) return value.ToString(); // guard against deep block nesting

        // Rich text: strip HTML tags → plain text
        if (value is IHtmlEncodedString html)
            return HtmlTagRegex().Replace(html.ToString() ?? string.Empty, " ").Trim();

        // Media picker (single) — MediaWithCrops extends IPublishedContent, check first
        if (value is MediaWithCrops media)
            return FormatElement(media.Content, depth);

        // Block List
        if (value is BlockListModel blockList)
            return blockList.Select(b => FormatElement(b.Content, depth + 1)).ToList();

        // Block Grid
        if (value is BlockGridModel blockGrid)
            return FormatBlockGrid(blockGrid, depth + 1);

        // Content reference (single) — MNTP single, Content Picker
        if (value is IPublishedContent content)
            return new Dictionary<string, object?> { ["name"] = content.Name, ["contentType"] = content.ContentType.Alias };

        // Media picker (multiple)
        if (value is IEnumerable<MediaWithCrops> mediaList)
            return mediaList.Select(m => FormatElement(m.Content, depth)).ToList();

        // Content references (multiple) — MNTP
        if (value is IEnumerable<IPublishedContent> contentList)
            return contentList.Select(c => (object?)new Dictionary<string, object?> { ["name"] = c.Name, ["contentType"] = c.ContentType.Alias }).ToList();

        // String selections (checkbox list, dropdown)
        if (value is IEnumerable<string> strings)
            return string.Join(", ", strings);

        // Primitives pass through as-is
        if (value is string or bool or int or long or double or decimal or float)
            return value;

        if (value is DateTime dt)
            return dt.ToString("O");

        return value.ToString();
    }

    private static Dictionary<string, object?> FormatElement(IPublishedElement element, int depth)
    {
        var result = new Dictionary<string, object?>();
        result["contentType"] = element.ContentType.Alias;
        if (element is IPublishedContent c) result["name"] = c.Name;

        foreach (IPublishedProperty prop in element.Properties)
        {
            try { result[prop.Alias] = FormatValueForAi(prop.GetValue(), depth + 1); }
            catch { /* skip unresolvable properties */ }
        }
        return result;
    }

    private static List<object?> FormatBlockGrid(BlockGridModel grid, int depth)
    {
        var items = new List<object?>();
        foreach (BlockGridItem item in grid)
        {
            Dictionary<string, object?> block = FormatElement(item.Content, depth);
            if (item.Areas.Any())
            {
                block["areas"] = item.Areas
                    .SelectMany(a => a)
                    .Select(areaItem => (object?)FormatElement(areaItem.Content, depth + 1))
                    .ToList();
            }
            items.Add(block);
        }
        return items;
    }

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex HtmlTagRegex();

    /// <summary>
    /// Returns <see langword="true"/> when <paramref name="value"/> is a plain string
    /// that does not look like serialised JSON (objects / arrays / UDIs).
    /// These are the only draft values worth overlaying on the resolved published data.
    /// </summary>
    private static bool IsSimpleTextDraft(object? value)
    {
        if (value is not string s) return false;
        string trimmed = s.TrimStart();
        return trimmed.Length > 0
            && trimmed[0] != '{'
            && trimmed[0] != '['
            && !trimmed.StartsWith("umb://", StringComparison.OrdinalIgnoreCase);
    }

    // ---------------------------------------------------------------------------
    // Prompt composition
    // ---------------------------------------------------------------------------

    private async Task<string> BuildSystemPromptAsync(
        AIEvaluatorConfig config,
        CancellationToken cancellationToken)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine(config.PromptText);

        // Append context instructions when a context is configured.
        if (config.ContextId.HasValue)
        {
            AIContext? context = await _contextService
                .GetContextAsync(config.ContextId.Value, cancellationToken);

            if (context is not null && !string.IsNullOrWhiteSpace(context.Name))
            {
                sb.AppendLine();
                sb.AppendLine("--- Context ---");
                sb.AppendLine(context.Name);
            }
        }

        // Enforce structured JSON output regardless of the evaluation criteria above.
        sb.AppendLine();
        sb.AppendLine("--- REQUIRED OUTPUT FORMAT ---");
        sb.AppendLine("You MUST respond with ONLY a valid JSON object. Do not include any text, explanation, or markdown outside the JSON object.");
        sb.AppendLine("""
            {
              "score": { "passed": <number>, "total": <number> },
              "checks": [
                { "checkNumber": 1, "status": "Pass|Fail|Warn", "label": "<label>", "explanation": "<explanation or null>" }
              ],
              "suggestions": "<overall suggestions or null>"
            }
            """);

        return sb.ToString().TrimEnd();
    }

    private static string BuildUserMessage(
        Guid nodeId,
        string documentTypeAlias,
        IReadOnlyDictionary<string, object?> properties)
    {
        string propertiesJson = JsonSerializer.Serialize(properties, new JsonSerializerOptions
        {
            WriteIndented = true,
        });

        return $$"""
            Evaluate the following content page.

            Node ID: {{nodeId}}
            Document Type: {{documentTypeAlias}}

            Properties:
            {{propertiesJson}}

            Respond with a structured JSON object in this exact format:
            {
              "score": { "passed": <number>, "total": <number> },
              "checks": [
                { "checkNumber": 1, "status": "Pass|Fail|Warn", "label": "<label>", "explanation": "<text or null>" }
              ],
              "suggestions": "<free-text suggestions or null>"
            }
            """;
    }

    // ---------------------------------------------------------------------------
    // Response parsing: JSON → Markdown → raw fallback
    // ---------------------------------------------------------------------------

    private static EvaluationReport? TryParseJson(string text)
    {
        // Extract JSON from the response — handles preamble text before a code fence.
        string stripped = ExtractJson(text.Trim());

        try
        {
            using JsonDocument doc = JsonDocument.Parse(stripped);
            JsonElement root = doc.RootElement;

            if (!root.TryGetProperty("checks", out JsonElement checksEl))
                return null;

            // Parse score
            EvaluationScore? score = null;
            if (root.TryGetProperty("score", out JsonElement scoreEl))
            {
                if (scoreEl.TryGetProperty("passed", out JsonElement p) &&
                    scoreEl.TryGetProperty("total", out JsonElement t))
                {
                    int passed = p.GetInt32();
                    int total = t.GetInt32();
                    score = new EvaluationScore(passed, total);
                }
            }

            // Parse checks
            List<CheckResult> checks = [];
            foreach (JsonElement checkEl in checksEl.EnumerateArray())
            {
                int checkNumber = checkEl.TryGetProperty("checkNumber", out JsonElement n) ? n.GetInt32() : 0;
                string statusStr = checkEl.TryGetProperty("status", out JsonElement s) ? s.GetString() ?? "Pass" : "Pass";
                string label = checkEl.TryGetProperty("label", out JsonElement l) ? l.GetString() ?? "" : "";
                string? explanation = checkEl.TryGetProperty("explanation", out JsonElement e) && e.ValueKind != JsonValueKind.Null
                    ? e.GetString()
                    : null;

                CheckStatus status = statusStr switch
                {
                    "Fail" => CheckStatus.Fail,
                    "Warn" => CheckStatus.Warn,
                    _ => CheckStatus.Pass,
                };

                checks.Add(new CheckResult(checkNumber, status, label, explanation));
            }

            string? suggestions = null;
            if (root.TryGetProperty("suggestions", out JsonElement sugg) && sugg.ValueKind != JsonValueKind.Null)
                suggestions = sugg.GetString();

            if (score is null && checks.Count == 0)
                return null;

            int passCount = score?.Passed ?? checks.Count(c => c.Status == CheckStatus.Pass);
            int totalCount = score?.Total ?? checks.Count;
            EvaluationScore finalScore = new(passCount, totalCount);

            return EvaluationReport.Parsed(finalScore, checks, suggestions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Extracts a JSON object from arbitrary text.
    /// Handles three cases in priority order:
    /// 1. A ```json … ``` code fence anywhere in the text.
    /// 2. A plain ``` … ``` code fence anywhere in the text.
    /// 3. The substring from the first '{' to the last '}' (bare JSON).
    /// Returns the original text unchanged when none of the patterns match.
    /// </summary>
    private static string ExtractJson(string text)
    {
        // 1 & 2: code fence (```json or ```) — search anywhere in the text.
        int fenceStart = text.IndexOf("```json", StringComparison.OrdinalIgnoreCase);
        if (fenceStart < 0)
            fenceStart = text.IndexOf("```", StringComparison.Ordinal);

        if (fenceStart >= 0)
        {
            int contentStart = text.IndexOf('\n', fenceStart);
            if (contentStart >= 0)
            {
                contentStart++; // skip the newline itself
                // The closing fence must come after the content start.
                int fenceEnd = text.IndexOf("```", contentStart, StringComparison.Ordinal);
                if (fenceEnd > contentStart)
                    return text[contentStart..fenceEnd].Trim();
            }
        }

        // 3: bare JSON — take from first '{' to last '}'.
        int jsonStart = text.IndexOf('{');
        int jsonEnd = text.LastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
            return text[jsonStart..(jsonEnd + 1)].Trim();

        return text;
    }

    /// <summary>
    /// Parses a numbered Markdown list in the format:
    /// <c>N. Status - Label[ - Explanation]</c>
    /// with an optional <c>## Suggestions</c> section below.
    /// </summary>
    private static EvaluationReport? TryParseMarkdown(string text)
    {
        List<CheckResult> checks = [];
        string? suggestions = null;
        bool inSuggestions = false;
        var suggestionLines = new List<string>();

        foreach (string rawLine in text.Split('\n'))
        {
            string line = rawLine.Trim();

            if (line.StartsWith("## Suggestions", StringComparison.OrdinalIgnoreCase) ||
                line.StartsWith("**Suggestions", StringComparison.OrdinalIgnoreCase))
            {
                inSuggestions = true;
                continue;
            }

            if (inSuggestions)
            {
                if (!string.IsNullOrWhiteSpace(line))
                    suggestionLines.Add(line);
                continue;
            }

            // Match: "N. Status - Label[ - Explanation]"
            // Accepts: "1. Pass - Title", "2. Fail - Meta - Empty."
            int dotIdx = line.IndexOf(". ", StringComparison.Ordinal);
            if (dotIdx < 1)
                continue;

            if (!int.TryParse(line[..dotIdx], out int checkNumber))
                continue;

            string rest = line[(dotIdx + 2)..];
            string[] parts = rest.Split(" - ", 3, StringSplitOptions.TrimEntries);
            if (parts.Length < 2)
                continue;

            CheckStatus status = parts[0].ToUpperInvariant() switch
            {
                "FAIL" => CheckStatus.Fail,
                "WARN" or "WARNING" => CheckStatus.Warn,
                _ => CheckStatus.Pass,
            };

            string label = parts[1];
            string? explanation = parts.Length >= 3 ? parts[2] : null;

            checks.Add(new CheckResult(checkNumber, status, label, explanation));
        }

        if (checks.Count == 0)
            return null;

        if (suggestionLines.Count > 0)
            suggestions = string.Join(" ", suggestionLines);

        int passed = checks.Count(c => c.Status == CheckStatus.Pass);
        EvaluationScore score = new(passed, checks.Count);
        return EvaluationReport.Parsed(score, checks, suggestions);
    }
}
