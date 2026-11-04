using System.ComponentModel;
using System.Reflection;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Tools;
using ProWorks.Umbraco.AI.PageEvaluator.Tools.Scopes;
using Umbraco.AI.Core;
using Umbraco.AI.Core.Guardrails;
using Umbraco.AI.Core.Guardrails.Evaluators;
using Umbraco.AI.Core.Providers.Errors;
using Umbraco.AI.Core.RuntimeContext;
using Umbraco.AI.Core.Tools;
using Umbraco.AI.Core.Tools.Umbraco;
using Umbraco.Cms.Core.Models.Membership;
using Umbraco.Cms.Core.Security;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Tools;

/// <summary>
/// The <c>evaluate_page</c> server tool (006 contracts/server-tool.md): node id resolution, the service's
/// node → permission → culture order with <see cref="IUmbracoReadAuthorizer"/> as the permission check, the shared
/// per-user limit applied only before a real AI call, and the error mapping. The scoped
/// <see cref="IContentEvaluationService"/> is resolved through a real DI scope.
/// </summary>
public class EvaluatePageToolTests
{
    private static readonly Guid UserKey = Guid.NewGuid();

    private readonly IContentEvaluationService _evaluation = Substitute.For<IContentEvaluationService>();
    private readonly IAIRuntimeContextAccessor _runtimeContextAccessor = Substitute.For<IAIRuntimeContextAccessor>();
    private readonly IUmbracoReadAuthorizer _readAuthorizer = Substitute.For<IUmbracoReadAuthorizer>();
    private readonly IEvaluationRateLimiter _rateLimiter = Substitute.For<IEvaluationRateLimiter>();
    private readonly IBackOfficeSecurityAccessor _securityAccessor = Substitute.For<IBackOfficeSecurityAccessor>();
    private readonly ILogger<EvaluatePageTool> _logger = Substitute.For<ILogger<EvaluatePageTool>>();
    private int _scopesCreated;
    private readonly EvaluatePageTool _sut;

    public EvaluatePageToolTests()
    {
        var services = new ServiceCollection();
        services.AddScoped(_ =>
        {
            _scopesCreated++;
            return _evaluation;
        });
        IServiceScopeFactory scopeFactory = services.BuildServiceProvider(validateScopes: true).GetRequiredService<IServiceScopeFactory>();

        var user = Substitute.For<IUser>();
        user.Key.Returns(UserKey);
        var security = Substitute.For<IBackOfficeSecurity>();
        security.CurrentUser.Returns(user);
        _securityAccessor.BackOfficeSecurity.Returns(security);

        _readAuthorizer.CanReadContentAsync(Arg.Any<Guid>()).Returns(true);
        _rateLimiter.TryAcquire(Arg.Any<string>()).Returns(true);

        _sut = new EvaluatePageTool(scopeFactory, _runtimeContextAccessor, _readAuthorizer, _rateLimiter, _securityAccessor, _logger);
    }

    private static readonly AIEvaluatorConfig Config = new()
    {
        Name = "Blog checks",
        DocumentTypeAlias = "blogPost",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        ScoringEnabled = true,
    };

    private static ContentEvaluationResult Ok(bool fromCache = false) => new()
    {
        Status = ContentEvaluationStatus.Ok,
        Report = EvaluationReport.Parsed(new EvaluationScore(1, 1), [new CheckResult(1, CheckStatus.Pass, "Title", null, ["title"])], "Fine.")
            .WithCachedAt(new DateTime(2026, 11, 3, 10, 15, 0, DateTimeKind.Utc)),
        CachedAt = new DateTime(2026, 11, 3, 10, 15, 0, DateTimeKind.Utc),
        FromCache = fromCache,
        Config = Config,
        DocumentTypeAlias = "blogPost",
        ContentName = "Blog post",
    };

    private static ContentEvaluationResult Status(ContentEvaluationStatus status) => new()
    {
        Status = status,
        Message = "English detail.",
    };

