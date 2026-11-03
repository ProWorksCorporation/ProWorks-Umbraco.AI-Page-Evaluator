using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Cache;

/// <summary>
/// EFCore implementation of <see cref="IEvaluationCacheRepository"/>.
/// Rows are keyed on (NodeId, Culture); <see cref="string.Empty"/> is the invariant/legacy culture.
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

    public async Task<EvaluationCacheEntry?> GetAsync(Guid nodeId, string culture, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        EvaluationCacheEntity? entity = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluationCache
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.NodeId == nodeId && e.Culture == culture, cancellationToken));

        if (entity is null)
            return null;

        EvaluationReport? report = JsonSerializer.Deserialize<EvaluationReport>(entity.ReportJson, SerializerOptions);
        if (report is null)
            return null;

        return new EvaluationCacheEntry
        {
            NodeId = entity.NodeId,
            Culture = entity.Culture,
            DocumentTypeAlias = entity.DocumentTypeAlias,
            Report = report,
            // Always written as DateTime.UtcNow, but providers read it back as Kind = Unspecified; without this the
            // cached response has no "Z" and the browser shows "Last evaluated" off by the UTC offset.
            CachedAt = DateTime.SpecifyKind(entity.CachedAt, DateTimeKind.Utc),
        };
    }

    public async Task SaveAsync(EvaluationCacheEntry entry, CancellationToken cancellationToken = default)
    {
        string reportJson = JsonSerializer.Serialize(entry.Report, SerializerOptions);

        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            // Write first, never read-then-write: on SQLite, Umbraco's scope transactions are deferred, and this save
            // runs right after the AI call — exactly when Umbraco.AI's background jobs (CompleteAuditLog, RecordUsage)
            // commit. A transaction that has already read can't upgrade to a write once another connection has
            // committed (SQLITE_BUSY_SNAPSHOT), and Microsoft.Data.Sqlite retries that until the 30 s command timeout,
            // failing the evaluation. A first statement that writes takes the write lock directly.
            int updated = await db.EvaluationCache
                .Where(e => e.NodeId == entry.NodeId && e.Culture == entry.Culture)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(e => e.DocumentTypeAlias, entry.DocumentTypeAlias)
                    .SetProperty(e => e.ReportJson, reportJson)
                    .SetProperty(e => e.CachedAt, entry.CachedAt),
                    cancellationToken);

            if (updated == 0)
            {
                db.EvaluationCache.Add(new EvaluationCacheEntity
                {
                    NodeId = entry.NodeId,
                    Culture = entry.Culture,
                    DocumentTypeAlias = entry.DocumentTypeAlias,
                    ReportJson = reportJson,
                    CachedAt = entry.CachedAt,
                });
                await db.SaveChangesAsync(cancellationToken);
            }

            return null;
        });

        scope.Complete();
    }

    public async Task DeleteAsync(Guid nodeId, string culture, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            await db.EvaluationCache
                .Where(e => e.NodeId == nodeId && e.Culture == culture)
                .ExecuteDeleteAsync(cancellationToken);

            return null;
        });

        scope.Complete();
    }

    public async Task DeleteAllCulturesAsync(Guid nodeId, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            await db.EvaluationCache
                .Where(e => e.NodeId == nodeId)
                .ExecuteDeleteAsync(cancellationToken);

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
