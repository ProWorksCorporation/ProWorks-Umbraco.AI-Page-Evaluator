# Development Guide

Developer-facing documentation for the ProWorks Umbraco AI Page Evaluator. For installation and usage, see [README.md](README.md).

---

## Project Structure

```
src/
  ProWorks.Umbraco.AI.PageEvaluator/              # RCL: API controller, services, composer
    Controllers/PageEvaluatorApiController.cs      # Management API endpoints
    Services/PageEvaluationService.cs             # AI orchestration + property resolution
    Composers/PageEvaluatorComposer.cs            # DI registrations
    wwwroot/dist/                                 # Compiled backoffice JS (git-ignored; build from Client)
  ProWorks.Umbraco.AI.PageEvaluator.Client/       # TypeScript / Lit / Vite backoffice extensions
    src/
      entry-point.ts                              # Registers all extensions
      localization/en.ts                          # English UI strings (Umbraco localization format)
      evaluation-modal/                           # Slide-in evaluation report modal
      evaluator-config/                           # Config list + form workspace
      prompt-builder/                             # AI prompt generation UI
      workspace-action/                           # "Evaluate Page" toolbar button
  ProWorks.Umbraco.AI.PageEvaluator.Core/         # Domain models and interfaces
  ProWorks.Umbraco.AI.PageEvaluator.Persistence/  # EF Core DbContext, entities, and cache repository
  ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite/    # SQLite migrations
  ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer/ # SQL Server migrations
  ProWorks.Umbraco.AI.PageEvaluator.TestSite/     # Umbraco 17 test site
tests/
  ProWorks.Umbraco.AI.PageEvaluator.Tests/        # xUnit unit tests (NSubstitute)
```

---

## Development

### Prerequisites

- .NET 10 SDK
- Node.js **24.13+** and npm **11+** (required by `@umbraco-cms/backoffice` 17.6 and `@umbraco-ui/uui` 2; `package.json` declares `engines`)
- Umbraco CMS 17.6.2 / Umbraco.AI 17.3.4 (the TestSite already references these)
- An Umbraco.AI-compatible AI provider API key (Anthropic recommended)

### Build the backoffice client

The compiled JS in `src/ProWorks.Umbraco.AI.PageEvaluator/wwwroot/dist/` is committed to the repository, so a fresh clone already includes working backoffice assets.

If you change any TypeScript source, rebuild and commit the updated dist files:

```bash
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm install   # first time only
npm run build
# then git add the changed wwwroot/dist/* files
```

### Build and run the test site

```bash
# Stop IIS Express if running, then:
dotnet build src/ProWorks.Umbraco.AI.PageEvaluator.TestSite
```

Open `https://localhost:44318/umbraco` in a browser.

| Setting | Value |
|---|---|
| URL | `https://localhost:44318` |
| Backoffice | `https://localhost:44318/umbraco` |
| Login | `admin@example.com` / `SecureP@ssw0rd!` |
| Database | SQLite (`umbraco.sqlite.db` in TestSite root) |

After a fresh clone, import the demo content via **Settings → uSync → Import All**. This brings in the languages, doc types, data types, templates and content, but **not the evaluator configurations**: those live in the package's own database tables. Create them in **AI → Page Evaluator** (see "E2E prerequisites" below).

**Templates and `Layout`:** the views use `Layout = "~/Views/Shared/_Layout.cshtml";` (the path form). Don't change it to `Layout = "_Layout";`. Umbraco reads a bare name as a *master template alias*, and because `_Layout` is a plain ASP.NET Core layout rather than an Umbraco template, creating or importing the templates then fails with `MasterTemplateNotFound`. The TestSite had no templates in its database until 2026-09-24 for exactly this reason.

**One session per user:** the TestSite sets `Umbraco:CMS:Security:AllowConcurrentLogins` to `false`, so every new login (including the e2e auth setup and any script) signs the same user out elsewhere. Use a separate backoffice user for automation if you want to stay logged in.

### Run the tests

