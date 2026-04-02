---
description: "Task list for Umbraco AI Page Evaluator"
---

# Tasks: Umbraco AI Page Evaluator

**Input**: Design documents from `/specs/001-ai-page-evaluator/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Included per constitution Principle II (TDD NON-NEGOTIABLE). Tests are written
and confirmed failing before each implementation task.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

```
src/
  ProWorks.Umbraco.AI.PageEvaluator.Core/          # Domain interfaces + models
  ProWorks.Umbraco.AI.PageEvaluator.Persistence/   # EFCore DbContext + entities + repositories
  ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer/  # SQL Server migrations
  ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite/     # SQLite migrations
  ProWorks.Umbraco.AI.PageEvaluator/               # Web: controllers, services, composers, App_Plugins
  ProWorks.Umbraco.AI.PageEvaluator.Client/        # TypeScript/Vite front-end
tests/
  ProWorks.Umbraco.AI.PageEvaluator.Tests/         # xUnit C# tests
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Solution and project initialization. No user story work begins until this phase is complete.

- [x] T001 Create solution file `ProWorks.Umbraco.AI.PageEvaluator.sln` and all 5 C# project directories (`Core`, `Persistence`, `Persistence.SqlServer`, `Persistence.Sqlite`, `Web`) with `.csproj` files referencing `Umbraco.CMS` v17 and `Umbraco.AI.Core`
- [x] T002 [P] Create `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/` xUnit project with NSubstitute and project references to Core and Web
- [x] T003 [P] Initialize TypeScript client project at `src/ProWorks.Umbraco.AI.PageEvaluator.Client/package.json` with dependencies: `@umbraco-cms/backoffice`, `@umbraco-ui/uui`, `@umbraco-ai/core`, `lit`, and dev dependencies: `vite`, `vitest`, `@playwright/test`, `msw`, `typescript`, `eslint`, `@typescript-eslint/eslint-plugin`
- [x] T004 [P] Configure `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, and path aliases for `@umbraco-cms/backoffice` and `@umbraco-ai/core`
- [x] T005 [P] Configure `src/ProWorks.Umbraco.AI.PageEvaluator.Client/vite.config.ts` with `build.lib` mode (entry: `src/entry-point.ts`), `format: "es"`, `build.sourcemap: true`, HMR enabled, and `external` declarations for all `@umbraco-cms/*`, `@umbraco-ui/*`, and `@umbraco-ai/*` imports
- [x] T006 [P] Configure `src/ProWorks.Umbraco.AI.PageEvaluator.Client/.eslintrc.json` with `@typescript-eslint/recommended-type-checked` ruleset

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain model, EFCore persistence layer, DI wiring, and shared client infrastructure. MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Domain Layer

- [x] T007 Define repository interface `IAIEvaluatorConfigRepository` in `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/IAIEvaluatorConfigRepository.cs` (methods: GetById, GetByAlias, GetAll, GetActiveForDocumentType, Save, Delete, AliasExists)
- [x] T008 [P] Define service interfaces `IAIEvaluatorConfigService` and `IPageEvaluationService` in `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/IAIEvaluatorConfigService.cs` and `.../Evaluation/IPageEvaluationService.cs`
- [x] T009 [P] Define domain models `AIEvaluatorConfig`, `EvaluationReport`, `CheckResult`, and `EvaluationScore` in `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/AIEvaluatorConfig.cs` and `.../Evaluation/` (matching data-model.md fields including Description, ProfileId Guid, ContextId Guid?)

### EFCore Persistence Layer

- [x] T010 Create EFCore entity `AIEvaluatorConfigEntity` in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/AIEvaluatorConfigEntity.cs` mapping to table `umbracoAIEvaluatorConfig` with all fields from data-model.md (Id, Name, Description, DocumentTypeAlias, ProfileId, ContextId, PromptText, IsActive, DateCreated, DateModified, CreatedByUserId, ModifiedByUserId, Version)
- [x] T011 Create `UmbracoAIPageEvaluatorDbContext` in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/UmbracoAIPageEvaluatorDbContext.cs` with `DbSet<AIEvaluatorConfigEntity>` and composite index on `(DocumentTypeAlias, IsActive)`
- [x] T012 Create `AIEvaluatorConfigEntityFactory` in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/AIEvaluatorConfigEntityFactory.cs` with bidirectional domain-to-entity mapping
- [x] T013 Implement `EFCoreAIEvaluatorConfigRepository` in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs` using `IEFCoreScopeProvider<UmbracoAIPageEvaluatorDbContext>` for all CRUD operations and the active-one rule (set IsActive=true on save, IsActive=false on all others for same DocumentTypeAlias, in single transaction)
- [x] T014 [P] Create initial SQL Server EFCore migration `UmbracoAIPageEvaluator_InitialCreate` in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer/Migrations/`
- [x] T015 [P] Create initial SQLite EFCore migration `UmbracoAIPageEvaluator_InitialCreate` in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite/Migrations/`
- [x] T016 Create `RunPageEvaluatorMigrationNotificationHandler` in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Notifications/RunPageEvaluatorMigrationNotificationHandler.cs` implementing `INotificationHandler<UmbracoApplicationStartedNotification>` to auto-run pending EFCore migrations
- [x] T017 Create `AddUmbracoAIPageEvaluatorPersistence()` extension method in `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Configuration/UmbracoBuilderExtensions.cs` registering `EFCoreAIEvaluatorConfigRepository` as singleton and the migration handler

### Web Layer Bootstrap

- [x] T018 Create `PageEvaluatorComposer` in `src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs` decorated with `[ComposeAfter(typeof(UmbracoAIComposer))]`, calling `AddUmbracoAIPageEvaluatorPersistence()` and registering all services; log a clear warning (not throw) if `IChatClient` is not registered

### Client Shared Infrastructure

- [x] T019 Define shared TypeScript interfaces in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/types.ts` mirroring all API request/response shapes from `contracts/management-api.md` (EvaluatorConfigItem, EvaluationReportResponse, CheckResult, EvaluationScore, etc.)
- [x] T020 [P] Create typed API client wrappers in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/api-client.ts` for all Management API endpoints defined in `contracts/management-api.md`
- [x] T021 [P] Register localization strings in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/localization.ts` for all user-visible labels using `UmbLocalizationContext`
- [x] T022 Create `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/entry-point.ts` with `onInit`/`onUnload` exports and empty manifest array (manifests added per story phase)
- [x] T023 Create `src/ProWorks.Umbraco.AI.PageEvaluator/App_Plugins/ProWorks.AI.PageEvaluator/umbraco-package.json` with the `backofficeEntryPoint` manifest pointing to the Vite build output

**Checkpoint**: Persistence layer compiles, migrations run against a local Umbraco v17 database, and `umbracoAIEvaluatorConfig` table is created. Client project builds with zero TypeScript errors.

---

## Phase 3: User Story 1 - Content Editor Evaluates a Page (Priority: P1) 🎯 MVP

**Goal**: A content editor can trigger an AI evaluation of the current page and receive a structured PASS/FAIL/WARN report in a slide-in dialog.

**Independent Test**: Install package, configure one evaluator for the Blog Post document type, open a blog post node, click "Evaluate Page", and verify a structured report with score, passing items, and attention items appears in the slide-in dialog within 30 seconds.

### Tests for User Story 1 ⚠️ Write FIRST — confirm failing before implementing

- [x] T024 [P] [US1] Write xUnit unit tests for `PageEvaluationService` (prompt composition, JSON parse, Markdown parse, raw-response fallback when both fail) in `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs`
- [x] T025 [P] [US1] Write xUnit unit tests for `POST /evaluate` and `GET /configurations/active/{alias}` controller actions (happy path, 404 when no active config, 502 on AI error) in `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`
- [x] T026 [P] [US1] Write Vitest unit tests for `evaluation-report.element.ts` (renders score, passing section, attention section, suggestions; handles null suggestions) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/unit/evaluation-report.test.ts`
- [x] T027 [P] [US1] Write Vitest unit tests for `page-evaluator-action.element.ts` (button hidden when GET active config returns 404; visible when 200) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/unit/page-evaluator-action.test.ts`
- [x] T028 [P] [US1] Write MSW integration test for `POST /evaluate` (success with structured report, parse-failed response, 502 AI error) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/integration/evaluate.msw.test.ts`
- [x] T029 [P] [US1] Write MSW integration test for `GET /configurations/active/{alias}` (200 returns config, 404 triggers button hide) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/integration/active-config.msw.test.ts`
- [x] T030 [P] [US1] Write Playwright E2E test for full evaluate-page flow (open blog post, click Evaluate Page, assert progress messages appear, assert structured report renders within 30 seconds using `await expect(reportElement).toBeVisible({ timeout: 30000 })`) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/e2e/evaluate-page.spec.ts`

### Implementation for User Story 1

- [x] T031 [US1] Implement `PageEvaluationService` in `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs`: inject `IAIEvaluatorConfigService`, `IAIProfileService`, `IAIContextService`, `IChatClient`; compose system prompt from evaluator prompt + context instructions; send page properties as user message; attempt JSON parse → Markdown parse → raw fallback; return `EvaluationReport`
- [x] T032 [US1] Implement `POST /evaluate` endpoint on `PageEvaluatorApiController` in `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`: accept `EvaluationRequest`, call `PageEvaluationService`, return `EvaluationReport`; return 404 if no active config; return 502 on `IChatClient` failure
- [x] T033 [US1] Implement `GET /configurations/active/{documentTypeAlias}` endpoint on `PageEvaluatorApiController`: return active config for alias or 404; used by workspace action for button visibility
- [x] T034 [P] [US1] Implement `evaluation-modal.token.ts` defining `UmbModalToken` with `type: "sidebar"` in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-modal.token.ts`
- [x] T035 [US1] Implement `evaluation-report.element.ts` Lit component rendering score badge, passing items list, attention items list, and suggestions block using UUI components in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-report.element.ts`. Status icons MUST use `<uui-icon>` bound to `UmbIconRegistry` aliases: `icon-wrong` for Fail, `icon-alert` for Warn, `icon-check` for Pass. Verify these aliases exist in the registry at implementation time and substitute the closest available alias if any differ.
- [x] T036 [US1] Implement `evaluation-warning.element.ts` Lit component rendering the parse-failure warning banner with link to evaluator configuration in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-warning.element.ts`
- [x] T037 [US1] Implement `evaluation-modal.element.ts` Lit component: on open calls `POST /evaluate`, cycles through status messages ("Sending page data…", "Waiting for AI response…", "Rendering report…") using the appropriate UUI loading indicator component (verify the current alias in `@umbraco-ui/uui` before use — e.g. `uui-loader`, `uui-load-indicator`, or similar), renders `<page-evaluator-report>` on success or `<page-evaluator-warning>` + raw text on `parseFailed`, renders retry button on 502 in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-modal.element.ts`
- [x] T038 [US1] Implement `page-evaluator-action.element.ts` extending `UmbWorkspaceActionBase` in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/workspace-action/page-evaluator-action.element.ts`. Two distinct concerns must be implemented separately: (a) **Visibility** — in `connectedCallback`, consume `UMB_DOCUMENT_WORKSPACE_CONTEXT` to get the document type alias, then call `GET /configurations/active/{documentTypeAlias}`; if 404, set a reactive property (e.g. `_hasConfig = false`) so the host hides the action; (b) **Click handler** — in `handleAction()`, consume `UMB_DOCUMENT_WORKSPACE_CONTEXT` to call `getData()` (or equivalent) to retrieve the current draft property values (including unsaved changes), then open the evaluation modal via `UMB_MODAL_MANAGER_CONTEXT` passing the node id, document type alias, and collected property values as modal data. Do NOT open the modal from the visibility check — the visibility check only determines whether the button renders.
- [x] T039 [US1] Register `workspaceAction` manifest (targeting `Umb.Workspace.Document`) and `modal` manifest for the evaluation dialog in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/entry-point.ts`

**Checkpoint**: User Story 1 fully functional and independently testable. A content editor can evaluate any page that has an active evaluator configuration and receive a structured report in the slide-in dialog.

---

## Phase 4: User Story 2 - Administrator Configures Evaluator per Document Type (Priority: P2)

**Goal**: An administrator can create, edit, and delete evaluator configurations in the Umbraco.AI Addons section, selecting a Profile and optional Context via the published Umbraco.AI picker components.

**Independent Test**: In Umbraco.AI Addons, create an evaluator for Blog Post with a valid profile and prompt, save it, confirm it appears with an Active badge, then open a blog post and confirm the Evaluate Page button appears.

### Tests for User Story 2 ⚠️ Write FIRST — confirm failing before implementing

- [x] T040 [P] [US2] Write xUnit unit tests for `AIEvaluatorConfigService` (create sets active, duplicate doc type deactivates previous, delete of active promotes next) in `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs`
- [x] T041 [P] [US2] Write xUnit unit tests for CRUD controller actions (`GET /configurations`, `POST /configurations`, `PUT /configurations/{id}`, `DELETE /configurations/{id}`) including validation error cases in `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`
- [x] T042 [P] [US2] Write Vitest unit tests for `evaluator-config-workspace.element.ts` (renders list grouped by doc type, shows Active badge on active config, delete confirmation) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/unit/evaluator-config-workspace.test.ts`
- [x] T043 [P] [US2] Write Vitest unit tests for `evaluator-form.element.ts` (validation errors on empty name/doctype/profile/prompt, save calls correct endpoint, profile picker rendered with `capability="Chat"`) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/unit/evaluator-form.test.ts`
- [x] T044 [P] [US2] Write MSW integration tests for all CRUD `/configurations` endpoints (create, read, update, delete, validation 422) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/integration/configurations-crud.msw.test.ts`
- [x] T045 [P] [US2] Write Playwright E2E tests for evaluator configuration workflow (create evaluator, verify Active badge, edit, delete, verify button absent after delete) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/e2e/evaluator-config.spec.ts`

### Implementation for User Story 2

- [x] T046 [US2] Implement `AIEvaluatorConfigService` in `src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs`: CRUD wrapping `IAIEvaluatorConfigRepository`; enforce active-one rule on save; validate ProfileId resolves via `IAIProfileService`; validate ContextId resolves via `IAIContextService` when provided
- [x] T047 [US2] Implement `GET /configurations` and `POST /configurations` endpoints on `PageEvaluatorApiController`: list returns all configs with profileName and contextName resolved; create runs validation and returns 422 with field errors on failure
- [x] T048 [US2] Implement `GET /configurations/{id}`, `PUT /configurations/{id}`, and `DELETE /configurations/{id}` endpoints on `PageEvaluatorApiController`: update promotes to active; delete of active promotes next most-recent
- [x] T049 [US2] Implement `evaluator-config-workspace.element.ts` Lit component: fetches config list, groups by document type, renders each with name, description, Active badge (`uui-badge`), and edit/delete actions using `uui-table` in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-config-workspace.element.ts`
- [x] T050 [US2] Implement `evaluator-form.element.ts` Lit component: document type picker (`umb-input-document-type`), `<uai-profile-picker capability="Chat">`, `<uai-context-picker>`, name input, description textarea, prompt textarea; client-side validation before submit; maps to create/update API calls in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts`
- [x] T051 [US2] Register `menuItem` manifest (`kind: "entityContainer"`, `menus: [UAI_ADDONS_MENU_ALIAS]`), `workspace`, and `collection` manifests for the config list and form in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/entry-point.ts`

**Checkpoint**: User Stories 1 AND 2 both work independently. Administrator can manage evaluator configurations; content editors see the Evaluate Page button appear/disappear based on active configuration.

---

## Phase 5: User Story 3 - Administrator Uses Prompt Builder (Priority: P3)

**Goal**: An administrator can open the Prompt Builder within the evaluator form, select checklist categories, enter site context, generate a prompt draft incorporating document type property aliases, and transfer it to the evaluator prompt textarea.

**Independent Test**: In Page Evaluator config, open Prompt Builder for Blog Post, verify property aliases appear grouped by tab, select Required Fields and Metadata & SEO categories, enter site context text, click Generate Prompt Draft, confirm draft references property aliases and site context, click Use This Prompt, confirm draft appears in the evaluator form's prompt textarea.

### Tests for User Story 3 ⚠️ Write FIRST — confirm failing before implementing

- [X] T052 [P] [US3] Write Vitest unit tests for `checklist-categories.ts` (all 6 categories defined, each has id/label/promptFragment, promptFragment includes property alias placeholder) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/unit/checklist-categories.test.ts`
- [X] T053 [P] [US3] Write Vitest unit tests for `prompt-builder.element.ts` (category selection toggles, property aliases display, site context woven into draft, Use This Prompt fires event with draft text; SC-006 coverage assertion: given a mock doc type with 10 properties, verify ≥ 8 property aliases appear in the rendered list) in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/unit/prompt-builder.test.ts`
- [X] T054 [P] [US3] Write MSW integration test for document type property loading via Management API `GET /document-type/by-alias/{alias}` in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/integration/prompt-builder.msw.test.ts`
- [X] T055 [P] [US3] Write Playwright E2E tests for full Prompt Builder workflow in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/tests/e2e/prompt-builder.spec.ts`

### Implementation for User Story 3

- [X] T056 [US3] Define `checklist-categories.ts` with all 6 static categories (Required Fields, Metadata & SEO, Content Quality, Schema & Structured Data, Accessibility & Visibility, Calls to Action), each with `id`, `label`, and `promptFragment` template string containing `{{propertyAliases}}` and `{{siteContext}}` placeholders in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/checklist-categories.ts`
- [X] T057 [US3] Implement `prompt-builder.element.ts` Lit component: fetches doc type schema via `GET /umbraco/management/api/v1/document-type/by-alias/{alias}`, renders property aliases grouped by property group using `uui-box`, renders category checkboxes, renders Site Context `uui-textarea`, assembles draft on Generate click (fills `{{propertyAliases}}` with alias list; fills `{{siteContext}}` with admin input), fires `prompt-selected` custom event on Use This Prompt in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts`
- [X] T058 [US3] Integrate Prompt Builder into `evaluator-form.element.ts`: add "Open Prompt Builder" `uui-button`, render `<page-evaluator-prompt-builder>` in a `uui-dialog` or collapsible panel, listen for `prompt-selected` event and set it as the prompt textarea value in `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts`

**Checkpoint**: All three user stories independently functional. Prompt Builder reduces time for admins to create their first working evaluation prompt.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates, accessibility, bundle validation, and final verification.

- [X] T059 [P] Run `tsc --noEmit` across `src/ProWorks.Umbraco.AI.PageEvaluator.Client/` and resolve all TypeScript errors; confirm zero errors before merge
- [X] T060 [P] Run ESLint with `@typescript-eslint/recommended-type-checked` across `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/` and resolve all warnings
- [X] T061 Run `vite build` and inspect bundle output: confirm no single extension bundle exceeds 150 KB uncompressed; confirm no `@umbraco-cms/*`, `@umbraco-ui/*`, or `@umbraco-ai/*` modules are bundled (must appear as externals)
- [X] T062 [P] WCAG 2.1 AA review of `evaluation-modal.element.ts`, `evaluator-form.element.ts`, and `prompt-builder.element.ts`: verify keyboard navigation, focus management on modal open/close, ARIA roles on custom interactive elements, and colour contrast using Umbraco design tokens only
- [ ] T063 [P] Run the quickstart.md validation checklist against a local Umbraco v17 instance with `Umbraco.AI` configured; mark each step as passed or document any failures
- [X] T064 [P] Update `umbraco-package.json` version to `1.0.0`, confirm `App_Plugins/ProWorks.AI.PageEvaluator/dist/` path matches Vite output, and verify NuGet package includes `App_Plugins` directory in packaging configuration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — first story, no cross-story dependencies
- **US2 (Phase 4)**: Depends on Foundational — independent of US1 but US1 creates the evaluation trigger US2's config enables
- **US3 (Phase 5)**: Depends on US2 (Prompt Builder lives inside the evaluator form)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Requires Foundational complete. No dependency on US2 or US3.
- **US2 (P2)**: Requires Foundational complete. Logically enables US1 but does not depend on US1 implementation.
- **US3 (P3)**: Requires US2 complete (integrates into evaluator form).

### Within Each User Story

- **Tests MUST be written and confirmed failing before implementation** (constitution Principle II)
- Tests marked [P] within a story can run in parallel
- Implementation follows: service/server → controller → client components → manifest registration
- Story is complete only when all its tests pass

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel
- Phase 2: domain layer (T007–T009) in parallel, then persistence layer (T010–T017) sequentially within persistence, then client shared (T019–T021) in parallel
- All test tasks within a story marked [P] can be written in parallel
- US1 and US2 server-side test writing can proceed in parallel (different test files)

---

## Parallel Example: User Story 1 Tests

```
# Launch all US1 test tasks together (write and confirm failing):
Task T024: PageEvaluationServiceTests.cs
Task T025: PageEvaluatorApiControllerTests.cs (US1 actions)
Task T026: evaluation-report.test.ts
Task T027: page-evaluator-action.test.ts
Task T028: evaluate.msw.test.ts
Task T029: configurations.msw.test.ts (active endpoint)
Task T030: evaluate-page.spec.ts

# Then implement T031 → T039 in dependency order
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL — blocks everything**)
3. Write all US1 tests (T024–T030) — confirm they fail
4. Implement US1 (T031–T039)
5. **STOP and VALIDATE**: Run US1 tests, run quickstart.md Steps 1–5
6. Demo: content editor can evaluate a page

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US1 → evaluation report works → **MVP demo-able**
3. US2 → admin can configure evaluators without developer help
4. US3 → prompt builder reduces onboarding friction
5. Polish → production-ready bundle

### Parallel Team Strategy

With multiple developers (after Foundational complete):

- **Developer A**: US1 server-side (T031–T033)
- **Developer B**: US1 client-side (T034–T039) — can start once T031–T032 are done
- **Developer C**: US2 server-side (T046–T048) — independent of US1 client work

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work in same phase
- TDD is NON-NEGOTIABLE (constitution Principle II): every test must be written and **confirmed failing** before its implementation task begins
- `<uai-profile-picker capability="Chat">` and `<uai-context-picker>` are imported from `@umbraco-ai/core` — do NOT build custom picker components
- `ProfileId` and `ContextId` are **Guids** passed from pickers and stored as soft FKs — not alias strings
- All `@umbraco-cms/*`, `@umbraco-ui/*`, and `@umbraco-ai/*` imports MUST remain external in the Vite build
- `PageEvaluatorComposer` MUST use `[ComposeAfter(typeof(UmbracoAIComposer))]`
- Commit after each task or logical group; stop at phase checkpoints to validate
