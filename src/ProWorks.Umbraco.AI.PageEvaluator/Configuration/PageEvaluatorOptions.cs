namespace ProWorks.Umbraco.AI.PageEvaluator.Configuration;

/// <summary>
/// Options bound from the <c>ProWorks:PageEvaluator</c> configuration section.
/// </summary>
public sealed class PageEvaluatorOptions
{
    /// <summary>
    /// Property editor aliases from third-party or custom packages that should be treated
    /// as plain-text recommendable fields. Editors listed here gain both the Recommend and
    /// Apply buttons in the evaluation modal.
    /// </summary>
    /// <remarks>
    /// Comparison is case-insensitive. Built-in Umbraco editors (TextBox, TextArea, Markdown,
    /// Tags, RichText, TinyMCE) are always supported and do not need to be listed here.
    /// </remarks>
    /// <example>
    /// In <c>appsettings.json</c>:
    /// <code>
    /// "ProWorks": {
    ///   "PageEvaluator": {
    ///     "AdditionalRecommendableEditorAliases": [
    ///       "MyPackage.CustomTextEditor",
    ///       "AnotherPackage.RichEditor"
    ///     ]
    ///   }
    /// }
    /// </code>
    /// </example>
    public List<string> AdditionalRecommendableEditorAliases { get; set; } = [];
}
