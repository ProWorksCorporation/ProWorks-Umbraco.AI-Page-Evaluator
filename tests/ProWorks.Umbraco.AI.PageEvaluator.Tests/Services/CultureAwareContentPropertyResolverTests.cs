using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.Cms.Core.DeliveryApi;
using Umbraco.Cms.Core.Models.DeliveryApi;
using Umbraco.Cms.Core.Models.PublishedContent;
using Umbraco.Cms.Core.PublishedCache;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

/// <summary>
/// Culture-scoped content resolution (FR-018a, research R3).
/// </summary>
public class CultureAwareContentPropertyResolverTests
{
    private readonly IPublishedContentCache _contentCache = Substitute.For<IPublishedContentCache>();
    private readonly TestVariationContextAccessor _variationContextAccessor = new();
    private readonly IOutputExpansionStrategyAccessor _strategyAccessor = Substitute.For<IOutputExpansionStrategyAccessor>();
    private readonly IOutputExpansionStrategy _strategy = Substitute.For<IOutputExpansionStrategy>();
    private readonly Guid _nodeId = Guid.NewGuid();
    private static readonly IReadOnlyDictionary<string, object?> NoDrafts = new Dictionary<string, object?>();

    public CultureAwareContentPropertyResolverTests()
    {
        _strategyAccessor.TryGetValue(out Arg.Any<IOutputExpansionStrategy?>())
            .Returns(call => { call[0] = _strategy; return true; });
    }

    private CultureAwareContentPropertyResolver CreateSut()
        => new(_contentCache, _variationContextAccessor, _strategyAccessor, NullLogger<CultureAwareContentPropertyResolver>.Instance);

    private IPublishedContent Content(bool publishedInCulture = true)
    {
        var content = Substitute.For<IPublishedContent>();
        content.Key.Returns(_nodeId);
        content.IsPublished(Arg.Any<string?>()).Returns(publishedInCulture);
        return content;
    }

    [Fact]
    public void SetsTheVariationContextToTheRequestedCulture_WhileMapping_AndRestoresItAfterwards()
    {
        var original = new VariationContext("en-us");
        _variationContextAccessor.VariationContext = original;
        IPublishedContent content = Content();
        _contentCache.GetById(false, _nodeId).Returns(content);
        string? cultureDuringMapping = null;
        _strategy.MapContentProperties(content).Returns(_ =>
        {
            cultureDuringMapping = _variationContextAccessor.VariationContext?.Culture;
            return new Dictionary<string, object?> { ["title"] = "Hej" };
        });

        IReadOnlyDictionary<string, object?> result = CreateSut().Resolve(_nodeId, "da-dk", NoDrafts);

        Assert.Equal("da-dk", cultureDuringMapping);
        Assert.Same(original, _variationContextAccessor.VariationContext);
        Assert.Equal("Hej", result["title"]);
    }

    [Fact]
    public void RestoresTheVariationContext_EvenWhenMappingThrows()
    {
        var original = new VariationContext("en-us");
        _variationContextAccessor.VariationContext = original;
        IPublishedContent content = Content();
        _contentCache.GetById(false, _nodeId).Returns(content);
        _strategy.MapContentProperties(content).Returns(_ => throw new InvalidOperationException("boom"));

        Assert.Throws<InvalidOperationException>(() => CreateSut().Resolve(_nodeId, "da-dk", NoDrafts));

        Assert.Same(original, _variationContextAccessor.VariationContext);
    }

    [Fact]
    public void UsesThePublishedVersion_WhenPublishedInTheCulture()
    {
        IPublishedContent published = Content(publishedInCulture: true);
        _contentCache.GetById(false, _nodeId).Returns(published);
        _strategy.MapContentProperties(published).Returns(new Dictionary<string, object?> { ["title"] = "Published" });

        IReadOnlyDictionary<string, object?> result = CreateSut().Resolve(_nodeId, "da-dk", NoDrafts);

        Assert.Equal("Published", result["title"]);
        _contentCache.DidNotReceive().GetById(true, _nodeId);
    }

    [Fact]
    public void FallsBackToTheDraft_WhenNotPublishedInTheCulture()
    {
        IPublishedContent published = Content(publishedInCulture: false);
        IPublishedContent draft = Content();
        _contentCache.GetById(false, _nodeId).Returns(published);
        _contentCache.GetById(true, _nodeId).Returns(draft);
        _strategy.MapContentProperties(draft).Returns(new Dictionary<string, object?> { ["title"] = "Draft" });

        IReadOnlyDictionary<string, object?> result = CreateSut().Resolve(_nodeId, "da-dk", NoDrafts);

        Assert.Equal("Draft", result["title"]);
    }

