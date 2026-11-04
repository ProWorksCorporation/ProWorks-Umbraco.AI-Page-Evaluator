using Umbraco.AI.Core.Profiles;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Answers whether an AI profile has its own system prompt (005-upgrade-cms-17-8-ai-17-6 FR-012/FR-014).
/// </summary>
/// <remarks>
/// Since Umbraco.AI 17.5, <c>AIProfileSystemPromptChatMiddleware</c> prepends a chat profile's
/// <see cref="AIChatProfileSettings.SystemPromptTemplate"/> as the first system message of every chat call
/// through that profile, including the evaluator's, whenever the template is not null or whitespace. It can
/// only be switched off site-wide, so the package never removes it; instead the evaluator configuration form
/// warns administrators (research R2). This service uses the same test as the middleware, so the notice
/// appears exactly when the prompt is actually sent. It never exposes the prompt's text.
/// </remarks>
public interface IProfileSystemPromptService
{
    /// <summary>
    /// Returns <see langword="true"/> when the profile's chat settings have a non-empty system prompt.
    /// An unknown profile, or settings that aren't chat settings, count as having none.
    /// </summary>
    /// <param name="profileId">The Umbraco.AI profile.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<bool> HasSystemPromptAsync(Guid profileId, CancellationToken cancellationToken = default);
}

/// <inheritdoc cref="IProfileSystemPromptService" />
internal sealed class ProfileSystemPromptService : IProfileSystemPromptService
{
    private readonly IAIProfileService _profileService;

    public ProfileSystemPromptService(IAIProfileService profileService)
    {
        _profileService = profileService;
    }

    public async Task<bool> HasSystemPromptAsync(Guid profileId, CancellationToken cancellationToken = default)
    {
        AIProfile? profile = await _profileService.GetProfileAsync(profileId, cancellationToken);
        return profile?.Settings is AIChatProfileSettings { SystemPromptTemplate: var template }
            && !string.IsNullOrWhiteSpace(template);
    }
}
