using System.Reflection;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Composers;
using ProWorks.Umbraco.AI.PageEvaluator.Deploy.Composing;
using Umbraco.AI.Deploy.Composing;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Composing;
using Umbraco.Deploy.Infrastructure.Disk;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Deploy.Tests;

/// <summary>Composer ordering and component registration (006 contracts/deploy-artifact.md §2.1).</summary>
public class ComposerTests
{
    [Fact]
    public void Composer_RunsAfterUmbracoAIDeploy_AndThePageEvaluatorComposer()
    {
        Type[] after = typeof(PageEvaluatorDeployComposer).GetCustomAttributes<ComposeAfterAttribute>()
            .Select(a => a.RequiredType).ToArray();

        Assert.Contains(typeof(UmbracoAIDeployComposer), after);
        Assert.Contains(typeof(PageEvaluatorComposer), after);
        Assert.True(typeof(IComposer).IsAssignableFrom(typeof(PageEvaluatorDeployComposer)));
    }

    [Fact]
    public async Task Component_RegistersTheGuidUdiType_AndTheDiskEntityType()
    {
        var diskEntityService = Substitute.For<IDiskEntityService>();

        await new PageEvaluatorDeployComponent(diskEntityService).InitializeAsync(false, CancellationToken.None);

        var id = Guid.NewGuid();
        // Udi.Create(type, Guid) only accepts registered GUID UDI types.
        Assert.Equal(new GuidUdi("proworks-ai-evaluator-config", id), Assert.IsType<GuidUdi>(Udi.Create("proworks-ai-evaluator-config", id)));
        diskEntityService.Received(1).RegisterDiskEntityType("proworks-ai-evaluator-config");
    }
}
