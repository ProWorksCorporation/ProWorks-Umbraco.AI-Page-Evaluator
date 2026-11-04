using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Models;
using Umbraco.AI.Core.Profiles;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// 005-upgrade-cms-17-8-ai-17-6 FR-012/FR-014 (research R2/R3): Umbraco.AI 17.5+ sends a profile's
/// <c>SystemPromptTemplate</c> ahead of the evaluator's instructions whenever it is not null or whitespace.
/// The service must answer exactly that, and nothing about the prompt's content.
/// </summary>
public class ProfileSystemPromptServiceTests
{
    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly Guid _profileId = Guid.NewGuid();

    private ProfileSystemPromptService CreateSut() => new(_profileService);

    private void GivenProfile(IAIProfileSettings? settings)
        => _profileService.GetProfileAsync(_profileId, Arg.Any<CancellationToken>())
            .Returns(new AIProfile
            {
                Alias = "evaluator",
                Name = "Evaluator",
                ConnectionId = Guid.NewGuid(),
                Model = new AIModelRef("anthropic", "claude-test"),
                Settings = settings,
            });

    [Fact]
    public async Task ReturnsTrue_WhenTheChatProfileHasASystemPrompt()
    {
        GivenProfile(new AIChatProfileSettings { SystemPromptTemplate = "Reply in a friendly tone." });

        Assert.True(await CreateSut().HasSystemPromptAsync(_profileId));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   \n\t")]
    public async Task ReturnsFalse_WhenTheSystemPromptIsEmptyOrWhitespace(string? prompt)
    {
        GivenProfile(new AIChatProfileSettings { SystemPromptTemplate = prompt });

        Assert.False(await CreateSut().HasSystemPromptAsync(_profileId));
    }

    [Fact]
    public async Task ReturnsFalse_WhenTheProfileHasNoSettings()
    {
        GivenProfile(null);

        Assert.False(await CreateSut().HasSystemPromptAsync(_profileId));
    }

    [Fact]
    public async Task ReturnsFalse_WhenTheProfileSettingsAreNotChatSettings()
    {
        GivenProfile(Substitute.For<IAIProfileSettings>());

        Assert.False(await CreateSut().HasSystemPromptAsync(_profileId));
    }

    [Fact]
    public async Task ReturnsFalse_WhenTheProfileDoesNotExist()
    {
        _profileService.GetProfileAsync(_profileId, Arg.Any<CancellationToken>()).Returns((AIProfile?)null);

        Assert.False(await CreateSut().HasSystemPromptAsync(_profileId));
    }
}
