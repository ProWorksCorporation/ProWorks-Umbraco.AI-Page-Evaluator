using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace ProWorks.Umbraco.AI.PageEvaluator.Notifications;

/// <summary>
/// Invalidates cached evaluation results when a whole document is unpublished, so the cache never
/// keeps a result for a published version that no longer exists (FR-018e). Unpublishing a single
/// culture raises a <see cref="ContentPublishedNotification"/> instead; see <see cref="ContentPublishedNotificationHandler"/>.
/// </summary>
public sealed class ContentUnpublishedNotificationHandler
    : INotificationAsyncHandler<ContentUnpublishedNotification>
{
    private readonly IEvaluationCacheRepository _cacheRepository;

    public ContentUnpublishedNotificationHandler(IEvaluationCacheRepository cacheRepository)
    {
        _cacheRepository = cacheRepository;
    }

    public async Task HandleAsync(ContentUnpublishedNotification notification, CancellationToken cancellationToken)
    {
        foreach (var content in notification.UnpublishedEntities)
        {
            await CacheInvalidationRules.InvalidateAsync(
                _cacheRepository,
                content,
                [notification.UnpublishedCultures],
                cancellationToken);
        }
    }
}
