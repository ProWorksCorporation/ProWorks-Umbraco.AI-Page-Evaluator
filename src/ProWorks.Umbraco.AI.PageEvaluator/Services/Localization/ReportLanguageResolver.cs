namespace ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;

/// <summary>
/// Picks the language of the server-side text (Automate step report, summary and errors; 006 spec FR-029,
/// contracts/server-localization.md §2): the explicit setting, then the evaluated content's culture mapped to a
/// supported language, then English.
/// </summary>
public static class ReportLanguageResolver
{
    /// <summary>The fallback language.</summary>
    public const string Default = "en";

    /// <summary>The package's 10 languages, matching the backoffice localization files.</summary>
    public static IReadOnlyList<string> Supported { get; } = ["en", "es", "fr", "da", "de", "nb", "sv", "it", "hi", "pt"];

    // The culture attribute of Umbraco core's own language file for each language (CMS 17.8.0
    // src/Umbraco.Core/EmbeddedResources/Lang). Core has no Hindi file, so hi uses hi-IN.
    private static readonly IReadOnlyDictionary<string, string> FileCultures = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["en"] = "en-GB",
        ["es"] = "es-ES",
        ["fr"] = "fr-FR",
        ["da"] = "da-DK",
        ["de"] = "de-DE",
        ["nb"] = "nb-NO",
        ["sv"] = "sv-SE",
        ["it"] = "it-IT",
        ["hi"] = "hi-IN",
        ["pt"] = "pt-BR",
    };

    /// <summary>
    /// Resolves the report language.
    /// </summary>
    /// <param name="setting">The step's report-language setting (a language code, or empty for automatic).</param>
    /// <param name="contentCulture">The evaluated content's culture (e.g. <c>da-DK</c>), or <see langword="null"/>.</param>
    /// <returns>One of <see cref="Supported"/>.</returns>
    public static string Resolve(string? setting, string? contentCulture)
        => ToSupported(setting) ?? ToSupported(contentCulture) ?? Default;

    /// <summary>
    /// Maps a language or culture code to a supported language (<c>da-DK</c> → <c>da</c>; <c>nb-NO</c>, <c>no</c>
    /// and <c>nn-NO</c> → <c>nb</c>; <c>pt-BR</c>/<c>pt-PT</c> → <c>pt</c>), or <see langword="null"/>.
    /// </summary>
    public static string? ToSupported(string? cultureOrLanguage)
    {
        if (string.IsNullOrWhiteSpace(cultureOrLanguage))
            return null;

        string language = cultureOrLanguage.Trim().Split('-', '_')[0].ToLowerInvariant();
        if (language is "no" or "nn")
            language = "nb";

        return FileCultures.ContainsKey(language) ? language : null;
    }

    /// <summary>
    /// The culture of the package's language file for <paramref name="language"/> (the culture CMS merges it into),
    /// e.g. <c>da</c> → <c>da-DK</c>. Unsupported languages map to English's.
    /// </summary>
    public static string FileCulture(string language)
        => FileCultures[ToSupported(language) ?? Default];
}
