using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite;

/// <summary>
/// Design-time factory for <see cref="UmbracoAIPageEvaluatorDbContext"/> using SQLite.
/// Used exclusively by <c>dotnet ef migrations add</c> — not registered in the DI container.
/// </summary>
public sealed class UmbracoAIPageEvaluatorDbContextFactory
    : IDesignTimeDbContextFactory<UmbracoAIPageEvaluatorDbContext>
{
    public UmbracoAIPageEvaluatorDbContext CreateDbContext(string[] args)
    {
        DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext> optionsBuilder =
            new DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext>();

        optionsBuilder.UseSqlite(
            "Data Source=Umbraco.sqlite.db",
            o => o.MigrationsAssembly("ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite"));

        return new UmbracoAIPageEvaluatorDbContext(optionsBuilder.Options);
    }
}
