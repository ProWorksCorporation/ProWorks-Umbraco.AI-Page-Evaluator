using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Tests;
using Umbraco.AI.Core.EditableModels;
using Umbraco.AI.Core.Tests;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Tests;

public class PageEvaluatorTestFeatureTests
{
    private readonly IPageEvaluationService _evaluationService = Substitute.For<IPageEvaluationService>();
    private readonly IAIEvaluatorConfigService _configService = Substitute.For<IAIEvaluatorConfigService>();
    // AITestContextResolver is sealed — use a real instance (it has no dependencies)
    private readonly AITestContextResolver _contextResolver = new AITestContextResolver();
    private readonly IAIEditableModelSchemaBuilder _schemaBuilder = Substitute.For<IAIEditableModelSchemaBuilder>();
    private readonly PageEvaluatorTestFeature _sut;

    public PageEvaluatorTestFeatureTests()
    {
        // PageEvaluatorTestFeature is a Singleton that consumes Scoped services via IServiceScopeFactory.
        // Wire up a scope factory that returns mocks for both scoped services.
        var serviceProvider = Substitute.For<IServiceProvider>();
        serviceProvider.GetService(typeof(IPageEvaluationService)).Returns(_evaluationService);
        serviceProvider.GetService(typeof(IAIEvaluatorConfigService)).Returns(_configService);

        var scope = Substitute.For<IServiceScope>();
        scope.ServiceProvider.Returns(serviceProvider);

        var scopeFactory = Substitute.For<IServiceScopeFactory>();
        scopeFactory.CreateScope().Returns(scope);

        _sut = new PageEvaluatorTestFeature(scopeFactory, _contextResolver, _schemaBuilder);
    }

    [Fact]
    public void Id_IsPageEvaluatorId()
        => Assert.Equal("proworks-page-evaluator", _sut.Id);

    [Fact]
    public void Category_IsProWorks()
        => Assert.Equal("ProWorks", _sut.Category);

    [Fact]
    public async Task ExecuteAsync_WhenConfigExists_ReturnsTranscriptWithMessages()
    {
        var configId = Guid.NewGuid();
        var config = new AIEvaluatorConfig
        {
            Id = configId,
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this.",
        };

        SetupConfigById(configId, config);

        var rawResult = new EvaluationRawResult(
            EvaluationReport.Parsed(new EvaluationScore(2, 2), [], null),
            "System prompt text",
            "User message text",
            """{"score":{"passed":2,"total":2},"checks":[],"suggestions":null}""");
        _evaluationService.EvaluateWithConfigAsync(
                Arg.Any<AIEvaluatorConfig>(),
                Arg.Any<IReadOnlyDictionary<string, object?>>(),
                Arg.Any<CancellationToken>())
            .Returns(rawResult);

        var featureConfig = new PageEvaluatorTestFeatureConfig
        {
            MockPropertiesJson = """{"title":"My Page"}""",
        };
        var test = BuildAITest(configId, featureConfig);

        var transcript = await _sut.ExecuteAsync(test, 1, null, null, null, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, transcript.RunId);
        Assert.NotNull(transcript.Messages);
        Assert.NotEqual(JsonValueKind.Undefined, transcript.Messages!.Value.ValueKind);
        Assert.NotEqual(JsonValueKind.Undefined, transcript.FinalOutput.ValueKind);
    }

