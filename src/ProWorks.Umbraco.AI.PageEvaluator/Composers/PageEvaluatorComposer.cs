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
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;
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
        // 006 contracts/deploy-artifact.md §1.2: the deploy-only write path, used only by the Deploy add-on's
        // connector (which resolves it through a DI scope: connectors are singletons).
        builder.Services.AddScoped<IEvaluatorConfigImportService, EvaluatorConfigImportService>();
        builder.Services.AddScoped<IPageEvaluationService, PageEvaluationService>();
        // 006 research R1: node → permission → culture → cache → evaluate, shared by the endpoints, the
        // evaluate_page server tool and the Automate step.
        builder.Services.AddScoped<IContentEvaluationService, ContentEvaluationService>();
        // 006 research R4: one per-user budget (10/min) for POST /evaluate, POST /recommend and the
        // evaluate_page server tool. A singleton so every caller shares it, with or without app.UseRateLimiter().
        builder.Services.AddSingleton<IEvaluationRateLimiter>(sp =>
            new EvaluationRateLimiter(sp.GetService<TimeProvider>() ?? TimeProvider.System));
        // Reads provider capability metadata only (no AI call); scoped like IAIProfileService's consumers.
        builder.Services.AddScoped<ISamplingSupportService, SamplingSupportService>();
        // 005 FR-012: reads whether a profile has its own system prompt (Umbraco.AI 17.5+ sends it first).
        builder.Services.AddScoped<IProfileSystemPromptService, ProfileSystemPromptService>();
        // FR-017: provider-enforced response schemas with a one-shot fallback; the support cache is
        // process-wide so a rejected profile version isn't retried on every request.
        builder.Services.AddSingleton<IStructuredOutputSupportCache, StructuredOutputSupportCache>();
        builder.Services.AddScoped<IEvaluatorChatExecutor, EvaluatorChatExecutor>();
        // FR-018a: culture-scoped content resolution. Its dependencies (IPublishedContentCache,
        // IVariationContextAccessor, IOutputExpansionStrategyAccessor) are all singletons in CMS 17.6.2.
        builder.Services.AddSingleton<ICultureAwareContentPropertyResolver, CultureAwareContentPropertyResolver>();
        // 006 research R9: server-side text (wwwroot/lang/*.xml, area proworksPageEvaluator) for the Automate step's
        // report, summary and errors. ILocalizedTextService is a singleton and the package files are read once.
        // The language itself is chosen by the static ReportLanguageResolver.
        builder.Services.AddSingleton<IPageEvaluatorTextService, PageEvaluatorTextService>();

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

        // Legacy middleware policy. Since 17.6.1 the evaluate/recommend actions no longer use it: they call the
        // shared IEvaluationRateLimiter above, so calling app.UseRateLimiter() is no longer required. It stays
        // registered because a host that calls app.UseRateLimiter() without the rate-limiter services fails to
        // start, and because hosts may still reference the "PageEvaluatorEvaluate" policy name.
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
        builder.AddNotificationAsyncHandler<ContentUnpublishedNotification, ContentUnpublishedNotificationHandler>();

        // Register the PageEvaluatorTestFeature with the Umbraco.AI test runner.
        builder.AITestFeatures().Add<PageEvaluatorTestFeature>();
    }
}
