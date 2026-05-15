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
- Node.js 20+
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

After a fresh clone, import the demo content via **Settings → uSync → Import All**.

### Run the tests

```bash
dotnet test
```

The test suite covers controller error handling, service behavior, persistence mapping, cache invalidation, notification handling, and the Umbraco.AI test feature integration (173 tests, xUnit + NSubstitute).

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

```bash
# SQLite (delete old migration files first)
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
Modal opens → GET /evaluate/cached/{nodeId}
        │
        ├─ Cache hit → renders report immediately with "Last evaluated" timestamp
        │              "Re-run Evaluation" button available to force a fresh call
        │
        └─ Cache miss (or Re-run) →
                │
                ▼
        Workspace action collects draft property values
                │
                ▼
        POST /umbraco/management/api/v1/page-evaluator/evaluate
                │
                ├─ Fetches the active evaluator config for the document type
                ├─ Resolves published property values via IApiContentBuilder
                │   (media → metadata, rich text → plain text, blocks → structured JSON)
                ├─ Filters to selected properties only (if PropertyAliases configured)
                ├─ Strips HTML tags and truncates long values (2000 char limit)
                ├─ Overlays simple draft text values for unsaved edits
                ├─ Builds system prompt (config prompt + optional context + JSON format instructions)
                ├─ Adds defensive preamble to guard against prompt injection from content
                └─ Calls the AI model via IAIChatService (Temperature=0, JSON format)
                        │
                        ▼
                Parses JSON response → EvaluationReport
                        │
                        ▼
                Saved to umbracoAIEvaluationCache (keyed on NodeId)
                        │
                        ▼
                Modal renders: score pills · suggestions · attention items · passing items
```

> Cache is automatically cleared for all nodes of a document type whenever its evaluator configuration is created, updated, activated, or deleted. Cache entries for individual nodes are also cleared when content is published.

---

## Architecture Notes

### Property resolution

Property values are resolved via Umbraco's `IApiContentBuilder` (the same service that powers the Content Delivery API) before being sent to the AI. This means:

- **Rich text** → HTML stripped to plain text
- **Media picker** → resolved metadata (name, alt text, dimensions, file type)
- **Block List / Block Grid** → recursively structured JSON with each block's properties
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
      "propertyAlias": "metaDescription"
    }
  ],
  "suggestions": "…",
  "overallScore": 3.8,
  "axisScores": [
    { "name": "Clarity", "score": 4, "feedback": "…" }
  ]
}
```

`propertyAlias` links a check to a specific Umbraco property so the UI can offer an AI text recommendation for that field. It is `null` for structural or computed checks (e.g. "page has no H1 tag") that do not map to a single editable property. `overallScore` and `axisScores` are only present when dimensional scoring is enabled on the evaluator configuration.

Both the evaluate and cached-evaluate responses also include a `propertyEditorAliases` map (`{ [alias]: editorAlias }`) populated by the controller at response time using `IContentTypeService`. This map is **never stored in the cache** — it is always derived fresh so it stays current if content types change. The frontend uses it to classify each property:

| Editor alias | Recommendation | Apply to field |
|---|---|---|
| `Umbraco.TextBox`, `Umbraco.TextArea`, `Umbraco.Markdown`, `Umbraco.Tags` | Yes | Yes |
| `Umbraco.RichText`, `Umbraco.TinyMCE` | Yes (copy only) | No |
| All others (media pickers, block editors, pickers, etc.) | No | No |

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

#### POST /evaluate

| Condition | HTTP status | Client behavior |
|---|---|---|
| No active config for document type | 404 | Modal shows "no configuration" message |
| Guardrail policy blocked content | 422 | Modal shows guardrail reason message |
| AI provider HTTP error | 502 | Modal shows generic error + Retry button |
| AI provider temporarily overloaded (e.g. Anthropic 529) | 503 | Modal shows "temporarily unavailable" + Retry button |
| Unexpected server error | 500 | Modal shows generic error + Retry button |

#### POST /recommend

| Condition | HTTP status | Client behavior |
|---|---|---|
| Content node not found | 404 | Recommendation button shows error state |
| No active config for document type | 404 | Recommendation button shows error state |
| Property alias not found on document type | 400 | Recommendation button shows error state |
| Guardrail policy blocked content | 422 | Recommendation button shows error state |
| AI provider HTTP error | 502 | Recommendation button shows error state |
| AI provider temporarily overloaded | 503 | Recommendation button shows error state |
| Unexpected server error | 500 | Recommendation button shows error state |

Provider error details are never forwarded to the client to avoid leaking API key or account information.
