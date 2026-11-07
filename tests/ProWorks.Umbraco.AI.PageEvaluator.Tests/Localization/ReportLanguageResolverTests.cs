using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Localization;

/// <summary>
/// Report language order (spec FR-029, contracts/server-localization.md §2): the step setting, then the content
/// culture's language when supported, then English.
/// </summary>
public class ReportLanguageResolverTests
{
    [Theory]
    [InlineData("de", "da-DK", "de")]
    [InlineData("fr", null, "fr")]
    [InlineData("hi", "en-US", "hi")]
    [InlineData("PT", "da-DK", "pt")]
    public void Resolve_SupportedSetting_Wins(string setting, string? contentCulture, string expected)
    {
        Assert.Equal(expected, ReportLanguageResolver.Resolve(setting, contentCulture));
    }

    [Theory]
    [InlineData("da-DK", "da")]
    [InlineData("da-dk", "da")]
    [InlineData("nb-NO", "nb")]
    [InlineData("no", "nb")]
    [InlineData("nn-NO", "nb")]
    [InlineData("pt-BR", "pt")]
    [InlineData("pt-PT", "pt")]
    [InlineData("en-US", "en")]
    [InlineData("es-MX", "es")]
    [InlineData("sv-SE", "sv")]
    [InlineData("hi-IN", "hi")]
    public void Resolve_NoSetting_UsesTheContentCulturesLanguage(string contentCulture, string expected)
    {
        Assert.Equal(expected, ReportLanguageResolver.Resolve(null, contentCulture));
        Assert.Equal(expected, ReportLanguageResolver.Resolve("", contentCulture));
    }

    [Theory]
    [InlineData("ja-JP")]
    [InlineData("nl-NL")]
    [InlineData("zz")]
    public void Resolve_UnsupportedContentCulture_IsEnglish(string contentCulture)
    {
        Assert.Equal("en", ReportLanguageResolver.Resolve(null, contentCulture));
    }

    [Fact]
    public void Resolve_UnsupportedSetting_FallsThroughToTheContentCulture()
    {
        Assert.Equal("da", ReportLanguageResolver.Resolve("nl", "da-DK"));
    }

    [Fact]
    public void Resolve_Nothing_IsEnglish()
    {
        Assert.Equal("en", ReportLanguageResolver.Resolve(null, null));
        Assert.Equal("en", ReportLanguageResolver.Resolve("  ", "  "));
    }

    [Fact]
    public void Supported_IsTheTenPackageLanguages()
    {
        Assert.Equal(["en", "es", "fr", "da", "de", "nb", "sv", "it", "hi", "pt"], ReportLanguageResolver.Supported);
    }

    [Theory]
    [InlineData("en", "en-GB")]
    [InlineData("da", "da-DK")]
    [InlineData("nb", "nb-NO")]
    [InlineData("pt", "pt-BR")]
    [InlineData("hi", "hi-IN")]
    public void FileCulture_MatchesTheLanguageFilesCultureAttribute(string language, string expected)
    {
        Assert.Equal(expected, ReportLanguageResolver.FileCulture(language));
        Assert.Equal(ServerLocalizationKeysTests.ExpectedCultures[language], ReportLanguageResolver.FileCulture(language));
    }
}