    /// <summary>
    /// Makes the substitute behave like <see cref="IContentEvaluationService.EvaluateSavedAsync"/>: authorize first,
    /// then (unless a cached result is reused) the beforeAiCall gate, then the AI call.
    /// </summary>
    private void GivenService(bool reusesCache = false, ContentEvaluationResult? result = null, Exception? aiError = null)
    {
        _evaluation.EvaluateSavedAsync(
                Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<bool>(),
                Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(),
                Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(),
                Arg.Any<CancellationToken>())
            .Returns(async call =>
            {
                var nodeId = call.ArgAt<Guid>(0);
                var authorize = call.ArgAt<Func<Guid, CancellationToken, Task<bool>>>(3);
                var beforeAiCall = call.ArgAt<Func<AIEvaluatorConfig, CancellationToken, Task>?>(4);
                var ct = call.ArgAt<CancellationToken>(5);

                if (!await authorize(nodeId, ct))
                    return Status(ContentEvaluationStatus.Forbidden);
                if (reusesCache && call.ArgAt<bool>(2))
                    return Ok(fromCache: true);
                if (beforeAiCall is not null)
                    await beforeAiCall(Config, ct);
                if (aiError is not null)
                    throw aiError;
                return result ?? Ok();
            });
    }

    private Task<object> Run(EvaluatePageArgs args, CancellationToken cancellationToken = default)
        => ((IAITool)_sut).ExecuteAsync(args, cancellationToken);

    private static JsonObject Json(object result) => Assert.IsType<JsonObject>(result);

    private static void AssertError(object result, string code)
    {
        JsonObject json = Json(result);
        Assert.False(json["success"]!.GetValue<bool>());
        Assert.Equal(code, json["error"]!["code"]!.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(json["error"]!["message"]!.GetValue<string>()));
    }

    private void GivenRuntimeContext(object? entityId, string? entityType)
    {
        var context = new AIRuntimeContext([]);
        if (entityId is not null) context.SetValue(Constants.ContextKeys.EntityId, entityId);
        if (entityType is not null) context.SetValue(Constants.ContextKeys.EntityType, entityType);
        _runtimeContextAccessor.Context.Returns(context);
    }

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------

    [Fact]
    public void Tool_IsEvaluatePage_InTheReadScope_AndNotDestructive()
    {
        AIToolAttribute attribute = typeof(EvaluatePageTool).GetCustomAttribute<AIToolAttribute>()!;

        Assert.Equal("evaluate_page", attribute.Id);
        Assert.Equal("Evaluate Page", attribute.Name);
        Assert.Equal(PageEvaluatorReadScope.ScopeId, attribute.ScopeId);
        Assert.Equal("page-evaluator-read", _sut.ScopeId);
        Assert.False(attribute.IsDestructive);
        Assert.False(_sut.IsDestructive);
        Assert.Equal(typeof(EvaluatePageArgs), _sut.ArgsType);
    }

    [Fact]
    public void Description_SaysItEvaluatesTheSavedVersion()
        => Assert.Equal(
            "Evaluates the latest saved version of an Umbraco page against the site's Page Evaluator checks and returns the score and each check's result. Unsaved changes in an open editor are not included.",
            _sut.Description);

    [Fact]
    public void EveryArgument_HasADescription()
    {
        foreach (PropertyInfo property in typeof(EvaluatePageArgs).GetProperties())
            Assert.False(string.IsNullOrWhiteSpace(property.GetCustomAttribute<DescriptionAttribute>()?.Description), property.Name);
    }

    // -------------------------------------------------------------------------
    // Node id
    // -------------------------------------------------------------------------

