namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;

/// <summary>
/// The "Report language" setting's dropdown (contracts/automate-step.md §2): Automatic plus the package's
/// 10 languages, each named in its own language.
/// </summary>
public static class ReportLanguages
{
    /// <summary>The value of the "Automatic" item: the content's language, then English.</summary>
    public const string Automatic = "";

    /// <summary>
    /// <c>EditorConfig</c> for <c>Umb.PropertyEditorUi.Dropdown</c> (the same <c>items</c> shape as Automate's own
    /// dropdown settings).
    /// </summary>
    public const string DropdownConfig = """
        [{ "alias": "items", "value": [
            { "name": "Automatic", "value": "" },
            { "name": "English", "value": "en" },
            { "name": "Español", "value": "es" },
            { "name": "Français", "value": "fr" },
            { "name": "Dansk", "value": "da" },
            { "name": "Deutsch", "value": "de" },
            { "name": "Norsk bokmål", "value": "nb" },
            { "name": "Svenska", "value": "sv" },
            { "name": "Italiano", "value": "it" },
            { "name": "हिन्दी", "value": "hi" },
            { "name": "Português", "value": "pt" }
        ] }]
        """;
}
