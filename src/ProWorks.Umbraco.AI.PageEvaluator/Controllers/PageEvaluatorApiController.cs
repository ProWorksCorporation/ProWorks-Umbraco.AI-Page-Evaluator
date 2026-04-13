using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Services;
using Umbraco.AI.Core.Contexts;
using Umbraco.AI.Core.Profiles;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Extensions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Controllers;

/// <summary>
/// Umbraco Management API controller for the ProWorks AI Page Evaluator.
/// Base path: <c>/umbraco/management/api/v1/page-evaluator</c>
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.BackOfficeAccess)]
[Route("umbraco/management/api/v1/page-evaluator")]
public sealed class PageEvaluatorApiController : ControllerBase
{
    private readonly IPageEvaluationService _evaluationService;
    private readonly IAIEvaluatorConfigService _configService;
    private readonly IAIProfileService _profileService;
    private readonly IAIContextService _contextService;
    private readonly IContentTypeService _contentTypeService;
    private readonly IEvaluationCacheRepository _cacheRepository;
    private readonly ILogger<PageEvaluatorApiController> _logger;

    public PageEvaluatorApiController(
        IPageEvaluationService evaluationService,
        IAIEvaluatorConfigService configService,
        IAIProfileService profileService,
        IAIContextService contextService,
        IContentTypeService contentTypeService,
        IEvaluationCacheRepository cacheRepository,
        ILogger<PageEvaluatorApiController> logger)
    {
        _evaluationService = evaluationService;
        _configService = configService;
        _profileService = profileService;
        _contextService = contextService;
        _contentTypeService = contentTypeService;
        _cacheRepository = cacheRepository;
        _logger = logger;
    }

    // ---------------------------------------------------------------------------
    // GET /configurations  (T047)
    // ---------------------------------------------------------------------------

    /// <summary>Returns all EvaluatorConfigurations with resolved profile and context names.</summary>
    [HttpGet("configurations")]
    public async Task<IActionResult> GetConfigurationsAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<AIEvaluatorConfig> configs = await _configService.GetAllAsync(cancellationToken);

        var items = new List<EvaluatorConfigResponse>(configs.Count);
        foreach (AIEvaluatorConfig config in configs)
            items.Add(await ToResponseAsync(config, cancellationToken));

