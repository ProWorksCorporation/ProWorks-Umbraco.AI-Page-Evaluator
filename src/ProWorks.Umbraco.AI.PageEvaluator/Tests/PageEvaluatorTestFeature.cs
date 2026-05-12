using System.Diagnostics;
using System.Text.Json;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.AI.Core.EditableModels;
using Umbraco.AI.Core.Tests;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests;

[AITestFeature("proworks-page-evaluator", "Page Evaluator Test", Category = "ProWorks")]
public sealed class PageEvaluatorTestFeature : AITestFeatureBase<PageEvaluatorTestFeatureConfig>
{
    private readonly IPageEvaluationService _evaluationService;
    private readonly IAIEvaluatorConfigService _configService;

    public override string Description => "Tests a page evaluator configuration with mock page content";

    public PageEvaluatorTestFeature(
        IPageEvaluationService evaluationService,
        IAIEvaluatorConfigService configService,
        AITestContextResolver contextResolver,
        IAIEditableModelSchemaBuilder schemaBuilder)
        : base(contextResolver, schemaBuilder)
    {
        _evaluationService = evaluationService;
        _configService = configService;
    }

    public override async Task<AITestTranscript> ExecuteAsync(
        AITest test,
        int runNumber,
        Guid? profileIdOverride,
        IEnumerable<Guid>? contextIdsOverride,
        IEnumerable<Guid>? guardrailIdsOverride,
        CancellationToken cancellationToken)
    {
        var featureConfig = test.GetTestFeatureConfig<PageEvaluatorTestFeatureConfig>();
        if (featureConfig is null)
            throw new InvalidOperationException("Failed to deserialize PageEvaluatorTestFeatureConfig.");

        AIEvaluatorConfig? config = await _configService.GetByIdAsync(test.TestTargetId, cancellationToken);
        if (config is null)
            throw new InvalidOperationException(
                $"Evaluator configuration '{test.TestTargetId}' not found.");

        if (profileIdOverride.HasValue)
            config.ProfileId = profileIdOverride.Value;
        if (guardrailIdsOverride is not null)
            config.GuardrailIds = guardrailIdsOverride.ToList();

        IReadOnlyDictionary<string, object?> properties;
        try
        {
            properties = JsonSerializer.Deserialize<Dictionary<string, object?>>(
                featureConfig.MockPropertiesJson) ?? new Dictionary<string, object?>();
        }
        catch (JsonException)
        {
            properties = new Dictionary<string, object?>();
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            EvaluationRawResult raw = await _evaluationService.EvaluateWithConfigAsync(
                config, properties, cancellationToken);
            stopwatch.Stop();

            var messages = new[]
            {
                new { role = "system",    content = raw.SystemPrompt },
                new { role = "user",      content = raw.UserMessage },
                new { role = "assistant", content = raw.AiResponse },
            };

            return new AITestTranscript
            {
                RunId = Guid.NewGuid(),
                Messages = JsonSerializer.SerializeToElement(messages),
                FinalOutput = JsonSerializer.SerializeToElement(new
                {
                    content = raw.AiResponse,
                    parseFailed = raw.Report.ParseFailed,
                    checksPassed = raw.Report.Score?.Passed,
                    checksTotal = raw.Report.Score?.Total,
                }),
                Timing = JsonSerializer.SerializeToElement(new
                {
                    totalMs = stopwatch.ElapsedMilliseconds,
                    status = "success",
                }),
            };
        }
        catch (OperationCanceledException)
        {
            stopwatch.Stop();
            throw;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new AITestTranscript
            {
                RunId = Guid.NewGuid(),
                Messages = JsonSerializer.SerializeToElement(new[]
                {
                    new { role = "error", content = ex.Message },
                }),
                FinalOutput = JsonSerializer.SerializeToElement(new
                {
                    error = ex.Message,
                }),
                Timing = JsonSerializer.SerializeToElement(new
                {
                    totalMs = stopwatch.ElapsedMilliseconds,
                    status = "error",
                }),
            };
        }
    }
}
