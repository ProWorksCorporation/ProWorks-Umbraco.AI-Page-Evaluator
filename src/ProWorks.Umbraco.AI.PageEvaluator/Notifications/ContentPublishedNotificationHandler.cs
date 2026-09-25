using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace ProWorks.Umbraco.AI.PageEvaluator.Notifications;

/// <summary>
/// Invalidates cached evaluation results when content is published. Only the cultures that were
/// published (or unpublished as part of the publish) are cleared; see <see cref="CacheInvalidationRules"/>.
/// </summary>
public sealed class ContentPublishedNotificationHandler
    : INotificationAsyncHandler<ContentPublishedNotification>
{
    private readonly IEvaluationCacheRepository _cacheRepository;

    public ContentPublishedNotificationHandler(IEvaluationCacheRepository cacheRepository)
    {
        _cacheRepository = cacheRepository;
    }

    public async Task HandleAsync(ContentPublishedNotification notification, CancellationToken cancellationToken)
    {
        foreach (var content in notification.PublishedEntities)
        {
            await CacheInvalidationRules.InvalidateAsync(
                _cacheRepository,
                content,
                [notification.PublishedCultures, notification.UnpublishedCultures],
                cancellationToken);
        }
    }
}
