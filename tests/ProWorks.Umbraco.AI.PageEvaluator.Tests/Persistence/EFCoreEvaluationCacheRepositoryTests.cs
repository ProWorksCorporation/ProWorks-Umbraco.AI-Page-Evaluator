using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Cache;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Persistence;

/// <summary>
/// Composite (NodeId, Culture) cache key (FR-018d, data-model.md §1), exercised against a real
/// in-memory SQLite <see cref="UmbracoAIPageEvaluatorDbContext"/>. The Umbraco EF Core scope is
/// substituted so each <c>ExecuteWithContextAsync</c> callback runs against that context.
/// </summary>
public sealed class EFCoreEvaluationCacheRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<UmbracoAIPageEvaluatorDbContext> _options;
    private readonly EFCoreEvaluationCacheRepository _sut;

    public EFCoreEvaluationCacheRepositoryTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext>().UseSqlite(_connection).Options;
        using (var db = new UmbracoAIPageEvaluatorDbContext(_options))
            db.Database.EnsureCreated();

        var scopeProvider = Substitute.For<IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext>>();
        scopeProvider.CreateScope(Arg.Any<RepositoryCacheMode>(), Arg.Any<bool?>()).Returns(_ => CreateScope());
        _sut = new EFCoreEvaluationCacheRepository(scopeProvider);
    }

    private readonly List<IEfCoreScope<UmbracoAIPageEvaluatorDbContext>> _scopes = [];

    private IEfCoreScope<UmbracoAIPageEvaluatorDbContext> CreateScope()
    {
        var scope = Substitute.For<IEfCoreScope<UmbracoAIPageEvaluatorDbContext>>();
        _scopes.Add(scope);
        scope.ExecuteWithContextAsync(Arg.Any<Func<UmbracoAIPageEvaluatorDbContext, Task<EvaluationCacheEntity?>>>())
            .Returns(call => Run(call.Arg<Func<UmbracoAIPageEvaluatorDbContext, Task<EvaluationCacheEntity?>>>()));
        scope.ExecuteWithContextAsync(Arg.Any<Func<UmbracoAIPageEvaluatorDbContext, Task<object?>>>())
            .Returns(call => Run(call.Arg<Func<UmbracoAIPageEvaluatorDbContext, Task<object?>>>()));
        return scope;
    }

    private async Task<T> Run<T>(Func<UmbracoAIPageEvaluatorDbContext, Task<T>> work)
    {
        await using var db = new UmbracoAIPageEvaluatorDbContext(_options);
        return await work(db);
    }

    private static EvaluationCacheEntry Entry(Guid nodeId, string culture, string suggestions, string alias = "blogPost")
        => new()
        {
            NodeId = nodeId,
            Culture = culture,
            DocumentTypeAlias = alias,
            Report = EvaluationReport.Parsed(new EvaluationScore(1, 1), [], suggestions),
            CachedAt = DateTime.UtcNow,
        };

    private int RowCount()
    {
        using var db = new UmbracoAIPageEvaluatorDbContext(_options);
        return db.EvaluationCache.Count();
    }

    [Fact]
    public async Task GetAsync_CompletesItsScope_WithAndWithoutAHit()
    {
        // 17.6.2: a scope disposed without Complete() inside an outer Umbraco transaction (e.g. a Deploy import or a
        // content operation's notification handlers) makes that transaction roll back (CoreScope.ChildCompleted).
        var nodeId = Guid.NewGuid();
        await _sut.SaveAsync(Entry(nodeId, "", "x"));
        _scopes.Clear();

        await _sut.GetAsync(nodeId, "");
        await _sut.GetAsync(Guid.NewGuid(), "");

        Assert.Equal(2, _scopes.Count);
        foreach (IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope in _scopes)
            scope.Received(1).Complete();
    }

    [Fact]
    public async Task GetAsync_ReturnsCachedAtAsUtc()
    {
        // Regression (005 scratch-site validation): providers read DateTime back as Kind = Unspecified, so the
        // cached-report endpoint serialised CachedAt without a "Z" and the browser showed "Last evaluated" in UTC
        // wall-clock time as if it were local time (off by the UTC offset). Values are always written as UtcNow.
        var nodeId = Guid.NewGuid();
        DateTime written = DateTime.UtcNow;
        EvaluationCacheEntry entry = Entry(nodeId, "", "s");
        await _sut.SaveAsync(new EvaluationCacheEntry
        {
            NodeId = entry.NodeId, Culture = entry.Culture, DocumentTypeAlias = entry.DocumentTypeAlias,
            Report = entry.Report, CachedAt = written,
        });

        EvaluationCacheEntry? read = await _sut.GetAsync(nodeId, "");

        Assert.NotNull(read);
        Assert.Equal(DateTimeKind.Utc, read.CachedAt.Kind);
        Assert.Equal(written, read.CachedAt, TimeSpan.FromMilliseconds(1));
        Assert.EndsWith("Z", System.Text.Json.JsonSerializer.Serialize(read.CachedAt).Trim('"'));
    }

    [Fact]
    public async Task SaveAsync_UpsertsOnNodeAndCulture()
    {
        var nodeId = Guid.NewGuid();

        await _sut.SaveAsync(Entry(nodeId, "da-dk", "first"));
        await _sut.SaveAsync(Entry(nodeId, "da-dk", "second"));
        await _sut.SaveAsync(Entry(nodeId, "en-us", "english"));

        Assert.Equal(2, RowCount());
        Assert.Equal("second", (await _sut.GetAsync(nodeId, "da-dk"))!.Report.Suggestions);
        Assert.Equal("english", (await _sut.GetAsync(nodeId, "en-us"))!.Report.Suggestions);
    }

    [Fact]
    public async Task GetAsync_IgnoresOtherCulturesAndTheLegacyInvariantRow()
    {
        var nodeId = Guid.NewGuid();
        await _sut.SaveAsync(Entry(nodeId, "en-us", "english"));
        await _sut.SaveAsync(Entry(nodeId, string.Empty, "legacy"));

        Assert.Null(await _sut.GetAsync(nodeId, "da-dk"));
        EvaluationCacheEntry? invariant = await _sut.GetAsync(nodeId, string.Empty);
        Assert.Equal("legacy", invariant!.Report.Suggestions);
        Assert.Equal(string.Empty, invariant.Culture);
    }

    [Fact]
    public async Task DeleteAsync_RemovesOnlyThatCulture()
    {
        var nodeId = Guid.NewGuid();
        await _sut.SaveAsync(Entry(nodeId, "da-dk", "danish"));
        await _sut.SaveAsync(Entry(nodeId, "en-us", "english"));

        await _sut.DeleteAsync(nodeId, "da-dk");

        Assert.Null(await _sut.GetAsync(nodeId, "da-dk"));
        Assert.NotNull(await _sut.GetAsync(nodeId, "en-us"));
    }

    [Fact]
    public async Task DeleteAllCulturesAsync_RemovesEveryRowForTheNodeOnly()
    {
        var nodeId = Guid.NewGuid();
        var otherNode = Guid.NewGuid();
        await _sut.SaveAsync(Entry(nodeId, "da-dk", "danish"));
        await _sut.SaveAsync(Entry(nodeId, string.Empty, "legacy"));
        await _sut.SaveAsync(Entry(otherNode, "da-dk", "other"));

        await _sut.DeleteAllCulturesAsync(nodeId);

        Assert.Equal(1, RowCount());
        Assert.NotNull(await _sut.GetAsync(otherNode, "da-dk"));
    }

    [Fact]
    public async Task DeleteByDocumentTypeAliasAsync_RemovesEveryCulture()
    {
        var nodeId = Guid.NewGuid();
        await _sut.SaveAsync(Entry(nodeId, "da-dk", "danish"));
        await _sut.SaveAsync(Entry(nodeId, "en-us", "english"));
        await _sut.SaveAsync(Entry(Guid.NewGuid(), string.Empty, "other type", alias: "landingPage"));

        await _sut.DeleteByDocumentTypeAliasAsync("blogPost");

        Assert.Equal(1, RowCount());
    }

    [Fact]
    public async Task SourceUpdateDate_RoundTripsAsUtc()
    {
        // 006 data-model §1: saved-draft evaluations store the node's UpdateDate; read back as UTC like CachedAt.
        var nodeId = Guid.NewGuid();
        var source = new DateTime(2026, 11, 3, 10, 15, 30, 123, DateTimeKind.Utc);
        EvaluationCacheEntry entry = Entry(nodeId, "", "s");
        await _sut.SaveAsync(new EvaluationCacheEntry
        {
            NodeId = entry.NodeId, Culture = entry.Culture, DocumentTypeAlias = entry.DocumentTypeAlias,
            Report = entry.Report, CachedAt = entry.CachedAt, SourceUpdateDate = source,
        });

        EvaluationCacheEntry? read = await _sut.GetAsync(nodeId, "");

        Assert.NotNull(read);
        Assert.NotNull(read.SourceUpdateDate);
        Assert.Equal(DateTimeKind.Utc, read.SourceUpdateDate!.Value.Kind);
        Assert.Equal(source, read.SourceUpdateDate.Value, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task SourceUpdateDate_IsNullForOnScreenEntries()
    {
        var nodeId = Guid.NewGuid();
        await _sut.SaveAsync(Entry(nodeId, "", "on-screen"));

        EvaluationCacheEntry? read = await _sut.GetAsync(nodeId, "");

        Assert.NotNull(read);
        Assert.Null(read.SourceUpdateDate);
    }

    [Fact]
    public async Task SaveAsync_WriteFirstUpsert_UpdatesSourceUpdateDateOnAnExistingRow()
    {
        var nodeId = Guid.NewGuid();
        var first = new DateTime(2026, 11, 1, 8, 0, 0, DateTimeKind.Utc);
        var second = new DateTime(2026, 11, 2, 9, 30, 0, 500, DateTimeKind.Utc);
        EvaluationCacheEntry entry = Entry(nodeId, "da-dk", "s");
        EvaluationCacheEntry With(DateTime? source) => new()
        {
            NodeId = entry.NodeId, Culture = entry.Culture, DocumentTypeAlias = entry.DocumentTypeAlias,
            Report = entry.Report, CachedAt = entry.CachedAt, SourceUpdateDate = source,
        };

        await _sut.SaveAsync(With(first));
        await _sut.SaveAsync(With(second));
        Assert.Equal(1, RowCount());
        Assert.Equal(second, (await _sut.GetAsync(nodeId, "da-dk"))!.SourceUpdateDate!.Value, TimeSpan.FromMilliseconds(1));

        // An on-screen re-evaluation of the same (node, culture) clears the marker again.
        await _sut.SaveAsync(With(null));
        Assert.Null((await _sut.GetAsync(nodeId, "da-dk"))!.SourceUpdateDate);
    }

    public void Dispose() => _connection.Dispose();
}
