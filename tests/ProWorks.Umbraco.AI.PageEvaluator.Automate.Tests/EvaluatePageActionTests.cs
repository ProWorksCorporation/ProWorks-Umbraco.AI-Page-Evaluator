using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;
using Umbraco.AI.Core.Guardrails;
using Umbraco.AI.Core.Guardrails.Evaluators;
using Umbraco.AI.Core.Providers.Errors;
using Umbraco.Automate.Core.Actions;
using Umbraco.Automate.Core.Security;
using Umbraco.Automate.Core.Settings;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core.Hosting;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Tests;

/// <summary>
/// The "Evaluate Page" Automate step (006 User Stories 2 and 3; contracts/automate-step.md §1, §4).
/// </summary>
public class EvaluatePageActionTests
{
    private static readonly Guid Key = Guid.Parse("3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7");
    private static readonly DateTime CachedAt = new(2026, 11, 3, 14, 5, 0, DateTimeKind.Utc);

    private readonly IContentEvaluationService _evaluation = Substitute.For<IContentEvaluationService>();
    private readonly IEvaluationRateLimiter _limiter = Substitute.For<IEvaluationRateLimiter>();
    private readonly IServiceScopeFactory _scopeFactory = Substitute.For<IServiceScopeFactory>();
    private readonly IAutomationActionAuthorizer _authorizer = Substitute.For<IAutomationActionAuthorizer>();
    private readonly WebRoutingSettings _routing = new() { UmbracoApplicationUrl = "https://www.example.com/" };

