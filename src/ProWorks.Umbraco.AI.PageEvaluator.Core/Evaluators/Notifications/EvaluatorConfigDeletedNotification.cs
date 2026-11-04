using Umbraco.AI.Core.Models.Notifications;
using Umbraco.Cms.Core.Events;

namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;

/// <summary>
/// Published (with <c>IEventAggregator.PublishAsync</c>, after the delete commits) for a deleted evaluator
/// configuration (006 data-model §3). A sibling promoted to active by the delete gets its own
/// <see cref="EvaluatorConfigSavedNotification"/>. Handlers must not throw back into the operation.
/// </summary>
public sealed class EvaluatorConfigDeletedNotification(Guid entityId, EventMessages messages)
    : AIEntityDeletedNotification<AIEvaluatorConfig>(entityId, messages);