        return Ok(new { items, total = items.Count });
    }

    // ---------------------------------------------------------------------------
    // GET /configurations/{id}  (T047)
    // ---------------------------------------------------------------------------

    [HttpGet("configurations/{id:guid}")]
    public async Task<IActionResult> GetConfigurationAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? config = await _configService.GetByIdAsync(id, cancellationToken);
        if (config is null)
            return NotFound(new { title = $"Evaluator configuration '{id}' not found." });

        return Ok(await ToResponseAsync(config, cancellationToken));
    }

    // ---------------------------------------------------------------------------
    // POST /configurations  (T047)
    // ---------------------------------------------------------------------------

    [HttpPost("configurations")]
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    public async Task<IActionResult> CreateConfigurationAsync(
        [FromBody] CreateEvaluatorConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        var config = new AIEvaluatorConfig
        {
            Name = request.Name,
            Description = request.Description,
            DocumentTypeAlias = request.DocumentTypeAlias,
            ProfileId = request.ProfileId,
            ContextId = request.ContextId,
            PromptText = request.PromptText,
            PropertyAliases = request.PropertyAliases,
        };

        try
        {
            AIEvaluatorConfig created = await _configService.CreateAsync(config, GetCurrentUserKey(), cancellationToken);
            await _cacheRepository.DeleteByDocumentTypeAliasAsync(created.DocumentTypeAlias, cancellationToken);
            EvaluatorConfigResponse response = await ToResponseAsync(created, cancellationToken);
            return CreatedAtAction("GetConfiguration", new { id = created.Id }, response);
        }
        catch (ArgumentException ex)
        {
            return UnprocessableEntity(new { errors = new Dictionary<string, string[]> { [ex.ParamName ?? "config"] = [ex.Message] } });
        }
    }

    // ---------------------------------------------------------------------------
    // PUT /configurations/{id}  (T048)
    // ---------------------------------------------------------------------------

    [HttpPut("configurations/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    public async Task<IActionResult> UpdateConfigurationAsync(
        Guid id,
        [FromBody] UpdateEvaluatorConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        var config = new AIEvaluatorConfig
        {
            Id = id,
            Name = request.Name,
            Description = request.Description,
            DocumentTypeAlias = request.DocumentTypeAlias,
            ProfileId = request.ProfileId,
            ContextId = request.ContextId,
            PromptText = request.PromptText,
            PropertyAliases = request.PropertyAliases,
            Version = request.Version,
        };

        try
        {
            AIEvaluatorConfig updated = await _configService.UpdateAsync(config, GetCurrentUserKey(), cancellationToken);
            await _cacheRepository.DeleteByDocumentTypeAliasAsync(updated.DocumentTypeAlias, cancellationToken);
            return Ok(await ToResponseAsync(updated, cancellationToken));
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { title = "This configuration was modified by another user. Please reload and try again." });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { title = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return UnprocessableEntity(new { errors = new Dictionary<string, string[]> { [ex.ParamName ?? "config"] = [ex.Message] } });
        }
    }

    // ---------------------------------------------------------------------------
    // POST /configurations/{id}/activate
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Promotes an inactive configuration to active for its document type.
    /// All other configurations for the same document type are deactivated.
    /// </summary>
    [HttpPost("configurations/{id:guid}/activate")]
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    public async Task<IActionResult> ActivateConfigurationAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? existing = await _configService.GetByIdAsync(id, cancellationToken);
        if (existing is null)
            return NotFound(new { title = $"Evaluator configuration '{id}' not found." });

        existing.IsActive = true;
        AIEvaluatorConfig updated = await _configService.UpdateAsync(existing, GetCurrentUserKey(), cancellationToken);
        await _cacheRepository.DeleteByDocumentTypeAliasAsync(updated.DocumentTypeAlias, cancellationToken);
        return Ok(await ToResponseAsync(updated, cancellationToken));
    }

    // ---------------------------------------------------------------------------
    // DELETE /configurations/{id}  (T048)
    // ---------------------------------------------------------------------------

    [HttpDelete("configurations/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    public async Task<IActionResult> DeleteConfigurationAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? existing = await _configService.GetByIdAsync(id, cancellationToken);
        if (existing is null)
            return NotFound(new { title = $"Evaluator configuration '{id}' not found." });

        await _configService.DeleteAsync(id, cancellationToken);
        await _cacheRepository.DeleteByDocumentTypeAliasAsync(existing.DocumentTypeAlias, cancellationToken);
        return NoContent();
    }

    // ---------------------------------------------------------------------------
    // GET /evaluate/cached/{nodeId}
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Returns the cached evaluation report for a content node, if one exists.
    /// Returns 404 when no cached result is available — the client should then call POST /evaluate.
    /// </summary>
    [HttpGet("evaluate/cached/{nodeId:guid}")]
    public async Task<IActionResult> GetCachedEvaluationAsync(
        Guid nodeId,
        CancellationToken cancellationToken = default)
    {
        EvaluationCacheEntry? entry = await _cacheRepository.GetAsync(nodeId, cancellationToken);
        if (entry is null)
            return NotFound(new { title = $"No cached evaluation for node '{nodeId}'." });

        return Ok(entry.Report.WithCachedAt(entry.CachedAt));
    }

    // ---------------------------------------------------------------------------
    // POST /evaluate  (T032)
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Triggers a fresh AI evaluation for a content page.
    /// Saves the result to the evaluation cache (keyed on NodeId) and returns the report
    /// with <c>cachedAt</c> set to the current UTC time.
    /// Returns 404 when no active evaluator is configured, or 502 on AI provider failure.
    /// </summary>
    [HttpPost("evaluate")]
    [EnableRateLimiting("PageEvaluatorEvaluate")]
    public async Task<IActionResult> EvaluateAsync(
        [FromBody] EvaluatePageRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            EvaluationReport report = await _evaluationService.EvaluateAsync(
                request.NodeId,
                request.DocumentTypeAlias,
                request.Properties,
                cancellationToken);

            DateTime cachedAt = DateTime.UtcNow;
            await _cacheRepository.SaveAsync(new EvaluationCacheEntry
            {
                NodeId = request.NodeId,
                DocumentTypeAlias = request.DocumentTypeAlias,
                Report = report,
                CachedAt = cachedAt,
            }, cancellationToken);

            return Ok(report.WithCachedAt(cachedAt));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { title = ex.Message });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "[PageEvaluator] AI provider error during evaluation of node {NodeId}.", request.NodeId);
            return StatusCode(502, new
            {
                title = "The AI provider returned an error. Please try again later.",
            });
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "[PageEvaluator] Unexpected error during evaluation of node {NodeId}.", request.NodeId);
            return StatusCode(500, new
            {
                title = "An unexpected error occurred during evaluation. Please try again later.",
            });
        }
    }

    // ---------------------------------------------------------------------------
    // GET /configurations/active/{documentTypeAlias}  (T033)
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Returns the active EvaluatorConfiguration for a given document type alias.
    /// Used by the workspace action to determine whether to show the "Evaluate Page" button.
    /// Returns 404 when no active configuration exists for this document type.
    /// </summary>
    [HttpGet("configurations/active/{documentTypeAlias}")]
    public async Task<IActionResult> GetActiveConfigurationAsync(
        string documentTypeAlias,
        CancellationToken cancellationToken = default)
    {
        AIEvaluatorConfig? config = await _configService.GetActiveForDocumentTypeAsync(
            documentTypeAlias, cancellationToken);

        if (config is null)
            return NotFound(new { title = $"No active evaluator configuration for document type '{documentTypeAlias}'." });

        return Ok(await ToResponseAsync(config, cancellationToken));
    }

    // ---------------------------------------------------------------------------
    // GET /document-type/{alias}/properties
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Returns the property aliases, labels, groups, and editor aliases for a
    /// document type identified by its alias. Used by the front-end prompt builder.
    /// </summary>
    [HttpGet("document-type/{alias}/properties")]
    public IActionResult GetDocumentTypeProperties(string alias)
    {
        var contentType = _contentTypeService.Get(alias);
        if (contentType is null)
            return NotFound(new { title = $"Document type '{alias}' not found." });

        var properties = contentType.CompositionPropertyTypes.Select(p =>
        {
            string groupName = contentType.CompositionPropertyGroups
                .FirstOrDefault(g => g.PropertyTypes?.Any(pt => pt.Alias == p.Alias) == true)
                ?.Name ?? "General";

            return new
            {
                alias = p.Alias,
                label = p.Name ?? p.Alias,
                groupName,
                editorAlias = p.PropertyEditorAlias,
            };
        });

        return Ok(new
        {
            alias = contentType.Alias,
            name = contentType.Name,
            properties,
        });
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private Guid GetCurrentUserKey()
        => HttpContext.User.Identity?.GetUserKey() ?? Guid.Empty;

    private async Task<EvaluatorConfigResponse> ToResponseAsync(
        AIEvaluatorConfig config,
        CancellationToken cancellationToken)
    {
        string? profileName = null;
        if (config.ProfileId != Guid.Empty)
        {
            var profile = await _profileService.GetProfileAsync(config.ProfileId, cancellationToken);
            profileName = profile?.Name;
        }

        string? contextName = null;
        if (config.ContextId.HasValue)
        {
            var context = await _contextService.GetContextAsync(config.ContextId.Value, cancellationToken);
            contextName = context?.Name;
        }

        string? documentTypeName = _contentTypeService.Get(config.DocumentTypeAlias)?.Name;

        return new EvaluatorConfigResponse
        {
            Id = config.Id,
            Name = config.Name,
            Description = config.Description,
            DocumentTypeAlias = config.DocumentTypeAlias,
            DocumentTypeName = documentTypeName,
            ProfileId = config.ProfileId,
            ProfileName = profileName,
            ContextId = config.ContextId,
            ContextName = contextName,
            PromptText = config.PromptText,
            IsActive = config.IsActive,
            DateCreated = config.DateCreated,
            DateModified = config.DateModified,
            PropertyAliases = config.PropertyAliases,
            Version = config.Version,
        };
    }
}

