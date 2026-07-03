# Upgrade Brief: Umbraco.AI 17.0.0 → 18.0.0 / Umbraco CMS 17.4.2 → 18.0.0 (Page Evaluator)

**Purpose**: Input document for spec-kit to generate a spec for upgrading ProWorks.Umbraco.AI.PageEvaluator to the Umbraco CMS 18 / Umbraco.AI 18.0.0 line. This is **Phase 2**; it assumes the Umbraco.AI 17.0.0 upgrade (`umbraco-ai-17-upgrade-brief.md`) is complete — all Phase 1 changes (AIProviderException handling, M.E.AI 10.7.0 pins, `$` config audit) carry over unchanged.

**Comparison basis**: Local checkouts `C:\Repositories\umbraco.ai-latest` (`feature/v17-main`, release 2026.06.4) vs `C:\Repositories\umbraco.ai-18` (`feature/v18-main`, release 2026.06.5, 2026-06-25). v18/main is v17/main + 45 commits of pure CMS-18 porting — **no new Umbraco.AI features and no Umbraco.AI Core API changes**.

---

## 1. Version deltas

| Dependency | v17 line | v18 line |
|---|---|---|
| Umbraco.AI packages (all) | 17.0.0 | 18.0.0 |
| Umbraco CMS packages | `[17.4.0, 18)` — site on 17.4.2 | `[18.0.0, 19)` |
| `@umbraco-cms/backoffice` (npm) | ^17.4.0 | ^18.0.0 |
| Node / npm (client build) | ≥22.17.1 / ≥10.9.2 | **≥24.13 / ≥11** |
| Microsoft.AspNetCore.OpenApi | — | 10.0.7+ (replaces Swashbuckle in Umbraco.AI.Web) |
| Microsoft.Extensions.AI | 10.7.0 | 10.7.0 (unchanged) |
| Anthropic SDK floor | 12.29.1 | 12.29.1 (unchanged) |

Versioning policy: all Umbraco.AI package majors now track the CMS major (17.x for CMS 17, 18.x for CMS 18).

## 2. Confirmed UNCHANGED between v17/main and v18/main (no action)

Byte-identical in both checkouts — the Phase 1 integration surface is stable:

- `IAIChatService` (Umbraco.AI.Core.Chat)
- `AIChatBuilder` (Umbraco.AI.Core.InlineChat)
- `AIGuardrailBlockedException` (Umbraco.AI.Core.Guardrails)
- `AIProviderException` / `AIProviderErrorInfo` / `AIProviderErrorCategory` (Umbraco.AI.Core.Providers.Errors) — the Phase 1 controller error mapping stays valid
- `UmbracoAIComposer` (Umbraco.AI.Startup.Configuration)

---

## 3. What Umbraco.AI changed for v18 — porting patterns to mirror

These are the CMS-18 breaking areas Umbraco.AI itself had to absorb. The Page Evaluator must be checked against each; §4 gives the per-item assessment.

### 3.1 Backoffice `collectionAction` host requires an `api`

