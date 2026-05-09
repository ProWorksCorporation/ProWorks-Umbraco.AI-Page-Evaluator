using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Notifications;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Configuration;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Startup.Configuration;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;

namespace ProWorks.Umbraco.AI.PageEvaluator.Composers;

/// <summary>
/// Umbraco composer for the ProWorks AI Page Evaluator package.
/// Registers persistence and application services.
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

        // Rate limiter: 10 AI evaluation requests per user per minute (per back-office user key).
        // Consuming apps must call app.UseRateLimiter() in their middleware pipeline.
        builder.Services.AddRateLimiter(options =>
            options.AddFixedWindowLimiter("PageEvaluatorEvaluate", o =>
            {
                o.PermitLimit = 10;
                o.Window = TimeSpan.FromMinutes(1);
                o.QueueLimit = 0;
            })
        );

        // Invalidate cached evaluations when content is published.
        builder.AddNotificationAsyncHandler<ContentPublishedNotification, ContentPublishedNotificationHandler>();
    }
}
