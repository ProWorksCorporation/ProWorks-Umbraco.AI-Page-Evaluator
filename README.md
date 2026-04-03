# ProWorks Umbraco AI Page Evaluator

An Umbraco 17 backoffice package that adds an **Evaluate Page** button to the content editor toolbar. When clicked, it sends the current page's content to an AI model and returns a structured quality report — scored checks, warnings, and actionable suggestions — directly inside the backoffice.

---

## Features

- **One-click evaluation** from the document workspace toolbar
- **Structured report**: per-check pass / warn / fail status with explanations, overall score, and a suggestions summary
- **Evaluation caching**: results are cached per content node — re-opening the modal shows the previous result instantly with a timestamp; a **Re-run Evaluation** button forces a fresh AI call
- **Configurable per document type**: create named evaluator configurations with custom prompts in the Umbraco.AI Add-ons section; activate, edit, or delete configurations from the list view
- **Prompt Builder**: guided UI for generating evaluation prompts from document type properties and checklist categories
- **AI provider agnostic**: works with any profile configured in Umbraco.AI (Anthropic, OpenAI, etc.)
- **Rich property resolution**: uses Umbraco's Content Delivery API builder to send properly resolved property values — media alt text, block content, rich text as plain text, MNTP references — rather than raw editor format
- **Draft-aware**: overlays unsaved text edits on top of the published content snapshot so unevaluated changes are included

---

## Requirements

| Dependency | Version |
|---|---|
| Umbraco CMS | 17.2.x |
| Umbraco.AI | 1.7.x |
| .NET | 10 |

---

## Getting Started

### 1. Install the package

> NuGet package publication is pending. For now, build from source (see [Development](#development) below) and reference the project or DLL directly.

### 2. Configure an AI profile

In the Umbraco backoffice, go to **Settings → Umbraco.AI → Profiles** and create or verify an AI profile (Anthropic Claude is recommended for evaluation tasks).

### 3. Create an Evaluator Configuration

Go to **Settings → AI Add-ons → Page Evaluator**.

1. Click **Create New Configuration**
2. Select the **Document Type** you want to evaluate
3. Choose the **AI Profile**
4. Write or generate an evaluation prompt (use the **Prompt Builder** tab to auto-generate one from the document type's properties)
5. Optionally attach a **Context** resource from Umbraco.AI
6. Save and set the configuration to **Active**

### 4. Evaluate a page

Open any published content node of the configured document type. An **Evaluate Page** button appears in the workspace toolbar. Click it — the modal runs the evaluation and displays the report.

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
                ├─ Resolves the AI profile and creates a chat client
                ├─ Resolves published property values via IApiContentBuilder
                │   (media → metadata, rich text → plain text, blocks → structured JSON)
                ├─ Overlays simple draft text values for unsaved edits
                ├─ Builds system prompt (config prompt + optional context + JSON format instructions)
                └─ Calls the AI model
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

> Cache is automatically cleared for all nodes of a document type whenever its evaluator configuration is created, updated, activated, or deleted.

---

## Project Structure

```
src/
  ProWorks.Umbraco.AI.PageEvaluator/              # RCL — API controller, services, composer
    Controllers/PageEvaluatorApiController.cs      # Management API endpoints
    Services/PageEvaluationService.cs             # AI orchestration + property resolution
    Composers/PageEvaluatorComposer.cs            # DI registrations
    wwwroot/dist/                                 # Compiled backoffice JS (git-ignored; build from Client)
  ProWorks.Umbraco.AI.PageEvaluator.Client/       # TypeScript / Lit / Vite backoffice extensions
    src/
      entry-point.ts                              # Registers all extensions
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

## Architecture Notes

### Property resolution

Property values are resolved via Umbraco's `IApiContentBuilder` (the same service that powers the Content Delivery API) before being sent to the AI. This means:

- **Rich text** → HTML stripped to plain text
- **Media picker** → resolved metadata (name, alt text, dimensions, file type)
- **Block List / Block Grid** → recursively structured JSON with each block's properties
- **Multi-node tree picker** → referenced item names and content types
- **Text / textarea** → draft (unsaved) values override the published snapshot

If the node has not been published, raw draft values are used as a fallback.

### AI output format

The system prompt instructs the model to respond with a strict JSON schema:

```json
{
  "score": { "passed": 22, "total": 34 },
  "checks": [
    { "checkNumber": 1, "status": "Pass|Fail|Warn", "label": "…", "explanation": "…" }
  ],
  "suggestions": "…"
}
```

The response parser tries JSON first, then a Markdown numbered-list fallback, then stores the raw text for display if both fail.

### Umbraco.AI integration

- `IAIChatClientFactory` creates chat clients per AI profile — never inject `IChatClient` directly
- Context resources are injected into the system prompt; the `get_context_resource` tool is disabled via `ChatOptions { Tools = [] }` to avoid a known argument-type mismatch in the current Umbraco.AI build
- Uses `[ComposeAfter(typeof(UmbracoAIComposer))]` to ensure correct DI registration order

---

## License

MIT
