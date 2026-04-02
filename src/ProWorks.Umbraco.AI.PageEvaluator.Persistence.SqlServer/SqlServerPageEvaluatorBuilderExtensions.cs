using Microsoft.EntityFrameworkCore;
using ProWorks.Umbraco.AI.PageEvaluator.Persistence;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Extensions;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer;

/// <summary>
/// Extension methods for <see cref="IUmbracoBuilder"/> to register the SQL Server persistence
/// provider for the ProWorks AI Page Evaluator package.
/// </summary>
public static class SqlServerPageEvaluatorBuilderExtensions
{
    /// <summary>
    /// Registers the <see cref="UmbracoAIPageEvaluatorDbContext"/> using SQL Server, reading the
    /// connection string from Umbraco's configured <c>umbracoDbDSN</c> connection string.
    /// Call this from your <c>Program.cs</c> after <c>.AddComposers()</c> when your Umbraco
    /// site is configured with SQL Server.
    /// </summary>
    public static IUmbracoBuilder AddPageEvaluatorSqlServer(this IUmbracoBuilder builder)
    {
        builder.Services.AddUmbracoDbContext<UmbracoAIPageEvaluatorDbContext>(
            (optionsBuilder, connectionString, providerName, serviceProvider) =>
            {
                optionsBuilder.UseSqlServer(
                    connectionString,
                    o => o.MigrationsAssembly("ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer"));
            });

        return builder;
    }
}
