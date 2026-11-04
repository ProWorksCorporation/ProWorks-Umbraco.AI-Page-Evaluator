using Microsoft.Extensions.Options;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Hosting;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// The report's "Open in Umbraco" link (006 research R8, contracts/automate-step.md §5). The CMS 17.8 document
/// workspace route is <c>section/content/workspace/document/edit/{unique}</c> (<c>UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN</c>),
/// followed by the variant path, which for a culture is the language's ISO code as configured (<c>UmbVariantId.toString()</c>).
/// </summary>
public class BackofficeLinkBuilderTests
{
    private static readonly Guid Key = Guid.Parse("3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7");

    private readonly WebRoutingSettings _routing = new();
    private readonly IHostingEnvironment _hosting = Substitute.For<IHostingEnvironment>();

    private BackofficeLinkBuilder Create()
    {
        var monitor = Substitute.For<IOptionsMonitor<WebRoutingSettings>>();
        monitor.CurrentValue.Returns(_routing);
        return new BackofficeLinkBuilder(monitor, _hosting);
    }

    [Fact]
    public void Build_UsesUmbracoApplicationUrl_First()
    {
        _routing.UmbracoApplicationUrl = "https://www.example.com/";
        _hosting.ApplicationMainUrl.Returns(new Uri("https://other.example.com/"));

        Assert.Equal(
            "https://www.example.com/umbraco/section/content/workspace/document/edit/3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
            Create().Build(Key, culture: null));
    }

    [Fact]
    public void Build_FallsBackToTheApplicationMainUrl()
    {
        _hosting.ApplicationMainUrl.Returns(new Uri("https://localhost:44318/"));

        Assert.Equal(
            "https://localhost:44318/umbraco/section/content/workspace/document/edit/3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
            Create().Build(Key, culture: null));
    }

    [Fact]
    public void Build_VaryingDocument_AppendsTheCultureInItsConfiguredCase()
    {
        _routing.UmbracoApplicationUrl = "https://www.example.com";

        Assert.Equal(
            "https://www.example.com/umbraco/section/content/workspace/document/edit/3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7/da-DK",
            Create().Build(Key, "da-dk"));
    }

    [Fact]
    public void Build_KeepsAVirtualDirectory()
    {
        _routing.UmbracoApplicationUrl = "https://www.example.com/site/";

        Assert.StartsWith("https://www.example.com/site/umbraco/section/content/", Create().Build(Key, null));
    }

    [Theory]
    [InlineData("ftp://www.example.com")]
    [InlineData("javascript:alert(1)")]
    [InlineData("/relative/path")]
    [InlineData("www.example.com")]
    [InlineData("  ")]
    public void Build_NonHttpBase_IsIgnored(string configured)
    {
        _routing.UmbracoApplicationUrl = configured;

        Assert.Null(Create().Build(Key, null));
    }

    [Fact]
    public void Build_NonHttpConfiguredBase_FallsBackToTheMainUrl()
    {
        _routing.UmbracoApplicationUrl = "ftp://www.example.com";
        _hosting.ApplicationMainUrl.Returns(new Uri("http://localhost:5000/"));

        Assert.StartsWith("http://localhost:5000/umbraco/", Create().Build(Key, null));
    }

    [Fact]
    public void Build_NoBaseKnown_IsNull()
    {
        Assert.Null(Create().Build(Key, "en-US"));
    }

    [Fact]
    public void Build_DropsQueryAndFragmentFromTheBase()
    {
        _routing.UmbracoApplicationUrl = "https://www.example.com/?x=1#top";

        Assert.Equal(
            "https://www.example.com/umbraco/section/content/workspace/document/edit/3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
            Create().Build(Key, null));
    }
}
