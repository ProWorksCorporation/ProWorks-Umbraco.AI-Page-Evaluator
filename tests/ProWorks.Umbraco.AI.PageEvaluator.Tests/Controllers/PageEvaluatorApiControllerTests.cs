using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ProWorks.Umbraco.AI.PageEvaluator.Controllers;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Services;
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
    private readonly PageEvaluatorApiController _sut;

    public PageEvaluatorApiControllerTests()
    {
        _sut = new PageEvaluatorApiController(_evaluationService, _configService, _profileService, _contextService, _contentTypeService, _cacheRepository);
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
    public async Task ActivateConfigurationAsync_WhenExists_Returns200AndInvalidatesCache()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(config);

        IActionResult result = await _sut.ActivateConfigurationAsync(id);

        Assert.IsType<OkObjectResult>(result);
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync(
            config.DocumentTypeAlias, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ActivateConfigurationAsync_WhenNotFound_Returns404()
    {
        var id = Guid.NewGuid();
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((AIEvaluatorConfig?)null);

        IActionResult result = await _sut.ActivateConfigurationAsync(id);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    // ---------------------------------------------------------------------------
    // DELETE /configurations/{id}  (T048 RED)
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task DeleteConfigurationAsync_WhenExists_Returns200AndInvalidatesCache()
    {
        var id = Guid.NewGuid();
        var config = BuildConfig("blogPost");
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);

        IActionResult result = await _sut.DeleteConfigurationAsync(id);

        Assert.IsType<OkObjectResult>(result);
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
}
