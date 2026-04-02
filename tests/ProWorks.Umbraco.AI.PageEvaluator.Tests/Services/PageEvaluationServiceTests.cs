using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Chat;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Unit tests for <see cref="PageEvaluationService"/>.
/// Tests: prompt composition, JSON parse, Markdown parse fallback,
/// raw-response fallback when both fail, and error handling.
/// </summary>
public class PageEvaluationServiceTests
{
    private readonly IAIEvaluatorConfigService _configService = Substitute.For<IAIEvaluatorConfigService>();
    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly IAIContextService _contextService = Substitute.For<IAIContextService>();
    private readonly IAIChatClientFactory _chatClientFactory = Substitute.For<IAIChatClientFactory>();
    private readonly IChatClient _chatClient = Substitute.For<IChatClient>();
    private readonly ILogger<PageEvaluationService> _logger = Substitute.For<ILogger<PageEvaluationService>>();
    private readonly PageEvaluationService _sut;

    private static readonly AIProfile DefaultProfile = new() { Alias = "test", Name = "Test Profile", ConnectionId = Guid.NewGuid() };

    public PageEvaluationServiceTests()
    {
        _profileService.GetProfileAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(DefaultProfile);
        _chatClientFactory.CreateClientAsync(Arg.Any<AIProfile>(), Arg.Any<CancellationToken>())
            .Returns(_chatClient);

        _sut = new PageEvaluationService(_configService, _profileService, _contextService, _chatClientFactory, _logger);
    }

    // ---------------------------------------------------------------------------
    // JSON parse (happy path)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenAiReturnsValidJson_ReturnsParsedReport()
    {
        const string documentTypeAlias = "blogPost";
        var nodeId = Guid.NewGuid();
        var activeConfig = BuildConfig(documentTypeAlias);
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns(activeConfig);

        var jsonResponse = """
            {
              "score": { "passed": 3, "total": 4 },
              "checks": [
                { "checkNumber": 1, "status": "Pass", "label": "Title", "explanation": null },
                { "checkNumber": 2, "status": "Fail", "label": "Meta Description", "explanation": "Empty." },
                { "checkNumber": 3, "status": "Pass", "label": "Featured Image", "explanation": null },
                { "checkNumber": 4, "status": "Warn", "label": "Browser Title", "explanation": "Too long." }
              ],
              "suggestions": "Add meta description."
            }
            """;

        MockChatResponse(jsonResponse);

        EvaluationReport report = await _sut.EvaluateAsync(nodeId, documentTypeAlias, new Dictionary<string, object?>());

        Assert.False(report.ParseFailed);
        Assert.NotNull(report.Score);
        Assert.Equal(3, report.Score.Passed);
        Assert.Equal(4, report.Score.Total);
        Assert.Equal(4, report.Checks.Count);
        Assert.Equal(CheckStatus.Pass, report.Checks[0].Status);
        Assert.Equal(CheckStatus.Fail, report.Checks[1].Status);
        Assert.Equal("Empty.", report.Checks[1].Explanation);
        Assert.Equal(CheckStatus.Warn, report.Checks[3].Status);
        Assert.Equal("Add meta description.", report.Suggestions);
        Assert.Null(report.RawResponse);
    }

    [Fact]
    public async Task EvaluateAsync_WhenJsonEmbeddedInMarkdownFence_ExtractsAndParses()
    {
        const string documentTypeAlias = "blogPost";
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns(BuildConfig(documentTypeAlias));

        // AI sometimes wraps JSON in a markdown code fence.
        var responseWithFence = """
            ```json
            {
              "score": { "passed": 2, "total": 2 },
              "checks": [
                { "checkNumber": 1, "status": "Pass", "label": "Title", "explanation": null },
                { "checkNumber": 2, "status": "Pass", "label": "Summary", "explanation": null }
              ],
              "suggestions": null
            }
            ```
            """;

        MockChatResponse(responseWithFence);

        EvaluationReport report = await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>());

