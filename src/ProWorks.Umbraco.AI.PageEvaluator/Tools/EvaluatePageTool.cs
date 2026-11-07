using System.ComponentModel;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Tools.Scopes;
using Umbraco.AI.Core;
using Umbraco.AI.Core.Guardrails;
using Umbraco.AI.Core.Providers.Errors;
using Umbraco.AI.Core.RuntimeContext;
using Umbraco.AI.Core.Tools;
using Umbraco.AI.Core.Tools.Umbraco;
using Umbraco.Cms.Core.Security;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tools;

/// <summary>Arguments for the <c>evaluate_page</c> tool.</summary>
public sealed record EvaluatePageArgs(
    [property: Description("Key (GUID) of the page to evaluate. Defaults to the page currently open, if any.")]
    Guid? NodeId = null,
    [property: Description("ISO culture code, e.g. en-US. Required for pages that vary by language; ignored otherwise.")]
    string? Culture = null,
    [property: Description("Only set this to true when a new evaluation is explicitly asked for (for example \"run it again\" or \"rescore\"). Otherwise leave it out: an up-to-date cached result is reused, and a page saved since its last evaluation is evaluated again anyway.")]
    bool? Fresh = null);

/// <summary>
/// The read-only <c>evaluate_page</c> server tool (006 contracts/server-tool.md, research R6): evaluates the latest
/// saved draft of a page by id for agents, including ones with no open page (Automate's "Run AI Agent"). Discovered by
/// Umbraco.AI's type scan; granted per agent through the Page Evaluator Read scope. Non-destructive, so Copilot keeps it.
/// <list type="bullet">
///   <item>Order (inside <see cref="IContentEvaluationService"/>): node exists → <see cref="IUmbracoReadAuthorizer"/>
///   (the current backoffice user: the editor in Copilot, the workspace service account in Automate; no user is
///   denied) → culture → active configuration.</item>
///   <item>The shared per-user <see cref="IEvaluationRateLimiter"/> runs in the <c>beforeAiCall</c> gate, so reusing an
///   up-to-date cached result costs no permit.</item>
///   <item>Expected failures return <c>{ success: false, error: { code, message } }</c>; only the caller's own
///   cancellation is rethrown.</item>
/// </list>
/// Tools live in Umbraco.AI's singleton tool collection, so the scoped evaluation service is resolved per call
/// through <see cref="IServiceScopeFactory"/>. The evaluation runs through the existing <c>proworks-page-evaluator</c>
/// chat alias, so it appears in Umbraco.AI's audit log like any other evaluation (spec FR-044).
/// </summary>
[AITool("evaluate_page", "Evaluate Page", ScopeId = PageEvaluatorReadScope.ScopeId)]
public sealed class EvaluatePageTool(
    IServiceScopeFactory scopeFactory,
    IAIRuntimeContextAccessor runtimeContextAccessor,
    IUmbracoReadAuthorizer readAuthorizer,
    IEvaluationRateLimiter rateLimiter,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
    ILogger<EvaluatePageTool> logger)
    : AIToolBase<EvaluatePageArgs>
{
    private const string DocumentEntityType = "document";

    // English, model-facing messages (identical to the Copilot tools' where the code is shared; spec FR-014: never
    // stack traces, raw provider text or HTTP bodies).
    private const string MissingNodeIdMessage =
        "No page was given and no page is open. Pass the page's key (GUID) as nodeId.";
    private const string NotFoundMessage = "The page doesn't exist.";
    private const string ForbiddenMessage = "The user doesn't have permission to browse this page.";
    private const string InvalidCultureMessage =
        "The language isn't valid for this page. Pages that vary by language need the culture of an existing language, e.g. en-US.";
    private const string CultureNotCreatedMessage = "The page doesn't have a version in this language yet.";
    private const string NoActiveConfigMessage = "There is no active Page Evaluator configuration for this page's document type.";
    private const string RateLimitedMessage = "Too many evaluation requests. Wait a minute and try again.";
    private const string GuardrailBlockedMessage = "A guardrail blocked the request.";
    private const string ProviderUnavailableMessage = "The AI provider is temporarily unavailable. Try again shortly.";
    private const string ProviderConfigurationMessage =
        "The AI provider couldn't be used because of an authentication or configuration problem. An administrator needs to check the AI connection.";
    private const string UnexpectedMessage = "Something went wrong. Try again later.";

    /// <inheritdoc />
    public override string Description =>
        "Evaluates the latest saved version of an Umbraco page against the site's Page Evaluator checks and returns the score (overall and per dimension, on a 1–5 scale where 5 is best) and each check's result. Unsaved changes in an open editor are not included. Reuses an up-to-date cached result (no new AI call) unless fresh is true; do not set fresh unless a new evaluation was explicitly asked for.";

    /// <inheritdoc />
    protected override async Task<object> ExecuteAsync(EvaluatePageArgs args, CancellationToken cancellationToken = default)
    {
        Guid? nodeId = args.NodeId ?? OpenDocumentId();
        if (nodeId is not Guid key || key == Guid.Empty)
            return ModelReportFactory.Failure("invalidArguments", MissingNodeIdMessage);

        try
        {
            await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
            IContentEvaluationService evaluation = scope.ServiceProvider.GetRequiredService<IContentEvaluationService>();

            ContentEvaluationResult result = await evaluation.EvaluateSavedAsync(
                key,
                args.Culture,
                reuseCache: args.Fresh != true,
                authorize: (id, _) => readAuthorizer.CanReadContentAsync(id),
                beforeAiCall: (_, _) =>
                {
                    // Only reached when an AI call will happen: a reused cached result costs no permit.
                    if (!rateLimiter.TryAcquire(RateLimitKey()))
                        throw new RateLimitExceededException();
                    return Task.CompletedTask;
                },
                cancellationToken);

            return result.Status switch
            {
                ContentEvaluationStatus.Ok => ModelReportFactory.Create(key, result),
                ContentEvaluationStatus.NodeNotFound => ModelReportFactory.Failure("notFound", NotFoundMessage),
                ContentEvaluationStatus.Forbidden => ModelReportFactory.Failure("forbidden", ForbiddenMessage),
                ContentEvaluationStatus.InvalidCulture => ModelReportFactory.Failure("invalidCulture", InvalidCultureMessage),
                ContentEvaluationStatus.CultureNotCreated => ModelReportFactory.Failure("cultureNotCreated", CultureNotCreatedMessage),
                ContentEvaluationStatus.NoActiveConfig => ModelReportFactory.Failure("noActiveConfig", NoActiveConfigMessage),
                _ => Unexpected(new InvalidOperationException($"Unexpected evaluation status {result.Status}."), key),
            };
        }
        catch (RateLimitExceededException)
        {
            return ModelReportFactory.Failure("rateLimited", RateLimitedMessage);
        }
        catch (AIGuardrailBlockedException ex)
        {
            logger.LogInformation(ex, "[PageEvaluator] Guardrail blocked the evaluate_page evaluation of node {NodeId}.", key);
            return ModelReportFactory.Failure("guardrailBlocked", $"{GuardrailBlockedMessage} {ex.Message}");
        }
        catch (AIProviderException ex)
        {
            logger.LogError(ex, "[PageEvaluator] AI provider error ({Category}, {ProviderCode}) during the evaluate_page evaluation of node {NodeId}.",
                ex.Category, ex.ProviderCode, key);
            return ex.Category switch
            {
                AIProviderErrorCategory.Transient or AIProviderErrorCategory.RateLimited
                    or AIProviderErrorCategory.Cancelled or AIProviderErrorCategory.NetworkError
                    => ModelReportFactory.Failure("providerUnavailable", ProviderUnavailableMessage),
                _ => ModelReportFactory.Failure("providerConfiguration", ProviderConfigurationMessage),
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw; // the caller's own cancellation (the run or request was cancelled)
        }
        catch (Exception ex)
        {
            return Unexpected(ex, key);
        }
    }

    private JsonObject Unexpected(Exception ex, Guid nodeId)
    {
        logger.LogError(ex, "[PageEvaluator] The evaluate_page tool failed for node {NodeId}.", nodeId);
        return ModelReportFactory.Failure("unexpected", UnexpectedMessage);
    }

    /// <summary>The open entity's key when it is a document (Copilot); null otherwise (e.g. Automate's Run AI Agent).</summary>
    private Guid? OpenDocumentId()
    {
        AIRuntimeContext? context = runtimeContextAccessor.Context;
        if (context is null)
            return null;

        if (!context.TryGetValue(Constants.ContextKeys.EntityType, out string entityType)
            || !string.Equals(entityType, DocumentEntityType, StringComparison.OrdinalIgnoreCase))
            return null;

        // Umbraco.AI stores the id as a Guid; some readers treat it as a string, so accept both.
        return context.Data.GetValueOrDefault(Constants.ContextKeys.EntityId) switch
        {
            Guid id => id,
            string text when Guid.TryParse(text, out Guid parsed) => parsed,
            _ => null,
        };
    }

    /// <summary>The per-user limit key: the current backoffice user (the Automate service account in a run).</summary>
    private string RateLimitKey()
        => backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Key.ToString() ?? "anonymous";

    /// <summary>Thrown by the beforeAiCall gate to abort before the AI call.</summary>
    private sealed class RateLimitExceededException : Exception;
}
