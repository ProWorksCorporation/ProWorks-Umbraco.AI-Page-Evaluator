<!-- Draft issue for the Umbraco.AI repository (not yet filed). Check that "#117" is the PR that added AIMigrationHistoryHelper (commit 237e54568) before posting. -->

# Migration history copy matches third-party migrations whose names contain "UmbracoAI"

## Summary

On startup, `AIMigrationHistoryHelper.MigrateHistoryRecordsAsync` copies rows from the shared `__EFMigrationsHistory` table into `__UmbracoAIMigrationsHistory`. The filter is `WHERE [MigrationId] LIKE '%UmbracoAI%'`. That also matches migrations from **third-party packages** whose migration names contain "UmbracoAI", so those packages' history ends up in Umbraco.AI's table.

## Environment

- Umbraco CMS 17.8.0, Umbraco.AI 17.6.1, SQL Server (LocalDB). The same pattern applies on SQLite.
- Third-party package: ProWorks.Umbraco.AI.PageEvaluator. Its EF Core migrations live in `__EFMigrationsHistory` and are named like `20260401000247_UmbracoAIPageEvaluator_InitialCreate`.

## Steps to reproduce

1. Install a package with its own EF Core `DbContext`, using the default `__EFMigrationsHistory` table, whose migration names contain "UmbracoAI". For example, an add-on that names its migrations after the ecosystem: `UmbracoAIPageEvaluator_…`.
2. Upgrade Umbraco.AI to a version that has `AIMigrationHistoryHelper` (added in #117) and start the site.

## Observed

The log shows:

```
Migrated 6 history record(s) from __EFMigrationsHistory to __UmbracoAIMigrationsHistory
```

All six of those rows are the third-party package's migrations, for example:

```
__UmbracoAIMigrationsHistory
  20260401000247_UmbracoAIPageEvaluator_InitialCreate
  20260402120000_UmbracoAIPageEvaluator_AddEvaluationCache
  …
  20260924163102_UmbracoAIPageEvaluator_AddEvaluationCacheCulture
```

Umbraco.AI's own rows were already in `__UmbracoAIMigrationsHistory`.

## Expected

Only Umbraco.AI's own migration history is copied.

## Impact

- **Today:** none that we've seen. The helper only copies, so the package's rows stay in `__EFMigrationsHistory`, and EF Core ignores unknown applied IDs in Umbraco.AI's table.
- **Risk:**
  - A future cleanup step that removes "migrated" rows from `__EFMigrationsHistory` with the same pattern would delete the third-party package's history. That package would then try to re-run `InitialCreate` on startup and fail because its tables already exist.
  - The foreign rows also make `__UmbracoAIMigrationsHistory` misleading when diagnosing migration state.

## Suggested fix

Copy only the IDs the calling product actually owns, instead of a name pattern. The product prefixes vary (`UmbracoAI_`, `UmbracoAIAgent_`, `UmbracoAIPrompt_`, `UmbracoAIConversations_`, …), so tightening the `LIKE` pattern alone isn't reliable. For example:

- pass the context's own migration IDs to the helper (`dbContext.Database.GetMigrations()`) and copy `WHERE MigrationId IN (…)`; or
- have each product pass its explicit prefix(es) and match `LIKE '%[_]UmbracoAIAgent[_]%'`, and so on. In SQL Server, `[_]` escapes the underscore wildcard; use `ESCAPE` on SQLite.

Source: `Umbraco.AI/src/Umbraco.AI.Core/Configuration/AIMigrationHistoryHelper.cs` (`MigrationPattern = "%UmbracoAI%"`). It's called from the Core, Agent, Prompt, Search and Conversations migration notification handlers.
