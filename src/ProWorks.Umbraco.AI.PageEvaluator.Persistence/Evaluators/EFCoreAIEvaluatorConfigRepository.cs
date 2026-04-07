using Microsoft.EntityFrameworkCore;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;

/// <summary>
/// EFCore implementation of <see cref="IAIEvaluatorConfigRepository"/>.
/// Uses <see cref="IEFCoreScopeProvider{TDbContext}"/> following the Umbraco.AI pattern.
/// Registered as a Singleton — the scope provider handles internal lifetime correctly.
/// </summary>
public sealed class EFCoreAIEvaluatorConfigRepository : IAIEvaluatorConfigRepository
{
    private readonly IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext> _scopeProvider;

    public EFCoreAIEvaluatorConfigRepository(
        IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext> scopeProvider)
    {
        _scopeProvider = scopeProvider;
    }

    public async Task<AIEvaluatorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        AIEvaluatorConfigEntity? entity = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id, cancellationToken));

        return entity is null ? null : AIEvaluatorConfigEntityFactory.ToDomain(entity);
    }

    public async Task<IReadOnlyList<AIEvaluatorConfig>> GetByDocumentTypeAliasAsync(
        string documentTypeAlias, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        List<AIEvaluatorConfigEntity> entities = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .AsNoTracking()
                .Where(e => e.DocumentTypeAlias == documentTypeAlias)
                .OrderByDescending(e => e.DateModified)
                .ToListAsync(cancellationToken));

        return entities.Select(AIEvaluatorConfigEntityFactory.ToDomain).ToList();
    }

    public async Task<IReadOnlyList<AIEvaluatorConfig>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        List<AIEvaluatorConfigEntity> entities = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .AsNoTracking()
                .OrderBy(e => e.DocumentTypeAlias)
                .ThenByDescending(e => e.DateModified)
                .ToListAsync(cancellationToken));

        return entities.Select(AIEvaluatorConfigEntityFactory.ToDomain).ToList();
    }

    public async Task<AIEvaluatorConfig?> GetActiveForDocumentTypeAsync(
        string documentTypeAlias, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        AIEvaluatorConfigEntity? entity = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.DocumentTypeAlias == documentTypeAlias && e.IsActive, cancellationToken));

        return entity is null ? null : AIEvaluatorConfigEntityFactory.ToDomain(entity);
    }

    public async Task SaveAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            // Active-one rule: deactivate all existing configs for this alias before saving.
            if (config.IsActive)
            {
                await db.EvaluatorConfigs
                    .Where(e => e.DocumentTypeAlias == config.DocumentTypeAlias && e.Id != config.Id)
                    .ExecuteUpdateAsync(
                        s => s.SetProperty(e => e.IsActive, false),
                        cancellationToken);
            }

            AIEvaluatorConfigEntity? existing = await db.EvaluatorConfigs
                .FirstOrDefaultAsync(e => e.Id == config.Id, cancellationToken);

            if (existing is null)
            {
                AIEvaluatorConfigEntity newEntity = AIEvaluatorConfigEntityFactory.ToEntity(config);
                newEntity.IsActive = true; // new records are always active
                db.EvaluatorConfigs.Add(newEntity);
            }
            else
            {
                // Set the original Version to the client-supplied value so EF Core's
                // concurrency check (WHERE Version = @original) detects conflicts.
                db.Entry(existing).Property(e => e.Version).OriginalValue = config.Version;
                AIEvaluatorConfigEntityFactory.ApplyToEntity(config, existing);
                existing.IsActive = true;
            }

            await db.SaveChangesAsync(cancellationToken);
            return null;
        });

        scope.Complete();
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            AIEvaluatorConfigEntity? entity = await db.EvaluatorConfigs
                .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

            if (entity is null)
            {
                return null;
            }

            bool wasActive = entity.IsActive;
            string alias = entity.DocumentTypeAlias;

            db.EvaluatorConfigs.Remove(entity);
            await db.SaveChangesAsync(cancellationToken);

            // If the deleted record was active, promote the next most-recent one.
            if (wasActive)
            {
                AIEvaluatorConfigEntity? next = await db.EvaluatorConfigs
                    .Where(e => e.DocumentTypeAlias == alias)
                    .OrderByDescending(e => e.DateModified)
                    .FirstOrDefaultAsync(cancellationToken);

                if (next is not null)
                {
                    next.IsActive = true;
                    await db.SaveChangesAsync(cancellationToken);
                }
            }

            return null;
        });

        scope.Complete();
    }

    public async Task<bool> AliasExistsAsync(string documentTypeAlias, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        return await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs.AnyAsync(e => e.DocumentTypeAlias == documentTypeAlias, cancellationToken));
    }
}
