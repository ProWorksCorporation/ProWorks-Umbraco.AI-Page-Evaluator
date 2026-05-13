using Umbraco.AI.Core.EditableModels;
using Umbraco.AI.Core.Tests;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests;

public sealed class PageEvaluatorTestFeatureConfig : AITestFeatureConfigBase
{
    [AIField(
        Label = "Mock Page Properties",
        Description = "JSON object mapping property aliases to mock content. Example: {\"title\": \"My Page\"}",
        EditorUiAlias = "Umb.PropertyEditorUi.TextArea",
        Group = "Input",
        SortOrder = 0)]
    public string MockPropertiesJson { get; set; } = "{}";
}
