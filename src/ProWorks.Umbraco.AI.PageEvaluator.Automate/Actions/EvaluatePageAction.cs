using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Helpers;
using ProWorks.Umbraco.AI.PageEvaluator.Automate.Rendering;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services.Localization;
using Umbraco.AI.Core.Guardrails;
using Umbraco.AI.Core.Providers.Errors;
using Umbraco.Automate.Core.Actions;
using Umbraco.Automate.Core.Security;

namespace ProWorks.Umbraco.AI.PageEvaluator.Automate.Actions;

/// <summary>
/// The Umbraco Automate "Evaluate Page" step (006 User Stories 2 and 3, contracts/automate-step.md): evaluates the
/// latest saved version of a page with its active evaluator configuration, reusing an up-to-date cached result, and
/// outputs the score, a pass/fail verdict and an email-ready report.
/// </summary>
/// <remarks>
/// <para>
/// Actions are discovered by the TypeLoader and are singletons, while the evaluation services are scoped, so each run
/// creates its own DI scope. The step runs as the Automate workspace's service account, which needs Browse access
/// to the page. It never uses the editors' per-user evaluation rate limit (spec Assumptions).
/// </para>
/// <para>
/// Failures are returned (never thrown, which Automate would retry as Unknown) with a localized message; the original
/// exception is the inner exception and is logged.
/// </para>
/// </remarks>
[Action("proworks.evaluatePage", "Evaluate Page",
    Description = "Evaluates the latest saved version of a page with its active Page Evaluator configuration and reports the score, pass/fail and an email-ready report.",
    Group = "AI",
    Icon = "icon-checkbox",
    RequiredSections = ["content"],
    RequiredPermissions = ["Umb.Document.Read"])]
