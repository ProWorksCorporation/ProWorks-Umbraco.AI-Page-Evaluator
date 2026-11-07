using ProWorks.Umbraco.AI.PageEvaluator.Composers;
using ProWorks.Umbraco.AI.PageEvaluator.Deploy.NotificationHandlers;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using Umbraco.AI.Deploy.Composing;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.Composing;

/// <summary>
/// Composer for the Page Evaluator Deploy add-on (006 contracts/deploy-artifact.md §2.1). The service connector is
/// found by Deploy's type scan (<c>[UdiDefinition]</c>); this registers the UDI/disk-entity component and the
/// Saved/Deleted handlers that keep the <c>.uda</c> files current.
/// </summary>
[ComposeAfter(typeof(UmbracoAIDeployComposer))]
[ComposeAfter(typeof(PageEvaluatorComposer))]
public sealed class PageEvaluatorDeployComposer : IComposer
{
    /// <inheritdoc />
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Components().Append<PageEvaluatorDeployComponent>();

        builder.AddNotificationAsyncHandler<EvaluatorConfigSavedNotification, EvaluatorConfigSavedDeployRefresherNotificationAsyncHandler>();
        builder.AddNotificationAsyncHandler<EvaluatorConfigDeletedNotification, EvaluatorConfigDeletedDeployRefresherNotificationAsyncHandler>();
    }
}
