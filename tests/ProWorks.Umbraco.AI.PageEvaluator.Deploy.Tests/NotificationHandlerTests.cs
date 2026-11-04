using System.Reflection;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Deploy.Composing;
using ProWorks.Umbraco.AI.PageEvaluator.Deploy.NotificationHandlers;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using Umbraco.AI.Deploy.NotificationHandlers;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Events;
using Umbraco.Deploy.Core;
using Umbraco.Deploy.Core.Connectors.ServiceConnectors;
using Umbraco.Deploy.Infrastructure.Disk;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.Tests;

/// <summary>
/// The Saved/Deleted refresher handlers (006 contracts/deploy-artifact.md §2.1): each is bound to the main package's
/// notification and writes/removes artifacts of the evaluator config UDI type.
/// </summary>
public class NotificationHandlerTests
{
    private const string EntityType = "proworks-ai-evaluator-config";

    private static string EntityTypeOf(object handler)
    {
        for (Type? type = handler.GetType(); type is not null; type = type.BaseType)
        {
            FieldInfo? field = type.GetField("_entityType", BindingFlags.Instance | BindingFlags.NonPublic);
            if (field is not null)
                return (string)field.GetValue(handler)!;
        }

        throw new InvalidOperationException("No _entityType field on the handler's base classes.");
    }

    [Fact]
    public void SavedHandler_IsBoundToTheSavedNotification_AndTheEvaluatorConfigEntityType()
    {
        var handler = new EvaluatorConfigSavedDeployRefresherNotificationAsyncHandler(
            Substitute.For<IServiceConnectorFactory>(), Substitute.For<IDiskEntityService>(), Substitute.For<ISignatureService>());

        Assert.IsAssignableFrom<INotificationAsyncHandler<EvaluatorConfigSavedNotification>>(handler);
        Assert.IsAssignableFrom<UmbracoAIEntitySavedDeployRefresherNotificationAsyncHandlerBase<AIEvaluatorConfig, EvaluatorConfigSavedNotification>>(handler);
        Assert.Equal(EntityType, EntityTypeOf(handler));
    }

    [Fact]
    public void DeletedHandler_IsBoundToTheDeletedNotification_AndTheEvaluatorConfigEntityType()
    {
        var handler = new EvaluatorConfigDeletedDeployRefresherNotificationAsyncHandler(
            Substitute.For<IDiskEntityService>(), Substitute.For<ISignatureService>());

        Assert.IsAssignableFrom<INotificationAsyncHandler<EvaluatorConfigDeletedNotification>>(handler);
        Assert.IsAssignableFrom<UmbracoAIEntityDeletedDeployRefresherNotificationAsyncHandlerBase<AIEvaluatorConfig, EvaluatorConfigDeletedNotification>>(handler);
        Assert.Equal(EntityType, EntityTypeOf(handler));
    }

    [Fact]
    public async Task DeletedHandler_ClearsTheSignatureOfTheDeletedConfigsUdi()
    {
        // Udi.Create needs the UDI type registered, which the add-on's component does at startup.
        var diskEntityService = Substitute.For<IDiskEntityService>();
        await new PageEvaluatorDeployComponent(diskEntityService).InitializeAsync(false, CancellationToken.None);
        var signatureService = Substitute.For<ISignatureService>();
        var handler = new EvaluatorConfigDeletedDeployRefresherNotificationAsyncHandler(diskEntityService, signatureService);
        var id = Guid.NewGuid();

        await handler.HandleAsync(new EvaluatorConfigDeletedNotification(id, new EventMessages()), CancellationToken.None);

        signatureService.Received(1).ClearSignatures(Arg.Is<IEnumerable<Udi>>(udis => udis.Single().Equals(new GuidUdi(EntityType, id))));
    }
}
