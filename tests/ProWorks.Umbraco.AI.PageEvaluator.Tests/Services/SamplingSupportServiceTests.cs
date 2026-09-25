using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Models;
using Umbraco.AI.Core.Profiles;
using Umbraco.AI.Core.Providers;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// FR-015 / research R8: the variability notice is shown only when the provider declares that the
/// profile's model ignores temperature.
/// </summary>
public class SamplingSupportServiceTests
{
    private const string ProviderId = "anthropic";
    private const string ConfiguredModel = "claude-configured";

    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly IAIChatCapability _capability = Substitute.For<IAIChatCapability>();
    private readonly Guid _profileId = Guid.NewGuid();

    private SamplingSupportService CreateSut(bool providerHasChatCapability = true, bool providerExists = true)
    {
        var provider = Substitute.For<IAIProvider>();
        provider.Id.Returns(ProviderId);
        provider.TryGetCapability(out Arg.Any<IAIChatCapability?>())
            .Returns(call =>
            {
                call[0] = providerHasChatCapability ? _capability : null;
                return providerHasChatCapability;
            });

        var providers = new AIProviderCollection(() => providerExists ? [provider] : []);
        return new SamplingSupportService(_profileService, providers);
    }

    private void GivenProfile()
        => _profileService.GetProfileAsync(_profileId, Arg.Any<CancellationToken>())
            .Returns(new AIProfile
            {
                Alias = "evaluator",
                Name = "Evaluator",
                ConnectionId = Guid.NewGuid(),
                Model = new AIModelRef(ProviderId, ConfiguredModel),
            });

    private void GivenUnsupported(string modelId, params string[] settings)
        => _capability.GetSettingsSupport(modelId)
            .Returns(new AIModelSettingsSupport { UnsupportedProfileSettings = settings });

    [Theory]
    [InlineData("temperature")]
    [InlineData("Temperature")]
    [InlineData(" TEMPERATURE ")]
    public async Task ReturnsFalse_WhenProviderDeclaresTemperatureUnsupported(string declared)
    {
        GivenProfile();
        GivenUnsupported(ConfiguredModel, declared, "topP");

        Assert.False(await CreateSut().IsTemperatureSupportedAsync(_profileId, null));
    }

    [Fact]
    public async Task ReturnsTrue_WhenOnlyOtherSettingsAreUnsupported()
    {
        GivenProfile();
        GivenUnsupported(ConfiguredModel, "topP", "frequencyPenalty");

        Assert.True(await CreateSut().IsTemperatureSupportedAsync(_profileId, null));
    }

    [Fact]
    public async Task ReturnsTrue_WhenProviderDeclaresNothing()
    {
        GivenProfile();
        _capability.GetSettingsSupport(Arg.Any<string>()).Returns(AIModelSettingsSupport.Default);

        Assert.True(await CreateSut().IsTemperatureSupportedAsync(_profileId, null));
    }

    [Fact]
    public async Task ReturnsTrue_WhenProfileIsMissing()
    {
        _profileService.GetProfileAsync(_profileId, Arg.Any<CancellationToken>()).Returns((AIProfile?)null);

        Assert.True(await CreateSut().IsTemperatureSupportedAsync(_profileId, null));
    }

    [Fact]
    public async Task ReturnsTrue_WhenProviderIsNotRegistered()
    {
        GivenProfile();

        Assert.True(await CreateSut(providerExists: false).IsTemperatureSupportedAsync(_profileId, null));
    }

    [Fact]
    public async Task ReturnsTrue_WhenProviderHasNoChatCapability()
    {
        GivenProfile();

        Assert.True(await CreateSut(providerHasChatCapability: false).IsTemperatureSupportedAsync(_profileId, null));
    }

    [Fact]
    public async Task UsesTheModelOverride_WhenOneIsSupplied()
    {
        GivenProfile();
        GivenUnsupported(ConfiguredModel);
        GivenUnsupported("claude-that-served-it", "temperature");

        Assert.False(await CreateSut().IsTemperatureSupportedAsync(_profileId, "claude-that-served-it"));
        _capability.Received(1).GetSettingsSupport("claude-that-served-it");
    }
}
