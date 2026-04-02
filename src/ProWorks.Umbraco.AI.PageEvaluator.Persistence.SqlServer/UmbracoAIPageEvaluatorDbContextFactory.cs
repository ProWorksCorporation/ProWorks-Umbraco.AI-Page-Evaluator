using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer;

/// <summary>
/// Design-time factory for <see cref="UmbracoAIPageEvaluatorDbContext"/> using SQL Server.
/// Used exclusively by <c>dotnet ef migrations add</c> — not registered in the DI container.
/// </summary>
public sealed class UmbracoAIPageEvaluatorDbContextFactory
    : IDesignTimeDbContextFactory<UmbracoAIPageEvaluatorDbContext>
{
    public UmbracoAIPageEvaluatorDbContext CreateDbContext(string[] args)
    {
        DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext> optionsBuilder =
            new DbContextOptionsBuilder<UmbracoAIPageEvaluatorDbContext>();

        optionsBuilder.UseSqlServer(
            "Server=.;Database=UmbracoAIPageEvaluator;Trusted_Connection=True;TrustServerCertificate=True;",
            o => o.MigrationsAssembly("ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer"));

        return new UmbracoAIPageEvaluatorDbContext(optionsBuilder.Options);
    }
}
