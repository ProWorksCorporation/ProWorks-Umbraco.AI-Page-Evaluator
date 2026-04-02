using Microsoft.Extensions.DependencyInjection;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Notifications;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Configuration;

/// <summary>
/// Extension methods for <see cref="IUmbracoBuilder"/> to register the persistence layer.
/// Called from <c>PageEvaluatorComposer</c> in the Web project.
/// </summary>
public static class UmbracoBuilderExtensions
{
    /// <summary>
    /// Registers the EFCore repository, migration handler, and DbContext factory for the
    /// ProWorks AI Page Evaluator package.
    /// </summary>
    public static IUmbracoBuilder AddUmbracoAIPageEvaluatorPersistence(
        this IUmbracoBuilder builder)
    {
        // Register the repository as Singleton — IEFCoreScopeProvider handles internal lifetimes.
        builder.Services.AddSingleton<IAIEvaluatorConfigRepository, EFCoreAIEvaluatorConfigRepository>();

        // Register the migration handler to auto-run on application start.
        builder.AddNotificationAsyncHandler<
            UmbracoApplicationStartedNotification,
            RunPageEvaluatorMigrationNotificationHandler>();

        return builder;
    }
}