// ---------------------------------------------------------------------------
// Request / Response DTOs
// ---------------------------------------------------------------------------

/// <summary>Request body for <c>POST /evaluate</c>.</summary>
public sealed class EvaluatePageRequest
{
    /// <summary>The Umbraco content node GUID being evaluated.</summary>
    public Guid NodeId { get; set; }

    /// <summary>The document type alias of the node.</summary>
    public string DocumentTypeAlias { get; set; } = string.Empty;

    /// <summary>
    /// Current draft property values from the back-office editor.
    /// Keys are property aliases; values are the current editor state.
    /// </summary>
    public Dictionary<string, object?> Properties { get; set; } = [];
}

/// <summary>Request body for <c>POST /configurations</c>.</summary>
public sealed class CreateEvaluatorConfigRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DocumentTypeAlias { get; set; } = string.Empty;
    public Guid ProfileId { get; set; }
    public Guid? ContextId { get; set; }
    public string PromptText { get; set; } = string.Empty;
    public List<string>? PropertyAliases { get; set; }
}

/// <summary>Request body for <c>PUT /configurations/{id}</c>.</summary>
public sealed class UpdateEvaluatorConfigRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string DocumentTypeAlias { get; set; } = string.Empty;
    public Guid ProfileId { get; set; }
    public Guid? ContextId { get; set; }
    public string PromptText { get; set; } = string.Empty;
    public List<string>? PropertyAliases { get; set; }

    /// <summary>
    /// The version of the config the client last read.
    /// Used for optimistic concurrency — the server rejects the update if
    /// the stored version no longer matches.
    /// </summary>
    public int Version { get; set; }
}

/// <summary>API response shape for a single EvaluatorConfiguration.</summary>
public sealed class EvaluatorConfigResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string DocumentTypeAlias { get; init; } = string.Empty;
    public string? DocumentTypeName { get; init; }
    public Guid ProfileId { get; init; }
    public string? ProfileName { get; init; }
    public Guid? ContextId { get; init; }
    public string? ContextName { get; init; }
    public string PromptText { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public DateTime DateCreated { get; init; }
    public DateTime DateModified { get; init; }
    public List<string>? PropertyAliases { get; init; }
    public int Version { get; init; }
}
