using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Configuration;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Startup.Configuration;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace ProWorks.Umbraco.AI.PageEvaluator.Composers;

/// <summary>
/// Umbraco composer for the ProWorks AI Page Evaluator package.
/// Registers persistence, application services, and validates that Umbraco.AI
/// (IChatClient) is present in the container.
/// </summary>
[ComposeAfter(typeof(UmbracoAIComposer))]
public sealed class PageEvaluatorComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Persistence layer: EFCore repository + migration handler.
        builder.AddUmbracoAIPageEvaluatorPersistence();

        // Application services.
        builder.Services.AddScoped<IAIEvaluatorConfigService, AIEvaluatorConfigService>();
        builder.Services.AddScoped<IPageEvaluationService, PageEvaluationService>();

        // Guard: warn clearly if Umbraco.AI has not registered IChatClient rather than
        // letting the first evaluation request throw an opaque DI exception.
        ServiceDescriptor? chatClientDescriptor = builder.Services
            .FirstOrDefault(d => d.ServiceType == typeof(IChatClient));

        if (chatClientDescriptor is null)
        {
            // Resolve logger via a build-time service provider snapshot.
            // This runs at compose time — the full DI container is not yet built.
            using ServiceProvider tempProvider = builder.Services.BuildServiceProvider();
            ILogger<PageEvaluatorComposer> logger =
                tempProvider.GetRequiredService<ILogger<PageEvaluatorComposer>>();

            logger.LogWarning(
                "ProWorks AI Page Evaluator: IChatClient is not registered. " +
                "Ensure the Umbraco.AI package is installed and configured before this package. " +
                "Page evaluations will fail until this is resolved.");
        }
    }
}