    [Fact]
    public async Task ExecuteAsync_WhenConfigNotFound_ThrowsInvalidOperationException()
    {
        var configId = Guid.NewGuid();
        SetupConfigById(configId, null);

        var test = BuildAITest(configId, new PageEvaluatorTestFeatureConfig());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.ExecuteAsync(test, 1, null, null, null, CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_WhenProfileIdOverrideProvided_UsesOverrideProfile()
    {
        var configId = Guid.NewGuid();
        var originalProfileId = Guid.NewGuid();
        var overrideProfileId = Guid.NewGuid();

        var config = new AIEvaluatorConfig
        {
            Id = configId,
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = originalProfileId,
            PromptText = "Evaluate.",
        };
        SetupConfigById(configId, config);

        AIEvaluatorConfig? capturedConfig = null;
        _evaluationService.EvaluateWithConfigAsync(
                Arg.Do<AIEvaluatorConfig>(c => capturedConfig = c),
                Arg.Any<IReadOnlyDictionary<string, object?>>(),
                Arg.Any<CancellationToken>())
            .Returns(new EvaluationRawResult(
                EvaluationReport.Parsed(null, [], null),
                "sys", "usr", "{}"));

        var test = BuildAITest(configId, new PageEvaluatorTestFeatureConfig());

        await _sut.ExecuteAsync(test, 1, overrideProfileId, null, null, CancellationToken.None);

        Assert.NotNull(capturedConfig);
        Assert.Equal(overrideProfileId, capturedConfig!.ProfileId);
    }

    [Fact]
    public async Task ExecuteAsync_WhenGuardrailIdsOverrideProvided_ReplacesGuardrailIds()
    {
        var configId = Guid.NewGuid();
        var guardrailId = Guid.NewGuid();
        var config = new AIEvaluatorConfig
        {
            Id = configId,
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
        };
        SetupConfigById(configId, config);

        AIEvaluatorConfig? capturedConfig = null;
        _evaluationService.EvaluateWithConfigAsync(
                Arg.Do<AIEvaluatorConfig>(c => capturedConfig = c),
                Arg.Any<IReadOnlyDictionary<string, object?>>(),
                Arg.Any<CancellationToken>())
            .Returns(new EvaluationRawResult(
                EvaluationReport.Parsed(null, [], null),
                "sys", "usr", "{}"));

        var test = BuildAITest(configId, new PageEvaluatorTestFeatureConfig());

        await _sut.ExecuteAsync(test, 1, null, null, [guardrailId], CancellationToken.None);

        Assert.NotNull(capturedConfig);
        Assert.NotNull(capturedConfig!.GuardrailIds);
        Assert.Contains(guardrailId, capturedConfig.GuardrailIds!);
    }

    [Fact]
    public async Task ExecuteAsync_WhenEvaluationThrows_ReturnsErrorTranscript()
    {
        var configId = Guid.NewGuid();
        var config = new AIEvaluatorConfig
        {
            Id = configId,
            Name = "Test",
            DocumentTypeAlias = "homePage",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
        };
        SetupConfigById(configId, config);

        _evaluationService.EvaluateWithConfigAsync(
                Arg.Any<AIEvaluatorConfig>(),
                Arg.Any<IReadOnlyDictionary<string, object?>>(),
                Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("AI provider error"));

        var test = BuildAITest(configId, new PageEvaluatorTestFeatureConfig());

        var transcript = await _sut.ExecuteAsync(test, 1, null, null, null, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, transcript.RunId);
        Assert.Contains("AI provider error", transcript.FinalOutput.GetRawText());
    }

    [Fact]
    public void ExtractOutputValue_ReturnsContentFromFinalOutput()
    {
        var transcript = new AITestTranscript
        {
            RunId = Guid.NewGuid(),
            FinalOutput = JsonSerializer.SerializeToElement(new
            {
                content = "the evaluation JSON here",
            }),
        };

        string value = _sut.ExtractOutputValue(transcript);

        Assert.Equal("the evaluation JSON here", value);
    }

    // Helper: set up GetByIdAsync on _configService
    private void SetupConfigById(Guid id, AIEvaluatorConfig? result)
    {
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(result);
    }

    private static AITest BuildAITest(Guid configId, PageEvaluatorTestFeatureConfig featureConfig) =>
        new()
        {
            Alias = "test-alias",
            Name = "Test",
            TestFeatureId = "proworks-page-evaluator",
            TestTargetId = configId,
            TestFeatureConfig = JsonSerializer.SerializeToElement(featureConfig),
        };
}
