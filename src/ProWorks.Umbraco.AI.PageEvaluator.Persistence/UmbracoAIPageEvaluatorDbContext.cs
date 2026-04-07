using Microsoft.EntityFrameworkCore;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Cache;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;
using Umbraco.Cms.Persistence.EFCore;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence;

/// <summary>
/// EFCore DbContext for the ProWorks AI Page Evaluator package.
/// Follows the pattern established by Umbraco.AI.Prompt and Umbraco.AI.Agent.
/// Provider-specific migrations live in separate assembly projects:
///   - ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer
///   - ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite
/// </summary>
public sealed class UmbracoAIPageEvaluatorDbContext : DbContext
{
    public UmbracoAIPageEvaluatorDbContext(DbContextOptions<UmbracoAIPageEvaluatorDbContext> options)
        : base(options)
    {
    }

    public DbSet<AIEvaluatorConfigEntity> EvaluatorConfigs => Set<AIEvaluatorConfigEntity>();
    public DbSet<EvaluationCacheEntity> EvaluationCache => Set<EvaluationCacheEntity>();

    /// <summary>
    /// Configures the EFCore options for the correct database provider, pointing migrations
    /// at the appropriate provider-specific assembly. Called from the composer so consumers
    /// don't need to configure anything in Program.cs.
    /// </summary>
    internal static void ConfigureProvider(
        DbContextOptionsBuilder options,
        string? connectionString,
        string? providerName)
    {
        switch (providerName)
        {
            case Constants.ProviderNames.SQLServer:
                options.UseSqlServer(connectionString,
                    o => o.MigrationsAssembly("ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer"));
                break;
            default: // SQLite (Constants.ProviderNames.SQLLite = "Microsoft.Data.Sqlite")
                options.UseSqlite(connectionString,
                    o => o.MigrationsAssembly("ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite"));
                break;
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AIEvaluatorConfigEntity>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Optimistic concurrency: EF Core adds WHERE Version = @old to UPDATE statements.
            entity.Property(e => e.Version).IsConcurrencyToken();

            // Composite index used by the active-config lookup and list queries.
            entity.HasIndex(e => new { e.DocumentTypeAlias, e.IsActive })
                .HasDatabaseName("IX_umbracoAIEvaluatorConfig_DocumentTypeAlias_IsActive");
        });

        modelBuilder.Entity<EvaluationCacheEntity>(entity =>
        {
            entity.HasKey(e => e.NodeId);
        });
    }
}
