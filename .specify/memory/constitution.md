<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.2.1
Bump rationale: PATCH — corrected stale pinned dependency versions in "Package Version
  Constraints" and "Technology Stack" to match the versions actually shipped after the
  004-upgrade-umbraco-ai-uui feature (no principle redefined; pin values updated).

Corrections (errors in v1.2.0):
  - Package Version Constraints: `Microsoft.Extensions.AI*` pin 10.3.0 → 10.7.0 (required by
    Umbraco.AI.Core 17.0.0's `[10.7.0, 10.999.999)` range and Anthropic 12.29.1). The prior
    10.3.0 pin was itself already stale — CLAUDE.md had documented a 10.6.0 bump that was
    never synced back to this file, which is what allowed this second drift to go unnoticed
    until the next upgrade. `10.4.1`'s `MissingMethodException`/`TypeLoadException` history
    is preserved below for context; it no longer describes the current floor.
  - Package Version Constraints: EF Core pin 10.0.4 → 10.0.6 (required by
    `Umbraco.Cms.Persistence.EFCore 17.5.1`; matches the version already in use per CLAUDE.md).
  - Technology Stack: "EF Core 10.0.4" → "EF Core 10.0.6" (same fact restated in a second
    location; both now consistent).

Removed sections: None
Modified principles: None (Core Principles I–V unchanged)

Templates reviewed:
  ✅ .specify/templates/plan-template.md — no change needed (no principle renumbering).
  ✅ .specify/templates/spec-template.md — no change needed.
  ✅ .specify/templates/tasks-template.md — no change needed.

Deferred TODOs: unchanged from v1.2.0 (TypeScript client test layer still aspirational).
-->

<!--
PRIOR SYNC IMPACT REPORT (v1.1.0 → v1.2.0, retained for history)
==================
Version change: 1.1.0 → 1.2.0
Bump rationale: MINOR — new mandatory implementation rules added to Principles III and IV;
  new "Package Version Constraints" subsection added to Technology Stack; stale/incorrect
  references corrected (IAIChatClientFactory → IAIChatService, EF Core version, BEARER constant).

Modified principles:
  - III. Back-Office UX Consistency — added explicit nested localization object format rule
      and UmbLitElement base class requirement (components MUST extend UmbLitElement, not
      bare LitElement).
  - IV. Umbraco Extension Architecture — added Lit Event Listener Lifecycle rules:
      - connectedCallback/disconnectedCallback pairing is REQUIRED
      - event listener references MUST be private readonly arrow fields (not inline lambdas)
      - async methods that write to @state() MUST guard with if (!this.isConnected) return;
      - updated BEARER constant reference (use shared/api-client.ts export, not inline literal)

Corrections (errors in v1.1.0):
  - Technology Stack: IAIChatClientFactory → IAIChatService (IAIChatClientFactory is FORBIDDEN)
  - Technology Stack: EF Core 10.0.2 → 10.0.4 (required by Umbraco.Cms.Persistence.EFCore 17.3.4)
  - Principle IV API client rules: reworded to reference BEARER constant from shared/api-client.ts

Added sections:
  - "Package Version Constraints" subsection in Technology Stack & Constraints — governs the
    pinned Microsoft.Extensions.AI 10.3.0 and EF Core 10.0.4 requirements that caused
    MissingMethodException and TypeLoadException failures when upgraded prematurely.

Removed sections: None

Templates reviewed:
  ✅ .specify/templates/plan-template.md
       Constitution Check gate references "Core Principle (I–V)" — still valid (no new numbered
       principle added; package constraints are a subsection of Technology Stack). No change needed.
  ✅ .specify/templates/spec-template.md
       No changes needed; principle additions are implementation-level rules.
  ✅ .specify/templates/tasks-template.md
       "Tests are OPTIONAL" note is template boilerplate; project MUST still follow
       Principle II (TDD). No structural change required.

Deferred TODOs:
  - TypeScript client tests (Vitest/MSW/Playwright): currently zero tests exist for the
    client layer. These MUST be established before significant new TypeScript is added.
    Tracked as a known gap in Principle II.
-->

# ProWorks Umbraco AI Page Evaluator Constitution

## Core Principles

### I. TypeScript Type Safety (NON-NEGOTIABLE)

All source code MUST be written in TypeScript 5.x with `"strict": true` and
`"noUncheckedIndexedAccess": true` enabled. Use of `any` is forbidden; `unknown` with
proper type guards is required when the type cannot be determined statically. All public
API surfaces MUST have explicit return types. Generic types are preferred over type
assertions (`as`). Interfaces MUST be used for object shapes; `type` aliases are acceptable
for unions and mapped types. The `@ts-ignore` and `@ts-expect-error` suppressions MUST NOT
appear in committed code without an explanatory comment approved in code review.

**Rationale**: Umbraco v17's back-office is fully typed via `@umbraco-cms/backoffice`.
Strict typing prevents runtime errors inside the editor experience, makes extension APIs
self-documenting, and enables confident refactoring as the CMS evolves.

### II. Test-Driven Development (NON-NEGOTIABLE)

Tests MUST be written before implementation for all business logic and UI component
behaviour. The red–green–refactor cycle is mandatory; no implementation task is considered
complete until its accompanying tests exist and pass.

**Current active test layer (C# — server-side):**

- **Unit tests** (xUnit + NSubstitute) MUST cover all API controller actions, service
  methods, domain model behaviour, and repository contracts.
- The test project lives at `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/`.
- Run with `dotnet test` from the repository root.
- Test coverage MUST NOT decrease from the established baseline on any merge.

**Aspirational test layer (TypeScript — client-side):**

- The TypeScript client currently has zero automated tests. This is a known gap.
- Before any significant new TypeScript feature is added, the following MUST be established:
  - **Unit tests** (Vitest) for Umbraco context consumers, property editor logic,
    AI evaluation utilities, and pure TypeScript helpers.
  - **Integration tests** using MSW (Mock Service Worker) for code that calls the
    Umbraco Management API or an external AI provider endpoint.
  - **E2E tests** (Playwright via `@umbraco-cms/playwright-testhelpers`) for each
    user-facing extension point (workspace actions, modals, config workspace).
- Until these are established, extra care MUST be taken to test TypeScript changes
  manually in the test site before merging.

**Rationale**: Umbraco back-office extensions are hard to debug in isolation inside the
CMS. Test-first discipline validates extension contracts before integration with the live
editor and prevents regressions across Umbraco version upgrades.

### III. Back-Office UX Consistency (NON-NEGOTIABLE)

All UI MUST use Umbraco UI Library (`@umbraco-ui/uui`) components and conform to the
Umbraco v17 design system. Specifically:

- Custom styling MUST use Umbraco CSS custom properties (design tokens) exclusively;
  hardcoded colour, spacing, or typography values are forbidden.
- All interactive controls MUST use UUI base elements (`uui-button`, `uui-input`,
  `uui-toggle`, etc.) with correct ARIA roles and full keyboard navigation.
- **Base class**: All package components MUST extend `UmbLitElement`
  (from `@umbraco-cms/backoffice/lit-element`), not bare `LitElement`. This provides
  `this.localize.term(...)` via `UmbLocalizationController`. Modal elements extend
  `UmbModalBaseElement` which already extends `UmbLitElement` — no base class change
  needed for modals.
- Localisation strings MUST be registered and consumed via the Umbraco Localisation API.
  Specifically:
  - The localisation file MUST default-export a **nested** object
    `{ section: { key: 'value' } }`. Umbraco's `UmbLocalizationRegistry` resolves
    `this.localize.term('section_key')` by joining the section name, underscore, and key.
  - **Never** use a flat key format (`section_key: 'value'`) in the localisation file —
    the registry expects nested structure and flat keys are silently ignored.
  - All user-facing strings MUST go through localisation — no hardcoded English strings
    in component templates.
- Icons MUST be sourced from the Umbraco icon registry (`UmbIconRegistry`) — embedding
  custom SVG outside the registry is forbidden unless a suitable icon is absent.
- All modals and overlays MUST use the Umbraco Modal Manager (`UmbModalManagerContext`).

**Rationale**: Users encounter this package as an integral part of the Umbraco editor.
Visual or behavioural inconsistency with the surrounding back-office degrades trust,
accessibility, and the perception of quality.

### IV. Umbraco Extension Architecture

All Umbraco extension work MUST begin by consulting the `umbraco-cms-backoffice-skills`
agent (via the `Skill` tool or the dedicated subagent). Before implementing any new
manifest type, condition, workspace, property editor, context, or back-office pattern,
invoke the relevant skill to get authoritative, up-to-date guidance from the Umbraco v17
extension model. Do not rely on memory or prior examples alone — the extension API is
large and the correct pattern is often non-obvious.

All extension points MUST be declared as Umbraco extension manifests in the package entry
point and MUST NOT mutate global state outside the manifest lifecycle. Specific rules:

- Each extension (property editor, workspace, dashboard, context, action) MUST be
  self-contained, importing only from its own module or from documented Umbraco package
  exports (`@umbraco-cms/backoffice/*`).
- Cross-extension communication MUST use the Umbraco Context API (`UmbContextToken` /
  `UmbContextConsumer`); direct component-to-component method calls are forbidden.
- Extension manifests MUST declare a `conditions` entry specifying the minimum required
  Umbraco version for each registered extension.
- AI provider credentials MUST be kept server-side; the browser-side extension MUST call
  a custom Umbraco API controller — direct browser-to-AI-provider calls with credentials
  are forbidden.

**Lit import rule (NON-NEGOTIABLE)**: All Lit primitives (`html`, `css`, `LitElement`,
`customElement`, `state`, `property`, etc.) MUST be imported from
`@umbraco-cms/backoffice/external/lit`. Importing from bare `lit` or `lit/decorators.js`
is forbidden — Umbraco v17's browser import map has no entry for these specifiers,
causing a runtime `Failed to resolve module specifier` error that is silent during build.

**Lit event listener lifecycle rules (NON-NEGOTIABLE)**:
- If `connectedCallback` adds event listeners on `this`, a matching `disconnectedCallback`
  MUST remove them — each re-connect duplicates the handler if not removed.
- Event listener references MUST be stored as `private readonly` arrow fields (not inline
  lambdas). `removeEventListener` performs strict reference equality (`===`) and silently
  fails if the reference differs from the one passed to `addEventListener`:
  ```typescript
  private readonly _onFoo = (e: Event): void => { /* ... */ };
  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('foo', this._onFoo);
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('foo', this._onFoo);
  }
  ```
- Async methods that write to `@state()` properties MUST include
  `if (!this.isConnected) return;` before every state write. This guards against writes
  to a detached element when the element is unmounted while an async call is in flight.

**workspaceAction manifest rules**:
- A `workspaceAction` manifest MUST declare both `kind:` and `api:`; using `element:`
  alone (without `kind:`) is forbidden — Umbraco requires `kind` to resolve the renderer.
  An element-only manifest is never instantiated and produces no visible button.
- Workspace action visibility MUST be controlled via a `type: 'condition'` manifest
  backed by a class extending `UmbConditionBase`. Setting `this.permitted = false`
  removes the action from the DOM entirely. Using `disable()` on the action API is
  forbidden for visibility — it greys the button but leaves it in the DOM.
- `UmbConditionBase` MUST be imported from `@umbraco-cms/backoffice/extension-registry`.
  Use `this.consumeContext(...)` inside the constructor for async permission checks.

**API client rules**:
- Use `umbHttpClient` from `@umbraco-cms/backoffice/http-client` (re-exported as
  `apiClient` from `shared/api-client.ts`) for all Management API calls.
- Do NOT import `createClient` from `@umbraco-cms/backoffice/external/backend-api` —
  that package only exports the `client` singleton and generated service classes.
- All API call functions MUST pass `security: BEARER` where `BEARER` is the constant
  exported from `shared/api-client.ts`. Do NOT redefine the bearer security object
  inline — use the shared constant.

**Rationale**: Manifest-driven, context-mediated architecture is the contract Umbraco v17
defines for package authors. Violating it produces silent failures on upgrade and makes
extensions incompatible with future back-office changes. The specific implementation rules
above were learned through direct failures during development of this package — they are
non-negotiable.

### V. Vite Build & Bundle Performance

The Vite configuration MUST produce a tree-shaken, code-split output with no unnecessary
runtime overhead. Specific rules:

- Vite `build.lib` mode MUST be used with `format: "es"` for package output.
- All `@umbraco-cms/*`, `@umbraco-ui/*`, and `@umbraco-ai/*` imports MUST be declared as
  `external` so they are not bundled; bundling CMS or Umbraco.AI internals is forbidden.
- The total uncompressed JavaScript for any single extension bundle MUST NOT exceed 150 KB.
- Source maps MUST be generated for all production builds.
- HMR (Hot Module Replacement) MUST be enabled in the Vite dev server for `.ts` and
  `.html` files to support rapid back-office development iteration.
- Circular dependency warnings from Vite MUST be resolved before merge; they are treated
  as build failures.
- The Vite `external` list does NOT need `/^lit/` or `/^@lit\//` entries — Lit is covered
  by the existing `/^@umbraco-cms\//` rule (since Lit is consumed via
  `@umbraco-cms/backoffice/external/lit`).

**Rationale**: Umbraco back-office loads extensions as ES modules at runtime inside the
editor shell. Oversized or incorrectly-externalised bundles inflate editor load time and
can cause symbol conflicts with CMS internals.

## Technology Stack & Constraints

- **Language**: TypeScript 5.x (`strict: true`, `noUncheckedIndexedAccess: true`) + C# .NET 10
- **Build Tool**: Vite 6.x in `build.lib` mode, ES module output
- **UI Framework**: Lit 3.x web components; React, Vue, and Angular MUST NOT appear in
  extension code. Lit MUST be imported via `@umbraco-cms/backoffice/external/lit`.
- **CMS Platform**: Umbraco v17; all APIs used MUST be published in the Umbraco v17
  package docs or the `@umbraco-cms/backoffice` typings
- **Server**: ASP.NET Core (Umbraco RCL), EF Core 10.0.6, SQLite (dev) / SQL Server (prod)
- **AI Integration**: Calls to AI providers MUST be proxied via a server-side Umbraco API
  controller using `IAIChatService` (from `Umbraco.AI.Core.Chat`). Injecting
  `IChatClient` or `IAIChatClientFactory` directly is FORBIDDEN. Direct browser-to-provider
  credential usage is forbidden.
- **Package Distribution**: Primary artefact is a NuGet package containing the compiled
  JS; npm publishing is secondary and optional
- **Browser Support**: Evergreen browsers only — Chrome, Edge, Firefox, Safari (current
  and current−1)
- **Accessibility**: WCAG 2.1 AA compliance is REQUIRED for all custom UI components
- **Extension development guidance**: The `umbraco-cms-backoffice-skills` agent MUST be
  the first resource consulted for any Umbraco-specific extension patterns

### Package Version Constraints (NON-NEGOTIABLE)

These pinned versions MUST NOT be upgraded without explicit team approval and regression
testing against the full Umbraco.AI ecosystem. Upgrading past these pins has caused
`MissingMethodException` and `TypeLoadException` failures in production.

- **`Microsoft.Extensions.AI*`** (all packages in this family) MUST be pinned to
  `10.7.0` (required by `Umbraco.AI.Core 17.0.0`'s `[10.7.0, 10.999.999)` range and
  Anthropic SDK `12.29.1` floor). Historical context: an earlier `10.3.0` pin existed
  because `10.4.1` changed `McpServerToolCallContent.set_Arguments`'s signature
  (`MissingMethodException` in `Umbraco.AI.Anthropic 1.3.0`) and pulled `OpenAI SDK 2.9.1`,
  which removed `GetResponsesClient(string)` (`MissingMethodException` in
  `Umbraco.AI.OpenAI 1.2.0`) — both issues are specific to the now-superseded 1.x
  Umbraco.AI line and do not apply to the current `17.0.0` pin.
- **`Microsoft.Extensions.AI`** and **`Microsoft.Extensions.AI.Abstractions`** MUST
  always be the same version — mismatches cause
  `TypeLoadException: FunctionApprovalRequestContent`.
- **EF Core** MUST be `10.0.6` (required by `Umbraco.Cms.Persistence.EFCore 17.5.1`).

## Development Workflow & Quality Gates

Every pull request MUST satisfy all of the following gates before merge is permitted:

1. **Umbraco skills check**: For any new or modified Umbraco extension point, the
   relevant `umbraco-cms-backoffice-skills` skill MUST have been consulted before
   implementation. Note this in the PR description.
2. **Type check**: `tsc --noEmit` passes with zero errors
3. **Lint**: ESLint with `@typescript-eslint/recommended-type-checked` passes with zero
   warnings
4. **C# unit tests**: `dotnet test` passes; all xUnit tests pass; coverage MUST NOT
   decrease from baseline
5. **TypeScript unit tests**: (aspirational — MUST be established before the client layer
   grows significantly) All Vitest unit tests pass; coverage MUST NOT decrease from baseline
6. **Build**: `vite build` completes without circular-dependency warnings or unresolved
   external warnings; `dotnet build` passes for all projects
7. **Bundle size**: No single extension bundle exceeds 150 KB uncompressed
8. **Constitution Check**: Reviewer explicitly confirms each Core Principle (I–V) is
   satisfied in the PR review comment

Code review MUST include at least one reviewer familiar with the Umbraco v17 package
documentation for the affected extension type. Any deviation from these principles MUST be
justified in the PR description under a dedicated **Complexity Justification** section, and
MUST be tracked in the Complexity Tracking table of the relevant feature plan.

## Governance

This Constitution supersedes all other coding conventions, README guidance, and verbal
agreements. Amendments MUST be proposed as a pull request that modifies this file directly,
MUST include a version bump per the policy below, and MUST be approved by at least two
maintainers before merge. A migration plan MUST accompany any MAJOR version amendment that
removes or redefines a Core Principle.

**Versioning Policy**:
- MAJOR: Backward-incompatible removal or redefinition of a Core Principle
- MINOR: New principle or section added, or a section materially expanded with new
  mandatory rules
- PATCH: Clarifications, wording fixes, or non-semantic refinements

All PRs and code reviews MUST verify compliance with each Core Principle. Complexity
violations MUST be documented in the Complexity Tracking table of the relevant feature plan.

**Version**: 1.2.1 | **Ratified**: 2026-03-30 | **Last Amended**: 2026-07-02
