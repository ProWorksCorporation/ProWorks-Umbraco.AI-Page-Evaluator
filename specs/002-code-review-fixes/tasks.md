# Tasks: Code Review Fixes

**Input**: Design documents from `/specs/002-code-review-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per Constitution Principle II (TDD). C# xUnit tests for all service/controller changes. TypeScript changes verified manually (aspirational test layer not yet established).

**Organization**: Tasks grouped by implementation phase (each phase contains related user stories). Phases must be completed sequentially with verification after each. Within a phase, [P] tasks can run in parallel.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Critical Fixes — US1, US2, US3 (Priority: P1) 🎯 MVP

**Goal**: Fix broken AI context injection, secure logging, remove startup anti-pattern

**Independent Test**: Run evaluation with AI context configured → verify AI response reflects context content. Check Information-level logs → no full response body. Build → no ASP0000 warnings.

### Tests for Phase 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T001 [P] [US1] Unit test: BuildSystemPromptAsync includes AIContext resource content (not just Name) in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T002 [P] [US1] Unit test: BuildSystemPromptAsync skips resources with InjectionMode.OnDemand in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T003 [P] [US1] Unit test: BuildSystemPromptAsync handles context with no resources gracefully in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T004 [P] [US2] Unit test: EvaluateAsync logs full response at Debug level only (not Information) in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T005 [P] [US2] Unit test: EvaluateAsync logs metadata (nodeId, alias, length, parseFailed) at Information level in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/

### Implementation for Phase 1

- [X] T006 [P] [US1] Fix BuildSystemPromptAsync to iterate AIContext.Resources and include Always-mode resource content in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T007 [P] [US2] Change LogInformation of full AI response to LogDebug; add metadata-only LogInformation in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T008 [US3] Remove BuildServiceProvider guard block (lines 31-48) from src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs

**Checkpoint**: Build succeeds with zero ASP0000 warnings. Run evaluation with context → AI response references context content. Information logs show only metadata.

**Verification**: Manual test in test site + AI-assisted code review before proceeding to Phase 2.

---

## Phase 2: Security Hardening — US2 (cont.), US4, US5, US6 (Priority: P1-P2)

**Goal**: Secure error responses, restrict config management, defend against prompt injection, enable audit trail

**Independent Test**: Trigger AI error → browser shows generic message. Non-admin POST /configurations → 403. Content with injection text → objective evaluation. Config changes → user GUID in DB.

### Tests for Phase 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US2] Unit test: EvaluateAsync returns generic 502 on HttpRequestException (not provider message) in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T010 [P] [US2] Unit test: EvaluateAsync returns generic 500 on unexpected Exception in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T011 [P] [US2] Unit test: EvaluateAsync does not catch OperationCanceledException in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T012 [P] [US4] Unit test: Configuration CRUD methods have SectionAccessSettings authorize attribute in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T013 [P] [US5] Unit test: BuildUserMessage includes defensive preamble before content data in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T014 [P] [US6] Unit test: CreateConfigurationAsync passes authenticated user ID (not Guid.Empty) in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/

### Implementation for Phase 2

- [X] T015 [P] [US2] Add catch-all exception handler with generic error messages in EvaluateAsync in src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
- [X] T016 [P] [US4] Add [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)] to CreateConfigurationAsync, UpdateConfigurationAsync, DeleteConfigurationAsync, ActivateConfigurationAsync in src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
- [X] T017 [P] [US5] Add defensive preamble to BuildUserMessage and remove duplicate JSON schema from user message in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T018 [US6] Add GetCurrentUserId() helper using HttpContext.User.Identity.GetUserKey() and replace Guid.Empty in Create/Update/Activate actions in src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs

**Checkpoint**: All security fixes in place. Generic error messages on AI failures. Non-admin users blocked from config CRUD. User IDs recorded on config changes.

**Verification**: Manual test in test site + AI-assisted code review before proceeding to Phase 3.

---

## Phase 3: AI Best Practices — US7, US8 (Priority: P3)

**Goal**: Upgrade to IAIChatService, optimize token usage, add structured output

**Independent Test**: Run evaluation → AIChatExecuting/AIChatExecuted notifications fire. JSON schema appears only once. Temperature=0, ResponseFormat=JSON in options. Truncated response → warning logged.

### Tests for Phase 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US7] Unit test: EvaluateAsync calls IAIChatService.GetChatResponseAsync with correct builder config (profile, alias, options) in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T020 [P] [US8] Unit test: ChatOptions has Temperature=0, ResponseFormat=Json, Tools=empty in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T021 [P] [US8] Unit test: EvaluateAsync logs warning when FinishReason is Length in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T022 [P] [US8] Unit test: BuildUserMessage does not contain JSON schema (schema only in system message) in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T023 [P] [US8] Unit test: Properties serialized without WriteIndented in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/

### Implementation for Phase 3

- [X] T024 [US7] Replace IAIChatClientFactory + IAIProfileService with IAIChatService in PageEvaluationService constructor and EvaluateAsync in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T025 [US7] Update DI registration in PageEvaluatorComposer if needed (remove IAIProfileService if no longer injected directly) in src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs
- [X] T026 [P] [US8] Add FinishReason check after AI response in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T027 [P] [US8] Set Temperature=0f and ResponseFormat=ChatResponseFormat.Json on ChatOptions in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T028 [US8] Remove WriteIndented from JsonSerializer.Serialize in BuildUserMessage in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs

**Checkpoint**: IAIChatService integration complete. Token-optimized prompts. Deterministic structured output.

**Verification**: Manual test in test site + AI-assisted code review before proceeding to Phase 4.

---

## Phase 4: Cost Optimization — US9, US10, US11 (Priority: P4)

**Goal**: Property filtering, cache invalidation on publish, content truncation/HTML stripping

**Independent Test**: Configure property aliases → only selected properties in prompt. Publish content → cache invalidated. Long RTE → HTML stripped and truncated.

### Tests for Phase 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T029 [P] [US9] Unit test: EvaluateAsync filters properties when config.PropertyAliases is set in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T030 [P] [US9] Unit test: EvaluateAsync sends all properties when config.PropertyAliases is null in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T031 [P] [US10] Unit test: ContentPublishedNotificationHandler deletes cache for each published entity in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T032 [P] [US11] Unit test: Content truncation at 2000 chars with [...truncated] marker in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T033 [P] [US11] Unit test: HTML tags stripped from rich text property values in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/

### Implementation for Phase 4

#### US9: Property Alias Filtering

- [X] T034 [P] [US9] Add PropertyAliases property (List<string>?) to AIEvaluatorConfig in src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/AIEvaluatorConfig.cs
- [X] T035 [P] [US9] Add PropertyAliases column (string?) to AIEvaluatorConfigEntity in src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/AIEvaluatorConfigEntity.cs
- [X] T036 [US9] Add JSON serialization/deserialization for PropertyAliases in AIEvaluatorConfigEntityFactory in src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/AIEvaluatorConfigEntityFactory.cs
- [X] T037 [US9] Regenerate SQLite migration (AddPropertyAliases) in src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite/
- [X] T038 [US9] Regenerate SQL Server migration (AddPropertyAliases) in src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer/
- [X] T039 [US9] Add PropertyAliases to CreateEvaluatorConfigRequest, UpdateEvaluatorConfigRequest, and EvaluatorConfigResponse DTOs in src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
- [X] T040 [US9] Add property filtering logic in EvaluateAsync (filter resolvedProperties by config.PropertyAliases) in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T041 [US9] Add propertyAliases field to TypeScript types (EvaluatorConfigItem, Create/UpdateEvaluatorConfigRequest) in src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/types.ts
- [X] T042 [US9] Add property alias checkbox list UI to evaluator form (fetch from GET /document-type/{alias}/properties, render checkboxes, include in save payload) in src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts
- [X] T043 [US9] Rebuild client after TypeScript changes: npm run build in src/ProWorks.Umbraco.AI.PageEvaluator.Client/

#### US10: Cache Invalidation on Content Publish

- [X] T044 [US10] Create ContentPublishedNotificationHandler that deletes cache entries for published nodes in src/ProWorks.Umbraco.AI.PageEvaluator/Notifications/ContentPublishedNotificationHandler.cs
- [X] T045 [US10] Add DeleteAsync(Guid nodeKey, CancellationToken) to IEvaluationCacheRepository if not present in src/ProWorks.Umbraco.AI.PageEvaluator.Core/
- [X] T046 [US10] Implement DeleteAsync in EFCoreEvaluationCacheRepository if not present in src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Cache/EFCoreEvaluationCacheRepository.cs
- [X] T047 [US10] Register ContentPublishedNotificationHandler in PageEvaluatorComposer in src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs

#### US11: Content Truncation and HTML Stripping

- [X] T048 [US11] Add TruncateAndClean helper method (strip HTML tags heuristically, truncate at 2000 chars) in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
- [X] T049 [US11] Apply TruncateAndClean to string property values in BuildUserMessage in src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs

**Checkpoint**: Property filtering works end-to-end. Cache invalidated on publish. Large content truncated.

**Verification**: Manual test in test site + AI-assisted code review before proceeding to Phase 5.

---

## Phase 5: Cleanup — US12, US13, US14 (Priority: P5)

**Goal**: Remove obsolete base class, add rate limiting, fix entry point type signatures

**Independent Test**: Build with zero obsolete warnings. Rapid evaluate calls → 429 on second. TypeScript builds cleanly.

### Tests for Phase 5

- [X] T050 [P] [US12] Unit test: PageEvaluatorApiController does not inherit UmbracoApiController (reflection check) in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T051 [P] [US13] Unit test: Rate limiter registered with correct policy name and default window in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/

### Implementation for Phase 5

- [X] T052 [P] [US12] Change PageEvaluatorApiController base class from UmbracoApiController to ControllerBase in src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
- [X] T053 [US13] Add rate limiter registration with configurable window to PageEvaluatorComposer in src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs
- [X] T054 [US13] Add [EnableRateLimiting("PageEvaluatorEvaluate")] to EvaluateAsync in src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
- [X] T055 [US13] Add RateLimitSeconds config to test site appsettings in src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/appsettings.json
- [X] T056 [US14] Fix onInit and onUnload type signatures to match UmbEntryPointOnInit and UmbEntryPointOnUnload in src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/entry-point.ts
- [X] T057 [US14] Rebuild client after TypeScript changes: npm run build in src/ProWorks.Umbraco.AI.PageEvaluator.Client/

**Checkpoint**: All cleanup items addressed. Build clean. Rate limiting functional.

**Verification**: Manual test in test site + AI-assisted code review.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, build verification, CLAUDE.md updates

- [X] T058 Run full dotnet build for test site and verify zero warnings in src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/
- [X] T059 Run dotnet test and verify all tests pass in tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/
- [X] T060 Run npm run build and verify clean TypeScript build in src/ProWorks.Umbraco.AI.PageEvaluator.Client/
- [X] T061 Update CLAUDE.md to reflect IAIChatService replacing IAIChatClientFactory in CLAUDE.md
- [X] T062 Run quickstart.md validation steps for all phases in specs/002-code-review-fixes/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Critical Fixes)**: No dependencies — start immediately
- **Phase 2 (Security Hardening)**: Depends on Phase 1 (shares PageEvaluationService.cs changes)
- **Phase 3 (AI Best Practices)**: Depends on Phase 2 (builds on service changes from Phase 1-2)
- **Phase 4 (Cost Optimization)**: Depends on Phase 3 (IAIChatService must be in place before property filtering)
- **Phase 5 (Cleanup)**: Depends on Phase 4 (controller base class change should be last to avoid merge conflicts)
- **Phase 6 (Polish)**: Depends on all previous phases

### User Story Dependencies Within Phases

**Phase 1**: US1 (context), US2 (logging), US3 (composer) are independent — all [P] tasks
**Phase 2**: US4 (auth), US5 (prompt injection), US6 (audit) are independent — all [P] tasks
**Phase 3**: US7 (IAIChatService) must complete before US8 (token optimization) — US8 depends on new service signature
**Phase 4**: US9 (property filtering) requires migrations before service changes. US10 (cache invalidation) and US11 (truncation) are independent of US9.
**Phase 5**: US12 (base class), US13 (rate limiting), US14 (entry point) are independent — all [P] tasks

### Within Each Phase

- Tests MUST be written and FAIL before implementation (TDD per Constitution)
- Implementation tasks follow dependency order within each user story
- [P] tasks within a phase can run in parallel

### Parallel Opportunities

**Within Phase 1**: T001-T005 (tests) all parallel; T006-T008 (implementation) — T006 and T007 touch same file but different methods (can be parallel with care)
**Within Phase 2**: T009-T014 (tests) all parallel; T015-T018 — T015 and T016 touch same file (T016 is attribute-only, T015 modifies method body — can be parallel)
**Within Phase 3**: T019-T023 (tests) all parallel; T024 must complete before T025-T028
**Within Phase 4**: T029-T033 (tests) all parallel; T034-T035 parallel, then T036-T039 sequential, then T040 depends on T036+T039. T044-T047 independent of T034-T043. T048-T049 independent.
**Within Phase 5**: T050-T051 (tests) parallel; T052-T057 — T052, T053-T055, T056-T057 are three independent streams

---

## Parallel Example: Phase 1

```text
# All tests in parallel:
T001: Unit test context resource content inclusion
T002: Unit test OnDemand resource skipping
T003: Unit test empty resources handling
T004: Unit test Debug-level response logging
T005: Unit test Information-level metadata logging

