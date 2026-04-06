using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Notifications;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Notifications;

public class ContentPublishedNotificationHandlerTests
{
    private readonly IEvaluationCacheRepository _cacheRepository = Substitute.For<IEvaluationCacheRepository>();
    private readonly ContentPublishedNotificationHandler _sut;

    public ContentPublishedNotificationHandlerTests()
    {
        _sut = new ContentPublishedNotificationHandler(_cacheRepository);
    }

    [Fact]
    public async Task HandleAsync_DeletesCacheForEachPublishedEntity()
    {
        var key1 = Guid.NewGuid();
        var key2 = Guid.NewGuid();

        var content1 = Substitute.For<IContent>();
        content1.Key.Returns(key1);
        var content2 = Substitute.For<IContent>();
        content2.Key.Returns(key2);

        var notification = new ContentPublishedNotification(
            new[] { content1, content2 },
            new EventMessages());

        await _sut.HandleAsync(notification, CancellationToken.None);

        await _cacheRepository.Received(1).DeleteAsync(key1, Arg.Any<CancellationToken>());
        await _cacheRepository.Received(1).DeleteAsync(key2, Arg.Any<CancellationToken>());
    }
}
