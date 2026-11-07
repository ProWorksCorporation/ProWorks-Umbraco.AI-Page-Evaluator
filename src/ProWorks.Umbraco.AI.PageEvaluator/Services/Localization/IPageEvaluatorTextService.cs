namespace ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;

/// <summary>
/// Server-side text of the package (area <c>proworksPageEvaluator</c> in <c>wwwroot/lang/*.xml</c>), used where
/// there is no backoffice UI to localize it, such as the Automate step's report, summary and errors
/// (006 contracts/server-localization.md).
/// </summary>
public interface IPageEvaluatorTextService
{
    /// <summary>
    /// Returns the text for <paramref name="key"/> in <paramref name="language"/> with its named <c>{token}</c>s
    /// replaced. A missing translation falls back to English; a key missing everywhere returns the key itself.
    /// </summary>
    /// <param name="key">The key alias within the package area, e.g. <c>reportTitle</c>.</param>
    /// <param name="language">One of the package languages (see <see cref="ReportLanguageResolver.Supported"/>);
    /// anything else is treated as English.</param>
    /// <param name="tokens">Values for the <c>{name}</c> tokens. Replacement is single-pass, so token values are never
    /// themselves scanned for tokens; <see langword="null"/> values become empty.</param>
    string Localize(string key, string language, IDictionary<string, string?>? tokens = null);
}