v18 ships the `collectionAction` extension host as `umb-extension-with-api-slot` (CMS PR #21974): the slot only instantiates the element **when the manifest declares both an `element` AND an `api`**. Element-only `collectionAction` manifests silently render nothing. Umbraco.AI's fix: a shared no-op api (`UaiNoOpCollectionAction`) + required `meta.label` on every such manifest; simple create buttons were further migrated to the v18-idiomatic `collectionAction kind:"create"` + `entityCreateOptionAction` pattern.

### 3.2 Management API OpenAPI: Swashbuckle → Microsoft.AspNetCore.OpenApi

CMS 18 drops Swashbuckle. Umbraco.AI migrated: operation/schema *filters* → *transformers* (`SseResponseOperationFilter` → `SseResponseOperationTransformer`, `UmbracoAIApiOperationIdHandler`/`UmbracoAIApiSchemaIdHandler` → `UmbracoAIOperationIdTransformer`), deleted `SwaggerOperationAttribute`, and added `PreservePolymorphicSchemaNamesTransformer` to keep v17 schema names so generated API clients don't break.

### 3.3 Section authorization off obsolete claim API

`AllowedApplicationsClaimType` (obsolete since v15) replaced with a custom `IAuthorizationRequirement` + `AuthorizationHandler` (`AISectionRequirement` / `AISectionAuthorizationHandler`) built on public `IAuthorizationHelper` + `IUser.AllowedSections`. Behavior identical; no obsolete references.

### 3.4 Recurring hosted services → `IRecurringBackgroundJob`

`RecurringHostedServiceBase` (with `IRuntimeState` / `IServerRoleAccessor` / `IMainDom` boilerplate) replaced by v18 `RecurringBackgroundJobBase` — the framework now owns role/MainDom gating. Includes an execution-context-flow suppression fix for scope leakage.

### 3.5 Frontend misc

- Condition aliases split into their own modules (import-graph hygiene under v18 bundling)
- v18 `searchKeywords` added to property-editor and icon manifests
- OpenAPI client generation URLs rewired for v18 endpoints
- Node 24 toolchain: lockfiles regenerated on Node 24, engine guards added

---

## 4. Page Evaluator impact assessment

### 4.1 REQUIRED

1. **Retarget packages**: Umbraco CMS 17.4.2 → 18.0.0 and all Umbraco.AI references 17.0.0 → 18.0.0 across all projects (main RCL, Core, Persistence.*, TestSite). EF Core version must follow whatever `Umbraco.Cms.Persistence.EFCore 18.0.0` requires (verify at upgrade time; was 10.0.6 under 17.4.2).
2. **Client rebuild on v18**: bump `@umbraco-cms/backoffice` to ^18.0.0 in `ProWorks.Umbraco.AI.PageEvaluator.Client`, upgrade build toolchain to Node ≥24.13 / npm ≥11, regenerate `package-lock.json` on Node 24, rebuild.
3. **Verify every backoffice manifest renders under v18.** PE registers: `condition`, `workspaceAction`, `modal`, `menuItem`, `workspace`, `workspaceView`, `localization`. PE registers **no `collectionAction`**, so the api-slot break (§3.1) shouldn't bite — but the failure mode is *silent non-rendering*, and v18 may apply the element+api requirement to other extension hosts. Explicitly smoke-test: Evaluate Page workspace action (incl. its visibility condition), evaluation modal, Add-ons menu item (`Uai.Menu.Addons` — confirm alias survives in Umbraco.AI 18), evaluator-config workspace + views.
4. **TestSite upgrade**: Umbraco 17.4.2 → 18.0.0 (uSync 17.3.2 → 18.x, run CMS migrations, re-import uSync content), confirm `app.UseRateLimiter()` ordering before `app.UseUmbraco()` still holds in the v18 pipeline, and login/backoffice auth still works.

### 4.2 VERIFY (likely fine, cheap to confirm)

1. **Obsolete/removed CMS APIs in PE code.** PE controller uses `ControllerBase`, `IAuthorizationService` + `ContentPermissionResource`, `AuthorizationPolicies.SectionAccessSettings` / `ContentPermissionByResource`, `GetUserKey()` ("sub" claim). These are CMS-side public APIs (Umbraco.AI's claim migration §3.3 was for *its own* policy, not these) — but compile against 18 and check for `[Obsolete]` warnings; CMS removes members two majors after obsoletion, so anything obsoleted in v16 dies in v18.
2. **`CycleDetectingApiContentBuilder`**: decorates `IApiContentBuilder` via ServiceDescriptor replacement in the composer. Confirm the v18 DI registration shape (Lifetime, descriptor kind) still matches the three-branch factory; re-run its unit tests.
3. **`ContentPublishedNotificationHandler`, EF migrations, rate-limiter registration**: recompile-and-test; no known v18 changes but they touch CMS infrastructure seams.
4. **PE has no recurring hosted services** (§3.4 n/a) and **no Swagger/OpenAPI document customization** (§3.2 n/a — PE exposes plain `ControllerBase` endpoints). Confirm no Swashbuckle references exist in any csproj.
5. **Lit/UUI imports**: PE imports Lit via `@umbraco-cms/backoffice/external/lit` — still the required pattern in v18; verify the import map covers all specifiers used (run the client build and load the backoffice).
6. **Management API client**: `umbHttpClient` from `@umbraco-cms/backoffice/http-client` — confirm still exported and pre-configured with auth in v18.

### 4.3 Not applicable (context only)

- `collectionAction` api-slot no-op workaround / `kind:"create"` migration — PE has no collection actions (but see §4.1.3)
- OpenAPI transformer migration — PE doesn't customize the OpenAPI document
- Section-claim migration — PE uses CMS-provided policies, not custom claim checks
- `searchKeywords`, condition-module splits — internal Umbraco.AI frontend hygiene

---

## 5. Sequencing recommendation

1. Complete Phase 1 (Umbraco.AI 17.0.0 on CMS 17.4.2) and stabilize — isolates the error-handling rework from the CMS-major churn.
2. Phase 2 (this brief): CMS 18 + Umbraco.AI 18 together, since Umbraco.AI 18 requires CMS ≥18 and Umbraco.AI 17 caps at CMS <18. There is no supported mixed state.
3. Keep `main` releasable on 17.x; do Phase 2 on a branch until the ecosystem (uSync 18, any other TestSite packages) is stable.

## 6. Suggested acceptance criteria for the spec

1. Solution builds with CMS 18.0.0 + Umbraco.AI 18.0.0 package references; zero warnings from obsolete CMS APIs.
2. Client builds on Node ≥24.13 with `@umbraco-cms/backoffice` ^18.0.0; no bare-`lit` imports.
3. All backoffice surfaces render and function in the v18 backoffice: workspace action + condition-based visibility, evaluation modal (cache check + re-run), Add-ons menu item, config workspace/views, localized strings.
4. `POST /evaluate`, `POST /recommend`, `GET /evaluate/cached/{nodeId}` behave per Phase 1 contract (403/404/422/429-503/502/500 mapping) on the v18 TestSite, including rate limiting.
5. Cycle-detection decorator still wraps `IApiContentBuilder` (verified by existing unit tests) and evaluation of a page with a self-referencing Block List does not stack-overflow.
6. EF Core migrations run on both SQLite and SQL Server under CMS 18; evaluation cache read/write/invalidation works.
7. TestSite upgraded (CMS 18, uSync 18, content re-imported) and full evaluate → recommend → apply flow passes end-to-end.
8. CLAUDE.md updated: Active Technologies, package constraints, TestSite notes.
