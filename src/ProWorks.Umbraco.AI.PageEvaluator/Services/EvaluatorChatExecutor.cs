using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using Umbraco.AI.Core.Chat;
using Umbraco.AI.Core.InlineChat;
using Umbraco.AI.Core.Profiles;
using Umbraco.AI.Core.Providers.Errors;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>A single evaluator chat call (evaluate or recommend).</summary>
/// <param name="ProfileId">The Umbraco.AI profile to call.</param>
/// <param name="Alias">Inline-chat alias; distinct aliases get distinct audit-log feature identities (FR-019).</param>
/// <param name="Name">Display name for the audit log.</param>
/// <param name="Description">Description for the audit log.</param>
/// <param name="Messages">System + user messages.</param>
/// <param name="Temperature">Requested temperature (Umbraco.AI may strip it for models that reject it).</param>
/// <param name="MaxOutputTokens">Output token ceiling.</param>
/// <param name="Schema">The response schema to enforce, or <see langword="null"/> for plain JSON mode.</param>
public sealed record EvaluatorChatRequest(
    Guid ProfileId,
    string Alias,
    string Name,
    string Description,
    IList<ChatMessage> Messages,
    float? Temperature,
    int MaxOutputTokens,
    JsonElement? Schema);

/// <summary>
/// Runs evaluator chat calls through <see cref="IAIChatService"/> with a provider-enforced response
/// schema and a one-shot fallback (FR-017, research R6).
/// </summary>
public interface IEvaluatorChatExecutor
{
    Task<ChatResponse> ExecuteAsync(EvaluatorChatRequest request, CancellationToken cancellationToken = default);
}

/// <inheritdoc cref="IEvaluatorChatExecutor" />
/// <remarks>
/// <list type="bullet">
/// <item>With a schema, <c>ChatOptions.ResponseFormat</c> is left <see langword="null"/>: Umbraco.AI's
/// options-override middleware lets a non-null value in <c>WithChatOptions</c> win over
/// <c>WithOutputSchema</c>, silently cancelling the schema.</item>
/// <item>If the provider rejects the schema, the call is retried once without it (JSON mode), a warning
/// is logged, and that profile version is remembered so later calls go straight to JSON mode.</item>
/// <item>Any other failure, including a failure of the retry, propagates to the caller's error mapping.</item>
/// </list>
/// </remarks>
internal sealed class EvaluatorChatExecutor : IEvaluatorChatExecutor
{
    private readonly IAIChatService _chatService;
    private readonly IAIProfileService _profileService;
    private readonly IStructuredOutputSupportCache _supportCache;
    private readonly ILogger<EvaluatorChatExecutor> _logger;

    public EvaluatorChatExecutor(
        IAIChatService chatService,
        IAIProfileService profileService,
        IStructuredOutputSupportCache supportCache,
        ILogger<EvaluatorChatExecutor> logger)
    {
        _chatService = chatService;
        _profileService = profileService;
        _supportCache = supportCache;
        _logger = logger;
    }

    public async Task<ChatResponse> ExecuteAsync(EvaluatorChatRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Schema is not JsonElement schema)
            return await SendAsync(request, schema: null, cancellationToken);

        AIProfile? profile = await _profileService.GetProfileAsync(request.ProfileId, cancellationToken);
        int profileVersion = profile?.Version ?? 0;

        if (_supportCache.IsKnownUnsupported(request.ProfileId, profileVersion))
            return await SendAsync(request, schema: null, cancellationToken);

        try
        {
            return await SendAsync(request, schema, cancellationToken);
        }
        catch (AIProviderException ex) when (SchemaRejectionClassifier.IsSchemaRejection(ex))
        {
            _logger.LogWarning(
                ex,
                "[PageEvaluator] Provider rejected enforced response schema for profile {ProfileId} (v{Version}, {ProviderCode}); retrying without enforcement.",
                request.ProfileId, profileVersion, ex.ProviderCode);
            _supportCache.MarkUnsupported(request.ProfileId, profileVersion);
            return await SendAsync(request, schema: null, cancellationToken);
        }
    }

    private Task<ChatResponse> SendAsync(EvaluatorChatRequest request, JsonElement? schema, CancellationToken cancellationToken)
    {
        // Tools = []: context resources are already injected into the system prompt; tool-based
        // retrieval (get_context_resource) is deliberately not offered.
        var options = new ChatOptions
        {
            Tools = [],
            Temperature = request.Temperature,
            MaxOutputTokens = request.MaxOutputTokens,
            ResponseFormat = schema is null ? ChatResponseFormat.Json : null,
        };

        return _chatService.GetChatResponseAsync(
            chat =>
            {
                chat.WithAlias(request.Alias)
                    .WithName(request.Name)
                    .WithDescription(request.Description)
                    .WithProfile(request.ProfileId)
                    .WithChatOptions(options);
                if (schema is JsonElement enforced)
                    chat.WithOutputSchema(AIOutputSchema.FromJsonSchema(enforced));
            },
            request.Messages,
            cancellationToken);
    }
}
