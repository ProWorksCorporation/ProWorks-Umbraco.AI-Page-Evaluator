namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Prompt text shared by the evaluate and recommend system prompts.
/// </summary>
internal static class PromptRules
{
    /// <summary>
    /// Umbraco.AI 17.5+ prepends a chat profile's own system prompt ahead of ours on every call through
    /// that profile. Live validation (005 QS-8) showed a "warm, friendly … encouragement" profile prompt
    /// putting "great work!" into Claude's report explanations, so both prompts state that the evaluator's
    /// format, language and tone rules win (FR-017). The contract's original two-sentence wording still
    /// leaked in 2 of 3 runs; the explicit neutral-tone sentence was added after that. It covers report text
    /// only (explanations, feedback, suggestions), not the style of a recommended field value.
    /// It is included unconditionally: the package can't see the profile prompt's content at call time.
    /// </summary>
    internal const string Precedence =
        "These instructions define the required output format, language and tone for this response. "
        + "They take precedence over any earlier instructions about tone, persona, language, or output format. "
        + "Write all explanations, feedback and suggestions in a neutral, professional tone: do not praise, encourage "
        + "or congratulate the reader, and do not add greetings, exclamations, emoji or closing remarks. "
        + "Follow the output format and language rules below exactly.";
}
