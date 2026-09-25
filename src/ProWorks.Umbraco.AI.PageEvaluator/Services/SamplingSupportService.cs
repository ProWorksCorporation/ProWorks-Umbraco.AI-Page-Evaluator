using Umbraco.AI.Core.Models;
using Umbraco.AI.Core.Profiles;
using Umbraco.AI.Core.Providers;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Answers whether an AI profile's model honours the temperature setting.
/// </summary>
/// <remarks>
/// Umbraco.AI 17.3 silently strips sampling options (<c>Temperature</c>, <c>TopP</c>, …) for models
/// whose provider declares them unsupported (<c>DeclaredSettingsChatClient</c>), so the evaluator's
/// <c>Temperature = 0</c> is ignored on those models and scores may vary between re-runs (FR-014/FR-015).
/// Provider declarations are two-state: a model is reported unsupported only when the provider says so;
/// a missing declaration, provider or capability counts as supported (no notice).
/// </remarks>
public interface ISamplingSupportService
{
    /// <summary>
    /// Returns <see langword="false"/> only when the profile's provider declares that the model rejects
    /// or ignores the temperature setting.
    /// </summary>
    /// <param name="profileId">The Umbraco.AI profile.</param>
    /// <param name="modelIdOverride">
    /// The model that actually served a response (<c>ChatResponse.ModelId</c>), or <see langword="null"/>
    /// to use the profile's configured model.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<bool> IsTemperatureSupportedAsync(Guid profileId, string? modelIdOverride, CancellationToken cancellationToken = default);
}

/// <inheritdoc cref="ISamplingSupportService" />
internal sealed class SamplingSupportService : ISamplingSupportService
{
    private readonly IAIProfileService _profileService;
    private readonly AIProviderCollection _providers;

    public SamplingSupportService(IAIProfileService profileService, AIProviderCollection providers)
    {
        _profileService = profileService;
        _providers = providers;
    }

    public async Task<bool> IsTemperatureSupportedAsync(
        Guid profileId,
        string? modelIdOverride,
        CancellationToken cancellationToken = default)
    {
        AIProfile? profile = await _profileService.GetProfileAsync(profileId, cancellationToken);
        if (profile is null)
            return true;

        IAIProvider? provider = _providers.GetById(profile.Model.ProviderId);
        if (provider is null || !provider.TryGetCapability(out IAIChatCapability? capability) || capability is null)
            return true;

        string modelId = string.IsNullOrWhiteSpace(modelIdOverride) ? profile.Model.ModelId : modelIdOverride;
        AIModelSettingsSupport support = capability.GetSettingsSupport(modelId);

        // Mirrors Umbraco.AI's internal AsProfileSettingKeys() normalisation: declarations may be written as
        // nameof(AIChatProfileSettings.Temperature) ("Temperature") or as the key ("temperature").
        return !support.UnsupportedProfileSettings.Any(setting =>
            string.Equals(setting?.Trim(), AIProfileSettingKeys.Temperature, StringComparison.OrdinalIgnoreCase));
    }
}
