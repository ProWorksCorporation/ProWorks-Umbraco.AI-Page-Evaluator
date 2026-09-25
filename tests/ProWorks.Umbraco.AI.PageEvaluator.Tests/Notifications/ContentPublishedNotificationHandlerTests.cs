using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Notifications;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Notifications;

/// <summary>
/// Per-culture cache invalidation on publish (FR-018e, contracts/management-api.md §5).
/// </summary>
public class ContentPublishedNotificationHandlerTests
{
    private readonly IEvaluationCacheRepository _cacheRepository = Substitute.For<IEvaluationCacheRepository>();
    private readonly ContentPublishedNotificationHandler _sut;

    public ContentPublishedNotificationHandlerTests()
    {
        _sut = new ContentPublishedNotificationHandler(_cacheRepository);
    }

    internal static IContent Content(Guid key, bool variesByCulture)
    {
        var content = Substitute.For<IContent>();
        content.Key.Returns(key);
        var contentType = Substitute.For<ISimpleContentType>();
        contentType.Variations.Returns(variesByCulture ? ContentVariation.Culture : ContentVariation.Nothing);
        content.ContentType.Returns(contentType);
        return content;
    }

    private static IReadOnlyDictionary<Guid, IReadOnlyCollection<string>> Cultures(Guid key, params string[] cultures)
        => new Dictionary<Guid, IReadOnlyCollection<string>> { [key] = cultures };

    private Task Publish(IContent content, IReadOnlyDictionary<Guid, IReadOnlyCollection<string>>? published, IReadOnlyDictionary<Guid, IReadOnlyCollection<string>>? unpublished)
        => _sut.HandleAsync(new ContentPublishedNotification(content, new EventMessages(), published, unpublished), CancellationToken.None);

    [Fact]
    public async Task WithoutCultureInformation_DeletesEveryCultureForEachPublishedEntity()
    {
        var key1 = Guid.NewGuid();
        var key2 = Guid.NewGuid();
        var notification = new ContentPublishedNotification(
            new[] { Content(key1, variesByCulture: true), Content(key2, variesByCulture: false) },
            new EventMessages());

        await _sut.HandleAsync(notification, CancellationToken.None);

        await _cacheRepository.Received(1).DeleteAllCulturesAsync(key1, Arg.Any<CancellationToken>());
        await _cacheRepository.Received(1).DeleteAllCulturesAsync(key2, Arg.Any<CancellationToken>());
        await _cacheRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task InvariantContent_PublishedAsStar_DeletesEveryCulture()
    {
        var key = Guid.NewGuid();

        await Publish(Content(key, variesByCulture: false), Cultures(key, "*"), null);

        await _cacheRepository.Received(1).DeleteAllCulturesAsync(key, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AnEntityMissingFromTheCultureMaps_DeletesEveryCulture()
    {
        var key = Guid.NewGuid();

        await Publish(Content(key, variesByCulture: true), Cultures(Guid.NewGuid(), "da-DK"), null);

        await _cacheRepository.Received(1).DeleteAllCulturesAsync(key, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PublishingOneCulture_DeletesOnlyThatCulture_AndTheLegacyInvariantRow()
    {
        var key = Guid.NewGuid();

        await Publish(Content(key, variesByCulture: true), Cultures(key, "da-DK"), null);

        await _cacheRepository.Received(1).DeleteAsync(key, "da-dk", Arg.Any<CancellationToken>());
        await _cacheRepository.Received(1).DeleteAsync(key, string.Empty, Arg.Any<CancellationToken>());
        await _cacheRepository.DidNotReceive().DeleteAsync(key, "en-us", Arg.Any<CancellationToken>());
        await _cacheRepository.DidNotReceive().DeleteAllCulturesAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UnpublishingOneCultureDuringAPublish_DeletesThatCulture()
    {
        var key = Guid.NewGuid();

        await Publish(Content(key, variesByCulture: true), Cultures(key, "da-DK"), Cultures(key, "EN-us"));

        await _cacheRepository.Received(1).DeleteAsync(key, "da-dk", Arg.Any<CancellationToken>());
        await _cacheRepository.Received(1).DeleteAsync(key, "en-us", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task WhenNoEntitiesPublished_DoesNotCallRepository()
    {
        var notification = new ContentPublishedNotification(Array.Empty<IContent>(), new EventMessages());

        await _sut.HandleAsync(notification, CancellationToken.None);

        await _cacheRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _cacheRepository.DidNotReceive().DeleteAllCulturesAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }
}
