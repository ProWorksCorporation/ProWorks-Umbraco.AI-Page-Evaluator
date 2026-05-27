using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Configuration;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Notifications;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Configuration;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using ProWorks.Umbraco.AI.PageEvaluator.Tests;
using Umbraco.AI.Extensions;
using Umbraco.AI.Startup.Configuration;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DeliveryApi;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Extensions;

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
        // Global options (e.g. AdditionalRecommendableEditorAliases).
        builder.Services.Configure<PageEvaluatorOptions>(
            builder.Config.GetSection("ProWorks:PageEvaluator"));

        // Persistence layer: EFCore repository + migration handler.
        builder.AddUmbracoAIPageEvaluatorPersistence();

        // Application services.
        builder.Services.AddScoped<IAIEvaluatorConfigService, AIEvaluatorConfigService>();
        builder.Services.AddScoped<IPageEvaluationService, PageEvaluationService>();

        // Decorate IApiContentBuilder with cycle detection so that cyclic content graphs
        // (e.g. Block List → Content Picker → ancestor) do not cause StackOverflowException
        // when PageEvaluationService calls IApiContentBuilder.Build().
        // All callers — including Umbraco's ContentPickerValueConverter — use this decorator
        // because it replaces the singleton registration before the container is built.
        ServiceDescriptor? existingBuilder = builder.Services.FirstOrDefault(
            d => d.ServiceType == typeof(IApiContentBuilder));
        if (existingBuilder is not null)
        {
            builder.Services.Remove(existingBuilder);
            builder.Services.Add(new ServiceDescriptor(
                typeof(IApiContentBuilder),
                sp =>
                {
                    IApiContentBuilder inner;
                    if (existingBuilder.ImplementationInstance is not null)
                        inner = (IApiContentBuilder)existingBuilder.ImplementationInstance;
                    else if (existingBuilder.ImplementationFactory is not null)
                        inner = (IApiContentBuilder)existingBuilder.ImplementationFactory(sp);
                    else
                        inner = (IApiContentBuilder)ActivatorUtilities.CreateInstance(
                            sp, existingBuilder.ImplementationType!);
                    return new CycleDetectingApiContentBuilder(
                        inner,
                        sp.GetRequiredService<ILogger<CycleDetectingApiContentBuilder>>());
                },
                existingBuilder.Lifetime));
        }

        // Rate limiter: 10 AI evaluation requests per user per minute (per back-office user key).
        // Partitioned by user key so each back-office user gets their own 10 req/min bucket.
        // Falls back to IP address for unauthenticated requests.
        // Consuming apps must call app.UseRateLimiter() in their middleware pipeline.
        builder.Services.AddRateLimiter(options =>
            options.AddPolicy("PageEvaluatorEvaluate", ctx =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: ctx.User.Identity?.GetUserKey()?.ToString()
                        ?? ctx.Connection.RemoteIpAddress?.ToString()
                        ?? "anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    }))
        );

        // Invalidate cached evaluations when content is published.
        builder.AddNotificationAsyncHandler<ContentPublishedNotification, ContentPublishedNotificationHandler>();

        // Register the PageEvaluatorTestFeature with the Umbraco.AI test runner.
        builder.AITestFeatures().Add<PageEvaluatorTestFeature>();
    }
}
