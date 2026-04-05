# Data Model Changes: Code Review Fixes

## Modified Entity: AIEvaluatorConfig

### New Field: PropertyAliases

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| PropertyAliases | `string?` | Yes | `null` | JSON array of property alias strings, e.g. `["title","bodyText","metaDescription"]`. Null = send all properties (backward compatible). |

**Domain model** (`AIEvaluatorConfig`):
- Add `List<string>? PropertyAliases { get; set; }` — deserialized from/to JSON string on the entity

**Entity** (`AIEvaluatorConfigEntity`):
- Add `string? PropertyAliases { get; set; }` — stored as JSON string in the database column

**Factory** (`AIEvaluatorConfigEntityFactory`):
- `ToDomain`: Deserialize JSON string to `List<string>?`
- `ToEntity`: Serialize `List<string>?` to JSON string
- `ApplyToEntity`: Same serialization on update

### Migration

- Add column `PropertyAliases` (nullable string, no max length) to `umbracoAIEvaluatorConfig` table
- Both SQLite and SQL Server migration projects need regeneration

## Modified Entity: EvaluationCacheEntity

No schema changes. Cache invalidation is behavioral:
- New: `ContentPublishedNotification` handler calls `DeleteAsync(nodeKey)` on publish
- Existing: `DeleteByDocumentTypeAliasAsync` still used on config changes

## New: Rate Limit Configuration

No database entity. Configuration via appsettings:

```json
{
  "ProWorks": {
    "AI": {
      "PageEvaluator": {
        "RateLimitSeconds": 30
      }
    }
  }
}
```

Read at startup via `IConfiguration.GetValue<int>("ProWorks:AI:PageEvaluator:RateLimitSeconds", 30)`.

## Request/Response DTO Changes

### CreateEvaluatorConfigRequest / UpdateEvaluatorConfigRequest

Add:
- `List<string>? PropertyAliases { get; set; }` — optional; null means "all properties"

### EvaluatorConfigResponse

Add:
- `List<string>? PropertyAliases { get; init; }` — included in GET responses

### TypeScript Types

`EvaluatorConfigItem`, `CreateEvaluatorConfigRequest`, `UpdateEvaluatorConfigRequest`:
- Add `readonly propertyAliases: readonly string[] | null`
