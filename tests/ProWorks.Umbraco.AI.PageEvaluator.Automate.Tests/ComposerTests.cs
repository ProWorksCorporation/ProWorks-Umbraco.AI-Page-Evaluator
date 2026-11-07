using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Composers;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Hosting;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// <see cref="PageEvaluatorAutomateComposer"/> registrations (006 contracts/automate-step.md). The step itself is
/// discovered by Automate through the TypeLoader (<c>[Action]</c>); the composer only registers the step's helpers.
/// </summary>
public class ComposerTests
{
    private static ServiceCollection Compose()
    {
        var services = new ServiceCollection();
        var builder = Substitute.For<IUmbracoBuilder>();
        builder.Services.Returns(services);
        new PageEvaluatorAutomateComposer().Compose(builder);
        return services;
    }

    [Fact]
    public void Composer_IsADiscoverableComposer_WithNoOrderingAttributes()
    {
        // Umbraco's TypeLoader instantiates public, non-abstract IComposer types with a parameterless constructor.
        Type composer = typeof(PageEvaluatorAutomateComposer);
        Assert.True(typeof(IComposer).IsAssignableFrom(composer));
        Assert.True(composer.IsPublic && !composer.IsAbstract);
        Assert.NotNull(composer.GetConstructor(Type.EmptyTypes));

        // It only adds its own types (no replacing/decorating of others' registrations), so it needs no ordering against
        // Automate, Umbraco.AI or the main PageEvaluatorComposer: dependencies are resolved after composition.
        Assert.Empty(composer.GetCustomAttributes<ComposeAfterAttribute>());
        Assert.Empty(composer.GetCustomAttributes<ComposeBeforeAttribute>());
    }

    [Theory]
    [InlineData(typeof(EvaluationReportHtmlRenderer))]
    [InlineData(typeof(BackofficeLinkBuilder))]
    public void Compose_RegistersTheHelper_AsASingletonOfItsOwnType(Type helper)
    {
        ServiceDescriptor descriptor = Assert.Single(Compose(), d => d.ServiceType == helper);

        // Singleton: the action Automate resolves is a singleton, and both helpers are stateless over singletons.
        Assert.Equal(ServiceLifetime.Singleton, descriptor.Lifetime);
        Assert.Equal(helper, descriptor.ImplementationType);
    }

    [Fact]
    public void Compose_RegistersOnlyTheTwoHelpers()
    {
        // EvaluationSummaryBuilder is a static class (nothing to register); everything else comes from Automate,
        // Umbraco.AI or the main package.
        Assert.True(typeof(EvaluationSummaryBuilder).IsAbstract && typeof(EvaluationSummaryBuilder).IsSealed);
        Assert.Equal(
            new[] { typeof(BackofficeLinkBuilder), typeof(EvaluationReportHtmlRenderer) }.OrderBy(t => t.FullName),
            Compose().Select(d => d.ServiceType).OrderBy(t => t.FullName));
    }

    [Fact]
    public void Compose_TheHelpersResolveFromTheirSingletonDependencies_AndAreShared()
    {
        ServiceCollection services = Compose();
        services.AddSingleton(Substitute.For<IPageEvaluatorTextService>());
        services.AddSingleton(Substitute.For<IOptionsMonitor<WebRoutingSettings>>());
        services.AddSingleton(Substitute.For<IHostingEnvironment>());
        using ServiceProvider provider = services.BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateOnBuild = true,
            ValidateScopes = true,
        });

        Assert.Same(provider.GetRequiredService<EvaluationReportHtmlRenderer>(), provider.GetRequiredService<EvaluationReportHtmlRenderer>());
        Assert.Same(provider.GetRequiredService<BackofficeLinkBuilder>(), provider.GetRequiredService<BackofficeLinkBuilder>());
    }

    [Fact]
    public void Compose_CoversEveryPackageHelperTheStepsConstructorNeeds()
    {
        // The action's constructor parameters from this add-on must be registered by its composer; the rest
        // (ActionInfrastructure, IAutomationActionAuthorizer, IPageEvaluatorTextService, ...) come from elsewhere.
        Assembly addOn = typeof(PageEvaluatorAutomateComposer).Assembly;
        ConstructorInfo ctor = Assert.Single(typeof(EvaluatePageAction).GetConstructors());
        Type[] fromThisAddOn = ctor.GetParameters().Select(p => p.ParameterType).Where(t => t.Assembly == addOn).ToArray();
        HashSet<Type> registered = Compose().Select(d => d.ServiceType).ToHashSet();

        Assert.NotEmpty(fromThisAddOn);
        Assert.All(fromThisAddOn, t => Assert.Contains(t, registered));
    }
}