    [Fact]
    public void FallsBackToTheDraft_WhenNeverPublished()
    {
        IPublishedContent draft = Content();
        _contentCache.GetById(false, _nodeId).Returns((IPublishedContent?)null);
        _contentCache.GetById(true, _nodeId).Returns(draft);
        _strategy.MapContentProperties(draft).Returns(new Dictionary<string, object?> { ["title"] = "Draft" });

        Assert.Equal("Draft", CreateSut().Resolve(_nodeId, null, NoDrafts)["title"]);
    }

    [Fact]
    public void ReturnsTheSuppliedDraftValues_WhenTheNodeIsInNeitherCache()
    {
        var drafts = new Dictionary<string, object?> { ["title"] = "Raw draft" };

        IReadOnlyDictionary<string, object?> result = CreateSut().Resolve(_nodeId, "da-dk", drafts);

        Assert.Equal("Raw draft", result["title"]);
    }

    [Fact]
    public void FallsBackToPerPropertyDeliveryValues_WhenNoExpansionStrategyIsAvailable()
    {
        _strategyAccessor.TryGetValue(out Arg.Any<IOutputExpansionStrategy?>())
            .Returns(call => { call[0] = null; return false; });
        IPublishedContent content = Content();
        var property = Substitute.For<IPublishedProperty>();
        property.Alias.Returns("title");
        property.GetDeliveryApiValue(false, "da-dk", null).Returns("Dansk titel");
        content.Properties.Returns(new[] { property });
        _contentCache.GetById(false, _nodeId).Returns(content);

        Assert.Equal("Dansk titel", CreateSut().Resolve(_nodeId, "da-dk", NoDrafts)["title"]);
    }

    [Fact]
    public void OverlaysSimpleTextDrafts_ButNotComplexDraftValues()
    {
        IPublishedContent content = Content();
        _contentCache.GetById(false, _nodeId).Returns(content);
        _strategy.MapContentProperties(content).Returns(new Dictionary<string, object?>
        {
            ["title"] = "Published title",
            ["picker"] = "resolved picker",
        });
        var drafts = new Dictionary<string, object?>
        {
            ["title"] = "Unsaved title",
            ["picker"] = "[\"umb://document/abc\"]",
            ["image"] = "umb://media/123",
        };

        IReadOnlyDictionary<string, object?> result = CreateSut().Resolve(_nodeId, null, drafts);

        Assert.Equal("Unsaved title", result["title"]);
        Assert.Equal("resolved picker", result["picker"]);
        Assert.False(result.ContainsKey("image"));
    }

    /// <summary>
    /// T-cycle: a self-referencing picker resolved through the real cycle-detecting decorator must
    /// terminate (the decorator returns null for the re-entrant build) instead of overflowing the stack.
    /// </summary>
    [Fact]
    public void ASelfReferencingPicker_DoesNotOverflowTheStack()
    {
        IPublishedContent page = Content();
        _contentCache.GetById(false, _nodeId).Returns(page);

        var inner = Substitute.For<IApiContentBuilder>();
        var decorated = new CycleDetectingApiContentBuilder(inner, Substitute.For<ILogger<CycleDetectingApiContentBuilder>>());
        int innerBuilds = 0;
        // The page's picker points back at the page: every inner build re-enters the decorator.
        inner.Build(page).Returns(_ =>
        {
            innerBuilds++;
            IApiContent? picked = decorated.Build(page);
            var apiContent = Substitute.For<IApiContent>();
            apiContent.Properties.Returns(new Dictionary<string, object?> { ["self"] = picked });
            return apiContent;
        });
        _strategy.MapContentProperties(page).Returns(_ =>
            new Dictionary<string, object?> { ["relatedPage"] = decorated.Build(page) });

        IReadOnlyDictionary<string, object?> result = CreateSut().Resolve(_nodeId, null, NoDrafts);

        Assert.True(result.ContainsKey("relatedPage"));
        Assert.Equal(1, innerBuilds);
    }

    private sealed class TestVariationContextAccessor : IVariationContextAccessor
    {
        public VariationContext? VariationContext { get; set; }
    }
}
