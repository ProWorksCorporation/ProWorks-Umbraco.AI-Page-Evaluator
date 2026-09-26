using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Services;

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
    private readonly IRuntimeState _runtimeState;
    private readonly ILogger<ContentUnpublishedNotificationHandler> _logger;

    public ContentUnpublishedNotificationHandler(
        IEvaluationCacheRepository cacheRepository,
        IRuntimeState runtimeState,
        ILogger<ContentUnpublishedNotificationHandler> logger)
    {
        _cacheRepository = cacheRepository;
        _runtimeState = runtimeState;
        _logger = logger;
    }

    public Task HandleAsync(ContentUnpublishedNotification notification, CancellationToken cancellationToken)
        => CacheInvalidationRules.InvalidateSafelyAsync(
            _cacheRepository,
            _runtimeState,
            _logger,
            notification.UnpublishedEntities,
            [notification.UnpublishedCultures],
            cancellationToken);
}
