using System.ComponentModel.DataAnnotations;
using Umbraco.Automate.Core.Settings;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;

/// <summary>
/// Settings of the "Evaluate Page" step (contracts/automate-step.md §2, data-model §6). Labels and descriptions
/// are <c>#pageEvaluatorAutomate_*</c> keys in the main package's backoffice localization files.
/// </summary>
/// <remarks>
/// Only <see cref="string"/> settings resolve <c>${ }</c> bindings in Automate. The settings hold no
/// environment-specific identifiers other than the content key text (spec FR-026).
/// </remarks>
public sealed class EvaluatePageSettings
{
    /// <summary>The page to evaluate: a content key, normally bound to the triggering content.</summary>
    [Field(Label = "#pageEvaluatorAutomate_contentKeyLabel", Description = "#pageEvaluatorAutomate_contentKeyDescription",
        SupportsBindings = true, SortOrder = 1)]
    public string ContentKey { get; set; } = "${ trigger.contentKey }";

    /// <summary>
    /// The culture to evaluate (ISO code). Required for culture-varying document types, ignored for invariant ones.
    /// E.g. <c>${ trigger.cultures[0] }</c>, or <c>${ loop.item }</c> inside a ForEach over <c>${ trigger.cultures }</c>.
    /// </summary>
    [Field(Label = "#pageEvaluatorAutomate_cultureLabel", Description = "#pageEvaluatorAutomate_cultureDescription",
        SupportsBindings = true, SortOrder = 2)]
    public string? Culture { get; set; }

    /// <summary>Optional pass threshold on the report's 1–5 overall-score scale.</summary>
    [Field(Label = "#pageEvaluatorAutomate_passThresholdLabel", Description = "#pageEvaluatorAutomate_passThresholdDescription",
        SortOrder = 3)]
    [Range(typeof(decimal), "1", "5")]
    public decimal? PassThreshold { get; set; }

    /// <summary>Whether any check with Fail status fails the page (warnings never do).</summary>
    [Field(Label = "#pageEvaluatorAutomate_failOnAnyFailedCheckLabel", Description = "#pageEvaluatorAutomate_failOnAnyFailedCheckDescription",
        SortOrder = 4)]
    public bool FailOnAnyFailedCheck { get; set; } = true;

    /// <summary>The language of the summary, report and error messages; empty for automatic.</summary>
    [Field(Label = "#pageEvaluatorAutomate_reportLanguageLabel", Description = "#pageEvaluatorAutomate_reportLanguageDescription",
        EditorUiAlias = "Umb.PropertyEditorUi.Dropdown", EditorConfig = ReportLanguages.DropdownConfig, SortOrder = 5)]
    public string? ReportLanguage { get; set; }
}
