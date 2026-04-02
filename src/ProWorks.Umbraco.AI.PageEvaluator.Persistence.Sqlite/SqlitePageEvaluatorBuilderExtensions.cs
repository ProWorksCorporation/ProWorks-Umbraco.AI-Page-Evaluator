using Microsoft.EntityFrameworkCore;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite;

/// <summary>
/// Extension methods for <see cref="IUmbracoBuilder"/> to register the SQLite persistence
/// provider for the ProWorks AI Page Evaluator package.
/// </summary>
public static class SqlitePageEvaluatorBuilderExtensions
{
    /// <summary>
    /// Registers the <see cref="UmbracoAIPageEvaluatorDbContext"/> using SQLite, reading the
    /// connection string from Umbraco's configured <c>umbracoDbDSN</c> connection string.
    /// Call this from your <c>Program.cs</c> after <c>.AddComposers()</c> when your Umbraco
    /// site is configured with SQLite.
    /// </summary>
    public static IUmbracoBuilder AddPageEvaluatorSqlite(this IUmbracoBuilder builder)
    {
        builder.Services.AddUmbracoDbContext<UmbracoAIPageEvaluatorDbContext>(
            (optionsBuilder, connectionString, providerName, serviceProvider) =>
            {
                optionsBuilder.UseSqlite(
                    connectionString,
                    o => o.MigrationsAssembly("ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite"));
            });

        return builder;
    }
}
