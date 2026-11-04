using System.Globalization;
using Microsoft.Extensions.FileProviders;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Localization;

/// <summary>
/// <see cref="PageEvaluatorTextService"/> (contracts/server-localization.md §3): reads the package area through
/// <see cref="ILocalizedTextService"/>, replaces named <c>{token}</c>s and falls back to English.
/// </summary>
public class PageEvaluatorTextServiceTests
{
    private const string Area = "proworksPageEvaluator";

    private readonly ILocalizedTextService _textService = Substitute.For<ILocalizedTextService>();
    private readonly Dictionary<string, Dictionary<string, string>> _byCulture = new();

    public PageEvaluatorTextServiceTests()
    {
        _textService.GetSupportedCultures().Returns(_ => _byCulture.Keys.Select(CultureInfo.GetCultureInfo).ToArray());
        _textService.GetAllStoredValuesByAreaAndAlias(Arg.Any<CultureInfo>()).Returns(call =>
        {
            var culture = call.Arg<CultureInfo>();
            IDictionary<string, IDictionary<string, string>> result = new Dictionary<string, IDictionary<string, string>>();
            if (_byCulture.TryGetValue(culture.Name, out Dictionary<string, string>? keys))
                result[Area] = keys;
            return result;
        });
    }

    private PageEvaluatorTextService Create(IFileProvider? packageFiles = null) =>
        new(_textService, new PackageLanguageFiles(packageFiles ?? new NullFileProvider(), "lang"));

    [Fact]
    public void Localize_ReadsThePackageAreaInTheLanguagesFileCulture()
    {
        _byCulture["da-DK"] = new() { ["reportTitle"] = "Sideevaluering" };
        _byCulture["en-GB"] = new() { ["reportTitle"] = "Page Evaluation" };

        Assert.Equal("Sideevaluering", Create().Localize("reportTitle", "da"));
    }

    [Fact]
    public void Localize_ReplacesNamedTokens()
    {
        _byCulture["en-GB"] = new() { ["summaryUnscored"] = "{page}: {passed} passed, {failed} failed. {verdict}." };

        string text = Create().Localize("summaryUnscored", "en", new Dictionary<string, string?>
        {
            ["page"] = "Home",
            ["passed"] = "3",
            ["failed"] = "1",
            ["verdict"] = "Not passed",
        });

        Assert.Equal("Home: 3 passed, 1 failed. Not passed.", text);
    }

    [Fact]
    public void Localize_TokenValues_AreNotThemselvesReplaced()
    {
        _byCulture["en-GB"] = new() { ["summaryUnscored"] = "{page} / {verdict}" };

        string text = Create().Localize("summaryUnscored", "en", new Dictionary<string, string?>
        {
            ["page"] = "My {verdict} page",
            ["verdict"] = "Passed",
        });

        Assert.Equal("My {verdict} page / Passed", text);
    }

    [Fact]
    public void Localize_UnknownTokensAreLeftAndNullValuesAreEmpty()
    {
        _byCulture["en-GB"] = new() { ["k"] = "[{a}] [{b}]" };

        Assert.Equal("[] [{b}]", Create().Localize("k", "en", new Dictionary<string, string?> { ["a"] = null }));
    }

    [Fact]
    public void Localize_KeyMissingInTheLanguage_FallsBackToEnglish()
    {
        _byCulture["da-DK"] = new() { ["reportTitle"] = "Sideevaluering" };
        _byCulture["en-GB"] = new() { ["reportTitle"] = "Page Evaluation", ["reportChecks"] = "Checks" };

        Assert.Equal("Checks", Create().Localize("reportChecks", "da"));
    }

    [Fact]
    public void Localize_UnsupportedLanguage_IsTreatedAsEnglish()
    {
        _byCulture["en-GB"] = new() { ["reportTitle"] = "Page Evaluation" };

        Assert.Equal("Page Evaluation", Create().Localize("reportTitle", "nl"));
    }

    [Fact]
    public void Localize_KeyMissingEverywhere_ReturnsTheKey()
    {
        _byCulture["en-GB"] = new();

        Assert.Equal("nope", Create().Localize("nope", "fr"));
    }

    [Fact]
    public void Localize_LanguageCmsDoesNotLoad_ReadsThePackagesOwnFile()
    {
        // Umbraco core has no Hindi language file, so CMS never merges hi.xml into ILocalizedTextService.
        _byCulture["en-GB"] = new() { ["reportOpenInUmbraco"] = "Open in Umbraco" };
        var wwwroot = new PhysicalFileProvider(Path.GetDirectoryName(ServerLocalizationKeysTests.LangFolder())!);

        string text = Create(wwwroot).Localize("reportOpenInUmbraco", "hi");

        Assert.Equal("Umbraco में खोलें", text);
        _textService.DidNotReceive().GetAllStoredValuesByAreaAndAlias(Arg.Is<CultureInfo>(c => c.Name == "hi-IN"));
    }

    [Fact]
    public void Localize_SiteOverrideThroughCms_WinsOverThePackageFile()
    {
        _byCulture["en-GB"] = new() { ["reportOpenInUmbraco"] = "View in the backoffice" };
        var wwwroot = new PhysicalFileProvider(Path.GetDirectoryName(ServerLocalizationKeysTests.LangFolder())!);

        Assert.Equal("View in the backoffice", Create(wwwroot).Localize("reportOpenInUmbraco", "en"));
    }

    [Fact]
    public void Localize_CmsHasNoEnglishArea_FallsBackToThePackagesEnglishFile()
    {
        var wwwroot = new PhysicalFileProvider(Path.GetDirectoryName(ServerLocalizationKeysTests.LangFolder())!);

        Assert.Equal("Open in Umbraco", Create(wwwroot).Localize("reportOpenInUmbraco", "nl"));
    }
}
