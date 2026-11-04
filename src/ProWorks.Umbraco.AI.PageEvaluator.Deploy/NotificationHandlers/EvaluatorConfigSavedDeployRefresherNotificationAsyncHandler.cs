using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using Umbraco.AI.Deploy.NotificationHandlers;
using Umbraco.Deploy.Core;
using Umbraco.Deploy.Core.Connectors.ServiceConnectors;
using Umbraco.Deploy.Infrastructure.Disk;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.NotificationHandlers;

/// <summary>
/// Writes the evaluator configuration's <c>.uda</c> file and signature whenever its stored state changes. The main
/// package publishes <see cref="EvaluatorConfigSavedNotification"/> for every changed row, siblings included, so every
/// file stays current (006 research R10).
/// </summary>
internal sealed class EvaluatorConfigSavedDeployRefresherNotificationAsyncHandler(
    IServiceConnectorFactory serviceConnectorFactory,
    IDiskEntityService diskEntityService,
    ISignatureService signatureService)
    : UmbracoAIEntitySavedDeployRefresherNotificationAsyncHandlerBase<AIEvaluatorConfig, EvaluatorConfigSavedNotification>(
        serviceConnectorFactory,
        diskEntityService,
        signatureService,
        PageEvaluatorDeployConstants.UdiEntityType.EvaluatorConfig);
