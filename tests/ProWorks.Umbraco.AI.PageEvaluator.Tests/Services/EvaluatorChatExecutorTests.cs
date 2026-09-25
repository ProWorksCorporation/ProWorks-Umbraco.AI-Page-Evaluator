using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Chat;
using Umbraco.AI.Core.InlineChat;
using Umbraco.AI.Core.Models;
using Umbraco.AI.Core.Profiles;
using Umbraco.AI.Core.Providers.Errors;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Enforced response schema with a one-shot fallback (FR-017, research R6, contracts/chat-schemas.md §4).
/// </summary>
/// <remarks>
/// <see cref="AIChatBuilder"/> keeps its configuration in private fields and exposes no public
/// getters, so each captured builder callback is run against a real builder and the relevant
/// fields (<c>_alias</c>, <c>_chatOptions</c>, <c>_outputSchema</c>) are read by reflection.
/// </remarks>
public class EvaluatorChatExecutorTests
{
    private readonly IAIChatService _chatService = Substitute.For<IAIChatService>();
    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly StructuredOutputSupportCache _cache = new();
    private readonly ILogger<EvaluatorChatExecutor> _logger = Substitute.For<ILogger<EvaluatorChatExecutor>>();
    private readonly List<AIChatBuilder> _builders = [];
    private readonly Guid _profileId = Guid.NewGuid();
    private const int ProfileVersion = 7;

    private static readonly JsonElement Schema = JsonDocument.Parse(
        """{"type":"object","additionalProperties":false,"required":["recommendedValue"],"properties":{"recommendedValue":{"type":["string","null"]}}}""").RootElement;

    public EvaluatorChatExecutorTests()
    {
        var profile = new AIProfile
        {
            Alias = "evaluator",
            Name = "Evaluator",
            ConnectionId = Guid.NewGuid(),
            Model = new AIModelRef("openai", "gpt-x"),
        };
        typeof(AIProfile).GetProperty(nameof(AIProfile.Version))!.SetValue(profile, ProfileVersion);
        _profileService.GetProfileAsync(_profileId, Arg.Any<CancellationToken>()).Returns(profile);
    }

    private EvaluatorChatExecutor CreateSut() => new(_chatService, _profileService, _cache, _logger);

    private EvaluatorChatRequest Request(JsonElement? schema = null) => new(
        _profileId,
        "proworks-page-evaluator",
        "ProWorks Page Evaluator",
        "Evaluates page content",
        [new ChatMessage(ChatRole.User, "hi")],
        0f,
        2048,
        schema);

    private void CaptureBuilders()
        => _chatService.GetChatResponseAsync(
                Arg.Do<Action<AIChatBuilder>>(configure =>
                {
                    var builder = new AIChatBuilder();
                    configure(builder);
                    _builders.Add(builder);
                }),
                Arg.Any<IEnumerable<ChatMessage>>(),
                Arg.Any<CancellationToken>());

    private static T? Field<T>(AIChatBuilder builder, string name)
        => (T?)typeof(AIChatBuilder).GetField(name, BindingFlags.Instance | BindingFlags.NonPublic)!.GetValue(builder);

    private static AIProviderException SchemaRejection()
        => new(new AIProviderErrorInfo(AIProviderErrorCategory.InvalidRequest, "Bad request", "invalid_json_schema",
            "Invalid schema for response_format 'json_schema'"));

    [Fact]
    public async Task WithASchema_PassesTheSchema_AndLeavesResponseFormatNull()
    {
        CaptureBuilders();
        _chatService.GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(new ChatResponse(new ChatMessage(ChatRole.Assistant, "{}")));

        await CreateSut().ExecuteAsync(Request(Schema), CancellationToken.None);

        AIChatBuilder builder = Assert.Single(_builders);
        Assert.NotNull(Field<AIOutputSchema>(builder, "_outputSchema"));
        ChatOptions options = Field<ChatOptions>(builder, "_chatOptions")!;
        // A non-null ResponseFormat in WithChatOptions would override the schema (research R6).
        Assert.Null(options.ResponseFormat);
        Assert.Equal(0f, options.Temperature);
        Assert.Equal(2048, options.MaxOutputTokens);
        Assert.NotNull(options.Tools);
        Assert.Empty(options.Tools!);
        Assert.Equal("proworks-page-evaluator", Field<string>(builder, "_alias"));
    }

