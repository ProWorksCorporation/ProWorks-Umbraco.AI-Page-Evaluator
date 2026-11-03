using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Persistence;

/// <summary>
/// <see cref="EFCoreAIEvaluatorConfigRepository.SetActiveAsync"/> against a real in-memory SQLite context
/// (same harness as <see cref="EFCoreEvaluationCacheRepositoryTests"/>).
/// </summary>
public sealed class EFCoreAIEvaluatorConfigRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<UmbracoAIPageEvaluatorDbContext> _options;
    private readonly EFCoreAIEvaluatorConfigRepository _sut;

    public EFCoreAIEvaluatorConfigRepositoryTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext>().UseSqlite(_connection).Options;
        using (var db = new UmbracoAIPageEvaluatorDbContext(_options))
            db.Database.EnsureCreated();

        var scopeProvider = Substitute.For<IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext>>();
        scopeProvider.CreateScope(Arg.Any<RepositoryCacheMode>(), Arg.Any<bool?>()).Returns(_ => CreateScope());
        _sut = new EFCoreAIEvaluatorConfigRepository(scopeProvider);
    }

    private IEfCoreScope<UmbracoAIPageEvaluatorDbContext> CreateScope()
    {
        var scope = Substitute.For<IEfCoreScope<UmbracoAIPageEvaluatorDbContext>>();
        scope.ExecuteWithContextAsync(Arg.Any<Func<UmbracoAIPageEvaluatorDbContext, Task<object?>>>())
            .Returns(call => Run(call.Arg<Func<UmbracoAIPageEvaluatorDbContext, Task<object?>>>()));
        return scope;
    }

    private async Task<T> Run<T>(Func<UmbracoAIPageEvaluatorDbContext, Task<T>> work)
    {
        await using var db = new UmbracoAIPageEvaluatorDbContext(_options);
        return await work(db);
    }

    private Guid Seed(string alias, bool isActive)
    {
        var id = Guid.NewGuid();
        using var db = new UmbracoAIPageEvaluatorDbContext(_options);
        db.EvaluatorConfigs.Add(new AIEvaluatorConfigEntity
        {
            Id = id,
            Name = "Config " + id,
            DocumentTypeAlias = alias,
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            IsActive = isActive,
            DateCreated = DateTime.UtcNow,
            DateModified = DateTime.UtcNow,
        });
        db.SaveChanges();
        return id;
    }

    private bool IsActive(Guid id)
    {
        using var db = new UmbracoAIPageEvaluatorDbContext(_options);
        return db.EvaluatorConfigs.AsNoTracking().Single(e => e.Id == id).IsActive;
    }

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

    public void Dispose() => _connection.Dispose();
}
