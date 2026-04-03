using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Cache;

/// <summary>
/// EFCore implementation of <see cref="IEvaluationCacheRepository"/>.
/// Registered as a Singleton — the scope provider handles internal lifetime correctly.
/// </summary>
public sealed class EFCoreEvaluationCacheRepository : IEvaluationCacheRepository
{
    private readonly IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext> _scopeProvider;

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public EFCoreEvaluationCacheRepository(
        IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext> scopeProvider)
    {
        _scopeProvider = scopeProvider;
    }

    public async Task<EvaluationCacheEntry?> GetAsync(Guid nodeId, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        EvaluationCacheEntity? entity = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluationCache
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.NodeId == nodeId, cancellationToken));

        if (entity is null)
            return null;

        EvaluationReport? report = JsonSerializer.Deserialize<EvaluationReport>(entity.ReportJson, SerializerOptions);
        if (report is null)
            return null;

        return new EvaluationCacheEntry
        {
            NodeId = entity.NodeId,
            DocumentTypeAlias = entity.DocumentTypeAlias,
            Report = report,
            CachedAt = entity.CachedAt,
        };
    }

    public async Task SaveAsync(EvaluationCacheEntry entry, CancellationToken cancellationToken = default)
    {
        string reportJson = JsonSerializer.Serialize(entry.Report, SerializerOptions);

        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            EvaluationCacheEntity? existing = await db.EvaluationCache
                .FirstOrDefaultAsync(e => e.NodeId == entry.NodeId, cancellationToken);

            if (existing is null)
            {
                db.EvaluationCache.Add(new EvaluationCacheEntity
                {
                    NodeId = entry.NodeId,
                    DocumentTypeAlias = entry.DocumentTypeAlias,
                    ReportJson = reportJson,
                    CachedAt = entry.CachedAt,
                });
            }
            else
            {
                existing.DocumentTypeAlias = entry.DocumentTypeAlias;
                existing.ReportJson = reportJson;
                existing.CachedAt = entry.CachedAt;
            }

            await db.SaveChangesAsync(cancellationToken);
            return null;
        });

        scope.Complete();
    }

    public async Task DeleteAsync(Guid nodeId, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            EvaluationCacheEntity? entity = await db.EvaluationCache
                .FirstOrDefaultAsync(e => e.NodeId == nodeId, cancellationToken);

            if (entity is not null)
            {
                db.EvaluationCache.Remove(entity);
                await db.SaveChangesAsync(cancellationToken);
            }

            return null;
        });

        scope.Complete();
    }

    public async Task DeleteByDocumentTypeAliasAsync(string documentTypeAlias, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            await db.EvaluationCache
                .Where(e => e.DocumentTypeAlias == documentTypeAlias)
                .ExecuteDeleteAsync(cancellationToken);

            return null;
        });

        scope.Complete();
    }
}