# Then implementation (T006 and T007 different methods in same file):
T006: Fix BuildSystemPromptAsync context resolution
T007: Change logging levels
T008: Remove BuildServiceProvider from composer (different file, can parallel with T006/T007)
```

---

## Implementation Strategy

### MVP First (Phase 1 Only)

1. Complete Phase 1: Critical Fixes (US1 + US2 + US3)
2. **STOP and VALIDATE**: Context content reaches AI, logging secured, no anti-pattern
3. This alone fixes the most impactful bugs

### Incremental Delivery

1. Phase 1 → Critical fixes validated → Manual + AI review
2. Phase 2 → Security hardened → Manual + AI review
3. Phase 3 → AI integration upgraded → Manual + AI review
4. Phase 4 → Cost optimized → Manual + AI review
5. Phase 5 → Cleanup complete → Manual + AI review
6. Phase 6 → Full validation → Ready for PR

Each phase adds value independently and is safe to ship after verification.

---

## Notes

- [P] tasks = different files or different methods with no data dependencies
- [Story] label maps task to specific user story for traceability
- Each phase must be verified (manual test + AI code review) before proceeding
- Tests follow TDD: write test → verify it fails → implement → verify it passes
- Commit after each phase checkpoint
- The spec excludes issue #19 (MaxOutputTokens reduction) — keep at 16384
