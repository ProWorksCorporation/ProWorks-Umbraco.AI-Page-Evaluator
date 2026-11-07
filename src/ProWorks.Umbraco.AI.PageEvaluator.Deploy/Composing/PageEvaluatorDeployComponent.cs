using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Composing;
using Umbraco.Deploy.Infrastructure.Disk;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.Composing;

/// <summary>
/// Registers the evaluator configuration UDI type and makes it a Deploy disk (schema) entity, so its artifacts are
/// written as <c>.uda</c> files under <c>umbraco/Deploy/Revision</c> (006 contracts/deploy-artifact.md §2.1).
/// </summary>
public sealed class PageEvaluatorDeployComponent(IDiskEntityService diskEntityService) : IAsyncComponent
{
    /// <inheritdoc />
    public Task InitializeAsync(bool isRestarting, CancellationToken cancellationToken)
    {
        UdiParser.RegisterUdiType(PageEvaluatorDeployConstants.UdiEntityType.EvaluatorConfig, UdiType.GuidUdi);
        diskEntityService.RegisterDiskEntityType(PageEvaluatorDeployConstants.UdiEntityType.EvaluatorConfig);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task TerminateAsync(bool isRestarting, CancellationToken cancellationToken) => Task.CompletedTask;
}
