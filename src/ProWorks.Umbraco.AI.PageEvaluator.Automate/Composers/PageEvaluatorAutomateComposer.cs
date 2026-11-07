using Microsoft.Extensions.DependencyInjection;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Composers;

/// <summary>
/// Registers the "Evaluate Page" step's helpers. The step itself (<c>EvaluatePageAction</c>) is discovered by
/// Automate through the TypeLoader (<c>[Action]</c>), like Automate's built-in actions.
/// </summary>
public sealed class PageEvaluatorAutomateComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Both are stateless over singletons (IPageEvaluatorTextService, IOptionsMonitor, IHostingEnvironment),
        // matching the singleton action that uses them.
        builder.Services.AddSingleton<EvaluationReportHtmlRenderer>();
        builder.Services.AddSingleton<BackofficeLinkBuilder>();
    }
}
