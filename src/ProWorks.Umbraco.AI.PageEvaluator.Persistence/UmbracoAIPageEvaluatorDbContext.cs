using Microsoft.EntityFrameworkCore;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence.Evaluators;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AIEvaluatorConfigEntity>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Composite index used by the active-config lookup and list queries.
            entity.HasIndex(e => new { e.DocumentTypeAlias, e.IsActive })
                .HasDatabaseName("IX_umbracoAIEvaluatorConfig_DocumentTypeAlias_IsActive");
        });
    }
}
