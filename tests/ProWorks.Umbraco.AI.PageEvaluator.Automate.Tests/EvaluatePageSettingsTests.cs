using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;
using Umbraco.Automate.Core.Settings;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// The step settings and output (contracts/automate-step.md §2–3, data-model §6).
/// </summary>
public class EvaluatePageSettingsTests
{
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Defaults_BindTheTriggerAndFailOnAnyFailedCheck()
    {
        var settings = new EvaluatePageSettings();

        Assert.Equal("${ trigger.contentKey }", settings.ContentKey);
        Assert.True(settings.FailOnAnyFailedCheck);
        Assert.Null(settings.Culture);
        Assert.Null(settings.PassThreshold);
        Assert.Null(settings.ReportLanguage);
    }

    [Theory]
    [InlineData(0.5, false)]
    [InlineData(5.5, false)]
    [InlineData(0.99, false)]
    [InlineData(1.0, true)]
    [InlineData(3.5, true)]
    [InlineData(5.0, true)]
    public void PassThreshold_RangeIsOneToFive(double threshold, bool valid)
    {
        var settings = new EvaluatePageSettings { PassThreshold = (decimal)threshold };

        bool isValid = Validator.TryValidateObject(settings, new ValidationContext(settings), [], validateAllProperties: true);

        Assert.Equal(valid, isValid);
    }

    [Fact]
    public void PassThreshold_NotSet_IsValid()
    {
        var settings = new EvaluatePageSettings();

        Assert.True(Validator.TryValidateObject(settings, new ValidationContext(settings), [], validateAllProperties: true));
    }

    [Fact]
    public void Settings_RoundTripThroughCamelCaseJson()
    {
        var settings = new EvaluatePageSettings
        {
            ContentKey = "${ trigger.contentKey }",
            Culture = "${ trigger.cultures[0] }",
            PassThreshold = 3.5m,
            FailOnAnyFailedCheck = false,
            ReportLanguage = "da",
        };

        string json = JsonSerializer.Serialize(settings, CamelCase);
        var back = JsonSerializer.Deserialize<EvaluatePageSettings>(json, CamelCase)!;

        Assert.Contains("\"contentKey\":", json);
        Assert.Contains("\"passThreshold\":3.5", json);
        Assert.Contains("\"failOnAnyFailedCheck\":false", json);
        Assert.Contains("\"reportLanguage\":\"da\"", json);
        Assert.Equivalent(settings, back);
    }

    [Theory]
    [InlineData(nameof(EvaluatePageSettings.ContentKey), "#pageEvaluatorAutomate_contentKeyLabel", true)]
    [InlineData(nameof(EvaluatePageSettings.Culture), "#pageEvaluatorAutomate_cultureLabel", true)]
    [InlineData(nameof(EvaluatePageSettings.PassThreshold), "#pageEvaluatorAutomate_passThresholdLabel", false)]
    [InlineData(nameof(EvaluatePageSettings.FailOnAnyFailedCheck), "#pageEvaluatorAutomate_failOnAnyFailedCheckLabel", false)]
    [InlineData(nameof(EvaluatePageSettings.ReportLanguage), "#pageEvaluatorAutomate_reportLanguageLabel", false)]
    public void Fields_UseTheLocalizedLabelKeys(string property, string label, bool supportsBindings)
    {
        FieldAttribute field = typeof(EvaluatePageSettings).GetProperty(property)!.GetCustomAttribute<FieldAttribute>()!;

        Assert.Equal(label, field.Label);
        Assert.Equal(label.Replace("Label", "Description"), field.Description);
        Assert.Equal(supportsBindings, field.SupportsBindings);
    }

    [Fact]
    public void ReportLanguage_IsADropdownOfAutomaticAndTheTenLanguages()
    {
        FieldAttribute field = typeof(EvaluatePageSettings).GetProperty(nameof(EvaluatePageSettings.ReportLanguage))!
            .GetCustomAttribute<FieldAttribute>()!;

        Assert.Equal("Umb.PropertyEditorUi.Dropdown", field.EditorUiAlias);
        Assert.Equal(ReportLanguages.DropdownConfig, field.EditorConfig);

        using JsonDocument config = JsonDocument.Parse(field.EditorConfig!);
        JsonElement items = config.RootElement[0];
        Assert.Equal("items", items.GetProperty("alias").GetString());
        string[] values = items.GetProperty("value").EnumerateArray().Select(i => i.GetProperty("value").GetString()!).ToArray();
        string[] names = items.GetProperty("value").EnumerateArray().Select(i => i.GetProperty("name").GetString()!).ToArray();

        Assert.Equal(["", "en", "es", "fr", "da", "de", "nb", "sv", "it", "hi", "pt"], values);
        Assert.Equal(["Automatic", "English", "Español", "Français", "Dansk", "Deutsch", "Norsk bokmål", "Svenska", "Italiano", "हिन्दी", "Português"], names);
    }

    [Fact]
    public void Output_SerialisesPassedAsJsonBoolean_ForSwitchConditions()
    {
        string json = JsonSerializer.Serialize(new EvaluatePageOutput { Passed = true }, CamelCase);

        Assert.Contains("\"passed\":true", json);
        Assert.Contains("\"failedCheckTitles\":[]", json);
        Assert.Contains("\"reportHtml\":\"\"", json);
    }

    [Fact]
    public void Output_EveryPropertyHasASchemaDescription()
    {
        PropertyInfo[] undocumented = typeof(EvaluatePageOutput).GetProperties()
            .Where(p => p.GetCustomAttribute<Json.Schema.Generation.DescriptionAttribute>() is null)
            .ToArray();

        Assert.Empty(undocumented);
    }
}
