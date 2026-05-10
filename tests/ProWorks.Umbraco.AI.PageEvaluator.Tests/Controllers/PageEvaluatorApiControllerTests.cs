using System.Reflection;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Controllers;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Authorization;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Controllers;

/// <summary>
/// Unit tests for <see cref="PageEvaluatorApiController"/> — US1 and US2 actions.
/// </summary>
public class PageEvaluatorApiControllerTests
{
    private readonly IPageEvaluationService _evaluationService = Substitute.For<IPageEvaluationService>();
    private readonly IAIEvaluatorConfigService _configService = Substitute.For<IAIEvaluatorConfigService>();
    private readonly IAIProfileService _profileService = Substitute.For<IAIProfileService>();
    private readonly IAIContextService _contextService = Substitute.For<IAIContextService>();
    private readonly IContentTypeService _contentTypeService = Substitute.For<IContentTypeService>();
    private readonly IEvaluationCacheRepository _cacheRepository = Substitute.For<IEvaluationCacheRepository>();
    private readonly ILogger<PageEvaluatorApiController> _logger = Substitute.For<ILogger<PageEvaluatorApiController>>();
    private readonly IContentService _contentService = Substitute.For<IContentService>();
    private readonly IAuthorizationService _authorizationService = Substitute.For<IAuthorizationService>();
    private readonly PageEvaluatorApiController _sut;

    public PageEvaluatorApiControllerTests()
    {
        // Default: any node exists and any user is authorized (so existing tests are unaffected).
        var defaultContent = Substitute.For<IContent>();
        defaultContent.ContentType.Alias.Returns("blogPost");
        _contentService.GetById(Arg.Any<Guid>()).Returns(defaultContent);
        _authorizationService
            .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object?>(), Arg.Any<string>())
            .Returns(AuthorizationResult.Success());

