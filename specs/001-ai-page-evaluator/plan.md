# Implementation Plan: Umbraco AI Page Evaluator

**Branch**: `001-ai-page-evaluator` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ai-page-evaluator/spec.md`

## Summary

A NuGet package for Umbraco v17 that enables AI-powered evaluation of content pages in
the back-office. Administrators configure per-document-type evaluation prompts (with an
Umbraco.AI Profile and optional Context) in the Umbraco.AI Addons section. Content editors
trigger evaluation via a workspace action button; the result is displayed as a structured
HTML report in a slide-in dialog. The package is built as a two-project solution: a C#
Umbraco package project (Management API controller, database migration, AI service) and a
TypeScript/Vite front-end project (workspace action, modal, config UI, prompt builder).

## Technical Context

**Language/Version**: TypeScript 5.x `strict: true` (client) + C# .NET 9 (server)
**Primary Dependencies**:
- Client: `@umbraco-cms/backoffice`, `@umbraco-ui/uui`, `@umbraco-ai/core`, Lit 3.x, Vite 6.x
- Server: `Umbraco.CMS` v17, `Umbraco.AI.Core` (provides `IAIProfileService`, `IAIContextService`), `Microsoft.Extensions.AI` (`IChatClient`), `Microsoft.EntityFrameworkCore` (persistence)
**Storage**: EFCore custom table `umbracoAIEvaluatorConfig` with provider-specific migration assemblies (SQL Server + SQLite) — matching the Umbraco.AI.Prompt and Umbraco.AI.Agent persistence pattern
**Testing**: Vitest + MSW (client unit/integration), Playwright + `@umbraco-cms/playwright-testhelpers` (E2E), xUnit (server)
**Target Platform**: Umbraco v17 back-office; NuGet package distribution
**Performance Goals**: Evaluation report rendered ≤ 30 seconds; Evaluate button visibility resolved ≤ 500ms on node open
**Constraints**: Single JS bundle ≤ 150 KB uncompressed; all `@umbraco-cms/*` and `@umbraco-ui/*` externalized; WCAG 2.1 AA
**Scale/Scope**: Single-site; typically 3–20 document types; dozens of EvaluatorConfiguration rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TypeScript Type Safety | ✅ Pass | TypeScript 5.x, `strict: true`, `noUncheckedIndexedAccess: true`; no `any` |
| II. Test-Driven Development | ✅ Pass | Vitest unit, MSW integration, Playwright E2E, xUnit server — all planned before implementation |
| III. Back-Office UX Consistency | ✅ Pass | UUI components throughout; Umbraco design tokens; `UmbLocalizationContext` for strings; UUI modal for slide-in |
| IV. Umbraco Extension Architecture | ✅ Pass | Manifest-based extensions; Context API for cross-component comms; AI calls via server-side Management API controller using `IChatClient` |
| V. Vite Build & Bundle Performance | ✅ Pass | `build.lib` ES module output; `@umbraco-cms/*` and `@umbraco-ui/*` external; HMR dev server; ≤ 150 KB target |

**Post-Phase 1 Re-check**: Re-run this gate after contracts and data model are finalised.
No violations require Complexity Tracking entries at this time.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-page-evaluator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── management-api.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
  ProWorks.Umbraco.AI.PageEvaluator.Core/       # Domain interfaces + models (.NET 9)
    Evaluators/
      IAIEvaluatorConfigRepository.cs           # Repository interface
      IAIEvaluatorConfigService.cs              # Service interface
      AIEvaluatorConfig.cs                      # Domain model (not EFCore entity)
    Evaluation/
      IPageEvaluationService.cs
      EvaluationReport.cs                       # Domain result model
      CheckResult.cs
      EvaluationScore.cs

  ProWorks.Umbraco.AI.PageEvaluator.Persistence/  # EFCore DbContext + entities (.NET 9)
    UmbracoAIPageEvaluatorDbContext.cs
    Evaluators/
      AIEvaluatorConfigEntity.cs                # EFCore entity → table: umbracoAIEvaluatorConfig
      AIEvaluatorConfigEntityFactory.cs         # Domain ↔ entity mapping
      EFCoreAIEvaluatorConfigRepository.cs      # Implements IAIEvaluatorConfigRepository
    Configuration/
      UmbracoBuilderExtensions.cs               # AddUmbracoAIPageEvaluatorPersistence()
    Notifications/
      RunPageEvaluatorMigrationNotificationHandler.cs

  ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer/  # SQL Server migrations
    Migrations/

  ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite/     # SQLite migrations
    Migrations/

  ProWorks.Umbraco.AI.PageEvaluator/            # Web layer: controllers + composers (.NET 9)
    Composers/
      PageEvaluatorComposer.cs                  # [ComposeAfter(UmbracoAIComposer)] + DI wiring
    Controllers/
      PageEvaluatorApiController.cs             # Umbraco Management API controller
    Services/
      AIEvaluatorConfigService.cs               # Implements IAIEvaluatorConfigService
      PageEvaluationService.cs                  # Implements IPageEvaluationService
      # Injects: IAIProfileService, IAIContextService, IChatClient from Umbraco.AI.Core
    App_Plugins/
      ProWorks.AI.PageEvaluator/
        umbraco-package.json                    # Extension manifests

  ProWorks.Umbraco.AI.PageEvaluator.Client/     # TypeScript/Vite front-end project
    src/
      entry-point.ts                       # backofficeEntryPoint — registers all manifests
      workspace-action/
        page-evaluator-action.element.ts   # workspaceAction — "Evaluate Page" button logic
      evaluation-modal/
        evaluation-modal.token.ts          # UmbModalToken definition
        evaluation-modal.element.ts        # Slide-in dialog: progress + report rendering
        evaluation-report.element.ts       # Structured report HTML component
        evaluation-warning.element.ts      # Parse-failure warning banner
      evaluator-config/
        evaluator-config-workspace.element.ts  # Config list workspace (Addons section)
        evaluator-form.element.ts          # Create/edit evaluator form
        # Profile picker: use <uai-profile-picker> from @umbraco-ai/core (capability="Chat")
        # Context picker: use <uai-context-picker> from @umbraco-ai/core
      prompt-builder/
        prompt-builder.element.ts          # Prompt Builder panel
        checklist-categories.ts            # Static category definitions
      shared/
        api-client.ts                      # Typed fetch wrappers for Management API endpoints
        types.ts                           # Shared TypeScript interfaces
        localization.ts                    # Localisation key registration
    tests/
      unit/
        page-evaluator-action.test.ts
        evaluation-report.test.ts
        prompt-builder.test.ts
        checklist-categories.test.ts
      integration/
        evaluate.msw.test.ts
        configurations.msw.test.ts
        profiles.msw.test.ts
      e2e/
        evaluator-config.spec.ts
        evaluate-page.spec.ts
        prompt-builder.spec.ts
    vite.config.ts
    tsconfig.json
    package.json

tests/
  ProWorks.Umbraco.AI.PageEvaluator.Tests/   # xUnit + NSubstitute server tests
    Services/
      EvaluatorConfigurationServiceTests.cs
      PageEvaluationServiceTests.cs
      UmbracoAIProfileServiceTests.cs
    Controllers/
      PageEvaluatorApiControllerTests.cs
```

**Structure Decision**: Two-project layout — C# package project + TypeScript client project.
The Vite build outputs compiled JS into
`src/ProWorks.Umbraco.AI.PageEvaluator/App_Plugins/ProWorks.AI.PageEvaluator/dist/`.
The NuGet package bundles both the compiled C# and the `App_Plugins` directory.

## Phase 0: Research Findings

Research complete. See [research.md](research.md) for full decisions and rationale.

**Key resolved decisions**:
- Addons registration: `menuItem` (`kind: "entityContainer"`) with `menus: [UAI_ADDONS_MENU_ALIAS]`;
  section alias `"ai"` and menu alias `"Uai.Menu.Addons"` confirmed from `@umbraco-ai/core` source
  (research Decision 1 — spike complete)
- Profile/Context pickers: use `<uai-profile-picker capability="Chat">` and `<uai-context-picker>`
  from `@umbraco-ai/core`; NO custom picker components or server endpoints needed
  (research Decision 2 — custom pickers eliminated)
- AI calls: `IChatClient` from `Microsoft.Extensions.AI`; profile/context resolved server-side
  via `IAIProfileService` and `IAIContextService` from `Umbraco.AI.Core` (research Decision 3)
- Persistence: EFCore `UmbracoAIPageEvaluatorDbContext` with table `umbracoAIEvaluatorConfig`;
  soft-FK `ProfileId (Guid)` / `ContextId (Guid?)` to Umbraco.AI tables; provider-specific
  migration assemblies (SQL Server + SQLite); auto-migration via
  `INotificationHandler<UmbracoApplicationStartedNotification>` (research Decision 4 — revised)
- Workspace action: `workspaceAction` manifest targeting `Umb.Workspace.Document` (research Decision 5)
- Slide-in: `UmbModalToken` with `type: 'sidebar'` (research Decision 6)
- Document type properties: Umbraco Management API `GET /document-type/by-alias/{alias}` (research Decision 7)
- Report parsing: server-side JSON-first, Markdown fallback, raw+flag if both fail (research Decision 8)

~~**Spike item (Day 1)**~~: **Resolved** — Umbraco.AI source confirmed all aliases and
component names. No runtime inspection required.

## Phase 1: Design

### Data Model
See [data-model.md](data-model.md).

Primary entities:
- `EvaluatorConfiguration` — persisted, one active per document type
- `EvaluationReport` / `CheckResult` / `EvaluationScore` — transient response DTOs
- `DocumentTypePropertySummary` — transient read model for Prompt Builder
- `ChecklistCategory` — static front-end constants

### API Contracts
See [contracts/management-api.md](contracts/management-api.md).

Endpoints:
- `GET/POST /configurations` — list and create evaluator configs
- `GET/PUT/DELETE /configurations/{id}` — read, update, delete
- `GET /configurations/active/{documentTypeAlias}` — active config lookup (drives button visibility)
- `POST /evaluate` — trigger AI evaluation, return structured report
- `GET /profiles` — list available Umbraco.AI profiles
- `GET /contexts` — list available Umbraco.AI contexts

### Extension Manifests (`umbraco-package.json`)

```json
{
  "name": "ProWorks.AI.PageEvaluator",
  "version": "1.0.0",
  "extensions": [
    {
      "type": "backofficeEntryPoint",
      "alias": "ProWorks.AI.PageEvaluator.EntryPoint",
      "name": "Page Evaluator Entry Point",
      "js": "/App_Plugins/ProWorks.AI.PageEvaluator/dist/entry-point.js"
    }
  ]
}
```

The entry point registers all remaining extensions programmatically:
- `menuItem` (`kind: "entityContainer"`) targeting `"Uai.Menu.Addons"` — Addons nav entry
- `workspaceAction` targeting `"Umb.Workspace.Document"` — Evaluate Page button
- `modal` — slide-in evaluation dialog
- `workspace` / `collection` — config list and create/edit form

**Confirmed via source**: `UAI_ADDONS_MENU_ALIAS = "Uai.Menu.Addons"` and
`UAI_SECTION_ALIAS = "ai"` are exported from `@umbraco-ai/core`. No runtime detection
needed — import and use directly.

### Constitution Check (Post-Phase 1)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TypeScript Type Safety | ✅ Pass | All API contracts typed via `types.ts`; no `any` in DTOs |
| II. TDD | ✅ Pass | Test files planned for every service, controller, and UI component |
| III. Back-Office UX | ✅ Pass | Modal uses `type: 'sidebar'`; all pickers use UUI base elements |
| IV. Extension Architecture | ✅ Pass | `backofficeEntryPoint` + `workspaceAction`; no global state mutations; Context API for workspace comms |
| V. Vite Performance | ✅ Pass | Single entry point; externals confirmed in vite.config.ts |

No violations.

## Complexity Tracking

> No constitution violations requiring justification.

## Notes

- ~~Addons section alias spike~~ — **Resolved**. `UAI_ADDONS_MENU_ALIAS = "Uai.Menu.Addons"`
  confirmed from `@umbraco-ai/core` source. Import and use directly.
- ~~Custom profile/context endpoints~~ — **Eliminated**. Use `<uai-profile-picker>` and
  `<uai-context-picker>` from `@umbraco-ai/core`; inject `IAIProfileService` /
  `IAIContextService` server-side.
- ~~NPoco/Umbraco migration system~~ — **Replaced** with EFCore following the
  Umbraco.AI.Prompt / Umbraco.AI.Agent pattern. Use `IEFCoreScopeProvider<TDbContext>`,
  separate migration assemblies per DB provider, and `UmbracoApplicationStartedNotification`
  (not `Starting`) for auto-migration.
- `ProfileId` and `ContextId` stored as `Guid` (soft FK) — not as alias strings. The
  `<uai-profile-picker>` and `<uai-context-picker>` return the entity `unique` (Guid), not
  the alias. Resolve display names server-side via `IAIProfileService.GetProfileAsync(id)`.
- `IChatClient` injection assumes Umbraco.AI is installed. `PageEvaluatorComposer` MUST use
  `[ComposeAfter(typeof(UmbracoAIComposer))]` and log a clear warning on startup if
  Umbraco.AI is absent rather than throwing.
- `@umbraco-ai/core` must be added to `package.json` as a peer dependency and declared
  as `external` in `vite.config.ts` alongside `@umbraco-cms/*` and `@umbraco-ui/*`.
