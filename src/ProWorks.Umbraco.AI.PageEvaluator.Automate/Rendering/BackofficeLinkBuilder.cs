using System.Globalization;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Hosting;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;

/// <summary>
/// Builds the report's "Open in Umbraco" link (006 research R8, contracts/automate-step.md §5).
/// </summary>
/// <remarks>
/// <para>
/// Route verified against CMS 17.8.0's backoffice client: <c>UMB_EDIT_DOCUMENT_WORKSPACE_PATH_PATTERN</c> is
/// <c>section/content/workspace/document/edit/:unique</c>, and the document workspace editor adds one
/// <c>/:variantPath</c> segment, the variant's <c>UmbVariantId.toString()</c>: the language's ISO code as configured
/// (e.g. <c>da-DK</c>) for a culture-varying document, <c>invariant</c> otherwise. Without a segment the workspace
/// redirects to its default variant, so invariant documents get no segment.
/// </para>
/// <para>
/// The site base comes from <see cref="WebRoutingSettings.UmbracoApplicationUrl"/>, then
/// <see cref="IHostingEnvironment.ApplicationMainUrl"/>; only absolute http(s) URLs are accepted. When neither is
/// known (a background run on a site with no configured URL) there is no link.
/// </para>
/// </remarks>
public sealed class BackofficeLinkBuilder
{
    private const string DocumentEditPath = "umbraco/section/content/workspace/document/edit/";

    private readonly IOptionsMonitor<WebRoutingSettings> _webRoutingSettings;
    private readonly IHostingEnvironment _hostingEnvironment;

    public BackofficeLinkBuilder(IOptionsMonitor<WebRoutingSettings> webRoutingSettings, IHostingEnvironment hostingEnvironment)
    {
        _webRoutingSettings = webRoutingSettings;
        _hostingEnvironment = hostingEnvironment;
    }

    /// <summary>
    /// Returns the absolute backoffice URL of the document, or <see langword="null"/> when no site base is known.
    /// </summary>
    /// <param name="contentKey">The document key.</param>
    /// <param name="culture">The evaluated culture for a culture-varying document; <see langword="null"/> for invariant.</param>
    public string? Build(Guid contentKey, string? culture)
    {
        string? siteBase = SiteBase(_webRoutingSettings.CurrentValue.UmbracoApplicationUrl)
            ?? SiteBase(SafeMainUrl()?.ToString());
        if (siteBase is null)
            return null;

        string link = siteBase + DocumentEditPath + contentKey.ToString("D");
        return string.IsNullOrWhiteSpace(culture)
            ? link
            : link + "/" + Uri.EscapeDataString(VariantCulture(culture));
    }

    private Uri? SafeMainUrl()
    {
        try
        {
            return _hostingEnvironment.ApplicationMainUrl;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>The scheme, host, port and path of an absolute http(s) URL, ending in <c>/</c>; otherwise null.</summary>
    private static string? SiteBase(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)
            || !Uri.TryCreate(url.Trim(), UriKind.Absolute, out Uri? uri)
            || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
            || string.IsNullOrEmpty(uri.Host))
        {
            return null;
        }

        string path = uri.AbsolutePath.TrimEnd('/');
        return uri.GetLeftPart(UriPartial.Authority) + path + "/";
    }

    /// <summary>
    /// The backoffice matches variant segments to the language's ISO code as configured (e.g. <c>da-DK</c>), while
    /// the evaluation reports cultures lower-cased; .NET's culture name restores the usual casing.
    /// </summary>
    private static string VariantCulture(string culture)
    {
        try
        {
            return CultureInfo.GetCultureInfo(culture.Trim()).Name;
        }
        catch (CultureNotFoundException)
        {
            return culture.Trim();
        }
    }
}
