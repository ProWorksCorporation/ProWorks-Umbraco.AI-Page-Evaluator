# Data Model: Umbraco AI Page Evaluator

## Entities

---

### EvaluatorConfiguration (domain model)

Domain model used by services and controllers. Mapped to/from `AIEvaluatorConfigEntity`
by `AIEvaluatorConfigEntityFactory`.

### AIEvaluatorConfigEntity (EFCore entity)

Persisted via EFCore to table `umbracoAIEvaluatorConfig`. Follows the pattern established
by `AIPromptEntity` (`umbracoAIPrompt`) and `AIAgentEntity` (`umbracoAIAgent`).

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `Id` | `Guid` | No | Primary key |
| `Name` | `string` (255) | No | Display name shown in the config list |
| `Description` | `string` (1000) | Yes | Optional description; shown in the config list |
| `DocumentTypeAlias` | `string` (255) | No | Umbraco document type alias; used to match nodes |
| `ProfileId` | `Guid` | No | Soft FK to `umbracoAIProfile.Id` (no DB constraint) |
| `ContextId` | `Guid` | Yes | Soft FK to `umbracoAIContext.Id`; null = no context |
| `PromptText` | `string` (MAX) | No | The full evaluation prompt text |
| `IsActive` | `bool` | No | True only for the most recently saved config per doc type |
| `DateCreated` | `DateTime` | No | Set on creation, never updated |
| `DateModified` | `DateTime` | No | Updated on every save |
| `CreatedByUserId` | `Guid` | Yes | Umbraco user Guid of the creator |
| `ModifiedByUserId` | `Guid` | Yes | Umbraco user Guid of the last editor |
| `Version` | `int` | No | Incremented on every save; used for optimistic concurrency |

**Key differences from original plan**:
- `ProfileId` / `ContextId` are **Guids** (not alias strings) — soft FKs matching
  Umbraco.AI's pattern. The `<uai-profile-picker>` and `<uai-context-picker>` return
  the entity `unique` (Guid). Display names resolved on demand via `IAIProfileService`
  and `IAIContextService`.
- `DateTime` used (not `DateTimeOffset`) — consistent with Umbraco.AI entity pattern.
- `CreatedByUserId` / `ModifiedByUserId` are `Guid` — consistent with Umbraco.AI v17
  user tracking pattern (not username strings).
- `Version` field added for optimistic concurrency and audit history.

**Validation rules**:
- `Name` MUST be non-empty
- `DocumentTypeAlias` MUST reference an existing Umbraco document type
- `ProfileId` MUST reference an existing Umbraco.AI profile
- `PromptText` MUST be non-empty

**Active-one rule**: When a new `AIEvaluatorConfigEntity` is saved for a given
`DocumentTypeAlias`, the service sets `IsActive = true` on the new record and
`IsActive = false` on all existing records for that same alias within the same
EFCore scope/transaction.

**State transitions**:
```
[Created] → IsActive = true  (becomes active immediately on save)
[Superseded] → IsActive = false  (when a newer config is saved for same doc type)
[Deleted] → removed from table
```

---

### EvaluationReport (transient — never persisted)

Produced by `PageEvaluationService` and returned to the back-office. Not stored in the
database in v1.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `Score` | `EvaluationScore` | No | Passed/total check counts |
| `Checks` | `IReadOnlyList<CheckResult>` | No | Ordered list of individual check results |
| `Suggestions` | `string` | Yes | Free-text suggestions block from AI |
| `ParseFailed` | `bool` | No | True if AI response could not be parsed into structured form |
| `RawResponse` | `string` | Yes | Original AI response text; populated when `ParseFailed = true` |

---

### EvaluationScore (value object)

| Field | Type | Notes |
|-------|------|-------|
| `Passed` | `int` | Count of PASS results |
| `Total` | `int` | Total check count |
| `DisplayText` | `string` | e.g. `"14/17 checks passed"` — derived, not stored |

---

### CheckResult (value object)

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `Status` | `CheckStatus` | No | Enum: `Pass`, `Fail`, `Warn` |
| `Label` | `string` | No | Short check name (e.g. "Browser Title") |
| `Explanation` | `string` | Yes | Detail shown in "Items Needing Attention" |
| `CheckNumber` | `int` | No | Ordinal position in the report |

---

### PromptBuilderSession (transient — front-end only, never sent to server)