```bash
# Server (xUnit + NSubstitute; the cache repository tests use in-memory SQLite)
dotnet test

# Client (Vitest unit + MSW integration)
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run typecheck && npm run lint && npm test

# E2E against the running TestSite (Playwright + @umbraco/playwright-testhelpers; see "E2E prerequisites")
npx playwright install chromium   # first time only
URL=https://localhost:44318 UMBRACO_URL=https://localhost:44318 \
UMBRACO_USER_LOGIN=admin@example.com UMBRACO_USER_PASSWORD='SecureP@ssw0rd!' npm run test:e2e
```

The server suite covers controller error handling (including the Umbraco.AI 17.1+ `Cancelled` category and culture validation), the evaluator chat executor (enforced schemas and the one-shot fallback), culture-aware content resolution, the per-culture cache repository, publish/unpublish invalidation, and the Umbraco.AI test feature. The client suite covers the API client's error typing, the rich-text block safeguard, the apply helper, the report and form elements, and localization key parity across all 10 languages.

**E2E prerequisites.** The suite runs against the real TestSite and mocks only the AI endpoints (`tests/e2e/helpers.ts`), so it relies on the TestSite's content and on these **active evaluator configurations**, which aren't in uSync:

| Doc type | Why the specs need it |
|---|---|
| `home` | Evaluate Page on Home; the config list/form specs open **"Home Page Scoring Test"** by name |
| `landingPage` | the multilingual specs on "ProWorks AI Page Evaluator" (any name; recommendations enabled) |
| `contentPage` | must have **no** active config: the About Us spec checks the button is hidden |

The specs don't save anything to existing content. `tags-apply.spec.ts` needs a Tags property the TestSite doesn't have, so it creates a throwaway doc type, document and evaluator config (all prefixed `ZZ E2E`) through the Management API and deletes them again, even on failure. Note: the testhelpers' `umbracoApi` fixture doesn't work on CMS 17.6 (it expects the access token in localStorage; 17.6 uses HttpOnly cookies). Use `tests/e2e/management-api.ts` for test data instead.

Client test notes: the Vitest setup (`tests/setup/vitest.setup.ts`) loads `element-internals-polyfill` because happy-dom lacks `attachInternals()`, which UUI 2 form controls need; await `el.updateComplete` before asserting on a rendered `UmbLitElement`.

### Multilingual test content

The uSync files already contain it (imported with **Import All**):

- Languages `en-US` (default) and `da-DK` (Danish, falls back to `en-US`).
- The `landingPage` doc type and its `seo` composition **vary by culture**; `headerImage` and `ogImage` stay invariant.
- **ProWorks AI Page Evaluator** (under Home, key `3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7`) has English and Danish text, both published. Only the **Danish** `introText` embeds a block (a "Test block", key `d3a0c1e2-5b7f-4c1a-9e2d-7f003da00001`), so the rich-text Apply safeguard can be tested against a field with and without blocks. The shared "Richtext editor" data type allows the `testBlock` element type for this.
- Our Services and Umbraco AI are `landingPage` pages with **no** Danish variant, for the "language not created yet" case.

If you change this content, re-export with uSync so the setup stays reproducible.

### Build the NuGet package

Build the client JS first so `wwwroot/dist/` is up to date, then pack:

```bash
# 1. Build client JS
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
cd ../..

# 2. Pack
dotnet pack src/ProWorks.Umbraco.AI.PageEvaluator/ProWorks.Umbraco.AI.PageEvaluator.csproj \
  --configuration Release \
  --output ./nupkg
```

The `.nupkg` file is written to `./nupkg/`.

To publish to NuGet.org:

```bash
dotnet nuget push ./nupkg/ProWorks.Umbraco.AI.PageEvaluator.*.nupkg \
  --api-key <YOUR_API_KEY> \
  --source https://api.nuget.org/v3/index.json
```

Before publishing, update the `<Version>` in
`src/ProWorks.Umbraco.AI.PageEvaluator/ProWorks.Umbraco.AI.PageEvaluator.csproj`
and update `<PackageReleaseNotes>` to describe what changed.

