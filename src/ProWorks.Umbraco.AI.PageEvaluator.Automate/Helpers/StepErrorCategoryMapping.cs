using Umbraco.AI.Core.Providers.Errors;
using Umbraco.Automate.Core.Actions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Helpers;

/// <summary>
/// Maps an AI provider failure onto the <see cref="StepRunErrorCategory"/> Automate records for the step and uses to
/// decide whether a retry can help. A copy of Umbraco.AI.Automate's internal <c>StepErrorCategoryMapping</c>
/// (006 research R7), so the Page Evaluator step behaves like Umbraco.AI's own steps.
/// </summary>
/// <remarks>
/// Automate skips the retry budget for terminal categories (validation, configuration, authentication,
/// cancellation) and retries everything else, so a rejected API key or an unknown model must not be reported as
/// <see cref="StepRunErrorCategory.Unknown"/>.
/// </remarks>
internal static class StepErrorCategoryMapping
{
    /// <summary>
    /// Finds the classified <see cref="AIProviderException"/> in the exception chain (following
    /// <see cref="Exception.InnerException"/>) and maps its category; <see cref="StepRunErrorCategory.Unknown"/>
    /// when the failure didn't come from an AI provider.
    /// </summary>
    public static StepRunErrorCategory FromException(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is AIProviderException providerError)
                return FromProviderCategory(providerError.Category);
        }

        return StepRunErrorCategory.Unknown;
    }

    private static StepRunErrorCategory FromProviderCategory(AIProviderErrorCategory category) => category switch
    {
        AIProviderErrorCategory.RateLimited => StepRunErrorCategory.RateLimiting,
        AIProviderErrorCategory.Transient => StepRunErrorCategory.ServiceUnavailable,
        AIProviderErrorCategory.NetworkError => StepRunErrorCategory.ServiceUnavailable,
        AIProviderErrorCategory.Authentication => StepRunErrorCategory.Authentication,

        // Resending the same request to the same model can't change the answer: a settings problem.
        AIProviderErrorCategory.InvalidRequest => StepRunErrorCategory.ConfigurationError,
        AIProviderErrorCategory.NotFound => StepRunErrorCategory.ConfigurationError,

        AIProviderErrorCategory.Cancelled => StepRunErrorCategory.Cancelled,
        _ => StepRunErrorCategory.Unknown,
    };
}
