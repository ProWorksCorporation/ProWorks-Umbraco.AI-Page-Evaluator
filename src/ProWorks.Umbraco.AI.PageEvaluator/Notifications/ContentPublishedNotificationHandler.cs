using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace ProWorks.Umbraco.AI.PageEvaluator.Notifications;

/// <summary>
/// Invalidates cached evaluation results when content is published.
/// Deletes cache entries for each published node so the next evaluation
/// modal open triggers a fresh AI evaluation.
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
            await _cacheRepository.DeleteAsync(content.Key, cancellationToken);
        }
    }
}