    [Fact]
    public async Task WithoutASchema_UsesJsonResponseFormat_AndNoOutputSchema()
    {
        CaptureBuilders();
        _chatService.GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(new ChatResponse(new ChatMessage(ChatRole.Assistant, "{}")));

        await CreateSut().ExecuteAsync(Request(schema: null), CancellationToken.None);

        AIChatBuilder builder = Assert.Single(_builders);
        Assert.Null(Field<AIOutputSchema>(builder, "_outputSchema"));
        Assert.Equal(ChatResponseFormat.Json, Field<ChatOptions>(builder, "_chatOptions")!.ResponseFormat);
    }

    [Fact]
    public async Task OnSchemaRejection_RetriesOnceWithoutTheSchema_WarnsAndRemembers()
    {
        CaptureBuilders();
        var ok = new ChatResponse(new ChatMessage(ChatRole.Assistant, "{\"recommendedValue\":\"x\"}"));
        _chatService.GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(_ => throw SchemaRejection(), _ => ok);

        ChatResponse response = await CreateSut().ExecuteAsync(Request(Schema), CancellationToken.None);

        Assert.Same(ok, response);
        Assert.Equal(2, _builders.Count);
        Assert.NotNull(Field<AIOutputSchema>(_builders[0], "_outputSchema"));
        Assert.Null(Field<AIOutputSchema>(_builders[1], "_outputSchema"));
        Assert.Equal(ChatResponseFormat.Json, Field<ChatOptions>(_builders[1], "_chatOptions")!.ResponseFormat);
        Assert.True(_cache.IsKnownUnsupported(_profileId, ProfileVersion));
        _logger.Received(1).Log(LogLevel.Warning, Arg.Any<EventId>(), Arg.Any<object>(), Arg.Any<Exception?>(), Arg.Any<Func<object, Exception?, string>>());
    }

    [Fact]
    public async Task OnANonSchemaInvalidRequest_DoesNotRetry()
    {
        var error = new AIProviderException(new AIProviderErrorInfo(
            AIProviderErrorCategory.InvalidRequest, "Bad request", "400", "max_tokens is too large"));
        _chatService.GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(error);

        var thrown = await Assert.ThrowsAsync<AIProviderException>(() => CreateSut().ExecuteAsync(Request(Schema), CancellationToken.None));

        Assert.Same(error, thrown);
        await _chatService.Received(1).GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>());
        Assert.False(_cache.IsKnownUnsupported(_profileId, ProfileVersion));
    }

    [Fact]
    public async Task WhenTheProfileVersionIsKnownUnsupported_SkipsTheSchema_WithASingleCall()
    {
        CaptureBuilders();
        _cache.MarkUnsupported(_profileId, ProfileVersion);
        _chatService.GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(new ChatResponse(new ChatMessage(ChatRole.Assistant, "{}")));

        await CreateSut().ExecuteAsync(Request(Schema), CancellationToken.None);

        AIChatBuilder builder = Assert.Single(_builders);
        Assert.Null(Field<AIOutputSchema>(builder, "_outputSchema"));
    }

    [Fact]
    public async Task ANewProfileVersion_RetriesTheSchema()
    {
        CaptureBuilders();
        _cache.MarkUnsupported(_profileId, ProfileVersion - 1);
        _chatService.GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(new ChatResponse(new ChatMessage(ChatRole.Assistant, "{}")));

        await CreateSut().ExecuteAsync(Request(Schema), CancellationToken.None);

        Assert.NotNull(Field<AIOutputSchema>(Assert.Single(_builders), "_outputSchema"));
    }

    [Fact]
    public async Task WhenTheRetryAlsoFails_ItsOwnExceptionPropagates()
    {
        var retryError = new AIProviderException(new AIProviderErrorInfo(
            AIProviderErrorCategory.Transient, "Busy", "529", "overloaded"));
        _chatService.GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(
                _ => Task.FromException<ChatResponse>(SchemaRejection()),
                _ => Task.FromException<ChatResponse>(retryError));

        var thrown = await Assert.ThrowsAsync<AIProviderException>(() => CreateSut().ExecuteAsync(Request(Schema), CancellationToken.None));

        Assert.Same(retryError, thrown);
        await _chatService.Received(2).GetChatResponseAsync(Arg.Any<Action<AIChatBuilder>>(), Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<CancellationToken>());
    }
}
