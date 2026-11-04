using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Umbraco.Cms.Core.Services;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;

/// <summary>
/// Reads the package's server-side text (006 contracts/server-localization.md §3, research R9).
/// </summary>
/// <remarks>
/// <para>
/// CMS loads <c>App_Plugins/*/lang/*.xml</c> as supplementary language files, so the text is read through
/// <see cref="ILocalizedTextService"/> first: a site can override any key from its own <c>config/lang</c> files.
/// The lookup is area-exact (<see cref="ILocalizedTextService.GetAllStoredValuesByAreaAndAlias"/>), so a missing key
/// never picks up a core key of the same name from another area.
/// </para>
/// <para>
/// CMS only merges supplementary files into the cultures Umbraco core ships a language file for, and core has no
/// Hindi file. For a culture CMS doesn't load (and for any key CMS doesn't return) the package's own file is read
/// directly from the web root.
/// </para>
/// <para>Order: the language through CMS → the language's package file → English through CMS → English package file → the key.</para>
/// </remarks>
public sealed class PageEvaluatorTextService : IPageEvaluatorTextService
{
    /// <summary>The language-file area of the package's keys.</summary>
    public const string Area = "proworksPageEvaluator";

    /// <summary>Where the package's language files are served from (the RCL's <c>wwwroot/lang</c>).</summary>
    public const string LanguageFolder = "App_Plugins/ProWorks.AI.PageEvaluator/lang";

    private static readonly Regex TokenPattern = new(@"\{(\w+)\}", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly ILocalizedTextService _textService;
    private readonly PackageLanguageFiles _packageFiles;
    private readonly Lazy<HashSet<string>> _cmsCultures;

    /// <summary>Creates the service over the site's web root (DI constructor).</summary>
    public PageEvaluatorTextService(ILocalizedTextService textService, IWebHostEnvironment webHostEnvironment)
        : this(textService, new PackageLanguageFiles(webHostEnvironment.WebRootFileProvider, LanguageFolder))
    {
    }

    internal PageEvaluatorTextService(ILocalizedTextService textService, PackageLanguageFiles packageFiles)
    {
        _textService = textService;
        _packageFiles = packageFiles;
        _cmsCultures = new Lazy<HashSet<string>>(() =>
            new HashSet<string>(_textService.GetSupportedCultures().Select(c => c.Name), StringComparer.OrdinalIgnoreCase));
    }

    /// <inheritdoc />
    public string Localize(string key, string language, IDictionary<string, string?>? tokens = null)
    {
        string resolved = ReportLanguageResolver.ToSupported(language) ?? ReportLanguageResolver.Default;

        string text = Lookup(key, resolved)
            ?? (resolved == ReportLanguageResolver.Default ? null : Lookup(key, ReportLanguageResolver.Default))
            ?? key;

        return ReplaceTokens(text, tokens);
    }

    private string? Lookup(string key, string language)
        => FromCms(key, ReportLanguageResolver.FileCulture(language)) ?? _packageFiles.Get(language, key);

    private string? FromCms(string key, string cultureName)
    {
        // Asking CMS for a culture it has no files for logs a warning on every call.
        if (!_cmsCultures.Value.Contains(cultureName))
            return null;

        IDictionary<string, IDictionary<string, string>> areas =
            _textService.GetAllStoredValuesByAreaAndAlias(CultureInfo.GetCultureInfo(cultureName));

        return areas.TryGetValue(Area, out IDictionary<string, string>? keys)
               && keys.TryGetValue(key, out string? value)
               && !string.IsNullOrWhiteSpace(value)
            ? value
            : null;
    }

    private static string ReplaceTokens(string text, IDictionary<string, string?>? tokens)
    {
        if (tokens is null || tokens.Count == 0)
            return text;

        // Single pass: a token value (e.g. a page name containing "{verdict}") is never re-scanned.
        return TokenPattern.Replace(text, m =>
            tokens.TryGetValue(m.Groups[1].Value, out string? value) ? value ?? string.Empty : m.Value);
    }
}
