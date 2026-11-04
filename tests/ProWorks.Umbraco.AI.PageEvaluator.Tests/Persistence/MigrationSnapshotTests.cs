using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;
using Xunit;
using SqliteFactory = ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite.UmbracoAIPageEvaluatorDbContextFactory;
using SqlServerFactory = ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer.UmbracoAIPageEvaluatorDbContextFactory;

namespace ProWorks.Umbraco.AI.PageEvaluator.Tests.Persistence;

/// <summary>
/// Fails when <see cref="UmbracoAIPageEvaluatorDbContext"/>'s model has changed without a migration for a provider
/// (the model differs from that provider's <c>UmbracoAIPageEvaluatorDbContextModelSnapshot</c>). Uses the same
/// design-time factories as <c>dotnet ef migrations add</c>; <c>HasPendingModelChanges</c> only compares the model with
/// the snapshot, so no database (and no SQL Server) is opened. Fix a failure by adding a migration to BOTH projects
/// (CLAUDE.md "Commands").
/// </summary>
public sealed class MigrationSnapshotTests
{
    [Fact]
    public void Sqlite_HasNoPendingModelChanges()
    {
        using UmbracoAIPageEvaluatorDbContext db = new SqliteFactory().CreateDbContext([]);

        AssertMigrationsUpToDate(db, "ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite");
    }

    [Fact]
    public void SqlServer_HasNoPendingModelChanges()
    {
        using UmbracoAIPageEvaluatorDbContext db = new SqlServerFactory().CreateDbContext([]);

        AssertMigrationsUpToDate(db, "ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer");
    }

    private static void AssertMigrationsUpToDate(UmbracoAIPageEvaluatorDbContext db, string migrationsAssembly)
    {
        // Guards against comparing with an empty snapshot (a wrong migrations assembly would have none).
        Assert.Equal(migrationsAssembly,
            db.GetService<IMigrationsAssembly>().Assembly.GetName().Name);
        Assert.Contains(db.Database.GetMigrations(), m => m.EndsWith("_UmbracoAIPageEvaluator_InitialCreate", StringComparison.Ordinal));

        Assert.False(db.Database.HasPendingModelChanges(),
            $"UmbracoAIPageEvaluatorDbContext has model changes with no migration in {migrationsAssembly}. Add a migration to both provider projects.");
    }
}
