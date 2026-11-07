using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Extensions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Culture normalisation shared by <see cref="ContentEvaluationService"/> and <c>POST /recommend</c>
/// (003 contracts/management-api.md §1, moved out of the controller in 006).
/// </summary>
internal static class ContentCultureRules
{
    /// <summary>The outcome of <see cref="NormaliseAsync"/>.</summary>
    /// <param name="Status"><see cref="ContentEvaluationStatus.Ok"/>, <see cref="ContentEvaluationStatus.InvalidCulture"/> or <see cref="ContentEvaluationStatus.CultureNotCreated"/>.</param>
    /// <param name="Culture">The cache-key culture: lower-cased ISO code, or <see cref="string.Empty"/> for invariant documents. Null unless Ok.</param>
    /// <param name="Message">English explanation for a rejected culture.</param>
    internal readonly record struct Normalised(ContentEvaluationStatus Status, string? Culture, string? Message);

    /// <summary>
    /// Invariant document types always use <see cref="string.Empty"/> (the supplied value is ignored);
    /// culture-varying ones need a configured language that exists on the node.
    /// </summary>
    public static async Task<Normalised> NormaliseAsync(IContent content, string? requested, ILanguageService languageService)
    {
        if (!content.ContentType.VariesByCulture())
            return new Normalised(ContentEvaluationStatus.Ok, string.Empty, null);

        if (string.IsNullOrWhiteSpace(requested))
            return new Normalised(ContentEvaluationStatus.InvalidCulture, null,
                "A culture is required for this document type because it varies by culture.");

        IEnumerable<ILanguage> languages = await languageService.GetAllAsync();
        ILanguage? language = languages.FirstOrDefault(l => string.Equals(l.IsoCode, requested, StringComparison.OrdinalIgnoreCase));
        if (language is null)
            return new Normalised(ContentEvaluationStatus.InvalidCulture, null, $"'{requested}' is not a configured language.");

        if (!content.IsCultureAvailable(language.IsoCode))
            return new Normalised(ContentEvaluationStatus.CultureNotCreated, null, $"This page has no content in '{language.IsoCode}' yet.");

        return new Normalised(ContentEvaluationStatus.Ok, language.IsoCode.ToLowerInvariant(), null);
    }

    /// <summary>The cache-key culture as the API/AI culture: <see langword="null"/> for invariant.</summary>
    public static string? NullIfInvariant(string culture) => culture.Length == 0 ? null : culture;

    /// <summary>The wire-format category for a rejected culture.</summary>
    public static string Category(ContentEvaluationStatus status) => status switch
    {
        ContentEvaluationStatus.InvalidCulture => "invalidCulture",
        ContentEvaluationStatus.CultureNotCreated => "cultureNotCreated",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Not a culture status."),
    };
}