    public EvaluatePageActionTests()
    {
        _scopeFactory.CreateScope().Returns(_ =>
        {
            var provider = Substitute.For<IServiceProvider>();
            provider.GetService(typeof(IContentEvaluationService)).Returns(_evaluation);
            provider.GetService(typeof(IEvaluationRateLimiter)).Returns(_limiter);
            var scope = Substitute.For<IServiceScope>();
            scope.ServiceProvider.Returns(provider);
            return scope;
        });

        _authorizer.AuthorizeContentAsync(Arg.Any<Guid>(), Arg.Any<IReadOnlySet<string>>(), Arg.Any<CancellationToken>())
            .Returns(AutomationAuthorizationResult.Success);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private EvaluatePageAction CreateAction(IPageEvaluatorTextService? text = null)
    {
        text ??= new TestText.Echo();
        var routing = Substitute.For<IOptionsMonitor<WebRoutingSettings>>();
        routing.CurrentValue.Returns(_routing);

        return new EvaluatePageAction(
            new ActionInfrastructure(Substitute.For<IEditableModelResolver>()),
            _scopeFactory,
            _authorizer,
            text,
            new EvaluationReportHtmlRenderer(text),
            new BackofficeLinkBuilder(routing, Substitute.For<IHostingEnvironment>()),
            NullLogger<EvaluatePageAction>.Instance);
    }

    private static ActionContext Context(EvaluatePageSettings settings) => new()
    {
        AutomationId = Guid.NewGuid(),
        RunId = Guid.NewGuid(),
        StepId = Guid.NewGuid(),
        ActionAlias = "proworks.evaluatePage",
        Settings = settings,
    };

    private static EvaluatePageSettings Settings(
        string? contentKey = null,
        string? culture = null,
        decimal? threshold = null,
        bool failOnAnyFailedCheck = true,
        string? reportLanguage = null) => new()
        {
            ContentKey = contentKey ?? Key.ToString(),
            Culture = culture,
            PassThreshold = threshold,
            FailOnAnyFailedCheck = failOnAnyFailedCheck,
            ReportLanguage = reportLanguage,
        };

    private static AIEvaluatorConfig Config(bool scoringEnabled = true) => new()
    {
        Id = Guid.NewGuid(),
        Name = "Home Page Scoring Test",
        DocumentTypeAlias = "home",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        IsActive = true,
        ScoringEnabled = scoringEnabled,
    };

    private static EvaluationReport Report(double? score, params CheckStatus[] statuses) => EvaluationReport.Parsed(
        null,
        statuses.Select((s, i) => new CheckResult(i + 1, s, $"Check {i + 1} ({s})", $"Why {i + 1}", null)).ToArray(),
        null,
        overallScore: score);

    private static ContentEvaluationResult Ok(
        EvaluationReport report, bool scoringEnabled = true, string? culture = null, bool fromCache = false) => new()
        {
            Status = ContentEvaluationStatus.Ok,
            Report = report.WithCachedAt(CachedAt).WithCulture(culture),
            Culture = culture,
            CachedAt = CachedAt,
            FromCache = fromCache,
            Config = Config(scoringEnabled),
            DocumentTypeAlias = "home",
            ContentName = "Home",
        };

    private void Returns(ContentEvaluationResult result) =>
        _evaluation.EvaluateSavedAsync(
                Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<bool>(),
                Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(),
                Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(),
                Arg.Any<CancellationToken>())
            .Returns(result);

    private void Throws(Exception ex) =>
        _evaluation.EvaluateSavedAsync(
                Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<bool>(),
                Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(),
                Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(),
                Arg.Any<CancellationToken>())
            .ThrowsAsync(ex);

    private Task<ActionResult> Run(EvaluatePageSettings settings, IPageEvaluatorTextService? text = null)
        => CreateAction(text).ExecuteAsync(Context(settings), CancellationToken.None);

    private static EvaluatePageOutput Output(ActionResult result)
    {
        Assert.Equal(ActionResultStatus.Success, result.Status);
        return Assert.IsType<EvaluatePageOutput>(result.OutputData);
    }

    private static void AssertFailed(ActionResult result, StepRunErrorCategory category, string message)
    {
        Assert.Equal(ActionResultStatus.Failed, result.Status);
        Assert.Equal(category, result.ErrorCategory);
        Assert.Equal(message, result.Exception!.Message);
    }

    private Task DidNotEvaluate() =>
        _evaluation.DidNotReceiveWithAnyArgs().EvaluateSavedAsync(default, default, default, default!, default, default);

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    [Fact]
    public void Action_HasTheContractMetadata()
    {
        ActionAttribute attribute = typeof(EvaluatePageAction).GetCustomAttribute<ActionAttribute>()!;
        EvaluatePageAction action = CreateAction();

        Assert.Equal("proworks.evaluatePage", attribute.Alias);
        Assert.Equal("Evaluate Page", attribute.Name);
        Assert.Equal("AI", attribute.Group);
        Assert.Equal("icon-checkbox", attribute.Icon);
        Assert.False(string.IsNullOrWhiteSpace(attribute.Description));
        Assert.Equal(["content"], action.RequiredSections);
        Assert.Equal(["Umb.Document.Read"], action.RequiredPermissions);
        Assert.Equal(typeof(EvaluatePageSettings), action.SettingsType);
        Assert.Equal(typeof(EvaluatePageOutput), action.OutputType);
    }

    // -------------------------------------------------------------------------
    // Validation, authorization, scope
    // -------------------------------------------------------------------------

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("")]
    [InlineData("${ trigger.contentKey }")]
    public async Task BadContentKey_IsAValidationFailure_WithoutAuthorizingOrEvaluating(string contentKey)
    {
        ActionResult result = await Run(Settings(contentKey: contentKey));

        AssertFailed(result, StepRunErrorCategory.Validation, $"en:errorInvalidContentKey[value={contentKey}]");
        await _authorizer.DidNotReceiveWithAnyArgs().AuthorizeContentAsync(default, default!, default);
        await DidNotEvaluate();
    }

