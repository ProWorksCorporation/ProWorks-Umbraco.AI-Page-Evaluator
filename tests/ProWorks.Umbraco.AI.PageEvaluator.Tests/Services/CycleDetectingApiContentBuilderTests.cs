using Microsoft.Extensions.Logging;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.Cms.Core.DeliveryApi;
using Umbraco.Cms.Core.Models.DeliveryApi;
using Umbraco.Cms.Core.Models.PublishedContent;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Services;

public class CycleDetectingApiContentBuilderTests
{
    private readonly IApiContentBuilder _inner = Substitute.For<IApiContentBuilder>();
    private readonly ILogger<CycleDetectingApiContentBuilder> _logger =
        Substitute.For<ILogger<CycleDetectingApiContentBuilder>>();

    private CycleDetectingApiContentBuilder CreateSut() =>
        new(_inner, _logger);

    private static IPublishedContent MakeContent(Guid key)
    {
        var c = Substitute.For<IPublishedContent>();
        c.Key.Returns(key);
        return c;
    }

    // --- Pass-through when not in a cycle ---

    [Fact]
    public void Build_WhenAcyclicContent_ReturnsInnerResult()
    {
        var sut = CreateSut();
        var content = MakeContent(Guid.NewGuid());
        var expected = Substitute.For<IApiContent>();
        _inner.Build(content).Returns(expected);

        var result = sut.Build(content);

        Assert.Same(expected, result);
    }

    // --- Self-reference cycle (A → A) ---

    [Fact]
    public void Build_WhenContentReferencesItself_ReturnsNullForReentrantCall()
    {
        var sut = CreateSut();
        var key = Guid.NewGuid();
        var content = MakeContent(key);
        IApiContent? reentrantResult = Substitute.For<IApiContent>(); // non-null sentinel

        _inner.Build(content).Returns(_ =>
        {
            // Simulate the content picker inside this node resolving back to the same node
            reentrantResult = sut.Build(content);
            return Substitute.For<IApiContent>();
        });

        var rootResult = sut.Build(content);

        Assert.NotNull(rootResult);       // root call succeeds
        Assert.Null(reentrantResult);     // re-entrant call returns null (cycle detected)
    }

    // --- Transitive cycle (A → B → A) ---

    [Fact]
    public void Build_WhenTransitiveCycleExists_ReturnsNullForCyclicNode()
    {
        var sut = CreateSut();
        var keyA = Guid.NewGuid();
        var keyB = Guid.NewGuid();
        var contentA = MakeContent(keyA);
        var contentB = MakeContent(keyB);
        IApiContent? backRefResult = Substitute.For<IApiContent>(); // non-null sentinel

        _inner.Build(contentB).Returns(_ =>
        {
            // B's picker references A → cycle
            backRefResult = sut.Build(contentA);
            return Substitute.For<IApiContent>();
        });

        _inner.Build(contentA).Returns(_ =>
        {
            sut.Build(contentB); // A → B
            return Substitute.For<IApiContent>();
        });

        sut.Build(contentA);

        Assert.Null(backRefResult); // cycle back to A is detected and returns null
    }

    // --- DAG: same node reachable from two sibling paths ---

    [Fact]
    public void Build_WhenNodeReachableViaTwoPaths_AllowsBothVisits()
    {
        var sut = CreateSut();
        var keyA = Guid.NewGuid();
        var keyB = Guid.NewGuid();
        var contentA = MakeContent(keyA);
        var contentB = MakeContent(keyB);
        int bVisitCount = 0;

        _inner.Build(contentB).Returns(_ =>
        {
            bVisitCount++;
            return Substitute.For<IApiContent>();
        });

        _inner.Build(contentA).Returns(_ =>
        {
            // Two sibling references to B (DAG, not a cycle)
            sut.Build(contentB);
            sut.Build(contentB);
            return Substitute.For<IApiContent>();
        });

        sut.Build(contentA);

        Assert.Equal(2, bVisitCount); // B visited twice via different paths — not blocked
    }

    // --- Cycle warning is logged ---

    [Fact]
    public void Build_WhenCycleDetected_LogsWarning()
    {
        var sut = CreateSut();
        var content = MakeContent(Guid.NewGuid());

        _inner.Build(content).Returns(_ =>
        {
            sut.Build(content); // cycle
            return Substitute.For<IApiContent>();
        });

        sut.Build(content);

        _logger.Received().Log(
            LogLevel.Warning,
            Arg.Any<EventId>(),
            Arg.Any<object>(),
            Arg.Any<Exception?>(),
            Arg.Any<Func<object, Exception?, string>>());
    }

    // --- Root tracking cleans up after completion ---

    [Fact]
    public void Build_AfterRootCallCompletes_AllowsSameNodeAgain()
    {
        var sut = CreateSut();
        var content = MakeContent(Guid.NewGuid());
        var expected = Substitute.For<IApiContent>();
        _inner.Build(content).Returns(expected);

        var first = sut.Build(content);
        var second = sut.Build(content); // independent call — not a cycle

        Assert.Same(expected, first);
        Assert.Same(expected, second);
    }
}