### Database migrations

`dotnet-ef` isn't required globally; a local copy works: `dotnet tool install dotnet-ef --version 10.0.10 --tool-path ./.tools` then run `./.tools/dotnet-ef` in place of `dotnet ef`. Migrations are applied automatically at startup by `RunPageEvaluatorMigrationNotificationHandler`. On SQLite, primary-key changes rebuild the table (EF logs a non-transactional warning — expected).

```bash
# SQLite
dotnet ef migrations add <Name> \
  --project src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite \
  --context UmbracoAIPageEvaluatorDbContext

# SQL Server
dotnet ef migrations add <Name> \
  --project src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer \
  --context UmbracoAIPageEvaluatorDbContext
```

---

## How It Works

```
Editor clicks "Evaluate Page"
        │
        ▼
Modal opens → GET /evaluate/cached/{nodeId}?culture={viewed culture, if the page varies by culture}
        │
        ├─ Cache hit → renders report immediately with "Last evaluated" timestamp
        │              "Re-run Evaluation" button available to force a fresh call
        │
        └─ Cache miss (or Re-run) →
                │
                ▼
        Workspace action collects the viewed culture's draft values (+ invariant values)
                │
                ▼
        POST /umbraco/management/api/v1/page-evaluator/evaluate
                │
                ├─ Fetches the active evaluator config for the document type
                ├─ Validates the culture (400 invalidCulture / cultureNotCreated)
                ├─ Resolves property values for that culture (CultureAwareContentPropertyResolver:
                │   published, else draft; Delivery API mapping — media → metadata,
                │   rich text → plain text, blocks → structured JSON)
                ├─ Filters to selected properties only (if PropertyAliases configured)
                ├─ Strips HTML tags and truncates long values (2000 char limit)
                ├─ Overlays simple draft text values for unsaved edits
                ├─ Builds system prompt (config prompt + optional context + JSON format instructions)
                ├─ Adds defensive preamble to guard against prompt injection from content
                └─ Calls the AI model via IEvaluatorChatExecutor → IAIChatService
                    (Temperature=0, enforced JSON schema; one-time fallback to JSON mode
                     if the provider rejects the schema)
                        │
                        ▼
                Parses JSON response → EvaluationReport
                        │
                        ▼
                Saved to umbracoAIEvaluationCache (keyed on NodeId + Culture)
                        │
                        ▼
                Modal renders: score pills · suggestions · attention items · passing items
                        │
                        └─ For each attention item linked to a property →
                                "Generate recommendation" link → POST /recommend
                                        │
                                        ▼
                                Shows current field value + AI suggestion side-by-side
                                Apply (plain text / Tags) or Copy (RichText / TinyMCE)
```

> Cache is automatically cleared for all nodes of a document type whenever its evaluator configuration is created, updated, activated, or deleted. Cache entries for individual nodes are also cleared when content is published.

---

## Architecture Notes

### Property resolution

Property values are resolved via Umbraco's `IApiContentBuilder` (the same service that powers the Content Delivery API) before being sent to the AI. This means:

- **Rich text** → HTML stripped to plain text
- **Media picker** → resolved metadata (name, alt text, dimensions, file type)
- **Block List / Block Grid** → recursively structured JSON with each block's properties; cyclic content picker references (e.g. a block picking an ancestor page) are safely terminated by `CycleDetectingApiContentBuilder`
- **Multi-node tree picker** → referenced item names and content types
- **Text / textarea** → draft (unsaved) values override the published snapshot

If the node has not been published, raw draft values are used as a fallback.

**Property filtering**: Evaluator configurations can optionally specify a list of property aliases to include. When set, only those properties are sent to the AI. This is useful for large document types where only certain fields are relevant to evaluation.

**Content cleaning**: All string property values have HTML tags stripped and are truncated to 2,000 characters (with a `[...truncated]` marker) before serialization. This reduces token usage without losing meaningful content.

