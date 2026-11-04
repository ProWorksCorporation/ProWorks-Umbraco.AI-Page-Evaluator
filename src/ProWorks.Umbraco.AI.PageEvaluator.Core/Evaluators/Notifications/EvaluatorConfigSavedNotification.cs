using Umbraco.AI.Core.Models.Notifications;
using Umbraco.Cms.Core.Events;

namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;

/// <summary>
/// Published (with <c>IEventAggregator.PublishAsync</c>, after the change commits) for every evaluator configuration
/// whose stored state changed: the created/updated/activated row and any sibling deactivated or promoted by the
/// active-one rule (006 data-model §3). <see cref="AIEntitySavedNotification{T}.Entity"/> is the stored state after
/// the change. Handlers must not throw back into the operation; publishing failures are logged.
/// </summary>
public sealed class EvaluatorConfigSavedNotification(AIEvaluatorConfig entity, EventMessages messages)
    : AIEntitySavedNotification<AIEvaluatorConfig>(entity, messages);
