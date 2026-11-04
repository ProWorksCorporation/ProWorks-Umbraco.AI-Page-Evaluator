using Microsoft.Extensions.Logging;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators;
using ProWorks.Umbraco.AI.PageEvaluator.Evaluators.Notifications;
using Umbraco.Cms.Core.Events;

namespace ProWorks.Umbraco.AI.PageEvaluator.Services;

/// <summary>
/// Publishes <see cref="EvaluatorConfigSavedNotification"/> / <see cref="EvaluatorConfigDeletedNotification"/> for every
/// evaluator configuration whose stored state changed, found by reading the affected document types' rows before and
/// after a repository call (006 research R10, data-model §2). Shared by <see cref="AIEvaluatorConfigService"/> and
/// <see cref="EvaluatorConfigImportService"/>. Publishing never throws back into the operation: the change is committed.
/// </summary>
internal sealed class EvaluatorConfigChangeNotifier(
    IAIEvaluatorConfigRepository repository,
    IEventAggregator eventAggregator,
    ILogger logger)
{
    /// <summary>The stored rows of one or more document types, read before a repository call.</summary>
    public sealed record Snapshot(IReadOnlyList<string> Aliases, IReadOnlyDictionary<Guid, AIEvaluatorConfig> Rows);

    public async Task<Snapshot> SnapshotAsync(IEnumerable<string> aliases, CancellationToken cancellationToken)
    {
        // Each read runs in its own repository scope, before the write's scope starts (CLAUDE.md "Evaluation Cache":
        // never read-then-write inside one deferred SQLite transaction).
        string[] distinct = aliases.Distinct(StringComparer.Ordinal).ToArray();
        var rows = new Dictionary<Guid, AIEvaluatorConfig>();
        foreach (string alias in distinct)
        {
            foreach (AIEvaluatorConfig row in await repository.GetByDocumentTypeAliasAsync(alias, cancellationToken))
                rows[row.Id] = row;
        }

        return new Snapshot(distinct, rows);
    }

    /// <summary>
    /// Publishes Saved for every row that is new or whose stored state changed (plus <paramref name="target"/>, the
    /// row the caller saved), and Deleted for every row that disappeared. Never throws: the change is committed.
    /// Returns the after-snapshot (null when it couldn't be read).
    /// </summary>
    public async Task<Snapshot?> PublishChangesAsync(Snapshot before, AIEvaluatorConfig? target, CancellationToken cancellationToken)
    {
        Snapshot after;
        try
        {
            after = await SnapshotAsync(before.Aliases, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex,
                "[PageEvaluator] Could not read evaluator configurations for {Aliases} after a change; Saved/Deleted notifications were not published.",
                string.Join(", ", before.Aliases));
            return null;
        }

        var messages = new EventMessages();
        var saved = new List<AIEvaluatorConfig>();

        if (target is not null)
            saved.Add(after.Rows.GetValueOrDefault(target.Id) ?? target);

        foreach (AIEvaluatorConfig row in after.Rows.Values)
        {
            if (row.Id == target?.Id)
                continue;
            if (!before.Rows.TryGetValue(row.Id, out AIEvaluatorConfig? previous) || HasChanged(previous, row))
                saved.Add(row);
        }

        foreach (AIEvaluatorConfig row in saved)
            await PublishSafelyAsync(new EvaluatorConfigSavedNotification(row, messages), row.Id, cancellationToken);

        foreach (Guid deletedId in before.Rows.Keys.Where(id => !after.Rows.ContainsKey(id)))
            await PublishSafelyAsync(new EvaluatorConfigDeletedNotification(deletedId, messages), deletedId, cancellationToken);

        return after;
    }

    private static bool HasChanged(AIEvaluatorConfig previous, AIEvaluatorConfig current)
        => previous.IsActive != current.IsActive
            || previous.Version != current.Version
            || previous.DateModified != current.DateModified
            || previous.IsDeployManaged != current.IsDeployManaged
            || !string.Equals(previous.DocumentTypeAlias, current.DocumentTypeAlias, StringComparison.Ordinal);

    private async Task PublishSafelyAsync<TNotification>(TNotification notification, Guid configId, CancellationToken cancellationToken)
        where TNotification : global::Umbraco.Cms.Core.Notifications.INotification
    {
        try
        {
            await eventAggregator.PublishAsync(notification, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Never let a handler throw into the operation that raised it (CLAUDE.md): the change is committed.
            logger.LogWarning(ex,
                "[PageEvaluator] A {Notification} handler failed for evaluator configuration {ConfigId}.",
                typeof(TNotification).Name, configId);
        }
    }
}
