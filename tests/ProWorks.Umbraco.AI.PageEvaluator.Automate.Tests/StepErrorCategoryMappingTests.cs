using ProWorks.Umbraco.AI.PageEvaluator.Automate.Helpers;
using Umbraco.AI.Core.Providers.Errors;
using Umbraco.Automate.Core.Actions;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// Copy of Umbraco.AI.Automate's internal mapping (006 research R7): a failure that can't succeed on retry must be a
/// category Automate treats as terminal, so a bad key or unknown model doesn't burn the retry budget.
/// </summary>
public class StepErrorCategoryMappingTests
{
    private static AIProviderException ProviderError(AIProviderErrorCategory category)
        => new(new AIProviderErrorInfo(category, "user-safe message", ProviderCode: null, "raw message"), new Exception("sdk"));

    [Theory]
    [InlineData(AIProviderErrorCategory.RateLimited, StepRunErrorCategory.RateLimiting)]
    [InlineData(AIProviderErrorCategory.Transient, StepRunErrorCategory.ServiceUnavailable)]
    [InlineData(AIProviderErrorCategory.NetworkError, StepRunErrorCategory.ServiceUnavailable)]
    [InlineData(AIProviderErrorCategory.Authentication, StepRunErrorCategory.Authentication)]
    [InlineData(AIProviderErrorCategory.InvalidRequest, StepRunErrorCategory.ConfigurationError)]
    [InlineData(AIProviderErrorCategory.NotFound, StepRunErrorCategory.ConfigurationError)]
    [InlineData(AIProviderErrorCategory.Cancelled, StepRunErrorCategory.Cancelled)]
    [InlineData(AIProviderErrorCategory.Unknown, StepRunErrorCategory.Unknown)]
    public void FromException_ProviderError_MapsToTheMatchingStepCategory(
        AIProviderErrorCategory providerCategory, StepRunErrorCategory expected)
    {
        Assert.Equal(expected, StepErrorCategoryMapping.FromException(ProviderError(providerCategory)));
    }

    [Fact]
    public void FromException_CoversEveryProviderCategory()
    {
        // A new Umbraco.AI category must be classified deliberately, not fall into Unknown unnoticed.
        AIProviderErrorCategory[] mappedToUnknown = Enum.GetValues<AIProviderErrorCategory>()
            .Where(c => StepErrorCategoryMapping.FromException(ProviderError(c)) == StepRunErrorCategory.Unknown)
            .ToArray();

        Assert.Equal([AIProviderErrorCategory.Unknown], mappedToUnknown);
    }

    [Fact]
    public void FromException_ProviderErrorWrappedByAnotherException_IsStillMapped()
    {
        var wrapped = new InvalidOperationException("outer",
            new AggregateException(ProviderError(AIProviderErrorCategory.RateLimited)));

        Assert.Equal(StepRunErrorCategory.RateLimiting, StepErrorCategoryMapping.FromException(wrapped));
    }

    [Fact]
    public void FromException_NotAProviderFailure_IsUnknown()
    {
        Assert.Equal(StepRunErrorCategory.Unknown, StepErrorCategoryMapping.FromException(new InvalidCastException("not ours")));
    }
}