Held in component state during prompt construction. Discarded when the builder closes.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| `DocumentTypeAlias` | `string` | No | The selected document type |
| `DocumentTypeProperties` | `DocumentTypePropertySummary[]` | No | Loaded from Management API |
| `SelectedCategories` | `string[]` | No | IDs of selected checklist categories |
| `SiteContextText` | `string` | Yes | Free-text site context entered by admin |
| `DraftPrompt` | `string` | Yes | Assembled draft text; null until first generation |

---

### DocumentTypePropertySummary (transient — front-end read model)

Populated from the Umbraco Management API response for a document type.

| Field | Type | Notes |
|-------|------|-------|
| `Alias` | `string` | Property alias used in prompts (e.g. `blogNavigationImage`) |
| `Label` | `string` | Human-readable label from the document type definition |
| `GroupName` | `string` | Tab or group the property belongs to |
| `EditorAlias` | `string` | Property editor alias (e.g. `Umbraco.MediaPicker3`) |

---

### ChecklistCategory (static — defined in code, not database)

Predefined categories surfaced in the Prompt Builder. Defined as a constant set in the
front-end; not persisted.

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | Stable identifier (e.g. `required-fields`) |
| `Label` | `string` | Display name (e.g. "Required Fields") |
| `PromptFragment` | `string` | Template text injected into the assembled prompt |

**Built-in categories** (FR-009):
- `required-fields` — Required Fields
- `metadata-seo` — Metadata & SEO
- `content-quality` — Content Quality
- `schema-structured-data` — Schema & Structured Data
- `accessibility-visibility` — Accessibility & Visibility
- `calls-to-action` — Calls to Action

---

## Database Schema

Managed by EFCore migrations in `ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer`
and `.Sqlite`. Schema generated by EFCore from `AIEvaluatorConfigEntity` — the SQL below
is illustrative of the expected output.

```sql
-- Table name follows Umbraco.AI convention: umbracoAI + camelCase entity name
CREATE TABLE umbracoAIEvaluatorConfig (
    Id                  UNIQUEIDENTIFIER    NOT NULL PRIMARY KEY,
    Name                NVARCHAR(255)       NOT NULL,
    Description         NVARCHAR(1000)      NULL,
    DocumentTypeAlias   NVARCHAR(255)       NOT NULL,
    ProfileId           UNIQUEIDENTIFIER    NOT NULL,   -- soft FK to umbracoAIProfile.Id
    ContextId           UNIQUEIDENTIFIER    NULL,       -- soft FK to umbracoAIContext.Id
    PromptText          NVARCHAR(MAX)       NOT NULL,
    IsActive            BIT                 NOT NULL DEFAULT 1,
    DateCreated         DATETIME2           NOT NULL,
    DateModified        DATETIME2           NOT NULL,
    CreatedByUserId     UNIQUEIDENTIFIER    NULL,
    ModifiedByUserId    UNIQUEIDENTIFIER    NULL,
    Version             INT                 NOT NULL DEFAULT 1
);

CREATE INDEX IX_umbracoAIEvaluatorConfig_DocumentTypeAlias_IsActive
    ON umbracoAIEvaluatorConfig (DocumentTypeAlias, IsActive);
```

**Note**: No hard foreign key constraints to `umbracoAIProfile` or `umbracoAIContext` —
this matches the soft-FK pattern used by `umbracoAIPrompt` and `umbracoAIAgent`.

---

## Relationships

```
AIEvaluatorConfigEntity ─── soft FK (Guid) ──────── umbracoAIProfile.Id
AIEvaluatorConfigEntity ─── soft FK (Guid, opt) ─── umbracoAIContext.Id
AIEvaluatorConfigEntity ─── string ref ──────────── Umbraco DocumentType (by alias)

PageEvaluationService ──────── reads ──────── EvaluatorConfiguration (active for doc type)
PageEvaluationService ──────── produces ───── EvaluationReport (transient)
EvaluationReport ──────────── contains ────── CheckResult[]
EvaluationReport ──────────── contains ────── EvaluationScore

PromptBuilderSession ──────── reads ──────── DocumentTypePropertySummary[] (from Mgmt API)
PromptBuilderSession ──────── uses ──────── ChecklistCategory[] (static)
PromptBuilderSession ──────── produces ───── prompt text → EvaluatorConfiguration.PromptText
```
