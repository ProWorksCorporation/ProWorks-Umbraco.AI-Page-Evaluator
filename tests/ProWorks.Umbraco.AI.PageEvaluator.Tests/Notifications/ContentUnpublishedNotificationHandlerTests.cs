using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Notifications;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Notifications;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Notifications;

/// <summary>
/// Whole-document unpublish clears the evaluation cache (FR-018e; previously not handled at all).
/// </summary>
public class ContentUnpublishedNotificationHandlerTests
{
    private readonly IEvaluationCacheRepository _cacheRepository = Substitute.For<IEvaluationCacheRepository>();
    private readonly ContentUnpublishedNotificationHandler _sut;

    public ContentUnpublishedNotificationHandlerTests()
    {
        _sut = new ContentUnpublishedNotificationHandler(_cacheRepository);
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
}
