# Research: Umbraco AI Page Evaluator

## Decision 1: Umbraco.AI Addons Section Registration

**Decision**: ✅ CONFIRMED via source inspection of `C:\Repositories\Umbraco.AI\`.

Register with a `menuItem` manifest (`kind: "entityContainer"`) targeting the
`"Uai.Menu.Addons"` menu alias. The entry point uses the standard `backofficeEntryPoint`
type. Both existing add-ons (Umbraco.AI.Prompt and Umbraco.AI.Agent.Copilot) follow this
exact pattern. Import constants from `@umbraco-ai/core`.

**Confirmed constants** (from `@umbraco-ai/core`):
- Section alias: `"ai"`
- Addons menu alias: `"Uai.Menu.Addons"`
- Configuration menu alias: `"Uai.Menu.Configuration"`

**Confirmed manifest pattern**:
```typescript
import { UAI_ADDONS_MENU_ALIAS } from '@umbraco-ai/core';

{
    type: "menuItem",
    kind: "entityContainer",
    alias: "ProWorks.AI.PageEvaluator.MenuItem",
    name: "Page Evaluator Menu Item",
    weight: 100,
    meta: {
        label: "Page Evaluator",
        icon: "icon-wand",
        entityType: EVALUATOR_ROOT_ENTITY_TYPE,
        childEntityTypes: [EVALUATOR_CONFIG_ENTITY_TYPE],
        menus: [UAI_ADDONS_MENU_ALIAS],
    },
}
```

**Composer pattern** (from Umbraco.AI.Prompt source):
```csharp
[ComposeAfter(typeof(UmbracoAIComposer))]
public class PageEvaluatorComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddUmbracoAIPageEvaluator();
    }
}
```

**Alternatives considered**:
- Registering as a top-level Umbraco section — rejected; appears outside Umbraco.AI.
- Spike to confirm at runtime — no longer needed; source confirmed pattern definitively.

---

## Decision 2: Umbraco.AI Profile and Context Pickers

**Decision**: ✅ CONFIRMED via source inspection — use the published `<uai-profile-picker>`
and `<uai-context-picker>` components from `@umbraco-ai/core`. Do NOT build custom pickers.
The `GET /page-evaluator/profiles` and `GET /page-evaluator/contexts` server endpoints
planned in the initial design are **no longer needed** and have been removed from the API
contracts.

**Confirmed components** (both exported from `@umbraco-ai/core`):

| Component | Element Tag | Class |
|-----------|-------------|-------|
| Profile picker | `<uai-profile-picker>` | `UaiProfilePickerElement` |
| Context picker | `<uai-context-picker>` | `UaiContextPickerElement` |

**Profile picker key properties**:
- `capability?: string` — filter by `"Chat"` or `"Embedding"`; set to `"Chat"` for our use
- `multiple: boolean` — set `false` (single profile per evaluator)
- `value: string | undefined` — the selected profile alias

**Context picker key properties**:
- `multiple: boolean` — set `false` (single context per evaluator)
- `value: string | undefined` — the selected context alias

**C# server-side**: Inject `IAIProfileService` (`Umbraco.AI.Core.Profiles`) to resolve the
selected profile by alias when running an evaluation. Inject `IAIContextService`
(`Umbraco.AI.Core.Contexts`) to fetch context instructions by alias and merge them into
the prompt at evaluation time.

**Confirmed C# interfaces**:
```csharp
// Umbraco.AI.Core.Profiles
IAIProfileService.GetProfileByAliasAsync(string alias)
IAIProfileService.GetAllProfilesAsync()

// Umbraco.AI.Core.Contexts
IAIContextService.GetContextByAliasAsync(string alias)
IAIContextService.GetContextsAsync()
```

**Alternatives considered**:
- Building custom picker components backed by our own API endpoints — rejected now that
  confirmed published components exist; using the official components guarantees consistency
  with the rest of the Umbraco.AI UI.
- Plain text-input for profile alias — rejected; picker provides discoverability and
  validation.

---

## Decision 3: Server-Side AI Calls

**Decision**: Use `IChatClient` from `Microsoft.Extensions.AI` (registered by Umbraco.AI) to
make AI calls. Our `PageEvaluationService` will inject `IChatClient` and compose the final
prompt from: (1) the evaluator's prompt text, (2) the attached Umbraco.AI Context instructions
(fetched server-side), and (3) the serialised page property values passed from the back-office.

**Rationale**: Umbraco.AI is built on `Microsoft.Extensions.AI` and registers `IChatClient` in
the DI container. This is the correct, stable interface to target — it is owned by Microsoft, is
provider-agnostic, and will remain stable regardless of which Umbraco.AI provider package is
installed (OpenAI, Anthropic, Azure, etc.).

**Alternatives considered**:
- Calling AI providers directly from our package with own credentials — rejected; violates
  constitution Principle IV and forces admins to configure credentials twice.
- Using an undocumented Umbraco.AI internal service — rejected; brittle across package updates.

---

## Decision 4: EvaluatorConfiguration Persistence

**Decision**: ✅ REVISED via source inspection of `C:\Repositories\Umbraco.AI\`.

Use **Entity Framework Core with a dedicated `UmbracoAIPageEvaluatorDbContext`** and
provider-specific migration assemblies (SQL Server + SQLite). This is the exact pattern
used by both `Umbraco.AI.Prompt` (`umbracoAIPrompt` table) and `Umbraco.AI.Agent`
(`umbracoAIAgent` table). The initial plan to use NPoco and Umbraco's migration system
is **rejected** — it is inconsistent with the Umbraco.AI ecosystem pattern.

**Confirmed pattern from source**:

```
ProWorks.Umbraco.AI.PageEvaluator.Persistence/
  UmbracoAIPageEvaluatorDbContext.cs            # EFCore DbContext
  Evaluators/
    AIEvaluatorConfigEntity.cs                  # EFCore entity (maps to umbracoAIEvaluatorConfig)
    AIEvaluatorConfigEntityFactory.cs           # Domain ↔ entity mapping
    EFCoreAIEvaluatorConfigRepository.cs        # Implements IAIEvaluatorConfigRepository
  Configuration/
    UmbracoBuilderExtensions.cs                 # AddUmbracoAIPageEvaluatorPersistence()
  Notifications/
    RunPageEvaluatorMigrationNotificationHandler.cs

ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer/
  Migrations/  # EFCore SQL Server migrations

ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite/
  Migrations/  # EFCore SQLite migrations
