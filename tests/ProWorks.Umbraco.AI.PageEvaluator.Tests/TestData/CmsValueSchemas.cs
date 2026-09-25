using System.Text.Json.Nodes;
using NSubstitute;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.PropertyEditors;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.TestData;

/// <summary>
/// Value schemas taken from the real CMS property editors (<see cref="IValueSchemaProvider"/>), so recommend tests
/// see what <c>IPropertyEditorSchemaService</c> returns on a real site rather than a stubbed "no schema".
/// Stubbing <c>SupportsSchema(...) = false</c> hid that every core text, tag and rich-text editor takes the
/// schema branch (found live 2026-09-24).
/// </summary>
internal static class CmsValueSchemas
{
    private static readonly IDataValueEditorFactory Factory = Substitute.For<IDataValueEditorFactory>();
    private static readonly IIOHelper IoHelper = Substitute.For<IIOHelper>();

    public static JsonObject TextBox(int? maxChars = null) =>
        new TextboxPropertyEditor(Factory, IoHelper).GetValueSchema(new TextboxConfiguration { MaxChars = maxChars })!;

    public static JsonObject TextArea(int? maxChars = null) =>
        new TextAreaPropertyEditor(Factory, IoHelper).GetValueSchema(new TextAreaConfiguration { MaxChars = maxChars })!;

    public static JsonObject Markdown() =>
        new MarkdownPropertyEditor(Factory).GetValueSchema(null)!;

    public static JsonObject Tags() =>
        new TagsPropertyEditor(Factory, IoHelper, Substitute.For<ITagPropertyIndexValueFactory>()).GetValueSchema(null)!;

    public static JsonObject RichText() =>
        new RichTextPropertyEditor(Factory, IoHelper, Substitute.For<IRichTextPropertyIndexValueFactory>())
            .GetValueSchema(new RichTextConfiguration())!;

    /// <summary>The fixture for an editor alias, as the controller would receive it.</summary>
    public static JsonObject For(string editorAlias, int? maxChars = null) => editorAlias switch
    {
        "Umbraco.TextBox" => TextBox(maxChars),
        "Umbraco.TextArea" => TextArea(maxChars),
        "Umbraco.MarkdownEditor" => Markdown(),
        "Umbraco.Tags" => Tags(),
        "Umbraco.RichText" or "Umbraco.TinyMCE" => RichText(),
        _ => throw new ArgumentOutOfRangeException(nameof(editorAlias), editorAlias, null),
    };
}
