using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Notifications;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Notifications;

/// <summary>
/// Whole-document unpublish clears the evaluation cache (FR-018e; previously not handled at all).
/// </summary>
public class ContentUnpublishedNotificationHandlerTests
{
    private readonly IEvaluationCacheRepository _cacheRepository = Substitute.For<IEvaluationCacheRepository>();
    private readonly IRuntimeState _runtimeState = Substitute.For<IRuntimeState>();
    private readonly ILogger<ContentUnpublishedNotificationHandler> _logger = Substitute.For<ILogger<ContentUnpublishedNotificationHandler>>();
    private readonly ContentUnpublishedNotificationHandler _sut;

    public ContentUnpublishedNotificationHandlerTests()
    {
        _runtimeState.Level.Returns(RuntimeLevel.Run);
        _sut = new ContentUnpublishedNotificationHandler(_cacheRepository, _runtimeState, _logger);
    }

    private Task Unpublish(IContent content, IReadOnlyDictionary<Guid, IReadOnlyCollection<string>>? unpublished)
        => _sut.HandleAsync(new ContentUnpublishedNotification(content, new EventMessages(), unpublished), CancellationToken.None);

    [Fact]
    public async Task WithoutCultureInformation_DeletesEveryCulture()
    {
        var key = Guid.NewGuid();

        await Unpublish(ContentPublishedNotificationHandlerTests.Content(key, variesByCulture: true), null);

        await _cacheRepository.Received(1).DeleteAllCulturesAsync(key, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task InvariantContent_UnpublishedAsStar_DeletesEveryCulture()
    {
        var key = Guid.NewGuid();

        await Unpublish(
            ContentPublishedNotificationHandlerTests.Content(key, variesByCulture: false),
            new Dictionary<Guid, IReadOnlyCollection<string>> { [key] = ["*"] });

        await _cacheRepository.Received(1).DeleteAllCulturesAsync(key, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UnpublishedCultures_AreDeletedIndividually_WithTheLegacyRow()
    {
        var key = Guid.NewGuid();

        await Unpublish(
            ContentPublishedNotificationHandlerTests.Content(key, variesByCulture: true),
            new Dictionary<Guid, IReadOnlyCollection<string>> { [key] = ["da-DK", "en-US"] });

        await _cacheRepository.Received(1).DeleteAsync(key, "da-dk", Arg.Any<CancellationToken>());
        await _cacheRepository.Received(1).DeleteAsync(key, "en-us", Arg.Any<CancellationToken>());
        await _cacheRepository.Received(1).DeleteAsync(key, string.Empty, Arg.Any<CancellationToken>());
    }

    // Issue #25 (same guard as ContentPublishedNotificationHandler).
    [Theory]
    [InlineData(RuntimeLevel.Install)]
    [InlineData(RuntimeLevel.Upgrade)]
    public async Task BeforeUmbracoIsRunning_DoesNotTouchTheCache(RuntimeLevel level)
    {
        _runtimeState.Level.Returns(level);

        await Unpublish(ContentPublishedNotificationHandlerTests.Content(Guid.NewGuid(), variesByCulture: false), null);

        Assert.Empty(_cacheRepository.ReceivedCalls());
    }

    [Fact]
    public async Task WhenTheCacheCannotBeCleared_LogsAWarningInsteadOfFailingTheUnpublish()
    {
        var key = Guid.NewGuid();
        _cacheRepository.DeleteAllCulturesAsync(key, Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("no such table: umbracoAIEvaluationCache"));

        Exception? thrown = await Record.ExceptionAsync(
            () => Unpublish(ContentPublishedNotificationHandlerTests.Content(key, variesByCulture: false), null));

        Assert.Null(thrown);
        _logger.Received(1).Log(
            LogLevel.Warning,
            Arg.Any<EventId>(),
            Arg.Is<object>(v => v.ToString()!.Contains(key.ToString())),
            Arg.Any<Exception>(),
            Arg.Any<Func<object, Exception?, string>>());
    }
}
