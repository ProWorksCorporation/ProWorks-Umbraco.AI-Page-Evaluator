using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Persistence;

/// <summary>
/// <see cref="EFCoreAIEvaluatorConfigRepository"/> against a real SQLite file database in WAL mode, with every scope
/// running in a DEFERRED transaction (as Umbraco's <c>SqlitePreferDeferredTransactionsConnection</c> makes them) —
/// the same harness as <see cref="EFCoreEvaluationCacheRepositoryConcurrencyTests"/>. The 006 deploy methods
/// (<c>SetInactiveAsync</c>, <c>InsertWithIdAsync</c>, <c>DeleteWithoutPromotionAsync</c>, <c>ReplaceIdAsync</c>) are
/// also run with <see cref="ConcurrentCommitInterceptor"/> armed: another connection commits right after their first
/// command, which fails any method that reads and then writes inside one transaction (CLAUDE.md "Evaluation Cache").
/// </summary>
public sealed class EFCoreAIEvaluatorConfigRepositoryTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"pe-config-{Guid.NewGuid():N}.db");
    private readonly string _connectionString;
    private readonly ConcurrentCommitInterceptor _interceptor;
    private readonly EFCoreAIEvaluatorConfigRepository _sut;

    public EFCoreAIEvaluatorConfigRepositoryTests()
    {
        // A short command timeout keeps a failing (read-then-write) method to ~2 s instead of 30 s.
        _connectionString = new SqliteConnectionStringBuilder { DataSource = _dbPath, Pooling = false, DefaultTimeout = 2 }.ToString();
        using (var db = new UmbracoAIPageEvaluatorDbContext(Options(null)))
        {
            db.Database.EnsureCreated();
            db.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL;");
            db.Database.ExecuteSqlRaw("CREATE TABLE OtherWriter (Id INTEGER PRIMARY KEY AUTOINCREMENT, At TEXT);");
        }

        _interceptor = new ConcurrentCommitInterceptor(_connectionString);
        var scopeProvider = Substitute.For<IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext>>();
        scopeProvider.CreateScope(Arg.Any<RepositoryCacheMode>(), Arg.Any<bool?>()).Returns(_ => CreateScope());
        _sut = new EFCoreAIEvaluatorConfigRepository(scopeProvider);
    }

    private DbContextOptions<UmbracoAIPageEvaluatorDbContext> Options(IInterceptor? interceptor)
    {
        var builder = new DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext>().UseSqlite(_connectionString);
        if (interceptor is not null)
            builder.AddInterceptors(interceptor);
        return builder.Options;
    }

    private readonly List<IEfCoreScope<UmbracoAIPageEvaluatorDbContext>> _scopes = [];

    private IEfCoreScope<UmbracoAIPageEvaluatorDbContext> CreateScope()
    {
        var scope = Substitute.For<IEfCoreScope<UmbracoAIPageEvaluatorDbContext>>();
        _scopes.Add(scope);
        Stub<object?>(scope);
        Stub<AIEvaluatorConfigEntity?>(scope);
        Stub<List<AIEvaluatorConfigEntity>>(scope);
        Stub<bool>(scope);
        Stub<int>(scope);
        return scope;
    }

    private void Stub<T>(IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope)
        => scope.ExecuteWithContextAsync(Arg.Any<Func<UmbracoAIPageEvaluatorDbContext, Task<T>>>())
            .Returns(call => RunInTransaction(call.Arg<Func<UmbracoAIPageEvaluatorDbContext, Task<T>>>()));

    private async Task<T> RunInTransaction<T>(Func<UmbracoAIPageEvaluatorDbContext, Task<T>> work)
    {
        // One scope = one DEFERRED transaction (no lock until the first statement), committed when the work succeeds
        // and rolled back (disposed uncommitted) when it throws — as Umbraco's EFCoreScope does.
        await using var db = new UmbracoAIPageEvaluatorDbContext(Options(_interceptor));
        await db.Database.OpenConnectionAsync();
        var connection = (SqliteConnection)db.Database.GetDbConnection();
        await using SqliteTransaction tx = connection.BeginTransaction(deferred: true);
        await db.Database.UseTransactionAsync(tx);
        T result = await work(db);
        await tx.CommitAsync();
        return result;
    }

    private static readonly DateTime Created = new(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc);
    private static readonly DateTime Modified = new(2026, 2, 3, 4, 5, 6, DateTimeKind.Utc);

    private Guid Seed(string alias, bool isActive, Guid? id = null, string? name = null, int version = 1, bool isDeployManaged = false)
    {
        Guid key = id ?? Guid.NewGuid();
        using var db = new UmbracoAIPageEvaluatorDbContext(Options(null));
        db.EvaluatorConfigs.Add(new AIEvaluatorConfigEntity
        {
            Id = key,
            Name = name ?? "Config " + key,
            DocumentTypeAlias = alias,
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            IsActive = isActive,
            DateCreated = Created,
            DateModified = Modified,
            Version = version,
            IsDeployManaged = isDeployManaged,
        });
        db.SaveChanges();
        return key;
    }

    private AIEvaluatorConfigEntity? Row(Guid id)
    {
        using var db = new UmbracoAIPageEvaluatorDbContext(Options(null));
        return db.EvaluatorConfigs.AsNoTracking().SingleOrDefault(e => e.Id == id);
    }

    private bool IsActive(Guid id) => Row(id)!.IsActive;

    // -------------------------------------------------------------------------
    // Every scope completes, reads included (17.6.2)
    // -------------------------------------------------------------------------

    // Live test on Umbraco Cloud (2026-11-06): inside Deploy's import transaction the EF Core scope wraps a child of
    // Umbraco's ambient scope, and a child disposed without Complete() makes the parent un-completable
    // (CoreScope.ChildCompleted) — the whole import was rolled back silently. Reads must complete their scope too.
    public static TheoryData<string> ReadMethods =>
        ["GetByIdAsync", "GetByDocumentTypeAliasAsync", "GetAllAsync", "GetActiveForDocumentTypeAsync", "AliasExistsAsync"];

    [Theory]
    [MemberData(nameof(ReadMethods))]
    public async Task ReadMethods_CompleteTheirScope(string method)
    {
        Guid id = Seed("blogPost", isActive: true);
        _scopes.Clear();

        Task call = method switch
        {
            "GetByIdAsync" => _sut.GetByIdAsync(id),
            "GetByDocumentTypeAliasAsync" => _sut.GetByDocumentTypeAliasAsync("blogPost"),
            "GetAllAsync" => _sut.GetAllAsync(),
            "GetActiveForDocumentTypeAsync" => _sut.GetActiveForDocumentTypeAsync("blogPost"),
            "AliasExistsAsync" => _sut.AliasExistsAsync("blogPost"),
            _ => throw new ArgumentOutOfRangeException(nameof(method)),
        };
        await call;

        Assert.NotEmpty(_scopes);
        foreach (IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope in _scopes)
            scope.Received(1).Complete();
    }

    [Fact]
    public async Task ReadMethods_CompleteTheirScope_WhenNothingIsFound()
    {
        _scopes.Clear();

        await _sut.GetByIdAsync(Guid.NewGuid());
        await _sut.GetActiveForDocumentTypeAsync("missing");

        Assert.Equal(2, _scopes.Count);
        foreach (IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope in _scopes)
            scope.Received(1).Complete();
    }

    // -------------------------------------------------------------------------
    // SetActiveAsync (existing)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task SetActiveAsync_OnAnInactiveConfig_ActivatesItAndDeactivatesTheOtherForTheSameDocType()
    {
        Guid current = Seed("blogPost", isActive: true);
        Guid target = Seed("blogPost", isActive: false);
        Guid otherType = Seed("landingPage", isActive: true);

        await _sut.SetActiveAsync(target);

        Assert.True(IsActive(target));
        Assert.False(IsActive(current));
        Assert.True(IsActive(otherType));
    }

    [Fact]
    public async Task SetActiveAsync_OnTheAlreadyActiveConfig_KeepsItActive()
    {
        // Regression (found in 005 scratch-site validation): the bulk "deactivate others" update also matched the
        // target, and because the tracked entity still read IsActive = true, setting it to true saved nothing —
        // activating an active config (stale list, double click, API call) left the document type with none active.
        Guid target = Seed("blogPost", isActive: true);

        await _sut.SetActiveAsync(target);

        Assert.True(IsActive(target));
    }

    // -------------------------------------------------------------------------
    // SetInactiveAsync (006, deploy import)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task SetInactiveAsync_ChangesOnlyThatRow_AndNeitherVersionNorDateModified()
    {
        Guid target = Seed("blogPost", isActive: true, version: 3);
        Guid sibling = Seed("blogPost", isActive: false);
        Guid otherType = Seed("landingPage", isActive: true);
        _interceptor.Arm();

        await _sut.SetInactiveAsync(target);

        Assert.True(_interceptor.Fired);
        AIEvaluatorConfigEntity row = Row(target)!;
        Assert.False(row.IsActive);
        Assert.Equal(3, row.Version);
        Assert.Equal(Modified, row.DateModified);
        // Deactivating never promotes another row.
        Assert.False(IsActive(sibling));
        Assert.True(IsActive(otherType));
    }

    [Fact]
    public async Task SetInactiveAsync_OnAMissingConfig_DoesNothing()
    {
        Guid other = Seed("blogPost", isActive: true);

        await _sut.SetInactiveAsync(Guid.NewGuid());

        Assert.True(IsActive(other));
    }

    // -------------------------------------------------------------------------
    // InsertWithIdAsync (006, deploy import of a new config)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task InsertWithIdAsync_KeepsTheGivenId_AndDoesNotForceActive()
    {
        Guid activeSibling = Seed("blogPost", isActive: true);
        var id = Guid.NewGuid();
        var config = new AIEvaluatorConfig
        {
            Id = id,
            Name = "Deployed",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            IsActive = false,
            Version = 1,
            IsDeployManaged = true,
        };
        _interceptor.Arm();

        await _sut.InsertWithIdAsync(config);

        Assert.True(_interceptor.Fired);
        AIEvaluatorConfigEntity? row = Row(id);
        Assert.NotNull(row);
        Assert.False(row.IsActive);
        Assert.Equal(1, row.Version);
        Assert.True(row.IsDeployManaged);
        Assert.Equal("Deployed", row.Name);
        // Inserting never touches siblings.
        Assert.True(IsActive(activeSibling));
    }

    [Fact]
    public async Task InsertWithIdAsync_WithAnEmptyId_Throws()
    {
        var config = new AIEvaluatorConfig
        {
            Id = Guid.Empty,
            Name = "Deployed",
            DocumentTypeAlias = "blogPost",
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
        };

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.InsertWithIdAsync(config));
    }

    // -------------------------------------------------------------------------
    // DeleteWithoutPromotionAsync (006, deploy schema clean-up)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task DeleteWithoutPromotionAsync_DeletesTheActiveRow_AndPromotesNothing()
    {
        Guid target = Seed("blogPost", isActive: true);
        Guid sibling = Seed("blogPost", isActive: false);
        _interceptor.Arm();

        bool deleted = await _sut.DeleteWithoutPromotionAsync(target);

        Assert.True(_interceptor.Fired);
        Assert.True(deleted);
        Assert.Null(Row(target));
        Assert.False(IsActive(sibling));
    }

    [Fact]
    public async Task DeleteWithoutPromotionAsync_OnAMissingConfig_ReturnsFalse()
    {
        Guid other = Seed("blogPost", isActive: true);

        bool deleted = await _sut.DeleteWithoutPromotionAsync(Guid.NewGuid());

        Assert.False(deleted);
        Assert.NotNull(Row(other));
    }

    // -------------------------------------------------------------------------
    // ReplaceIdAsync (006, deploy adoption)
    // -------------------------------------------------------------------------

    [Fact]
    public async Task ReplaceIdAsync_CopiesEveryFieldUnderTheNewId_AndDeletesTheOldOne()
    {
        var oldId = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var contextId = Guid.NewGuid();
        var creator = Guid.NewGuid();
        var modifier = Guid.NewGuid();
        using (var db = new UmbracoAIPageEvaluatorDbContext(Options(null)))
        {
            db.EvaluatorConfigs.Add(new AIEvaluatorConfigEntity
            {
                Id = oldId,
                Name = "Hand-made",
                Description = "Made on the target.",
                DocumentTypeAlias = "blogPost",
                ProfileId = profileId,
                ContextId = contextId,
                PromptText = "Check the title.",
                IsActive = true,
                DateCreated = Created,
                DateModified = Modified,
                CreatedByUserId = creator,
                ModifiedByUserId = modifier,
                Version = 7,
                PropertyAliases = "[\"title\",\"body\"]",
                ScoringEnabled = true,
                RecommendationsEnabled = false,
                IsDeployManaged = false,
            });
            db.SaveChanges();
        }

        var newId = Guid.NewGuid();
        _interceptor.Arm();

        AIEvaluatorConfig result = await _sut.ReplaceIdAsync(oldId, newId);

        Assert.True(_interceptor.Fired);
        Assert.Null(Row(oldId));
        AIEvaluatorConfigEntity copy = Row(newId)!;
        Assert.Equal("Hand-made", copy.Name);
        Assert.Equal("Made on the target.", copy.Description);
        Assert.Equal("blogPost", copy.DocumentTypeAlias);
        Assert.Equal(profileId, copy.ProfileId);
        Assert.Equal(contextId, copy.ContextId);
        Assert.Equal("Check the title.", copy.PromptText);
        Assert.True(copy.IsActive);
        Assert.Equal(Created, copy.DateCreated);
        Assert.Equal(Modified, copy.DateModified);
        Assert.Equal(creator, copy.CreatedByUserId);
        Assert.Equal(modifier, copy.ModifiedByUserId);
        Assert.Equal(7, copy.Version);
        Assert.Equal("[\"title\",\"body\"]", copy.PropertyAliases);
        Assert.True(copy.ScoringEnabled);
        Assert.False(copy.RecommendationsEnabled);
        // Adoption hands the config to Deploy.
        Assert.True(copy.IsDeployManaged);

        Assert.Equal(newId, result.Id);
        Assert.True(result.IsDeployManaged);
        Assert.Equal(["title", "body"], result.PropertyAliases);
    }

    [Fact]
    public async Task ReplaceIdAsync_WhenTheNewIdAlreadyExists_RollsBackAndKeepsBothRows()
    {
        Guid oldId = Seed("blogPost", isActive: true, name: "Old");
        Guid newId = Seed("landingPage", isActive: true, name: "Taken");

        await Assert.ThrowsAnyAsync<DbUpdateException>(() => _sut.ReplaceIdAsync(oldId, newId));

        AIEvaluatorConfigEntity? old = Row(oldId);
        Assert.NotNull(old);
        Assert.Equal("Old", old.Name);
        Assert.False(old.IsDeployManaged);
        Assert.Equal("Taken", Row(newId)!.Name);
    }

    [Fact]
    public async Task ReplaceIdAsync_WhenTheExistingIdIsMissing_ThrowsInvalidOperation()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.ReplaceIdAsync(Guid.NewGuid(), Guid.NewGuid()));
    }

    // -------------------------------------------------------------------------
    // Deploy import of an EXISTING config (EvaluatorConfigImportService.ImportAsync): the field save, then the
    // activation, each with another connection committing right after the call's first command.
    // -------------------------------------------------------------------------

    private static AIEvaluatorConfig Deployed(Guid id, string alias, bool isActive, int targetVersion) => new()
    {
        Id = id,
        Name = "Deployed name",
        Description = "Deployed description",
        DocumentTypeAlias = alias,
        ProfileId = Guid.NewGuid(),
        ContextId = Guid.NewGuid(),
        PromptText = "Deployed prompt.",
        PropertyAliases = ["title"],
        ScoringEnabled = true,
        RecommendationsEnabled = false,
        IsDeployManaged = true,
        IsActive = isActive,
        Version = targetVersion,
        // What the import service sets; the field save must not take these from here.
        DateCreated = DateTime.UtcNow,
        CreatedByUserId = Guid.NewGuid(),
        ModifiedByUserId = null,
    };

    [Theory]
    [InlineData(false, true)]
    [InlineData(false, false)]
    [InlineData(true, true)]
    [InlineData(true, false)]
    public async Task ImportFieldSaveThenActivation_OnAnExistingConfig_SurvivesAnotherConnectionCommitting(bool targetActive, bool sourceActive)
    {
        Guid id = Seed("blogPost", isActive: targetActive, version: 3);
        Guid sibling = Seed("blogPost", isActive: !targetActive);
        DateTime before = DateTime.UtcNow.AddSeconds(-1);

        _interceptor.Arm();
        await _sut.UpdateDeployedFieldsAsync(Deployed(id, "blogPost", isActive: !targetActive, targetVersion: 3));
        Assert.True(_interceptor.Fired);

        _interceptor.Arm();
        if (sourceActive)
            await _sut.SetActiveAsync(id);
        else
            await _sut.SetInactiveAsync(id);
        Assert.True(_interceptor.Fired);

        AIEvaluatorConfigEntity row = Row(id)!;
        Assert.Equal("Deployed name", row.Name);
        Assert.Equal("Deployed description", row.Description);
        Assert.Equal("Deployed prompt.", row.PromptText);
        Assert.Equal("[\"title\"]", row.PropertyAliases);
        Assert.True(row.ScoringEnabled);
        Assert.False(row.RecommendationsEnabled);
        Assert.True(row.IsDeployManaged);
        Assert.Equal(4, row.Version);
        Assert.True(row.DateModified >= before);
        Assert.Null(row.ModifiedByUserId);
        Assert.Equal(Created, row.DateCreated); // the target keeps its own creation date and creator
        Assert.Null(row.CreatedByUserId);
        Assert.Equal(sourceActive, row.IsActive);
        if (sourceActive)
            Assert.False(IsActive(sibling));
    }

    [Fact]
    public async Task UpdateDeployedFieldsAsync_LeavesIsActiveAlone()
    {
        Guid id = Seed("blogPost", isActive: true, version: 2);

        await _sut.UpdateDeployedFieldsAsync(Deployed(id, "blogPost", isActive: false, targetVersion: 2));

        Assert.True(IsActive(id));
        Assert.Equal(3, Row(id)!.Version);
    }

    [Fact]
    public async Task UpdateDeployedFieldsAsync_MovingAnActiveRowToAnotherDocumentType_StoresItInactive()
    {
        // Otherwise the new document type would briefly have two active configs before the activation step.
        Guid id = Seed("blogPost", isActive: true, version: 2);
        Guid otherTypeActive = Seed("landingPage", isActive: true);
        _interceptor.Arm();

        await _sut.UpdateDeployedFieldsAsync(Deployed(id, "landingPage", isActive: true, targetVersion: 2));

        Assert.True(_interceptor.Fired);
        AIEvaluatorConfigEntity row = Row(id)!;
        Assert.Equal("landingPage", row.DocumentTypeAlias);
        Assert.False(row.IsActive);
        Assert.True(IsActive(otherTypeActive));
    }

    [Fact]
    public async Task UpdateDeployedFieldsAsync_OnAMissingConfig_ThrowsAConcurrencyError()
    {
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(
            () => _sut.UpdateDeployedFieldsAsync(Deployed(Guid.NewGuid(), "blogPost", isActive: false, targetVersion: 1)));
    }

    [Fact]
    public async Task UpdateDeployedFieldsAsync_WithAStaleVersion_ThrowsAConcurrencyErrorAndChangesNothing()
    {
        Guid id = Seed("blogPost", isActive: false, version: 5);

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(
            () => _sut.UpdateDeployedFieldsAsync(Deployed(id, "blogPost", isActive: false, targetVersion: 4)));

        AIEvaluatorConfigEntity row = Row(id)!;
        Assert.Equal(5, row.Version);
        Assert.Equal("Config " + id, row.Name);
    }

    [Fact]
    public async Task SetActiveAsync_OnAMissingConfig_ChangesNothing()
    {
        Guid other = Seed("blogPost", isActive: true);

        await _sut.SetActiveAsync(Guid.NewGuid());

        Assert.True(IsActive(other));
    }

    // -------------------------------------------------------------------------
    // Backoffice SaveAsync / DeleteAsync under contention (write-first since 17.6.1)
    // -------------------------------------------------------------------------

    private static AIEvaluatorConfig Edited(Guid id, string alias, bool isActive, int version) => new()
    {
        Id = id,
        Name = "Edited name",
        Description = "Edited description",
        DocumentTypeAlias = alias,
        ProfileId = Guid.NewGuid(),
        PromptText = "Edited prompt.",
        PropertyAliases = ["title", "metaDescription"],
        ScoringEnabled = true,
        RecommendationsEnabled = false,
        IsActive = isActive,
        Version = version,
        DateCreated = DateTime.UtcNow, // the stored creation date must not change on update
        ModifiedByUserId = Guid.NewGuid(),
    };

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SaveAsync_OnAnExistingConfig_SurvivesAnotherConnectionCommitting(bool isActive)
    {
        Guid id = Seed("blogPost", isActive: isActive, version: 2);
        Guid sibling = Seed("blogPost", isActive: !isActive);
        AIEvaluatorConfig edited = Edited(id, "blogPost", isActive, version: 2);
        DateTime before = DateTime.UtcNow.AddSeconds(-1);
        _interceptor.Arm();

        await _sut.SaveAsync(edited);

        Assert.True(_interceptor.Fired);
        AIEvaluatorConfigEntity row = Row(id)!;
        Assert.Equal("Edited name", row.Name);
        Assert.Equal("Edited description", row.Description);
        Assert.Equal("Edited prompt.", row.PromptText);
        Assert.Equal("[\"title\",\"metaDescription\"]", row.PropertyAliases);
        Assert.True(row.ScoringEnabled);
        Assert.False(row.RecommendationsEnabled);
        Assert.Equal(isActive, row.IsActive);
        Assert.Equal(3, row.Version);
        Assert.True(row.DateModified >= before);
        Assert.Equal(edited.ModifiedByUserId, row.ModifiedByUserId);
        Assert.Equal(Created, row.DateCreated);
        // Saving an active config keeps the one-active-per-type rule; saving an inactive one touches no sibling.
        Assert.Equal(!isActive, IsActive(sibling));
    }

    [Fact]
    public async Task SaveAsync_ANewConfig_IsInsertedActive_AndDeactivatesTheSibling_UnderContention()
    {
        Guid sibling = Seed("blogPost", isActive: true);
        Guid id = Guid.NewGuid();
        AIEvaluatorConfig created = Edited(id, "blogPost", isActive: true, version: 1);
        _interceptor.Arm();

        await _sut.SaveAsync(created);

        Assert.True(_interceptor.Fired);
        AIEvaluatorConfigEntity row = Row(id)!;
        Assert.True(row.IsActive);
        Assert.Equal(1, row.Version);
        Assert.False(IsActive(sibling));
    }

    [Fact]
    public async Task SaveAsync_WithAStaleVersion_ThrowsAConcurrencyErrorAndChangesNothing()
    {
        Guid id = Seed("blogPost", isActive: false, version: 5);

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(
            () => _sut.SaveAsync(Edited(id, "blogPost", isActive: false, version: 4)));

        AIEvaluatorConfigEntity row = Row(id)!;
        Assert.Equal(5, row.Version);
        Assert.Equal("Config " + id, row.Name);
    }

    [Fact]
    public async Task DeleteAsync_TheActiveConfig_PromotesTheMostRecentlyModifiedSibling_UnderContention()
    {
        Guid target = Seed("blogPost", isActive: true);
        Guid older = Seed("blogPost", isActive: false);
        Guid newer = Seed("blogPost", isActive: false);
        Guid otherType = Seed("landingPage", isActive: false);
        await using (var db = new UmbracoAIPageEvaluatorDbContext(Options(null)))
        {
            await db.EvaluatorConfigs.Where(e => e.Id == newer)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.DateModified, Modified.AddDays(1)));
        }
        _interceptor.Arm();

        await _sut.DeleteAsync(target);

        Assert.True(_interceptor.Fired);
        Assert.Null(Row(target));
        Assert.True(IsActive(newer));
        Assert.False(IsActive(older));
        Assert.False(IsActive(otherType));
    }

    [Fact]
    public async Task DeleteAsync_AnInactiveConfig_PromotesNothing_UnderContention()
    {
        Guid active = Seed("blogPost", isActive: true);
        Guid target = Seed("blogPost", isActive: false);
        Guid other = Seed("blogPost", isActive: false);
        _interceptor.Arm();

        await _sut.DeleteAsync(target);

        Assert.True(_interceptor.Fired);
        Assert.Null(Row(target));
        Assert.True(IsActive(active));
        Assert.False(IsActive(other));
    }

    [Fact]
    public async Task DeleteAsync_OnAMissingConfig_ChangesNothing()
    {
        Guid active = Seed("blogPost", isActive: true);

        await _sut.DeleteAsync(Guid.NewGuid());

        Assert.True(IsActive(active));
    }

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        foreach (string path in new[] { _dbPath, _dbPath + "-wal", _dbPath + "-shm" })
        {
            try { File.Delete(path); } catch (IOException) { }
        }
    }
}