### AI output format

The system prompt instructs the model to respond with a strict JSON schema:

```json
{
  "score": { "passed": 22, "total": 34 },
  "checks": [
    {
      "checkNumber": 1,
      "status": "Pass|Fail|Warn",
      "label": "…",
      "explanation": "…",
      "propertyAliases": ["metaDescription"]
    }
  ],
  "suggestions": "…",
  "overallScore": 3.8,
  "axisScores": [
    { "name": "Clarity", "score": 4, "feedback": "…" }
  ]
}
```

`propertyAliases` links a check to one or more Umbraco properties so the UI can offer AI text recommendations for those fields. When present, the modal renders a separate recommendation box per alias. It is `null` for structural or computed checks (e.g. "page has no H1 tag") that do not map to any editable property. `overallScore` and `axisScores` are only present when dimensional scoring is enabled on the evaluator configuration.

Both the evaluate and cached-evaluate responses also include a `propertyEditorAliases` map (`{ [alias]: editorAlias }`) populated by the controller at response time using `IContentTypeService`. This map is **never stored in the cache** — it is always derived fresh so it stays current if content types change. The frontend uses it to classify each property:

| Editor alias | Recommendation | Apply to field |
|---|---|---|
| `Umbraco.TextBox`, `Umbraco.TextArea`, `Umbraco.Markdown`, `Umbraco.Tags` | Yes | Yes |
| `Umbraco.RichText`, `Umbraco.TinyMCE` | Yes (copy only) | No |
| Editors in `AdditionalRecommendableEditorAliases` (see [Server configuration](#server-configuration)) | Yes | Yes |
| All others (media pickers, block editors, pickers, etc.) | No | No |

The response also includes `additionalRecommendableEditorAliases` — the list from `PageEvaluatorOptions` — which the frontend uses to show Recommend and Apply buttons for configured third-party editors.

When `propertyEditorAliases` is unavailable (e.g. the document type was deleted), the frontend falls back to a value-content heuristic: properties whose raw value starts with `{`, `[`, or `umb://` are treated as complex and excluded.

The response parser tries JSON first, then a Markdown numbered-list fallback, then stores the raw text for display if both fail.

### Umbraco.AI integration

- `IAIChatService` (from `Umbraco.AI.Core.Chat`) orchestrates AI calls via the `AIChatBuilder` fluent pattern. Never inject `IChatClient` or `IAIChatClientFactory` directly
- Context resources with `InjectionMode.Always` are injected into the system prompt
- `ChatOptions`: `Temperature = 0` for deterministic output, `ResponseFormat = Json` for structured responses, `Tools = []` to disable function calling
- Uses `[ComposeAfter(typeof(UmbracoAIComposer))]` to ensure correct DI registration order

### Optimistic concurrency

Evaluator configurations use a `Version` column as an EF Core concurrency token. The PUT endpoint requires clients to send the `version` they last read; if another user has saved since, the server returns `409 Conflict`. The front-end tracks this automatically and prompts the user to reload.

### Guardrails

Guardrail rules are configured at the **AI profile level** in Umbraco.AI, not per evaluator configuration. When a guardrail fires (pre- or post-generate), `IAIChatService` throws `AIGuardrailBlockedException`. The controller catches this and returns **422 Unprocessable Content** with the guardrail's message as the `title` field. The modal maps 422 responses to a dedicated "guardrail-blocked" state that shows the policy reason rather than the generic retry UI.

This means you can create a dedicated AI profile for page evaluation that omits content-moderation guardrails that are not relevant to evaluation tasks (e.g. an SEO-warning guardrail that flags SEO-related output would incorrectly block evaluation reports discussing SEO).

### Error response mapping

Umbraco.AI 17.0.0 wraps every provider chat client in an `AIErrorClassifyingChatClient` decorator, so provider SDK exceptions (`HttpRequestException`, Anthropic overloads, rate limits, auth failures, etc.) never reach this controller raw — they arrive as a single `Umbraco.AI.Core.Providers.Errors.AIProviderException` with a `Category` enum. The controller's `MapProviderError` helper classifies each into one of four editor-facing buckets, returned as both an HTTP status and a `category` field in the JSON body (the client uses `category`, not the status code, to pick the message — `authenticationConfiguration` and `unclassified` deliberately share HTTP 500):

| `AIProviderException.Category` | HTTP status | `category` (response body) | Client message |
|---|---|---|---|
| `Transient`, `RateLimited` | 503 | `temporaryRetryable` | "temporarily unavailable, try again in a moment" |
| `NetworkError` | 502 | `connectivity` | "could not reach the AI provider, check your connection" |
| `Authentication` | 500 | `authenticationConfiguration` | "AI connection needs attention, contact your administrator" |
| `InvalidRequest`, `NotFound`, `Unknown` | 500 | `unclassified` | generic error + Retry button |

**Every non-2xx response body from this controller (other than 404) must include `type` (literal `"Error"`) and `status` (the same status code passed to `StatusCode(...)`), not just `title`/`category`.** Umbraco's backoffice binds a global response interceptor to the shared `umbHttpClient` singleton used by every extension; for any non-2xx, non-401/403/404 response it checks whether the body looks like an RFC 7807 `ProblemDetails` object (`type`, `title`, and `status` all present) and, if not, **silently discards the real body and substitutes its own generic "fatal server error" fallback** — stripping `category` before the client ever sees it. This bit us during manual QA: the server log and raw network response were both correct, but the modal rendered the generic fallback message anyway. `MapProviderError`'s callers, the guardrail 422 responses, and the generic 500 fallback all include `type`/`status` for this reason.

#### POST /evaluate

| Condition | HTTP status | Client behavior |
|---|---|---|
| No active config for document type | 404 | Modal shows "no configuration" message |
| Guardrail policy blocked content | 422 | Modal shows guardrail reason message |
| AI provider error (see category table above) | 502/503/500 | Modal shows the category-specific message + Retry button |
| Unexpected server error (not an `AIProviderException`) | 500 | Modal shows generic error + Retry button |

#### POST /recommend

| Condition | HTTP status | Client behavior |
|---|---|---|
| Content node not found | 404 | Recommendation button shows error state |
| No active config for document type | 404 | Recommendation button shows error state |
| `propertyAliases` array is empty | 400 | Recommendation button shows error state |
| Any alias not found on document type | 400 | Recommendation button shows error state |
| Guardrail policy blocked content | 422 | Recommendation button shows error state |
| AI provider error (see category table above) | 502/503/500 | Recommendation button shows the category-specific message |
| Unexpected server error (not an `AIProviderException`) | 500 | Recommendation button shows generic error state |

Provider error details (`ProviderCode`, raw exception message/stack trace) are never forwarded to the client — only the classified `category` and a package-composed, non-provider-specific `title` are returned. Full detail is logged server-side (`ILogger`) for diagnostics.

---

## Server configuration

Package-level settings are read from `appsettings.json` under `ProWorks:PageEvaluator` and bound to `PageEvaluatorOptions` (`Configuration/PageEvaluatorOptions.cs`). Registration happens in `PageEvaluatorComposer`.

### `AdditionalRecommendableEditorAliases`

A list of property editor aliases from third-party or custom packages that should receive Recommend and Apply buttons in the evaluation modal. Editors listed here are treated as plain-text fields by `POST /recommend`.

```json
"ProWorks": {
  "PageEvaluator": {
    "AdditionalRecommendableEditorAliases": [
      "MyPackage.CustomTextEditor",
      "AnotherPackage.SimpleText"
    ]
  }
}
```

The list is propagated from `PageEvaluatorOptions` → `EvaluationReport.AdditionalRecommendableEditorAliases` → response JSON → `additionalRecommendableEditorAliases` on the `<page-evaluator-report>` element. The frontend's `_isAdditionalEditor()` method does a case-insensitive match. Built-in Umbraco editors do not need to be listed here.