        _sut = new PageEvaluatorApiController(
            _evaluationService, _configService, _profileService, _contextService,
            _contentTypeService, _cacheRepository, _logger,
            _contentService, _authorizationService);
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
        };
        var identity = new ClaimsIdentity(
            [new Claim("sub", Guid.NewGuid().ToString())],
            "test");
        _sut.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
    }

    // ---------------------------------------------------------------------------
    // POST /evaluate
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_HappyPath_Returns200WithStructuredReport()
    {
        var nodeId = Guid.NewGuid();
        const string alias = "blogPost";
        var request = new EvaluatePageRequest
        {
            NodeId = nodeId,
            DocumentTypeAlias = alias,
            Properties = new Dictionary<string, object?> { ["title"] = "My Blog Post" },
        };

        var score = new EvaluationScore(14, 17);
        var checks = new List<CheckResult>
        {
            new(1, CheckStatus.Pass, "Title", null),
            new(2, CheckStatus.Fail, "Meta Description", "Empty."),
        };
        var expectedReport = EvaluationReport.Parsed(score, checks, "Add meta description.");

        _evaluationService.EvaluateAsync(nodeId, alias, Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .Returns(expectedReport);

        IActionResult result = await _sut.EvaluateAsync(request);

        var ok = Assert.IsType<OkObjectResult>(result);
        var report = Assert.IsAssignableFrom<EvaluationReport>(ok.Value);
        Assert.False(report.ParseFailed);
        Assert.Equal(14, report.Score!.Passed);
        Assert.Equal(2, report.Checks.Count);
    }

    [Fact]
    public async Task EvaluateAsync_HappyPath_SavesResultToCacheAndSetsCachedAt()
    {
        var nodeId = Guid.NewGuid();
        const string alias = "blogPost";
        var request = new EvaluatePageRequest { NodeId = nodeId, DocumentTypeAlias = alias, Properties = new() };

        _evaluationService.EvaluateAsync(nodeId, alias, Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .Returns(EvaluationReport.Parsed(new EvaluationScore(1, 1), [], null));

        IActionResult result = await _sut.EvaluateAsync(request);

        // Cache must be written exactly once with the correct node id.
        await _cacheRepository.Received(1).SaveAsync(
            Arg.Is<EvaluationCacheEntry>(e => e.NodeId == nodeId && e.DocumentTypeAlias == alias),
            Arg.Any<CancellationToken>());

        // The returned report must have CachedAt populated.
        var ok = Assert.IsType<OkObjectResult>(result);
        var report = Assert.IsAssignableFrom<EvaluationReport>(ok.Value);
        Assert.NotNull(report.CachedAt);
    }

    [Fact]
    public async Task EvaluateAsync_WhenParseFailedReport_Returns200WithParseFailed()
    {
        var nodeId = Guid.NewGuid();
        const string alias = "blogPost";
        var request = new EvaluatePageRequest { NodeId = nodeId, DocumentTypeAlias = alias, Properties = new() };

        var rawReport = EvaluationReport.Failed("The page looks OK but I could not structure this.");
        _evaluationService.EvaluateAsync(nodeId, alias, Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .Returns(rawReport);

        IActionResult result = await _sut.EvaluateAsync(request);

        var ok = Assert.IsType<OkObjectResult>(result);
        var report = Assert.IsAssignableFrom<EvaluationReport>(ok.Value);
        Assert.True(report.ParseFailed);
        Assert.NotNull(report.RawResponse);
    }

    [Fact]
    public async Task EvaluateAsync_WhenNoActiveConfig_Returns404()
    {
        var request = new EvaluatePageRequest
        {
            NodeId = Guid.NewGuid(),
            DocumentTypeAlias = "unknownType",
            Properties = new(),
        };

        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("No active configuration for document type 'unknownType'."));

        IActionResult result = await _sut.EvaluateAsync(request);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task EvaluateAsync_WhenAiProviderFails_Returns502()
    {
        var request = new EvaluatePageRequest
        {
            NodeId = Guid.NewGuid(),
            DocumentTypeAlias = "blogPost",
            Properties = new(),
        };

        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("AI provider returned an error."));

        IActionResult result = await _sut.EvaluateAsync(request);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(502, statusResult.StatusCode);
    }

    // ---------------------------------------------------------------------------
    // POST /evaluate — authorization
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenContentNodeNotFound_Returns404()
    {
        var request = new EvaluatePageRequest
        {
            NodeId = Guid.NewGuid(),
            DocumentTypeAlias = "blogPost",
            Properties = new(),
        };

        _contentService.GetById(request.NodeId).Returns((IContent?)null);

        IActionResult result = await _sut.EvaluateAsync(request);

        Assert.IsType<NotFoundObjectResult>(result);
        await _evaluationService.DidNotReceive()
            .EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(),
                Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task EvaluateAsync_WhenUserLacksPermission_Returns403()
    {
        var nodeId = Guid.NewGuid();
        var content = Substitute.For<IContent>();
        content.ContentType.Alias.Returns("blogPost");
        _contentService.GetById(nodeId).Returns(content);

        _authorizationService
            .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object?>(), Arg.Any<string>())
            .Returns(AuthorizationResult.Failed());

        var request = new EvaluatePageRequest { NodeId = nodeId, DocumentTypeAlias = "blogPost", Properties = new() };
        IActionResult result = await _sut.EvaluateAsync(request);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, statusResult.StatusCode);
    }

    [Fact]
    public async Task EvaluateAsync_UsesCanonicalDocTypeAliasFromContentNode_NotClientSupplied()
    {
        var nodeId = Guid.NewGuid();
        var content = Substitute.For<IContent>();
        content.ContentType.Alias.Returns("blogPost"); // canonical alias
        _contentService.GetById(nodeId).Returns(content);

        _evaluationService
            .EvaluateAsync(nodeId, "blogPost", Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .Returns(EvaluationReport.Parsed(new EvaluationScore(1, 1), [], null));

        var request = new EvaluatePageRequest
        {
            NodeId = nodeId,
            DocumentTypeAlias = "wrongAlias", // client sends wrong alias
            Properties = new(),
        };
        IActionResult result = await _sut.EvaluateAsync(request);

        await _evaluationService.Received(1)
            .EvaluateAsync(nodeId, "blogPost", Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>());
        Assert.IsType<OkObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // GET /evaluate/cached/{nodeId} — authorization
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetCachedEvaluationAsync_WhenContentNodeNotFound_Returns404()
    {
        var nodeId = Guid.NewGuid();
        _contentService.GetById(nodeId).Returns((IContent?)null);

        IActionResult result = await _sut.GetCachedEvaluationAsync(nodeId);

        Assert.IsType<NotFoundObjectResult>(result);
        await _cacheRepository.DidNotReceive().GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetCachedEvaluationAsync_WhenUserLacksPermission_Returns403()
    {
        var nodeId = Guid.NewGuid();
        var content = Substitute.For<IContent>();
        content.ContentType.Alias.Returns("blogPost");
        _contentService.GetById(nodeId).Returns(content);

        _authorizationService
            .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object?>(), Arg.Any<string>())
            .Returns(AuthorizationResult.Failed());

        IActionResult result = await _sut.GetCachedEvaluationAsync(nodeId);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, statusResult.StatusCode);
    }

    // ---------------------------------------------------------------------------
    // GET /evaluate/cached/{nodeId}
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetCachedEvaluationAsync_WhenCacheHit_Returns200WithCachedAt()
    {
        var nodeId = Guid.NewGuid();
        var cachedAt = new DateTime(2026, 4, 2, 12, 0, 0, DateTimeKind.Utc);
        var cachedReport = EvaluationReport.Parsed(new EvaluationScore(5, 6), [], "Looks good.");
        _cacheRepository.GetAsync(nodeId, Arg.Any<CancellationToken>())
            .Returns(new EvaluationCacheEntry
            {
                NodeId = nodeId,
                DocumentTypeAlias = "blogPost",
                Report = cachedReport,
                CachedAt = cachedAt,
            });

        IActionResult result = await _sut.GetCachedEvaluationAsync(nodeId);

        var ok = Assert.IsType<OkObjectResult>(result);
        var report = Assert.IsAssignableFrom<EvaluationReport>(ok.Value);
        Assert.Equal(cachedAt, report.CachedAt);
        Assert.Equal(5, report.Score!.Passed);
    }

    [Fact]
    public async Task GetCachedEvaluationAsync_WhenCacheMiss_Returns404()
    {
        var nodeId = Guid.NewGuid();
        _cacheRepository.GetAsync(nodeId, Arg.Any<CancellationToken>())
            .Returns((EvaluationCacheEntry?)null);

        IActionResult result = await _sut.GetCachedEvaluationAsync(nodeId);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // GET /configurations/active/{documentTypeAlias}
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetActiveConfigurationAsync_WhenExists_Returns200WithConfig()
    {
        const string alias = "blogPost";
        var config = BuildConfig(alias);
        _configService.GetActiveForDocumentTypeAsync(alias, Arg.Any<CancellationToken>())
            .Returns(config);

        IActionResult result = await _sut.GetActiveConfigurationAsync(alias);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetActiveConfigurationAsync_WhenNotFound_Returns404()
    {
        const string alias = "noConfig";
        _configService.GetActiveForDocumentTypeAsync(alias, Arg.Any<CancellationToken>())
            .Returns((AIEvaluatorConfig?)null);

        IActionResult result = await _sut.GetActiveConfigurationAsync(alias);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // GET /configurations  (T047 RED — method does not exist yet)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetConfigurationsAsync_Returns200WithAllConfigs()
    {
        var configs = new List<AIEvaluatorConfig>
        {
            BuildConfig("blogPost"),
            BuildConfig("newsArticle"),
        };
        _configService.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns((IReadOnlyList<AIEvaluatorConfig>)configs);

        IActionResult result = await _sut.GetConfigurationsAsync();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    // ---------------------------------------------------------------------------
    // GET /configurations/{id}  (T047 RED)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task GetConfigurationAsync_WhenExists_Returns200()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);

        IActionResult result = await _sut.GetConfigurationAsync(id);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetConfigurationAsync_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);

        IActionResult result = await _sut.GetConfigurationAsync(id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // POST /configurations  (T047 RED)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task CreateConfigurationAsync_HappyPath_Returns201AndInvalidatesCache()
    {
        var request = new CreateEvaluatorConfigRequest
        {
            Name = "Blog Post Evaluator",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this page.",
        };
        var created = BuildConfig("blogPost");
        _configService.CreateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(created);

        IActionResult result = await _sut.CreateConfigurationAsync(request);

        var created201 = Assert.IsType<CreatedAtActionResult>(result);
        Assert.NotNull(created201.Value);
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync(
            "blogPost", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateConfigurationAsync_WhenValidationFails_Returns422()
    {
        var request = new CreateEvaluatorConfigRequest
        {
            Name = "",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this page.",
        };
        _configService.CreateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new ArgumentException("Evaluator configuration name is required."));

        IActionResult result = await _sut.CreateConfigurationAsync(request);

        var unprocessable = Assert.IsType<UnprocessableEntityObjectResult>(result);
        Assert.NotNull(unprocessable.Value);
    }

    // ---------------------------------------------------------------------------
    // PUT /configurations/{id}  (T048 RED)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task UpdateConfigurationAsync_HappyPath_Returns200AndInvalidatesCache()
    {
        var id = Guid.NewGuid();
        var request = new UpdateEvaluatorConfigRequest
        {
            Name = "Updated Evaluator",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "New prompt.",
        };
        var updated = BuildConfig("blogPost");
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(updated);

        IActionResult result = await _sut.UpdateConfigurationAsync(id, request);

        Assert.IsType<OkObjectResult>(result);
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync(
            "blogPost", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateConfigurationAsync_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        var request = new UpdateEvaluatorConfigRequest
        {
            Name = "Updated Evaluator",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "New prompt.",
        };
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("Not found."));

        IActionResult result = await _sut.UpdateConfigurationAsync(id, request);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task UpdateConfigurationAsync_WhenConcurrencyConflict_Returns409()
    {
        var id = Guid.NewGuid();
        var request = new UpdateEvaluatorConfigRequest
        {
            Name = "Updated Evaluator",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "New prompt.",
            Version = 1,
        };
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new DbUpdateConcurrencyException("Concurrency conflict."));

        IActionResult result = await _sut.UpdateConfigurationAsync(id, request);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.NotNull(conflict.Value);
    }

    [Fact]
    public async Task UpdateConfigurationAsync_PassesVersionFromRequest()
    {
        var id = Guid.NewGuid();
        var request = new UpdateEvaluatorConfigRequest
        {
            Name = "Updated Evaluator",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "New prompt.",
            Version = 3,
        };
        var updated = BuildConfig("blogPost");
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(updated);

        await _sut.UpdateConfigurationAsync(id, request);

        await _configService.Received(1).UpdateAsync(
            Arg.Is<AIEvaluatorConfig>(c => c.Version == 3),
            Arg.Any<Guid>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateConfigurationAsync_WhenValidationFails_Returns422()
    {
        var id = Guid.NewGuid();
        var request = new UpdateEvaluatorConfigRequest
        {
            Name = "",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "New prompt.",
        };
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new ArgumentException("Name is required."));

        IActionResult result = await _sut.UpdateConfigurationAsync(id, request);

        Assert.IsType<UnprocessableEntityObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // POST /configurations/{id}/activate
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task ActivateConfigurationAsync_CallsSetActiveAsync_NotUpdateAsync()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);
        _configService.SetActiveAsync(id, Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);

        await _sut.ActivateConfigurationAsync(id);

        await _configService.Received(1).SetActiveAsync(id, Arg.Any<CancellationToken>());
        await _configService.DidNotReceive().UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ActivateConfigurationAsync_WhenExists_Returns200AndInvalidatesCache()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);
        _configService.SetActiveAsync(id, Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);

        IActionResult result = await _sut.ActivateConfigurationAsync(id);

        Assert.IsType<OkObjectResult>(result);
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync(
            config.DocumentTypeAlias, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ActivateConfigurationAsync_ExplicitlySetsIsActiveTrue()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        config.IsActive = false; // simulate an inactive config
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);
        _configService.SetActiveAsync(id, Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);

        await _sut.ActivateConfigurationAsync(id);

        await _configService.Received(1).SetActiveAsync(id, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ActivateConfigurationAsync_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);

        IActionResult result = await _sut.ActivateConfigurationAsync(id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ActivateConfigurationAsync_WhenConcurrencyConflict_Returns409()
    {
        var id = Guid.NewGuid();
        var existing = new AIEvaluatorConfig
        {
            Id = id,
            Name = "Test",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            IsActive = false,
            Version = 2,
        };

        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        _configService.SetActiveAsync(id, Arg.Any<CancellationToken>())
            .ThrowsAsync(new DbUpdateConcurrencyException("Concurrency conflict."));

        IActionResult result = await _sut.ActivateConfigurationAsync(id);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(409, conflict.StatusCode);
    }

    [Fact]
    public async Task ActivateConfigurationAsync_WhenConfigDeletedBetweenActivateAndRefetch_Returns404()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        // First GetByIdAsync (pre-check) returns the config
        // Second GetByIdAsync (post-activate re-fetch) returns null
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>())
            .Returns(config, (AIEvaluatorConfig?)null);
        _configService.SetActiveAsync(id, Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);

        IActionResult result = await _sut.ActivateConfigurationAsync(id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // DELETE /configurations/{id}  (T048 RED)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task DeleteConfigurationAsync_WhenExists_Returns204AndInvalidatesCache()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);

        IActionResult result = await _sut.DeleteConfigurationAsync(id);

        Assert.IsType<NoContentResult>(result);
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync(
            "blogPost", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteConfigurationAsync_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);

        IActionResult result = await _sut.DeleteConfigurationAsync(id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // T009: Generic 502 on HttpRequestException (no provider details)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenHttpRequestException_Returns502WithGenericMessage()
    {
        var request = new EvaluatePageRequest
        {
            NodeId = Guid.NewGuid(),
            DocumentTypeAlias = "blogPost",
            Properties = new(),
        };

        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Sensitive provider error: API key invalid for account xyz"));

        IActionResult result = await _sut.EvaluateAsync(request);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(502, statusResult.StatusCode);
        // The response must NOT contain the sensitive provider error message
        string json = System.Text.Json.JsonSerializer.Serialize(statusResult.Value);
        Assert.DoesNotContain("API key invalid", json);
        Assert.DoesNotContain("xyz", json);
    }

    // ---------------------------------------------------------------------------
    // T010: Generic 500 on unexpected Exception
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenUnexpectedException_Returns500WithGenericMessage()
    {
        var request = new EvaluatePageRequest
        {
            NodeId = Guid.NewGuid(),
            DocumentTypeAlias = "blogPost",
            Properties = new(),
        };

        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new NullReferenceException("Object reference not set"));

        IActionResult result = await _sut.EvaluateAsync(request);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
        string json = System.Text.Json.JsonSerializer.Serialize(statusResult.Value);
        Assert.DoesNotContain("Object reference", json);
    }

    // ---------------------------------------------------------------------------
    // T011: OperationCanceledException not caught
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task EvaluateAsync_WhenOperationCanceled_PropagatesException()
    {
        var request = new EvaluatePageRequest
        {
            NodeId = Guid.NewGuid(),
            DocumentTypeAlias = "blogPost",
            Properties = new(),
        };

        _evaluationService.EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new OperationCanceledException());

        await Assert.ThrowsAsync<OperationCanceledException>(() => _sut.EvaluateAsync(request));
    }

    // ---------------------------------------------------------------------------
    // T012: Config CRUD methods require SectionAccessSettings
    // ---------------------------------------------------------------------------

    [Theory]
    [InlineData(nameof(PageEvaluatorApiController.CreateConfigurationAsync))]
    [InlineData(nameof(PageEvaluatorApiController.UpdateConfigurationAsync))]
    [InlineData(nameof(PageEvaluatorApiController.DeleteConfigurationAsync))]
    [InlineData(nameof(PageEvaluatorApiController.ActivateConfigurationAsync))]
    public void ConfigCrudMethod_HasSectionAccessSettingsAuthorizeAttribute(string methodName)
    {
        var method = typeof(PageEvaluatorApiController).GetMethod(methodName);
        Assert.NotNull(method);

        var authorizeAttrs = method!.GetCustomAttributes(typeof(AuthorizeAttribute), true)
            .Cast<AuthorizeAttribute>()
            .ToList();

        Assert.Contains(authorizeAttrs, a => a.Policy == AuthorizationPolicies.SectionAccessSettings);
    }

    // ---------------------------------------------------------------------------
    // T014: Create passes authenticated user ID, not Guid.Empty
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task CreateConfigurationAsync_PassesAuthenticatedUserId_NotGuidEmpty()
    {
        var userId = Guid.NewGuid();
        var claims = new ClaimsIdentity(new[] { new Claim("sub", userId.ToString()) }, "test");
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(claims) },
        };

        var request = new CreateEvaluatorConfigRequest
        {
            Name = "Test",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
        };
        var created = BuildConfig("blogPost");
        _configService.CreateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(created);

        await _sut.CreateConfigurationAsync(request);

        // The user ID passed to CreateAsync must be the authenticated user, not Guid.Empty
        await _configService.Received(1).CreateAsync(
            Arg.Any<AIEvaluatorConfig>(),
            Arg.Is<Guid>(g => g == userId),
            Arg.Any<CancellationToken>());
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private static AIEvaluatorConfig BuildConfig(string documentTypeAlias)
        => new()
        {
            Id = Guid.NewGuid(),
            Name = "Blog Post Evaluator",
            DocumentTypeAlias = documentTypeAlias,
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this page.",
            IsActive = true,
            DateCreated = DateTime.UtcNow,
            DateModified = DateTime.UtcNow,
        };

    // ---------------------------------------------------------------------------
    // ScoringEnabled: CRUD + cache invalidation + response round-trip (T015)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task CreateConfiguration_AcceptsScoringEnabledTrue_AndPersistsIt()
    {
        AIEvaluatorConfig? captured = null;
        _configService.CreateAsync(Arg.Do<AIEvaluatorConfig>(c => captured = c), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(ci => ci.Arg<AIEvaluatorConfig>());

        var request = new CreateEvaluatorConfigRequest
        {
            Name = "Scored",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            ScoringEnabled = true,
        };

        await _sut.CreateConfigurationAsync(request);

        Assert.NotNull(captured);
        Assert.True(captured!.ScoringEnabled);
    }

    [Fact]
    public async Task UpdateConfiguration_TogglingScoringEnabled_Returns200_AndInvalidatesCache()
    {
        var id = Guid.NewGuid();
        var existing = BuildConfig("blogPost");
        existing.Id = id;
        existing.ScoringEnabled = true;

        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(existing);

        var request = new UpdateEvaluatorConfigRequest
        {
            Name = existing.Name,
            DocumentTypeAlias = existing.DocumentTypeAlias,
            ProfileId = existing.ProfileId,
            PromptText = existing.PromptText,
            ScoringEnabled = true,
            Version = existing.Version,
        };

        var result = await _sut.UpdateConfigurationAsync(id, request);

        Assert.IsType<OkObjectResult>(result);
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync("blogPost", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UpdateConfiguration_WithStaleVersion_Returns409_EvenWhenOnlyScoringEnabledChanged()
    {
        var id = Guid.NewGuid();
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new DbUpdateConcurrencyException());

        var request = new UpdateEvaluatorConfigRequest
        {
            Name = "Blog",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            ScoringEnabled = true,
            Version = 1,
        };

        var result = await _sut.UpdateConfigurationAsync(id, request);

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task EvaluatorConfigResponse_RoundTripsScoringEnabled()
    {
        var config = BuildConfig("blogPost");
        config.ScoringEnabled = true;
        _configService.CreateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(config);

        var request = new CreateEvaluatorConfigRequest
        {
            Name = config.Name,
            DocumentTypeAlias = config.DocumentTypeAlias,
            ProfileId = config.ProfileId,
            PromptText = config.PromptText,
            ScoringEnabled = true,
        };

        var result = await _sut.CreateConfigurationAsync(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var response = Assert.IsType<EvaluatorConfigResponse>(created.Value);
        Assert.True(response.ScoringEnabled);
    }

    [Fact]
    public async Task CreateConfiguration_WithScoringEnabled_AndPromptLacksDimensions_Returns2xx_WithNoValidationError()
    {
        // FR-015: no validation warning or block when scoring is on but prompt names no dimensions
        var config = BuildConfig("blogPost");
        config.ScoringEnabled = true;
        _configService.CreateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(config);

        var request = new CreateEvaluatorConfigRequest
        {
            Name = "Scored",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate this page generically with no dimensions mentioned.",
            ScoringEnabled = true,
        };

        var result = await _sut.CreateConfigurationAsync(request);

        Assert.IsType<CreatedAtActionResult>(result);
    }

    // ---------------------------------------------------------------------------
    // T050: Controller base class
    // ---------------------------------------------------------------------------

    [Fact]
    public void Controller_DoesNotInheritUmbracoApiController()
    {
        var controllerType = typeof(PageEvaluatorApiController);
        // Check that no ancestor type is named UmbracoApiController (obsolete base class)
        var baseType = controllerType.BaseType;
        while (baseType != null)
        {
            Assert.NotEqual("UmbracoApiController", baseType.Name);
            baseType = baseType.BaseType;
        }
        // Should inherit from ControllerBase
        Assert.True(typeof(ControllerBase).IsAssignableFrom(controllerType));
    }

    // ---------------------------------------------------------------------------
    // T051: Rate limiting attribute
    // ---------------------------------------------------------------------------

    [Fact]
    public void EvaluateAsync_HasEnableRateLimitingAttribute()
    {
        var method = typeof(PageEvaluatorApiController).GetMethod(
            nameof(PageEvaluatorApiController.EvaluateAsync),
            BindingFlags.Public | BindingFlags.Instance);
        Assert.NotNull(method);

        var attr = method!.GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(attr);
        Assert.Equal("PageEvaluatorEvaluate", attr!.PolicyName);
    }

    [Fact]
    public void EvaluateAsync_HasRequestSizeLimitAttribute()
    {
        var method = typeof(PageEvaluatorApiController).GetMethod(
            nameof(PageEvaluatorApiController.EvaluateAsync),
            BindingFlags.Public | BindingFlags.Instance);
        Assert.NotNull(method);

        var attr = method!.GetCustomAttribute<RequestSizeLimitAttribute>();
        Assert.NotNull(attr);
    }

    // ---------------------------------------------------------------------------
    // GET /document-type/{alias}/properties
    // ---------------------------------------------------------------------------

    [Fact]
    public void GetDocumentTypeProperties_WhenAliasExists_Returns200WithMappedProperties()
    {
        const string alias = "blogPost";
        var contentType = Substitute.For<IContentType>();
        contentType.Alias.Returns(alias);
        contentType.Name.Returns("Blog Post");

        var prop = Substitute.For<IPropertyType>();
        prop.Alias.Returns("pageTitle");
        prop.Name.Returns("Page Title");
        prop.PropertyEditorAlias.Returns("Umbraco.TextBox");

        contentType.CompositionPropertyTypes.Returns(new[] { prop });
        contentType.CompositionPropertyGroups.Returns(Enumerable.Empty<PropertyGroup>());

        _contentTypeService.Get(alias).Returns(contentType);

        IActionResult result = _sut.GetDocumentTypeProperties(alias);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
        var type = ok.Value!.GetType();
        Assert.Equal(alias, (string)type.GetProperty("alias")!.GetValue(ok.Value)!);
        Assert.Equal("Blog Post", (string)type.GetProperty("name")!.GetValue(ok.Value)!);
    }

    [Fact]
    public void GetDocumentTypeProperties_WhenAliasNotFound_Returns404()
    {
        _contentTypeService.Get("unknown").Returns((IContentType?)null);

        IActionResult result = _sut.GetDocumentTypeProperties("unknown");

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public void GetDocumentTypeProperties_WhenPropertyNameIsNull_FallsBackToAlias()
    {
        const string alias = "article";
        var contentType = Substitute.For<IContentType>();
        contentType.Alias.Returns(alias);
        contentType.Name.Returns("Article");

        var prop = Substitute.For<IPropertyType>();
        prop.Alias.Returns("bodyText");
        prop.Name.Returns((string?)null);
        prop.PropertyEditorAlias.Returns("Umbraco.TinyMCE");

        contentType.CompositionPropertyTypes.Returns(new[] { prop });
        contentType.CompositionPropertyGroups.Returns(Enumerable.Empty<PropertyGroup>());

        _contentTypeService.Get(alias).Returns(contentType);

        IActionResult result = _sut.GetDocumentTypeProperties(alias);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        var propertiesValue = ok.Value!.GetType().GetProperty("properties")!.GetValue(ok.Value)!;
        var propertiesList = ((IEnumerable<object>)propertiesValue).ToList();
        Assert.Single(propertiesList);
        var firstProp = propertiesList[0];
        var label = (string)firstProp.GetType().GetProperty("label")!.GetValue(firstProp)!;
        Assert.Equal("bodyText", label);
    }
}
