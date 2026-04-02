using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Core.Notifications;

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Notifications;

/// <summary>
/// Runs pending EFCore migrations for <see cref="UmbracoAIPageEvaluatorDbContext"/> automatically
/// when Umbraco has finished starting. Follows the pattern established by Umbraco.AI.Prompt and
/// Umbraco.AI.Agent.
/// Note: Uses <c>UmbracoApplicationStartedNotification</c> (not <c>Starting</c>) — confirmed
/// from Umbraco.AI source inspection.
/// </summary>
public sealed class RunPageEvaluatorMigrationNotificationHandler
    : INotificationAsyncHandler<UmbracoApplicationStartedNotification>
{
    private readonly IDbContextFactory<UmbracoAIPageEvaluatorDbContext> _dbContextFactory;
    private readonly ILogger<RunPageEvaluatorMigrationNotificationHandler> _logger;

    public RunPageEvaluatorMigrationNotificationHandler(
        IDbContextFactory<UmbracoAIPageEvaluatorDbContext> dbContextFactory,
        ILogger<RunPageEvaluatorMigrationNotificationHandler> logger)
    {
        _dbContextFactory = dbContextFactory;
        _logger = logger;
    }

    public async Task HandleAsync(
        UmbracoApplicationStartedNotification notification,
        CancellationToken cancellationToken)
    {
        try
        {
            await using UmbracoAIPageEvaluatorDbContext db =
                await _dbContextFactory.CreateDbContextAsync(cancellationToken);

            IReadOnlyList<string> pending = (await db.Database.GetPendingMigrationsAsync(cancellationToken))
                .ToList()
                .AsReadOnly();

            if (pending.Count == 0)
            {
                _logger.LogDebug(
                    "ProWorks AI Page Evaluator: no pending EFCore migrations.");
                return;
            }

            _logger.LogInformation(
                "ProWorks AI Page Evaluator: applying {Count} pending EFCore migration(s): {Migrations}",
                pending.Count,
                string.Join(", ", pending));

            await db.Database.MigrateAsync(cancellationToken);

            _logger.LogInformation(
                "ProWorks AI Page Evaluator: EFCore migrations applied successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "ProWorks AI Page Evaluator: failed to apply EFCore migrations. " +
                "The umbracoAIEvaluatorConfig table may not exist. " +
                "Resolve the migration error and restart the application.");
        }
    }
}
