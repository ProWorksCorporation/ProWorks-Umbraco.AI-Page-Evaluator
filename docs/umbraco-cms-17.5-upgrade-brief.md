# Upgrade Brief: Umbraco CMS 17.4.2 → 17.5.1 (Page Evaluator)

**Purpose**: Input document for spec-kit (or direct execution) for upgrading ProWorks.Umbraco.AI.PageEvaluator's CMS dependency from 17.4.2 to 17.5.1. Independent of the Umbraco.AI upgrade briefs; can be done before, with, or after Phase 1 (`umbraco-ai-17-upgrade-brief.md`) since Umbraco.AI 17.0.0 targets `[17.4.0, 18)`.

**Comparison basis**: Local checkouts `C:\Repositories\Umbraco-CMS` (exactly at `release-17.4.2`) vs `C:\Repositories\Umbraco-CMS-v17-latest` (exactly at `release-17.5.1`, tagged 2026-06-30). 241 commits, ~65% of churn in the backoffice client (`Umbraco.Web.UI.Client`).

**Publishing caveat (as of 2026-07-02)**: NuGet's latest published stable is **17.5.0** (2026-06-25); the 17.5.1 tag exists in git (2026-06-30) but the package was not yet on NuGet. The spec should target "latest published 17.5.x" and note 17.5.1 may land during implementation.

---

## 1. Overall risk assessment: LOW

Minor-version upgrade with the CMS no-breaking-changes policy in effect. Every server-side API the Page Evaluator consumes was verified **byte-identical** between 17.4.2 and 17.5.1 (§3). No new obsoletions touch PE-consumed APIs. Expected work is package bumps plus a regression pass on the backoffice UI, where most of the 17.5 churn happened.

## 2. REQUIRED changes

1. **NuGet bumps** across all projects referencing CMS packages (main RCL, Core, Persistence.*, TestSite): `Umbraco.Cms.*` 17.4.2 → 17.5.1 (or latest published 17.5.x).
2. **uSync**: TestSite pins uSync 17.3.2 — bump to the latest uSync 17.x verified against CMS 17.5 and re-run **Settings → uSync → Import All** to confirm content round-trips.
3. **npm**: client declares `@umbraco-cms/backoffice` `^17.4.0` / `>=17.4.0` (types-only peer) — already semver-compatible with 17.5.x; run `npm update @umbraco-cms/backoffice` and rebuild so type checks run against 17.5 definitions.
4. **CLAUDE.md**: update Active Technologies (Umbraco CMS version, uSync version).

No EF Core change: CMS 17.5.1 still pins EF Core **10.0.6** — the Page Evaluator's existing pin is correct.

## 3. Verified UNCHANGED — PE-critical surface (no action)

Byte-identical files between the two checkouts:

- `IApiContentBuilder` / `ApiContentBuilder` / `ApiContentBuilderBase` (Umbraco.Core/DeliveryApi) **and** its DI registration (`UmbracoBuilder.CoreServices.cs`: `AddSingleton<IApiContentBuilder, ApiContentBuilder>()`) — the `CycleDetectingApiContentBuilder` decorator's ServiceDescriptor-replacement (three-branch factory, Singleton lifetime assumption) remains safe
- `ContentPickerValueConverter` — the recursion path the cycle detector guards is unchanged
- `ContentPermissionResource` (Umbraco.Core/Security/Authorization) and `AuthorizationPolicies` (Umbraco.Web.Common/Authorization) — controller auth checks unaffected
- `ClaimsIdentityExtensions` — `GetUserKey()` / `"sub"` claim handling unchanged
- `ContentPublishedNotification` — cache-invalidation handler contract unchanged

New 17.5 obsoletions reviewed: all are constructor-parameter additions (StaticServiceProvider pattern) plus an `HttpClient` cert-validation helper and an intermediate published-content lookup — **none are consumed by the Page Evaluator**.

## 4. Behavior changes to regression-test (no code change expected)

Most 17.5 changes are backoffice-client internals; these are the ones that intersect PE features:

1. **Extension registration/condition evaluation reworked** (batch registration with validation, debounced extension updates, loaded-flag on initializers, and a fix making condition-config comparison strict "to cover multiple conditions of the same alias"). PE's `workspaceAction` declares two conditions (`Umb.Condition.WorkspaceAlias` + the custom active-config condition extending `UmbConditionBase`). **Verify**: action appears/hides correctly on document workspaces, including after config activate/deactivate and on slow async condition resolution.
2. **Workspace Actions: waiting state restored for buttons with additional options** (#22554) — PE's Evaluate Page action should show its busy state correctly; just confirm no double-registration or stuck-spinner regressions.
3. **Publish/cache pipeline fixes** (variant change tracking on unpublish #22799, "do not assume published when unpublishing a single culture" #22662, element-type published-content-type cache invalidation #22704). PE's `ContentPublishedNotificationHandler` deletes cache rows per published node. **Verify**: evaluation cache invalidation still fires on publish, and consider whether unpublish-related fixes change any assumptions (PE only listens to published — unaffected in principle).
4. **Distributed-cache-only publisher fixes** (URL segments, HybridCache deferred content-type rebuilds) — only relevant to load-balanced deployments; no PE code involvement, note for production hosting docs.
5. **Auth**: `getLatestToken` un-deprecated and per-request fetches routed through it (#22736) — PE relies on `umbHttpClient` being pre-configured with auth; this change is in PE's favor. Verify API calls from the modal/config workspace still authenticate.

## 5. New 17.5 capabilities (optional, not required)

- `localize.htmlString()` helper for XSS-safe HTML-rendered translations — worth adopting if PE ever renders localized HTML (currently it doesn't)
- New extension types: `blockAction`, Value Type / Value Summary extensions — not applicable to PE
- Tiptap parallel extension loading, Rollup chunk coalescing — internal

## 6. Suggested acceptance criteria

1. Solution builds against Umbraco.Cms 17.5.x with zero new obsolete-API warnings; EF Core remains 10.0.6.
2. TestSite upgrades in place (SQLite migrations run, uSync 17.5-compatible version imports content cleanly, login works).
3. Backoffice regression pass: Evaluate Page workspace action visibility (both condition paths), evaluation modal (cached read, re-run, guardrail/error states), Add-ons menu entry, evaluator-config workspace incl. 409 concurrency path.
4. Evaluation cache invalidation verified on config mutation and on content publish under 17.5.
5. `dotnet test` green; client builds with `@umbraco-cms/backoffice` 17.5 types with no TS errors.
6. CLAUDE.md versions updated.