```

**Table name**: `umbracoAIEvaluatorConfig` (following Umbraco.AI naming convention:
`umbracoAI` prefix + camelCase entity name)

**Soft foreign keys**: `ProfileId (Guid)` references `umbracoAIProfile.Id`;
`ContextId (Guid, nullable)` references `umbracoAIContext.Id`. No hard database
constraints — same soft-FK pattern used by Prompt and Agent add-ons.

**Migration handler**: Implements
`INotificationHandler<UmbracoApplicationStartedNotification>` (note: `Started` not
`Starting` — confirmed from source). Auto-runs pending EFCore migrations on startup.

**Scope management**: Use `IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext>` — the
same scope provider pattern used by all Umbraco.AI persistence layers. Repositories
registered as Singletons (scope provider handles internal lifetime correctly).

**Rationale**: Consistency with the Umbraco.AI ecosystem is non-negotiable. Using a
different ORM or migration system would make the package feel alien to Umbraco.AI
developers, complicate future upgrades, and miss the established patterns for soft-FK
references to Profiles and Contexts.

**Alternatives reconsidered**:
- NPoco + Umbraco migration system — rejected; Umbraco.AI ecosystem uses EFCore exclusively.
- `IKeyValueService` — rejected; insufficient for structured relational data.
- JSON file on disk — rejected; not deployment-safe, no query support.

---

## Decision 5: Workspace Action Placement

**Decision**: Register a `workspaceAction` manifest targeting `Umb.Workspace.Document`. This
places the "Evaluate Page" button in the document workspace action area (footer bar). The button
is conditionally hidden when no active EvaluatorConfiguration exists for the current document
type — implemented by checking the active configuration via a back-office context that calls our
`GET /page-evaluator/configurations/active/{documentTypeAlias}` endpoint on workspace load.

**Rationale**: `workspaceAction` is the canonical Umbraco v17 extension point for adding
per-document actions. The conditional visibility pattern (load config → show/hide button) is
supported natively via workspace context observation.

**Alternatives considered**:
- `headerApp` — this creates a persistent icon in the workspace header, more like a sidebar
  toggle. Rejected for v1 since the slide-in dialog is the chosen pattern.
- Showing the button always with an error state — rejected per spec FR-005 / decision from
  clarification session.

---

## Decision 6: Slide-In Evaluation Dialog

**Decision**: Implement as an Umbraco modal with `type: 'sidebar'` using `UmbModalToken` and
`UmbModalManagerContext`. The modal element (`PageEvaluatorModalElement`) renders the progress
indicator (FR-013) and the structured report (FR-003/FR-004). It is opened by the workspace
action and dismissed by the editor.

**Rationale**: The Umbraco modal system with `type: 'sidebar'` produces the exact right-side
slide-in overlay described in FR-001. It integrates natively with the back-office's focus
management and keyboard navigation (Escape to close), satisfying constitution Principle III.

**Alternatives considered**:
- Custom overlay element — rejected; would duplicate Umbraco's modal system and likely violate
  UX consistency requirements.

---

## Decision 7: Document Type Property Discovery (Prompt Builder)

**Decision**: Call the Umbraco Management API endpoint
`GET /umbraco/management/api/v1/document-type/by-alias/{alias}` from our server-side controller
(proxied call), or call it directly from the back-office TypeScript using the generated
`@umbraco-cms/backoffice` API client. The response includes property aliases, labels, and
property groups needed by the Prompt Builder.

**Rationale**: The Management API is the official, versioned way to read document type schemas
in Umbraco v17. Calling it from TypeScript via the generated client is the lowest-overhead
path and does not require an additional server round-trip.

**Alternatives considered**:
- `UMB_DOCUMENT_WORKSPACE_CONTEXT` alone — insufficient; provides only the document type
  reference, not the full property schema.

---

## Decision 8: Report Rendering

**Decision**: The server-side `PageEvaluationService` attempts to parse the AI response as JSON
into a typed `EvaluationReport` model. If JSON parsing fails, it attempts lightweight Markdown
parsing into the same model (extracting PASS/FAIL/WARN lines). If both fail, it returns the raw
text with a `parseFailed: true` flag. The back-office modal renders the structured report using
UUI components; on `parseFailed`, it renders a warning banner (FR-015) plus the raw text in a
`uui-scroll-container`.

**Rationale**: Handling both JSON and Markdown server-side keeps the front-end simple and
testable. Returning a typed model regardless (with a flag for parse failure) means the front-end
always receives the same response shape.

**Alternatives considered**:
- Parsing in the front-end only — rejected; harder to unit-test and duplicates logic across
  browser/server boundary.
