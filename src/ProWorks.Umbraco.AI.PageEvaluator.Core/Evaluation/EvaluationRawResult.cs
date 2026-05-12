namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

public sealed record EvaluationRawResult(
    EvaluationReport Report,
    string SystemPrompt,
    string UserMessage,
    string AiResponse);