    [Fact]
    public async Task NodeId_FromTheArguments_IsEvaluated()
    {
        GivenService();
        var nodeId = Guid.NewGuid();

        JsonObject json = Json(await Run(new EvaluatePageArgs(nodeId, "da-DK", null)));

        Assert.True(json["success"]!.GetValue<bool>());
        Assert.Equal(nodeId.ToString(), json["page"]!["nodeId"]!.GetValue<string>());
        await _evaluation.Received(1).EvaluateSavedAsync(nodeId, "da-DK", true,
            Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(), Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(), Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task NodeId_DefaultsToTheOpenDocument(bool storedAsString)
    {
        GivenService();
        var nodeId = Guid.NewGuid();
        GivenRuntimeContext(storedAsString ? nodeId.ToString() : nodeId, "document");

        JsonObject json = Json(await Run(new EvaluatePageArgs(null, null, null)));

        Assert.True(json["success"]!.GetValue<bool>());
        await _evaluation.Received(1).EvaluateSavedAsync(nodeId, null, true,
            Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(), Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task NodeId_MissingWithNoOpenEntity_IsInvalidArguments()
    {
        GivenService();
        _runtimeContextAccessor.Context.Returns((AIRuntimeContext?)null);

        AssertError(await Run(new EvaluatePageArgs(null, null, null)), "invalidArguments");
        Assert.Equal(0, _scopesCreated);
    }

    [Fact]
    public async Task NodeId_MissingWhileANonDocumentIsOpen_IsInvalidArguments()
    {
        GivenService();
        GivenRuntimeContext(Guid.NewGuid(), "media");

        AssertError(await Run(new EvaluatePageArgs(null, null, null)), "invalidArguments");
    }

    [Fact]
    public async Task NodeId_Empty_IsInvalidArguments()
    {
        GivenService();

        AssertError(await Run(new EvaluatePageArgs(Guid.Empty, null, null)), "invalidArguments");
    }

    // -------------------------------------------------------------------------
    // Order: notFound → forbidden → culture (inside the service) and the authorizer
    // -------------------------------------------------------------------------

    [Theory]
    [InlineData(ContentEvaluationStatus.NodeNotFound, "notFound")]
    [InlineData(ContentEvaluationStatus.Forbidden, "forbidden")]
    [InlineData(ContentEvaluationStatus.InvalidCulture, "invalidCulture")]
    [InlineData(ContentEvaluationStatus.CultureNotCreated, "cultureNotCreated")]
    [InlineData(ContentEvaluationStatus.NoActiveConfig, "noActiveConfig")]
    public async Task ServiceStatus_IsMappedToItsErrorCode(ContentEvaluationStatus status, string code)
    {
        _evaluation.EvaluateSavedAsync(Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<bool>(),
                Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(), Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(), Arg.Any<CancellationToken>())
            .Returns(Status(status));

        object result = await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null));

        AssertError(result, code);
        Assert.DoesNotContain("English detail.", Json(result).ToJsonString());
    }

    [Fact]
    public async Task Permission_IsTheReadAuthorizer_ForTheRequestedNode()
    {
        GivenService();
        var nodeId = Guid.NewGuid();
        _readAuthorizer.CanReadContentAsync(nodeId).Returns(false);

        AssertError(await Run(new EvaluatePageArgs(nodeId, null, null)), "forbidden");

        await _readAuthorizer.Received(1).CanReadContentAsync(nodeId);
        _rateLimiter.DidNotReceive().TryAcquire(Arg.Any<string>());
    }

    [Fact]
    public async Task NoBackofficeUser_IsForbidden_BecauseTheAuthorizerDenies()
    {
        // UmbracoReadAuthorizer denies when there is no current user; the tool never bypasses it.
        GivenService();
        _securityAccessor.BackOfficeSecurity.Returns((IBackOfficeSecurity?)null);
        _readAuthorizer.CanReadContentAsync(Arg.Any<Guid>()).Returns(false);

        AssertError(await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null)), "forbidden");
    }