        Assert.False(report.ParseFailed);
        Assert.Equal(2, report.Score!.Passed);
        Assert.Equal(2, report.Checks.Count);
    }

    // ---------------------------------------------------------------------------
    // Markdown parse fallback
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenAiReturnsMarkdown_ParsesMarkdownFallback()
    {
        const string documentTypeAlias = "blogPost";
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns(BuildConfig(documentTypeAlias));

        // Markdown format: numbered list of "status - label[ - explanation]"
        var markdownResponse = """
            ## Evaluation Results

            1. Pass - Title - OK
            2. Fail - Meta Description - Meta description is empty.
            3. Pass - Featured Image
            4. Warn - Browser Title - Title exceeds 60 characters.

            ## Suggestions
            Consider adding internal links.
            """;

        MockChatResponse(markdownResponse);

        EvaluationReport report = await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>());

        Assert.False(report.ParseFailed);
        Assert.NotNull(report.Score);
        Assert.Equal(4, report.Checks.Count);
        Assert.Equal(CheckStatus.Pass, report.Checks[0].Status);
        Assert.Equal("Title", report.Checks[0].Label);
        Assert.Equal(CheckStatus.Fail, report.Checks[1].Status);
        Assert.Equal("Meta description is empty.", report.Checks[1].Explanation);
        Assert.Null(report.Checks[2].Explanation);
        Assert.Contains("Consider adding internal links", report.Suggestions);
    }

    // ---------------------------------------------------------------------------
    // Raw fallback (both parse paths fail)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenBothParsesFail_ReturnsRawResponseWithParseFailed()
    {
        const string documentTypeAlias = "blogPost";
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns(BuildConfig(documentTypeAlias));

        const string unstructuredResponse = "Here is my evaluation: the page looks mostly complete but needs work.";
        MockChatResponse(unstructuredResponse);

        EvaluationReport report = await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>());

        Assert.True(report.ParseFailed);
        Assert.Null(report.Score);
        Assert.Empty(report.Checks);
        Assert.Null(report.Suggestions);
        Assert.Equal(unstructuredResponse, report.RawResponse);
    }

    // ---------------------------------------------------------------------------
    // Prompt composition
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_SystemMessageIncludesEvaluatorPromptText()
    {
        const string documentTypeAlias = "blogPost";
        const string promptText = "You are a strict quality auditor for blog posts.";
        var config = BuildConfig(documentTypeAlias, promptText: promptText);
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns(config);
        MockChatResponse("""{"score":{"passed":1,"total":1},"checks":[{"checkNumber":1,"status":"Pass","label":"T","explanation":null}],"suggestions":null}""");

        await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>());

        await _chatClient.Received(1).GetResponseAsync(
            Arg.Is<IEnumerable<ChatMessage>>(msgs =>
                msgs.Any(m => m.Role == ChatRole.System && m.Text != null && m.Text.Contains(promptText))),
            Arg.Any<ChatOptions?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateAsync_UserMessageContainsPageProperties()
    {
        const string documentTypeAlias = "blogPost";
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns(BuildConfig(documentTypeAlias));
        MockChatResponse("""{"score":{"passed":1,"total":1},"checks":[{"checkNumber":1,"status":"Pass","label":"T","explanation":null}],"suggestions":null}""");

        var properties = new Dictionary<string, object?> { ["title"] = "My Blog Post", ["summary"] = "A summary." };

        await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, properties);

        await _chatClient.Received(1).GetResponseAsync(
            Arg.Is<IEnumerable<ChatMessage>>(msgs =>
                msgs.Any(m => m.Role == ChatRole.User && m.Text != null && m.Text.Contains("title"))),
            Arg.Any<ChatOptions?>(),
            Arg.Any<CancellationToken>());
    }

    // ---------------------------------------------------------------------------
    // Error handling
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenNoActiveConfig_ThrowsInvalidOperationException()
    {
        const string documentTypeAlias = "unknownType";
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns((AIEvaluatorConfig?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>()));
    }

    [Fact]
    public async Task EvaluateAsync_WhenChatClientThrows_PropagatesException()
    {
        const string documentTypeAlias = "blogPost";
        _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
            .Returns(BuildConfig(documentTypeAlias));
        _chatClient.GetResponseAsync(Arg.Any<IEnumerable<ChatMessage>>(), Arg.Any<ChatOptions?>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("AI provider unavailable"));

        await Assert.ThrowsAsync<HttpRequestException>(
            () => _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>()));
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private void MockChatResponse(string text)
    {
        _chatClient.GetResponseAsync(
                Arg.Any<IEnumerable<ChatMessage>>(),
                Arg.Any<ChatOptions?>(),
                Arg.Any<CancellationToken>())
            .Returns(new ChatResponse(new ChatMessage(ChatRole.Assistant, text)));
    }

    private static AIEvaluatorConfig BuildConfig(
        string documentTypeAlias,
        string promptText = "Evaluate this page thoroughly.")
        => new()
        {
            Id = Guid.NewGuid(),
            Name = "Test Evaluator",
            DocumentTypeAlias = documentTypeAlias,
            ProfileId = Guid.NewGuid(),
            PromptText = promptText,
            IsActive = true,
            DateCreated = DateTime.UtcNow,
            DateModified = DateTime.UtcNow,
        };
}
