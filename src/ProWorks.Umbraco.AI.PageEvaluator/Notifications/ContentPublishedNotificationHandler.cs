using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;

namespace ProWorks.Umbraco.AI.PageEvaluator.Notifications;

/// <summary>
/// Invalidates cached evaluation results when content is published. Only the cultures that were
/// published (or unpublished as part of the publish) are cleared; see <see cref="CacheInvalidationRules"/>.
/// </summary>
public sealed class ContentPublishedNotificationHandler
    : INotificationAsyncHandler<ContentPublishedNotification>
{
    private readonly IEvaluationCacheRepository _cacheRepository;
    private readonly IRuntimeState _runtimeState;
    private readonly ILogger<ContentPublishedNotificationHandler> _logger;

    public ContentPublishedNotificationHandler(
        IEvaluationCacheRepository cacheRepository,
        IRuntimeState runtimeState,
        ILogger<ContentPublishedNotificationHandler> logger)
    {
        _cacheRepository = cacheRepository;
        _runtimeState = runtimeState;
        _logger = logger;
    }

    public Task HandleAsync(ContentPublishedNotification notification, CancellationToken cancellationToken)
        => CacheInvalidationRules.InvalidateSafelyAsync(
            _cacheRepository,
            _runtimeState,
            _logger,
            notification.PublishedEntities,
            [notification.PublishedCultures, notification.UnpublishedCultures],
            cancellationToken);
}