    // -------------------------------------------------------------------------
    // Rate limit (only when an AI call will happen)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Limiter_IsCheckedBeforeTheAiCall_WithTheUsersKey()
    {
        GivenService();

        await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null));

        _rateLimiter.Received(1).TryAcquire(UserKey.ToString());
    }

    [Fact]
    public async Task Limiter_IsNotUsed_WhenACachedResultIsReused()
    {
        GivenService(reusesCache: true);

        JsonObject json = Json(await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null)));

        Assert.True(json["fromCache"]!.GetValue<bool>());
        _rateLimiter.DidNotReceive().TryAcquire(Arg.Any<string>());
    }

    [Fact]
    public async Task Limited_IsRateLimited_AndNoAiCallHappens()
    {
        var aiCalled = new InvalidOperationException("the AI must not be called");
        GivenService(aiError: aiCalled);
        _rateLimiter.TryAcquire(Arg.Any<string>()).Returns(false);

        AssertError(await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null)), "rateLimited");
    }

    // -------------------------------------------------------------------------
    // fresh
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Fresh_DisablesCacheReuse()
    {
        GivenService(reusesCache: true);
        var nodeId = Guid.NewGuid();

        JsonObject json = Json(await Run(new EvaluatePageArgs(nodeId, null, true)));

        Assert.False(json["fromCache"]!.GetValue<bool>());
        await _evaluation.Received(1).EvaluateSavedAsync(nodeId, null, false,
            Arg.Any<Func<Guid, CancellationToken, Task<bool>>>(), Arg.Any<Func<AIEvaluatorConfig, CancellationToken, Task>?>(), Arg.Any<CancellationToken>());
        _rateLimiter.Received(1).TryAcquire(Arg.Any<string>());
    }

    [Fact]
    public async Task Success_IsTheModelReport_WithNoRecommendableFields()
    {
        GivenService();
        var nodeId = Guid.NewGuid();

        JsonObject json = Json(await Run(new EvaluatePageArgs(nodeId, null, null)));

        Assert.Equal(ModelReportFactory.Create(nodeId, Ok()).ToJsonString(), json.ToJsonString());
        Assert.Empty(json["recommendable"]!.AsArray());
    }

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    [Fact]
    public async Task Guardrail_IsGuardrailBlocked_WithTheGuardrailsMessage()
    {
        var guardrail = new AIGuardrailBlockedException(new AIGuardrailEvaluationResult
        {
            Action = AIGuardrailAction.Block,
            Phase = AIGuardrailPhase.PreGenerate,
            RuleResults = [],
        });
        GivenService(aiError: guardrail);

        object result = await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null));

        AssertError(result, "guardrailBlocked");
        Assert.Contains(guardrail.Message, Json(result)["error"]!["message"]!.GetValue<string>());
    }

    [Theory]
    [InlineData(AIProviderErrorCategory.Transient, "providerUnavailable")]
    [InlineData(AIProviderErrorCategory.RateLimited, "providerUnavailable")]
    [InlineData(AIProviderErrorCategory.Cancelled, "providerUnavailable")]
    [InlineData(AIProviderErrorCategory.NetworkError, "providerUnavailable")]
    [InlineData(AIProviderErrorCategory.Authentication, "providerConfiguration")]
    [InlineData(AIProviderErrorCategory.InvalidRequest, "providerConfiguration")]
    [InlineData(AIProviderErrorCategory.NotFound, "providerConfiguration")]
    [InlineData(AIProviderErrorCategory.Unknown, "providerConfiguration")]
    public async Task ProviderError_IsMapped_WithoutRawProviderText(AIProviderErrorCategory category, string code)
    {
        GivenService(aiError: new AIProviderException(new AIProviderErrorInfo(category, "provider user message", "provider_code_123", "raw internal detail")));

        object result = await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null));

        AssertError(result, code);
        string json = Json(result).ToJsonString();
        Assert.DoesNotContain("raw internal detail", json);
        Assert.DoesNotContain("provider_code_123", json);
    }

    [Fact]
    public async Task UnexpectedException_IsLogged_AndUnexpected()
    {
        GivenService(aiError: new NullReferenceException("stack details"));

        object result = await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null));

        AssertError(result, "unexpected");
        Assert.DoesNotContain("stack details", Json(result).ToJsonString());
        _logger.Received(1).Log(LogLevel.Error, Arg.Any<EventId>(), Arg.Any<object>(),
            Arg.Any<NullReferenceException>(), Arg.Any<Func<object, Exception?, string>>());
    }

    [Fact]
    public async Task CallerCancellation_IsRethrown()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        GivenService(aiError: new OperationCanceledException(cts.Token));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Run(new EvaluatePageArgs(Guid.NewGuid(), null, null), cts.Token));
    }

    // -------------------------------------------------------------------------
    // Lifetime
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ContentEvaluationService_IsResolvedInANewScopePerCall()
    {
        GivenService();

        await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null));
        await Run(new EvaluatePageArgs(Guid.NewGuid(), null, null));

        Assert.Equal(2, _scopesCreated);
    }
}
