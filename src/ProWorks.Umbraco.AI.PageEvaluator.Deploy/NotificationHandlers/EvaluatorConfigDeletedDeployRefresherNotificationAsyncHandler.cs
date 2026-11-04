using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using Umbraco.AI.Deploy.NotificationHandlers;
using Umbraco.Deploy.Core;
using Umbraco.Deploy.Infrastructure.Disk;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.NotificationHandlers;

/// <summary>
/// Removes a deleted evaluator configuration's <c>.uda</c> file and signature (006 research R10).
/// </summary>
internal sealed class EvaluatorConfigDeletedDeployRefresherNotificationAsyncHandler(
    IDiskEntityService diskEntityService,
    ISignatureService signatureService)
    : UmbracoAIEntityDeletedDeployRefresherNotificationAsyncHandlerBase<AIEvaluatorConfig, EvaluatorConfigDeletedNotification>(
        diskEntityService,
        signatureService,
        PageEvaluatorDeployConstants.UdiEntityType.EvaluatorConfig);
