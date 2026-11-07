using System.Data.Common;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Persistence;

/// <summary>
/// Once armed, commits a write on a separate connection right after the next command the repository executes — the
/// moment Umbraco.AI's background jobs commit in production. If the repository's transaction already holds the write
/// lock, that write waits briefly and gives up (its failure is expected and ignored). A repository that reads and then
/// writes inside one deferred SQLite transaction fails after this (SQLITE_BUSY_SNAPSHOT → "database is locked").
/// The database must contain an <c>OtherWriter (Id INTEGER PRIMARY KEY AUTOINCREMENT, At TEXT)</c> table.
/// Shared by <see cref="EFCoreEvaluationCacheRepositoryConcurrencyTests"/> and <see cref="EFCoreAIEvaluatorConfigRepositoryTests"/>.
/// </summary>
internal sealed class ConcurrentCommitInterceptor(string connectionString) : DbCommandInterceptor
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
        catch (SqliteException) { /* blocked by the repository's write lock: fine */ }
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
