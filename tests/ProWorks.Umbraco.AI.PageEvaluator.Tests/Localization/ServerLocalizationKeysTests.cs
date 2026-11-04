using System.Text.RegularExpressions;
using System.Xml.Linq;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Localization;

/// <summary>
/// The server-side language files (006 contracts/server-localization.md, spec FR-028–FR-030) must all define
/// exactly <c>en.xml</c>'s keys, with the same <c>{tokens}</c>, under the <c>proworksPageEvaluator</c> area.
/// Mirrors the client's <c>localization-keys.test.ts</c>.
/// </summary>
public class ServerLocalizationKeysTests
{
    private const string Area = "proworksPageEvaluator";

    /// <summary>
    /// The <c>culture</c> attribute of Umbraco core's own language file for each language
    /// (<c>src/Umbraco.Core/EmbeddedResources/Lang/*.xml</c> in CMS 17.8.0). Core has no Hindi file, so
    /// <c>hi</c> uses the standard <c>hi-IN</c>.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string> ExpectedCultures = new Dictionary<string, string>
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

    public static TheoryData<string> Languages => new(ExpectedCultures.Keys);

    private static readonly Regex TokenPattern = new(@"\{(\w+)\}", RegexOptions.Compiled);

    internal static string LangFolder()
    {
        DirectoryInfo? dir = new(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "ProWorks.Umbraco.AI.PageEvaluator.sln")))
            dir = dir.Parent;

        Assert.NotNull(dir);
        return Path.Combine(dir!.FullName, "src", "ProWorks.Umbraco.AI.PageEvaluator", "wwwroot", "lang");
    }

    private static XDocument Load(string language) => XDocument.Load(Path.Combine(LangFolder(), language + ".xml"));

    private static Dictionary<string, string> Keys(XDocument doc) =>
        doc.Root!.Elements("area")
            .Where(a => (string?)a.Attribute("alias") == Area)
            .SelectMany(a => a.Elements("key"))
            .ToDictionary(k => (string)k.Attribute("alias")!, k => k.Value);

    private static SortedSet<string> Tokens(string value) =>
        new(TokenPattern.Matches(value).Select(m => m.Groups[1].Value), StringComparer.Ordinal);

    [Fact]
    public void ExactlyTheTenSupportedLanguageFilesExist()
    {
        string[] files = Directory.GetFiles(LangFolder(), "*.xml")
            .Select(Path.GetFileNameWithoutExtension)
            .OrderBy(f => f, StringComparer.Ordinal)
            .ToArray()!;

        Assert.Equal(ExpectedCultures.Keys.OrderBy(k => k, StringComparer.Ordinal), files);
    }

    [Theory]
    [MemberData(nameof(Languages))]
    public void File_ParsesAsAnUmbracoLanguageFile_WithThePackageArea(string language)
    {
        XDocument doc = Load(language);

        Assert.Equal("language", doc.Root!.Name.LocalName);
        Assert.Single(doc.Root.Elements("area"), a => (string?)a.Attribute("alias") == Area);
    }

    [Theory]
    [MemberData(nameof(Languages))]
    public void File_CultureAttribute_MatchesUmbracoCoresFileForTheLanguage(string language)
    {
        Assert.Equal(ExpectedCultures[language], (string?)Load(language).Root!.Attribute("culture"));
    }

    [Theory]
    [MemberData(nameof(Languages))]
    public void File_HasExactlyTheEnglishKeySet(string language)
    {
        var english = Keys(Load("en")).Keys.OrderBy(k => k, StringComparer.Ordinal).ToArray();
        var keys = Keys(Load(language)).Keys.OrderBy(k => k, StringComparer.Ordinal).ToArray();

        Assert.NotEmpty(english);
        Assert.Equal(english, keys);
    }

    [Theory]
    [MemberData(nameof(Languages))]
    public void File_HasNoEmptyValues(string language)
    {
        var empty = Keys(Load(language)).Where(k => string.IsNullOrWhiteSpace(k.Value)).Select(k => k.Key).ToArray();

        Assert.Empty(empty);
    }

    [Theory]
    [MemberData(nameof(Languages))]
    public void File_UsesTheSameTokensAsEnglish_ForEveryKey(string language)
    {
        Dictionary<string, string> english = Keys(Load("en"));
        Dictionary<string, string> translated = Keys(Load(language));

        foreach ((string key, string value) in english)
        {
            Assert.True(translated.TryGetValue(key, out string? other), $"{language}.xml is missing '{key}'.");
            Assert.True(Tokens(value).SetEquals(Tokens(other!)),
                $"{language}.xml '{key}' has tokens [{string.Join(", ", Tokens(other!))}], expected [{string.Join(", ", Tokens(value))}].");
        }
    }

    [Fact]
    public void English_DefinesEveryContractKey()
    {
        string[] contractKeys =
        [
            "reportTitle", "reportPage", "reportLanguage", "reportConfiguration", "reportEvaluatedAt", "reportFromCache",
            "reportOverallScore", "reportScoreOutOf", "reportAxisScores", "reportChecks", "reportStatusPass",
            "reportStatusFail", "reportStatusWarn", "reportVerdictPassed", "reportVerdictFailed", "reportVerdictNone",
            "reportParseFailed", "reportOpenInUmbraco", "reportInvariant",
            "summaryScored", "summaryUnscored", "summaryParseFailed",
            "errorInvalidContentKey", "errorContentNotFound", "errorCultureRequired", "errorInvalidCulture",
            "errorCultureNotCreated", "errorNoActiveConfig", "errorThresholdNeedsScoring", "errorGuardrailBlocked",
            "errorProviderUnavailable", "errorProviderConfiguration", "errorUnexpected",
        ];

        Dictionary<string, string> english = Keys(Load("en"));

        Assert.All(contractKeys, k => Assert.True(english.ContainsKey(k), $"en.xml is missing '{k}'."));
    }
}
