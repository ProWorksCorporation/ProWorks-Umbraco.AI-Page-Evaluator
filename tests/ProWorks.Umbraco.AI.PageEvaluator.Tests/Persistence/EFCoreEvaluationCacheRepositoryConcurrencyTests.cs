using System.Data.Common;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NSubstitute;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluation;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Cache;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Persistence;

/// <summary>
/// Regression for the SQLite "database is locked" failure seen in 005 scratch-site validation: the cache write runs
/// right after the AI call, exactly when Umbraco.AI's background jobs (CompleteAuditLog, RecordUsage) commit their own
/// writes. In WAL mode, a transaction that reads first and then writes cannot upgrade once another connection has
/// committed after its read snapshot (SQLITE_BUSY_SNAPSHOT); Microsoft.Data.Sqlite retries that until the command
/// timeout (30 s by default) and then throws, failing the editor's evaluation after the AI has already answered.
/// Each save here runs in a transaction (as the Umbraco EF Core scope does) on a file database in WAL mode, and a
/// second connection commits a write right after the save's first command.
/// </summary>
public sealed class EFCoreEvaluationCacheRepositoryConcurrencyTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"pe-cache-{Guid.NewGuid():N}.db");
    private readonly string _connectionString;
    private readonly ConcurrentCommitInterceptor _interceptor;
    private readonly EFCoreEvaluationCacheRepository _sut;

    public EFCoreEvaluationCacheRepositoryConcurrencyTests()
    {
        // A short command timeout keeps the old (failing) behaviour to ~2 s instead of 30 s.
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
        _sut = new EFCoreEvaluationCacheRepository(scopeProvider);
    }

    private DbContextOptions<UmbracoAIPageEvaluatorDbContext> Options(IInterceptor? interceptor)
    {
        var builder = new DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext>().UseSqlite(_connectionString);
        if (interceptor is not null)
            builder.AddInterceptors(interceptor);
        return builder.Options;
    }

    private IEfCoreScope<UmbracoAIPageEvaluatorDbContext> CreateScope()
    {
        var scope = Substitute.For<IEfCoreScope<UmbracoAIPageEvaluatorDbContext>>();
        scope.ExecuteWithContextAsync(Arg.Any<Func<UmbracoAIPageEvaluatorDbContext, Task<object?>>>())
            .Returns(call => RunInTransaction(call.Arg<Func<UmbracoAIPageEvaluatorDbContext, Task<object?>>>()));
        return scope;
    }

    private async Task<T> RunInTransaction<T>(Func<UmbracoAIPageEvaluatorDbContext, Task<T>> work)
    {
        // Umbraco wraps SQLite connections in SqlitePreferDeferredTransactionsConnection, so scope transactions are
        // DEFERRED (no lock until the first statement) — unlike Microsoft.Data.Sqlite's default BEGIN IMMEDIATE.
        await using var db = new UmbracoAIPageEvaluatorDbContext(Options(_interceptor));
        await db.Database.OpenConnectionAsync();
        var connection = (SqliteConnection)db.Database.GetDbConnection();
        await using SqliteTransaction tx = connection.BeginTransaction(deferred: true);
        await db.Database.UseTransactionAsync(tx);
        T result = await work(db);
        await tx.CommitAsync();
        return result;
    }

    private static EvaluationCacheEntry Entry(Guid nodeId, string culture, string suggestions) => new()
    {
        NodeId = nodeId,
        Culture = culture,
        DocumentTypeAlias = "blogPost",
        Report = EvaluationReport.Parsed(new EvaluationScore(1, 1), [], suggestions),
        CachedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task SaveAsync_NewRow_SurvivesAnotherConnectionCommittingDuringTheSave()
    {
        var nodeId = Guid.NewGuid();
        _interceptor.Arm();

        await _sut.SaveAsync(Entry(nodeId, "da-dk", "first"));

        Assert.True(_interceptor.Fired);
        EvaluationCacheEntry? saved = await new EFCoreEvaluationCacheRepository(PlainScopeProvider()).GetAsync(nodeId, "da-dk");
        Assert.Equal("first", saved?.Report.Suggestions);
    }

    [Fact]
    public async Task SaveAsync_ExistingRow_SurvivesAnotherConnectionCommittingDuringTheSave()
    {
        var nodeId = Guid.NewGuid();
        await _sut.SaveAsync(Entry(nodeId, "da-dk", "first"));
        _interceptor.Arm();

        await _sut.SaveAsync(Entry(nodeId, "da-dk", "second"));

        Assert.True(_interceptor.Fired);
        EvaluationCacheEntry? saved = await new EFCoreEvaluationCacheRepository(PlainScopeProvider()).GetAsync(nodeId, "da-dk");
        Assert.Equal("second", saved?.Report.Suggestions);
    }

    private IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext> PlainScopeProvider()
    {
        var provider = Substitute.For<IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext>>();
        provider.CreateScope(Arg.Any<RepositoryCacheMode>(), Arg.Any<bool?>()).Returns(_ =>
        {
            var scope = Substitute.For<IEfCoreScope<UmbracoAIPageEvaluatorDbContext>>();
            scope.ExecuteWithContextAsync(Arg.Any<Func<UmbracoAIPageEvaluatorDbContext, Task<EvaluationCacheEntity?>>>())
                .Returns(async call =>
                {
                    await using var db = new UmbracoAIPageEvaluatorDbContext(Options(null));
                    return await call.Arg<Func<UmbracoAIPageEvaluatorDbContext, Task<EvaluationCacheEntity?>>>()(db);
                });
            return scope;
        });
        return provider;
    }

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        foreach (string path in new[] { _dbPath, _dbPath + "-wal", _dbPath + "-shm" })
        {
            try { File.Delete(path); } catch (IOException) { }
        }
    }

    /// <summary>
    /// Once armed, commits a write on a separate connection right after the next command the save executes — the
    /// moment Umbraco.AI's background jobs commit in production. If the save already holds the write lock, that
    /// write waits briefly and gives up (its failure is expected and ignored).
    /// </summary>
    private sealed class ConcurrentCommitInterceptor(string connectionString) : DbCommandInterceptor
    {
        private bool _armed;
        public bool Fired { get; private set; }

        public void Arm() { _armed = true; Fired = false; }

        private void CommitElsewhere()
        {
            if (!_armed) return;
            _armed = false;
            Fired = true;
            var builder = new SqliteConnectionStringBuilder(connectionString) { DefaultTimeout = 1 };
            using var other = new SqliteConnection(builder.ToString());
            other.Open();
            using SqliteCommand cmd = other.CreateCommand();
            cmd.CommandText = "INSERT INTO OtherWriter (At) VALUES (datetime('now'));";
            try { cmd.ExecuteNonQuery(); }
            catch (SqliteException) { /* blocked by the save's write lock: fine */ }
        }

        public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            CommitElsewhere();
            return ValueTask.FromResult(result);
        }

        public override ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData, int result, CancellationToken cancellationToken = default)
        {
            CommitElsewhere();
            return ValueTask.FromResult(result);
        }
    }
}
