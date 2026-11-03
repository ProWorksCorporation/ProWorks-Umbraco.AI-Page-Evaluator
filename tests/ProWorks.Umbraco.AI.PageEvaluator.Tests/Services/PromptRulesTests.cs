using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Tripwire for the FR-017 precedence wording (005). The text was validated live in QS-8
/// (specs/005-upgrade-cms-17-8-ai-17-6/quickstart.md): the original two-sentence version still let an
/// Anthropic "friendly tone" profile prompt leak praise into reports, and only the explicit neutral-tone
/// sentence fixed it. If one of these fails, re-run QS-8 live before changing the expectation.
/// </summary>
public class PromptRulesTests
{
    [Theory]
    [InlineData("take precedence over any earlier instructions about tone, persona, language, or output format")]
    [InlineData("neutral, professional tone")]
    [InlineData("do not praise, encourage or congratulate the reader")]
    [InlineData("do not add greetings, exclamations, emoji or closing remarks")]
    [InlineData("Follow the output format and language rules below exactly.")]
    public void Precedence_KeepsTheRulesValidatedInQs8(string rule)
    {
        Assert.Contains(rule, PromptRules.Precedence, StringComparison.Ordinal);
    }

    [Fact]
    public void Precedence_IsASingleParagraph()
    {
        // Both prompts insert it with one AppendLine; a line break would split it from the rules it introduces.
        Assert.DoesNotContain('\n', PromptRules.Precedence);
        Assert.Equal(PromptRules.Precedence.Trim(), PromptRules.Precedence);
    }
}