    [Fact]
    public async Task Authorizes_TheServiceAccount_ForBrowse()
    {
        Returns(Ok(Report(4, CheckStatus.Pass)));

        await Run(Settings());

        await _authorizer.Received(1).AuthorizeContentAsync(
            Key, Arg.Is<IReadOnlySet<string>>(s => s.SetEquals(new[] { "Umb.Document.Read" })), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AuthorizationDenied_IsAnAuthenticationFailure_WithoutEvaluating()
    {
        _authorizer.AuthorizeContentAsync(Arg.Any<Guid>(), Arg.Any<IReadOnlySet<string>>(), Arg.Any<CancellationToken>())
            .Returns(AutomationAuthorizationResult.Fail("No access."));

        ActionResult result = await Run(Settings());

        Assert.Equal(ActionResultStatus.Failed, result.Status);
        Assert.Equal(StepRunErrorCategory.Authentication, result.ErrorCategory);
        await DidNotEvaluate();
    }

    [Fact]
    public async Task EachRun_UsesANewScope()
    {
        Returns(Ok(Report(4, CheckStatus.Pass)));
        EvaluatePageAction action = CreateAction();

        await action.ExecuteAsync(Context(Settings()), CancellationToken.None);
        await action.ExecuteAsync(Context(Settings()), CancellationToken.None);

        _scopeFactory.Received(2).CreateScope();
    }

    [Fact]
    public async Task EvaluatesTheSavedDraft_ReusingAnUpToDateResult()
    {
        Returns(Ok(Report(4, CheckStatus.Pass), culture: "da-dk"));

        await Run(Settings(culture: "da-DK"));

        await _evaluation.Received(1).EvaluateSavedAsync(
            Key, "da-DK", true,
            Arg.Is<Func<Guid, CancellationToken, Task<bool>>>(f => f(Key, CancellationToken.None).Result),
            Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task BlankCulture_IsPassedAsNull()
    {
        Returns(Ok(Report(4, CheckStatus.Pass)));

        await Run(Settings(culture: "  "));

        await _evaluation.Received(1).EvaluateSavedAsync(
            Key, null, true, Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(),
            Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task NeverUsesTheEditorRateLimit()
    {
        Returns(Ok(Report(4, CheckStatus.Pass)));

        await Run(Settings());

        Assert.Empty(_limiter.ReceivedCalls());
    }

    // -------------------------------------------------------------------------
    // Status mapping
    // -------------------------------------------------------------------------

    public static TheoryData<ContentEvaluationStatus, string?, string> StatusCases => new()
    {
        { ContentEvaluationStatus.NodeNotFound, null, $"en:errorContentNotFound[key={Key}]" },
        { ContentEvaluationStatus.InvalidCulture, "xx-YY", "en:errorInvalidCulture[culture=xx-YY]" },
        { ContentEvaluationStatus.InvalidCulture, null, "en:errorCultureRequired[page=Home]" },
        { ContentEvaluationStatus.CultureNotCreated, "da-DK", "da:errorCultureNotCreated[page=Home;culture=da-DK]" },
        { ContentEvaluationStatus.NoActiveConfig, null, "en:errorNoActiveConfig[documentType=home]" },
    };

    [Theory]
    [MemberData(nameof(StatusCases))]
    public async Task Status_MapsToAValidationFailure_WithALocalizedMessage(
        ContentEvaluationStatus status, string? culture, string message)
    {
        Returns(new ContentEvaluationResult
        {
            Status = status,
            DocumentTypeAlias = status == ContentEvaluationStatus.NodeNotFound ? null : "home",
            ContentName = status == ContentEvaluationStatus.NodeNotFound ? null : "Home",
            Message = "English log text",
        });

        ActionResult result = await Run(Settings(culture: culture));

        AssertFailed(result, StepRunErrorCategory.Validation, message);
    }

    [Fact]
    public async Task ErrorMessages_UseTheReportLanguageSetting()
    {
        Returns(new ContentEvaluationResult { Status = ContentEvaluationStatus.NodeNotFound });

        ActionResult result = await Run(Settings(reportLanguage: "fr", culture: "da-DK"));

        Assert.StartsWith("fr:errorContentNotFound", result.Exception!.Message);
    }

    // -------------------------------------------------------------------------
    // Threshold needs scoring
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ThresholdWithScoringOff_IsAConfigurationError_BeforeTheAICall()
    {
        bool aiCalled = false;
        _evaluation.EvaluateSavedAsync(
                Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<bool>(),
                Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(),
                Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(),
                Arg.Any<CancellationToken>())
            .Returns(async call =>
            {
                var beforeAiCall = call.ArgAt<Func<AIEvaluatorConfig, CancellationToken, Task>?>(4);
                Assert.NotNull(beforeAiCall);
                await beforeAiCall!(Config(scoringEnabled: false), CancellationToken.None);
                aiCalled = true;
                return Ok(Report(null, CheckStatus.Pass), scoringEnabled: false);
            });

        ActionResult result = await Run(Settings(threshold: 3.5m));

        AssertFailed(result, StepRunErrorCategory.ConfigurationError, "en:errorThresholdNeedsScoring[config=Home Page Scoring Test]");
        Assert.False(aiCalled);
    }

    [Fact]
    public async Task ThresholdWithScoringOn_LetsTheAICallThrough()
    {
        bool aiCalled = false;
        _evaluation.EvaluateSavedAsync(
                Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<bool>(),
                Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(),
                Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(),
                Arg.Any<CancellationToken>())
            .Returns(async call =>
            {
                await call.ArgAt<Func<AIEvaluatorConfig, CancellationToken, Task>?>(4)!(Config(), CancellationToken.None);
                aiCalled = true;
                return Ok(Report(4, CheckStatus.Pass));
            });

        ActionResult result = await Run(Settings(threshold: 3.5m));

        Assert.True(aiCalled);
        Assert.True(Output(result).Passed);
    }

    [Fact]
    public async Task ThresholdWithScoringOff_OnAReusedResult_IsStillAConfigurationError()
    {
        // A reused result skips beforeAiCall, so the step checks the returned configuration too.
        Returns(Ok(Report(null, CheckStatus.Pass), scoringEnabled: false, fromCache: true));

        ActionResult result = await Run(Settings(threshold: 2m));

        AssertFailed(result, StepRunErrorCategory.ConfigurationError, "en:errorThresholdNeedsScoring[config=Home Page Scoring Test]");
    }

    [Fact]
    public async Task NoThresholdWithScoringOff_Succeeds()
    {
        Returns(Ok(Report(null, CheckStatus.Pass), scoringEnabled: false));

        ActionResult result = await Run(Settings(threshold: null));

        Assert.True(Output(result).Passed);
    }

    // -------------------------------------------------------------------------
    // Exceptions
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Guardrail_IsAValidationFailure_WithTheGuardrailsMessage()
    {
        var guardrail = new AIGuardrailBlockedException(new AIGuardrailEvaluationResult
        {
            Action = AIGuardrailAction.Block,
            Phase = AIGuardrailPhase.PreGenerate,
            RuleResults = [],
        });
        Throws(guardrail);

        ActionResult result = await Run(Settings());

        AssertFailed(result, StepRunErrorCategory.Validation, $"en:errorGuardrailBlocked[message={guardrail.Message}]");
        Assert.Same(guardrail, result.Exception!.InnerException);
    }

    [Theory]
    [InlineData(AIProviderErrorCategory.RateLimited, StepRunErrorCategory.RateLimiting, "errorProviderUnavailable")]
    [InlineData(AIProviderErrorCategory.Transient, StepRunErrorCategory.ServiceUnavailable, "errorProviderUnavailable")]
    [InlineData(AIProviderErrorCategory.NetworkError, StepRunErrorCategory.ServiceUnavailable, "errorProviderUnavailable")]
    [InlineData(AIProviderErrorCategory.Authentication, StepRunErrorCategory.Authentication, "errorProviderConfiguration")]
    [InlineData(AIProviderErrorCategory.InvalidRequest, StepRunErrorCategory.ConfigurationError, "errorProviderConfiguration")]
    [InlineData(AIProviderErrorCategory.NotFound, StepRunErrorCategory.ConfigurationError, "errorProviderConfiguration")]
    [InlineData(AIProviderErrorCategory.Cancelled, StepRunErrorCategory.Cancelled, "errorUnexpected")]
    [InlineData(AIProviderErrorCategory.Unknown, StepRunErrorCategory.Unknown, "errorUnexpected")]
    public async Task ProviderError_IsMappedToItsStepCategory(
        AIProviderErrorCategory providerCategory, StepRunErrorCategory expected, string messageKey)
    {
        var error = new AIProviderException(new AIProviderErrorInfo(providerCategory, "user message", "code", "raw"));
        Throws(error);

        ActionResult result = await Run(Settings());

        AssertFailed(result, expected, "en:" + messageKey);
        Assert.Same(error, result.Exception!.InnerException);
    }

    [Fact]
    public async Task Cancellation_IsCancelled()
    {
        var cancelled = new OperationCanceledException();
        Throws(cancelled);

        ActionResult result = await Run(Settings());

        Assert.Equal(StepRunErrorCategory.Cancelled, result.ErrorCategory);
        Assert.Same(cancelled, result.Exception);
    }

    [Fact]
    public async Task AnythingElse_IsUnknown_WithTheOriginalAsInner()
    {
        var boom = new InvalidOperationException("boom");
        Throws(boom);

        ActionResult result = await Run(Settings());

        AssertFailed(result, StepRunErrorCategory.Unknown, "en:errorUnexpected");
        Assert.Same(boom, result.Exception!.InnerException);
    }

    [Fact]
    public async Task Failures_AreWrittenToTheStepLog()
    {
        Throws(new InvalidOperationException("boom"));
        ActionContext context = Context(Settings());

        await CreateAction().ExecuteAsync(context, CancellationToken.None);

        Assert.Contains(context.LogEntries, e => e.Level == ActionLogLevel.Error && e.Message.Contains("errorUnexpected"));
    }

    // -------------------------------------------------------------------------
    // Success output
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Success_FillsEveryOutputField()
    {
        Returns(Ok(Report(4, CheckStatus.Pass, CheckStatus.Pass, CheckStatus.Fail, CheckStatus.Warn, CheckStatus.Fail),
            culture: "da-dk", fromCache: true));
        ActionContext context = Context(Settings(culture: "da-DK", threshold: 3.5m, failOnAnyFailedCheck: false));

        ActionResult result = await CreateAction().ExecuteAsync(context, CancellationToken.None);
        EvaluatePageOutput output = Output(result);

        Assert.Equal(4m, output.OverallScore);
        Assert.True(output.Passed);
        Assert.Equal(3.5m, output.Threshold);
        Assert.Equal(2, output.PassedChecks);
        Assert.Equal(2, output.FailedChecks);
        Assert.Equal(1, output.WarningChecks);
        Assert.Equal(["Check 3 (Fail)", "Check 5 (Fail)"], output.FailedCheckTitles);
        Assert.Equal(Key, output.ContentKey);
        Assert.Equal("da-dk", output.Culture);
        Assert.Equal("Home Page Scoring Test", output.ConfigName);
        Assert.Equal(CachedAt, output.EvaluatedAt);
        Assert.Equal(DateTimeKind.Utc, output.EvaluatedAt.Kind);
        Assert.True(output.FromCache);
        Assert.False(output.ParseFailed);
        Assert.StartsWith("da:summaryScored[", output.Summary);
        Assert.Contains("da:reportTitle", output.ReportHtml);
        Assert.Contains("/umbraco/section/content/workspace/document/edit/3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7/da-DK", output.ReportHtml);
        Assert.Contains(context.LogEntries, e => e.Level == ActionLogLevel.Info);
    }

    [Fact]
    public async Task Success_ReportLanguageSetting_WinsOverTheContentCulture()
    {
        Returns(Ok(Report(4, CheckStatus.Pass), culture: "da-dk"));

        EvaluatePageOutput output = Output(await Run(Settings(culture: "da-DK", reportLanguage: "de")));

        Assert.StartsWith("de:", output.Summary);
        Assert.Contains("de:reportTitle", output.ReportHtml);
    }

    [Fact]
    public async Task Success_InvariantPage_HasNoCulture_AndEnglishText()
    {
        Returns(Ok(Report(4, CheckStatus.Pass)));

        EvaluatePageOutput output = Output(await Run(Settings(culture: "da-DK")));

        Assert.Null(output.Culture);
        // The step's culture setting is ignored for invariant pages; the report falls back to English.
        Assert.StartsWith("en:", output.Summary);
    }

    [Fact]
    public async Task Success_ParseFailure_IsReported_AndDoesNotPass()
    {
        Returns(Ok(EvaluationReport.Failed("not json")));

        EvaluatePageOutput output = Output(await Run(Settings()));

        Assert.True(output.ParseFailed);
        Assert.False(output.Passed);
        Assert.StartsWith("en:summaryParseFailed", output.Summary);
        Assert.Equal(0, output.FailedChecks);
    }

    [Fact]
    public async Task Success_NoSiteUrl_OmitsTheLink()
    {
        _routing.UmbracoApplicationUrl = null!;
        Returns(Ok(Report(4, CheckStatus.Pass)));

        EvaluatePageOutput output = Output(await Run(Settings()));

        Assert.DoesNotContain("href=", output.ReportHtml);
    }

    // -------------------------------------------------------------------------
    // User Story 3: auto-publish pages that pass (end to end through the action)
    // -------------------------------------------------------------------------

    public static TheoryData<double?, CheckStatus[], decimal?, bool, bool?> UserStory3 => new()
    {
        // Threshold 3.5: score 4 with no fails passes.
        { 4, [CheckStatus.Pass, CheckStatus.Warn], 3.5m, true, true },
        // Score 4 with one fail and the setting on doesn't.
        { 4, [CheckStatus.Pass, CheckStatus.Fail], 3.5m, true, false },
        // The same with the setting off passes.
        { 4, [CheckStatus.Pass, CheckStatus.Fail], 3.5m, false, true },
        // Score 3 doesn't.
        { 3, [CheckStatus.Pass], 3.5m, false, false },
        { 3, [CheckStatus.Pass], 3.5m, true, false },
        // No threshold, setting on: "no failed checks".
        { null, [CheckStatus.Pass, CheckStatus.Warn], null, true, true },
        { 5, [CheckStatus.Pass, CheckStatus.Fail], null, true, false },
        // Neither set: no verdict.
        { 2, [CheckStatus.Fail], null, false, null },
        // A missing score with a threshold doesn't pass.
        { null, [CheckStatus.Pass], 3.5m, true, false },
        { null, [CheckStatus.Pass], 3.5m, false, false },
    };

    [Theory]
    [MemberData(nameof(UserStory3))]
    public async Task UserStory3_PassedFollowsTheRules(
        double? score, CheckStatus[] checks, decimal? threshold, bool failOnAnyFailedCheck, bool? expected)
    {
        Returns(Ok(Report(score, checks), scoringEnabled: true));

        EvaluatePageOutput output = Output(await Run(Settings(threshold: threshold, failOnAnyFailedCheck: failOnAnyFailedCheck)));

        Assert.Equal(expected, output.Passed);
        Assert.Equal(threshold, output.Threshold);
    }

    [Fact]
    public async Task UserStory3_MissingScoreWithThreshold_SummaryMentionsTheMissingScore()
    {
        Returns(Ok(Report(null, CheckStatus.Pass, CheckStatus.Pass)));

        EvaluatePageOutput output = Output(await Run(Settings(threshold: 3.5m), TestText.Real()));

        Assert.False(output.Passed);
        Assert.Null(output.OverallScore);
        Assert.Equal("Home: 2 passed, 0 failed, 0 warnings. Not passed: the AI gave no overall score.", output.Summary);
        Assert.Contains("the AI gave no overall score", output.ReportHtml);
    }

    [Theory]
    [InlineData(4.0, "true")]
    [InlineData(3.0, "false")]
    public async Task UserStory3_PassedSerialisesAsABooleanForSwitch(double score, string json)
    {
        Returns(Ok(Report(score, CheckStatus.Pass)));

        EvaluatePageOutput output = Output(await Run(Settings(threshold: 3.5m)));
        string serialised = JsonSerializer.Serialize(output, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Contains($"\"passed\":{json}", serialised);
    }

    [Fact]
    public async Task UserStory3_NoRule_SerialisesPassedAsNull()
    {
        Returns(Ok(Report(4, CheckStatus.Pass)));

        EvaluatePageOutput output = Output(await Run(Settings(threshold: null, failOnAnyFailedCheck: false)));
        string serialised = JsonSerializer.Serialize(output, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Contains("\"passed\":null", serialised);
    }

    [Fact]
    public async Task UserStory3_FractionalScore_IsKept()
    {
        Returns(Ok(Report(3.75, CheckStatus.Pass)));

        EvaluatePageOutput output = Output(await Run(Settings(threshold: 3.7m)));

        Assert.Equal(3.75m, output.OverallScore);
        Assert.True(output.Passed);
    }

    // -------------------------------------------------------------------------
    // Stored settings, as Automate saves and reads them back (live-test finding, 2026-11-05)
    // -------------------------------------------------------------------------

    /// <summary>
    /// Automate's real settings resolver (internal <c>EditableModelResolver</c>), so the settings go through the same
    /// JSON options and single-value-array converter as a live run (<c>ActionStepBody</c> → <c>ResolveSettings</c>).
    /// </summary>
    private EvaluatePageAction CreateActionWithAutomatesResolver()
    {
        Type resolverType = typeof(IEditableModelResolver).Assembly
            .GetType("Umbraco.Automate.Core.Settings.EditableModelResolver", throwOnError: true)!;
        var references = Substitute.For<IConfigurationReferenceResolver>();
        references.ContainsReference(Arg.Any<string?>()).Returns(false);
        // No `$Key:Path` references in these settings: values pass through unchanged, as with the real resolver.
        references.Resolve(Arg.Any<object?>(), Arg.Any<Type>(), Arg.Any<bool>()).Returns(call => call.ArgAt<object?>(0));
        var resolver = (IEditableModelResolver)Activator.CreateInstance(
            resolverType, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic, null, [references], null)!;

        var routing = Substitute.For<IOptionsMonitor<WebRoutingSettings>>();
        routing.CurrentValue.Returns(_routing);
        var text = new TestText.Echo();
        return new EvaluatePageAction(
            new ActionInfrastructure(resolver), _scopeFactory, _authorizer, text, new EvaluationReportHtmlRenderer(text),
            new BackofficeLinkBuilder(routing, Substitute.For<IHostingEnvironment>()), NullLogger<EvaluatePageAction>.Instance);
    }

    /// <summary>The step's settings dictionary as Automate deserializes it from the stored automation definition.</summary>
    private EvaluatePageSettings ResolveStored(string settingsJson)
    {
        Dictionary<string, object?> stored = JsonSerializer.Deserialize<Dictionary<string, object?>>(settingsJson)!;
        return Assert.IsType<EvaluatePageSettings>(CreateActionWithAutomatesResolver().ResolveSettings(stored));
    }

    // The dropdown editor stores its value as an array: [] for "Automatic", ["da"] for a language. These are the shapes
    // the TestSite's automation actually stored.
    [Theory]
    [InlineData("""{"contentKey":"${ trigger.contentKey }","culture":"de-DE","passThreshold":3.5,"failOnAnyFailedCheck":true,"reportLanguage":[]}""", null)]
    [InlineData("""{"contentKey":"${ trigger.contentKey }","culture":"en-US","passThreshold":null,"failOnAnyFailedCheck":true,"reportLanguage":["da"]}""", "da")]
    [InlineData("""{"contentKey":"${ trigger.contentKey }","culture":"en-US","reportLanguage":"da"}""", "da")]
    [InlineData("""{"contentKey":"${ trigger.contentKey }","culture":"en-US"}""", null)]
    public void StoredSettings_ResolveTheReportLanguageDropdownValue(string settingsJson, string? expected)
    {
        EvaluatePageSettings settings = ResolveStored(settingsJson);

        Assert.Equal(expected, string.IsNullOrEmpty(settings.ReportLanguage) ? null : settings.ReportLanguage);
    }

    [Fact]
    public void StoredSettings_ResolveEveryField_AsSavedByTheAutomateEditor()
    {
        EvaluatePageSettings settings = ResolveStored(
            """{"contentKey":"${ trigger.contentKey }","culture":"${ trigger.cultures[0] }","passThreshold":3.5,"failOnAnyFailedCheck":false,"reportLanguage":["da"]}""");

        Assert.Equal("${ trigger.contentKey }", settings.ContentKey);
        Assert.Equal("${ trigger.cultures[0] }", settings.Culture);
        Assert.Equal(3.5m, settings.PassThreshold);
        Assert.False(settings.FailOnAnyFailedCheck);
        Assert.Equal("da", settings.ReportLanguage);
    }

    [Fact]
    public void StoredSettings_MissingFailOnAnyFailedCheck_KeepsTheDefaultOn()
    {
        EvaluatePageSettings settings = ResolveStored("""{"contentKey":"${ trigger.contentKey }"}""");

        Assert.True(settings.FailOnAnyFailedCheck);
        Assert.Null(settings.PassThreshold);
    }

    [Theory]
    [InlineData("""{"contentKey":"3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7","culture":"da-DK","reportLanguage":[]}""", "da:")]  // Automatic → the page's language
    [InlineData("""{"contentKey":"3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7","culture":"en-US","reportLanguage":["da"]}""", "da:")] // chosen language wins
    [InlineData("""{"contentKey":"3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7","culture":"en-US","reportLanguage":[]}""", "en:")]
    public async Task StoredSettings_DriveTheReportLanguage_EndToEnd(string settingsJson, string summaryPrefix)
    {
        EvaluatePageSettings settings = ResolveStored(settingsJson);
        string evaluatedCulture = settings.Culture!.ToLowerInvariant();
        Returns(Ok(Report(4, CheckStatus.Pass), culture: evaluatedCulture));

        EvaluatePageOutput output = Output(await Run(settings));

        Assert.StartsWith(summaryPrefix, output.Summary);
    }
}