public sealed class EvaluatePageAction : ActionBase<EvaluatePageSettings, EvaluatePageOutput>
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAutomationActionAuthorizer _authorizer;
    private readonly IPageEvaluatorTextService _text;
    private readonly EvaluationReportHtmlRenderer _renderer;
    private readonly BackofficeLinkBuilder _linkBuilder;
    private readonly ILogger<EvaluatePageAction> _logger;

    public EvaluatePageAction(
        ActionInfrastructure infrastructure,
        IServiceScopeFactory scopeFactory,
        IAutomationActionAuthorizer authorizer,
        IPageEvaluatorTextService text,
        EvaluationReportHtmlRenderer renderer,
        BackofficeLinkBuilder linkBuilder,
        ILogger<EvaluatePageAction> logger)
        : base(infrastructure)
    {
        _scopeFactory = scopeFactory;
        _authorizer = authorizer;
        _text = text;
        _renderer = renderer;
        _linkBuilder = linkBuilder;
        _logger = logger;
    }

    /// <inheritdoc />
    public override async Task<ActionResult> ExecuteAsync(ActionContext context, CancellationToken cancellationToken)
    {
        EvaluatePageSettings settings = context.GetSettings<EvaluatePageSettings>();
        string? culture = string.IsNullOrWhiteSpace(settings.Culture) ? null : settings.Culture.Trim();
        // Before a report exists, messages follow the setting, then the requested culture.
        string language = ReportLanguageResolver.Resolve(settings.ReportLanguage, culture);

        // 1. Parse the content key.
        if (!Guid.TryParse(settings.ContentKey?.Trim(), out Guid contentKey))
        {
            return Fail(context, language, StepRunErrorCategory.Validation, "errorInvalidContentKey",
                new() { ["value"] = settings.ContentKey });
        }

        // 2. The service account needs Browse access (Automate's own content-step pattern).
        if (await _authorizer.AuthorizeContentOrFailAsync(contentKey, RequiredPermissions, cancellationToken) is { } denied)
        {
            context.LogError(denied.Exception?.Message ?? "Access to the page was denied.");
            return denied;
        }

        // 3. Evaluate in a scope of its own.
        ContentEvaluationResult result;
        try
        {
            await using AsyncServiceScope scope = _scopeFactory.CreateAsyncScope();
            IContentEvaluationService evaluation = scope.ServiceProvider.GetRequiredService<IContentEvaluationService>();

            result = await evaluation.EvaluateSavedAsync(
                contentKey,
                culture,
                reuseCache: true,
                authorize: static (_, _) => Task.FromResult(true), // already authorized above
                beforeAiCall: (config, _) =>
                {
                    // 5. Checked before the AI call, so a misconfigured step doesn't spend a request.
                    if (settings.PassThreshold is not null && !config.ScoringEnabled)
                        throw new ThresholdNeedsScoringException(config.Name);
                    return Task.CompletedTask;
                },
                cancellationToken);
        }
        catch (ThresholdNeedsScoringException ex)
        {
            return ThresholdNeedsScoring(context, language, ex.ConfigName);
        }
        catch (AIGuardrailBlockedException ex)
        {
            _logger.LogInformation(ex, "[PageEvaluator] Automate run {RunId}: a guardrail blocked the evaluation of {ContentKey}.",
                context.RunId, contentKey);
            return Fail(context, language, StepRunErrorCategory.Validation, "errorGuardrailBlocked",
                new() { ["message"] = ex.Message }, ex);
        }
        catch (OperationCanceledException ex)
        {
            context.LogError(ex.Message);
            return ActionResult.Failed(ex, StepRunErrorCategory.Cancelled);
        }
        catch (Exception ex)
        {
            // AIProviderException (also when wrapped) maps to its category; anything else is Unknown.
            StepRunErrorCategory category = StepErrorCategoryMapping.FromException(ex);
            AIProviderException? provider = FindProviderError(ex);
            _logger.LogError(ex,
                "[PageEvaluator] Automate run {RunId}: evaluating {ContentKey} failed ({Category}, provider {ProviderCategory}/{ProviderCode}).",
                context.RunId, contentKey, category, provider?.Category, provider?.ProviderCode);
            return Fail(context, language, category, ProviderMessageKey(category, provider is not null), null, ex);
        }

        // 4. Map the status.
        if (result.Status != ContentEvaluationStatus.Ok)
            return StatusFailure(context, language, contentKey, culture, result);

        // A reused result skips beforeAiCall, so check the configuration it was produced with as well.
        if (settings.PassThreshold is not null && result.Config is { ScoringEnabled: false } config)
            return ThresholdNeedsScoring(context, language, config.Name);

        // 6–8. Pass rule, rendering, output.
        EvaluatePageOutput output = BuildOutput(settings, contentKey, result);
        context.LogInfo(string.Create(CultureInfo.InvariantCulture,
            $"Evaluated '{result.ContentName}' ({result.Culture ?? "invariant"}) with '{output.ConfigName}': score {output.OverallScore?.ToString() ?? "none"}, passed {output.Passed?.ToString() ?? "n/a"}, fromCache {output.FromCache}."));

        return Success(output);
    }

    private EvaluatePageOutput BuildOutput(EvaluatePageSettings settings, Guid contentKey, ContentEvaluationResult result)
    {
        EvaluationReport report = result.Report!;
        bool scoringEnabled = result.Config?.ScoringEnabled ?? report.OverallScore is not null;
        decimal? overallScore = scoringEnabled && report.OverallScore is { } score ? (decimal)score : null;

        int failed = report.Checks.Count(c => c.Status == CheckStatus.Fail);
        bool? passed = PassRule.Evaluate(settings.PassThreshold, settings.FailOnAnyFailedCheck, overallScore, failed, report.ParseFailed);

        DateTime evaluatedAt = result.CachedAt ?? report.CachedAt ?? DateTime.UtcNow;
        evaluatedAt = evaluatedAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(evaluatedAt, DateTimeKind.Utc)
            : evaluatedAt.ToUniversalTime();

        string pageName = result.ContentName ?? contentKey.ToString();
        string configName = result.Config?.Name ?? string.Empty;

        var view = new EvaluationReportView
        {
            Report = report,
            PageName = pageName,
            Culture = result.Culture,
            Language = ReportLanguageResolver.Resolve(settings.ReportLanguage, result.Culture),
            BackofficeLink = _linkBuilder.Build(contentKey, result.Culture),
            ConfigName = configName,
            EvaluatedAt = evaluatedAt,
            FromCache = result.FromCache,
            ScoringEnabled = scoringEnabled,
            Passed = passed,
            Threshold = settings.PassThreshold,
        };

        return new EvaluatePageOutput
        {
            OverallScore = overallScore,
            Passed = passed,
            Threshold = settings.PassThreshold,
            PassedChecks = report.Checks.Count(c => c.Status == CheckStatus.Pass),
            FailedChecks = failed,
            WarningChecks = report.Checks.Count(c => c.Status == CheckStatus.Warn),
            FailedCheckTitles = report.Checks.Where(c => c.Status == CheckStatus.Fail).Select(c => c.Label).ToArray(),
            Summary = EvaluationSummaryBuilder.Build(_text, view),
            ReportHtml = _renderer.Render(view),
            ContentKey = contentKey,
            Culture = result.Culture,
            ConfigName = configName,
            EvaluatedAt = evaluatedAt,
            FromCache = result.FromCache,
            ParseFailed = report.ParseFailed,
        };
    }

    private ActionResult StatusFailure(
        ActionContext context, string language, Guid contentKey, string? culture, ContentEvaluationResult result)
    {
        string page = result.ContentName ?? contentKey.ToString();
        return result.Status switch
        {
            ContentEvaluationStatus.NodeNotFound => Fail(context, language, StepRunErrorCategory.Validation,
                "errorContentNotFound", new() { ["key"] = contentKey.ToString() }),
            ContentEvaluationStatus.InvalidCulture when culture is null => Fail(context, language, StepRunErrorCategory.Validation,
                "errorCultureRequired", new() { ["page"] = page }),
            ContentEvaluationStatus.InvalidCulture => Fail(context, language, StepRunErrorCategory.Validation,
                "errorInvalidCulture", new() { ["culture"] = culture }),
            ContentEvaluationStatus.CultureNotCreated => Fail(context, language, StepRunErrorCategory.Validation,
                "errorCultureNotCreated", new() { ["page"] = page, ["culture"] = culture }),
            ContentEvaluationStatus.NoActiveConfig => Fail(context, language, StepRunErrorCategory.Validation,
                "errorNoActiveConfig", new() { ["documentType"] = result.DocumentTypeAlias }),
            // Not expected: the step authorizes before evaluating and passes an always-true delegate.
            ContentEvaluationStatus.Forbidden => Fail(context, language, StepRunErrorCategory.Authentication,
                "errorUnexpected", null, new UnauthorizedAccessException(result.Message)),
            _ => Fail(context, language, StepRunErrorCategory.Unknown,
                "errorUnexpected", null, new InvalidOperationException(result.Message ?? result.Status.ToString())),
        };
    }

    private ActionResult ThresholdNeedsScoring(ActionContext context, string language, string configName)
        => Fail(context, language, StepRunErrorCategory.ConfigurationError, "errorThresholdNeedsScoring",
            new() { ["config"] = configName });

    private ActionResult Fail(
        ActionContext context,
        string language,
        StepRunErrorCategory category,
        string messageKey,
        Dictionary<string, string?>? tokens,
        Exception? inner = null)
    {
        string message = _text.Localize(messageKey, language, tokens);
        context.LogError(message);
        return ActionResult.Failed(new EvaluatePageStepException(message, inner), category);
    }

    private static string ProviderMessageKey(StepRunErrorCategory category, bool fromProvider) => category switch
    {
        _ when !fromProvider => "errorUnexpected",
        StepRunErrorCategory.RateLimiting or StepRunErrorCategory.ServiceUnavailable or StepRunErrorCategory.Timeout
            => "errorProviderUnavailable",
        StepRunErrorCategory.Authentication or StepRunErrorCategory.ConfigurationError => "errorProviderConfiguration",
        _ => "errorUnexpected",
    };

    private static AIProviderException? FindProviderError(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            if (current is AIProviderException provider)
                return provider;
        }

        return null;
    }

    /// <summary>Raised inside <c>beforeAiCall</c> to stop before the AI call.</summary>
    private sealed class ThresholdNeedsScoringException(string configName) : Exception
    {
        public string ConfigName { get; } = configName;
    }
}

/// <summary>
/// The exception of a failed "Evaluate Page" step: its message is the localized text shown in the run, and the
/// original failure (if any) is the inner exception.
/// </summary>
public sealed class EvaluatePageStepException : Exception
{
    public EvaluatePageStepException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
