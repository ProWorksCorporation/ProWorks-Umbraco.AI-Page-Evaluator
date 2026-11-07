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

    // Every scope completes, reads included (17.6.2): inside an outer Umbraco transaction (a Deploy import, a content
    // operation's notification handlers) the EF Core scope wraps a child of the ambient scope, and a child disposed
    // without Complete() makes the whole outer transaction roll back (CoreScope.ChildCompleted).

    public async Task<AIEvaluatorConfig?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        AIEvaluatorConfigEntity? entity = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == id, cancellationToken));
        scope.Complete();

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
        scope.Complete();

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
        scope.Complete();

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
        scope.Complete();

        return entity is null ? null : AIEvaluatorConfigEntityFactory.ToDomain(entity);
    }

    public async Task SaveAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(config);
        string? propertyAliases = AIEvaluatorConfigEntityFactory.SerializePropertyAliases(config.PropertyAliases);
        DateTime now = DateTime.UtcNow;

        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            // Write-first (17.6.1): on SQLite a deferred transaction that reads before its first write fails with
            // "database is locked" when another connection commits in between (CLAUDE.md "Evaluation Cache").

            // Active-one rule: deactivate all other configs for this alias before saving.
            if (config.IsActive)
            {
                await db.EvaluatorConfigs
                    .Where(e => e.DocumentTypeAlias == config.DocumentTypeAlias && e.Id != config.Id)
                    .ExecuteUpdateAsync(
                        s => s.SetProperty(e => e.IsActive, false),
                        cancellationToken);
            }

            // Update in place; the client-supplied Version is the concurrency check (same fields as ApplyToEntity:
            // DateCreated and CreatedByUserId are never changed by an update).
            int updated = await db.EvaluatorConfigs
                .Where(e => e.Id == config.Id && e.Version == config.Version)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(e => e.Name, config.Name)
                    .SetProperty(e => e.Description, config.Description)
                    .SetProperty(e => e.DocumentTypeAlias, config.DocumentTypeAlias)
                    .SetProperty(e => e.ProfileId, config.ProfileId)
                    .SetProperty(e => e.ContextId, config.ContextId)
                    .SetProperty(e => e.PromptText, config.PromptText)
                    .SetProperty(e => e.IsActive, config.IsActive)
                    .SetProperty(e => e.DateModified, now)
                    .SetProperty(e => e.ModifiedByUserId, config.ModifiedByUserId)
                    .SetProperty(e => e.Version, e => e.Version + 1)
                    .SetProperty(e => e.PropertyAliases, propertyAliases)
                    .SetProperty(e => e.ScoringEnabled, config.ScoringEnabled)
                    .SetProperty(e => e.RecommendationsEnabled, config.RecommendationsEnabled)
                    .SetProperty(e => e.IsDeployManaged, config.IsDeployManaged),
                    cancellationToken);

            if (updated == 0)
            {
                // The UPDATE above already took the write lock (SQLite does so even when no row matches), so this read
                // can't hit SQLITE_BUSY_SNAPSHOT. A row with another Version is a concurrent edit (409 in the
                // controller); no row at all is a new configuration.
                if (await db.EvaluatorConfigs.AnyAsync(e => e.Id == config.Id, cancellationToken))
                {
                    throw new DbUpdateConcurrencyException(
                        $"Evaluator configuration '{config.Id}' was changed by someone else (expected Version {config.Version}).");
                }

                AIEvaluatorConfigEntity newEntity = AIEvaluatorConfigEntityFactory.ToEntity(config);
                newEntity.IsActive = true; // new records are always active
                db.EvaluatorConfigs.Add(newEntity);
                await db.SaveChangesAsync(cancellationToken);
            }

            return null;
        });

        scope.Complete();
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            // Write-first (17.6.1), no read: if the target is active, first promote the most recently modified other
            // config of its document type (resolved inside the statement), then delete the target. Both statements
            // affect nothing when the config doesn't exist.
            await db.EvaluatorConfigs
                .Where(e => e.Id == db.EvaluatorConfigs
                    .Where(c => c.Id != id
                        && db.EvaluatorConfigs.Any(t => t.Id == id && t.IsActive && t.DocumentTypeAlias == c.DocumentTypeAlias))
                    .OrderByDescending(c => c.DateModified)
                    .Select(c => c.Id)
                    .FirstOrDefault())
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.IsActive, true), cancellationToken);

            await db.EvaluatorConfigs
                .Where(e => e.Id == id)
                .ExecuteDeleteAsync(cancellationToken);

            return null;
        });

        scope.Complete();
    }

    public async Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            // Write-first, no read (the deploy import calls this; see the note above the deploy methods): two UPDATEs,
            // the document type resolved inside the statement. Both affect nothing when the config doesn't exist.
            // The target is excluded from the bulk deactivate (regression in ≤ 17.3.1: activating an active config
            // deactivated it).
            await db.EvaluatorConfigs
                .Where(e => e.Id == id && !e.IsActive)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.IsActive, true), cancellationToken);

            await db.EvaluatorConfigs
                .Where(e => e.IsActive && e.Id != id
                    && db.EvaluatorConfigs.Any(t => t.Id == id && t.DocumentTypeAlias == e.DocumentTypeAlias))
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.IsActive, false), cancellationToken);
            return null;
        });

        scope.Complete();
    }

    public async Task<bool> AliasExistsAsync(string documentTypeAlias, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        bool exists = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs.AnyAsync(e => e.DocumentTypeAlias == documentTypeAlias, cancellationToken));
        scope.Complete();
        return exists;
    }

    // -------------------------------------------------------------------------
    // Deploy import (006). Every transaction below starts with its write: on SQLite, Umbraco's scope transactions
    // are DEFERRED, and one that has read can't take the write lock once another connection has committed
    // (SQLITE_BUSY_SNAPSHOT → "database is locked"). Any read happens in its own scope first.
    // -------------------------------------------------------------------------

    public async Task SetInactiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .Where(e => e.Id == id && e.IsActive)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.IsActive, false), cancellationToken));

        scope.Complete();
    }

    public async Task UpdateDeployedFieldsAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(config);
        string? propertyAliases = AIEvaluatorConfigEntityFactory.SerializePropertyAliases(config.PropertyAliases);
        DateTime now = DateTime.UtcNow;

        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        int updated = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .Where(e => e.Id == config.Id && e.Version == config.Version) // the concurrency check, in the UPDATE
                .ExecuteUpdateAsync(s => s
                    // SET expressions read the row's previous values: a row moving to another type is stored inactive.
                    .SetProperty(e => e.IsActive, e => e.IsActive && e.DocumentTypeAlias == config.DocumentTypeAlias)
                    .SetProperty(e => e.Name, config.Name)
                    .SetProperty(e => e.Description, config.Description)
                    .SetProperty(e => e.DocumentTypeAlias, config.DocumentTypeAlias)
                    .SetProperty(e => e.ProfileId, config.ProfileId)
                    .SetProperty(e => e.ContextId, config.ContextId)
                    .SetProperty(e => e.PromptText, config.PromptText)
                    .SetProperty(e => e.PropertyAliases, propertyAliases)
                    .SetProperty(e => e.ScoringEnabled, config.ScoringEnabled)
                    .SetProperty(e => e.RecommendationsEnabled, config.RecommendationsEnabled)
                    .SetProperty(e => e.IsDeployManaged, config.IsDeployManaged)
                    .SetProperty(e => e.ModifiedByUserId, config.ModifiedByUserId)
                    .SetProperty(e => e.DateModified, now)
                    .SetProperty(e => e.Version, e => e.Version + 1),
                    cancellationToken));

        if (updated == 0)
        {
            // Nothing committed; disposing the scope uncompleted rolls the (empty) transaction back.
            throw new DbUpdateConcurrencyException(
                $"Evaluator configuration '{config.Id}' was not found at Version {config.Version}; it was changed or deleted concurrently.");
        }

        scope.Complete();
    }

    public async Task InsertWithIdAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
    {
        if (config.Id == Guid.Empty)
            throw new ArgumentException("A configuration inserted with its own id needs a non-empty Id.", nameof(config));

        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            db.EvaluatorConfigs.Add(AIEvaluatorConfigEntityFactory.ToEntity(config));
            await db.SaveChangesAsync(cancellationToken);
            return null;
        });

        scope.Complete();
    }

    public async Task<bool> DeleteWithoutPromotionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        int deleted = await scope.ExecuteWithContextAsync(async db =>
            await db.EvaluatorConfigs
                .Where(e => e.Id == id)
                .ExecuteDeleteAsync(cancellationToken));

        scope.Complete();
        return deleted > 0;
    }

    public async Task<AIEvaluatorConfig> ReplaceIdAsync(Guid existingId, Guid newId, CancellationToken cancellationToken = default)
    {
        // Read in its own scope, before the write transaction starts.
        AIEvaluatorConfigEntity existing;
        using (IEfCoreScope<UmbracoAIPageEvaluatorDbContext> readScope = _scopeProvider.CreateScope())
        {
            existing = await readScope.ExecuteWithContextAsync(async db =>
                await db.EvaluatorConfigs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.Id == existingId, cancellationToken))
                ?? throw new InvalidOperationException($"Evaluator configuration '{existingId}' not found.");
            readScope.Complete();
        }

        AIEvaluatorConfigEntity copy = CopyWithId(existing, newId);
        copy.IsDeployManaged = true;

        // One SaveChanges = one transaction: the INSERT of the copy and the DELETE of the original commit together or
        // not at all. The DELETE matches the Version read above, so a concurrent edit or delete of the original makes
        // it affect no row (DbUpdateConcurrencyException) and rolls the copy back too.
        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            db.EvaluatorConfigs.Add(copy);
            db.EvaluatorConfigs.Remove(existing);
            await db.SaveChangesAsync(cancellationToken);
            return null;
        });

        scope.Complete();
        return AIEvaluatorConfigEntityFactory.ToDomain(copy);
    }

    private static AIEvaluatorConfigEntity CopyWithId(AIEvaluatorConfigEntity source, Guid id) => new()
    {
        Id = id,
        Name = source.Name,
        Description = source.Description,
        DocumentTypeAlias = source.DocumentTypeAlias,
        ProfileId = source.ProfileId,
        ContextId = source.ContextId,
        PromptText = source.PromptText,
        IsActive = source.IsActive,
        DateCreated = source.DateCreated,
        DateModified = source.DateModified,
        CreatedByUserId = source.CreatedByUserId,
        ModifiedByUserId = source.ModifiedByUserId,
        Version = source.Version,
        PropertyAliases = source.PropertyAliases,
        ScoringEnabled = source.ScoringEnabled,
        RecommendationsEnabled = source.RecommendationsEnabled,
        IsDeployManaged = source.IsDeployManaged,
    };
}
