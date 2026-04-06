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
- **Property filtering**: optionally select which properties to include in evaluations — reduce token usage by excluding irrelevant fields
- **Rich property resolution**: uses Umbraco's Content Delivery API builder to send properly resolved property values — media alt text, block content, rich text as plain text, MNTP references — rather than raw editor format
- **Content cleaning**: HTML tags are stripped and long property values are truncated before sending to the AI, reducing token consumption
- **Draft-aware**: overlays unsaved text edits on top of the published content snapshot so unevaluated changes are included
- **Security hardened**: admin-only config management, generic error responses, prompt injection defense, and per-user audit trail

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

Install via NuGet:

```bash
dotnet add package ProWorks.Umbraco.AI.PageEvaluator
```

Or search for **ProWorks.Umbraco.AI.PageEvaluator** in the NuGet Package Manager in Visual Studio.

Package page: https://www.nuget.org/packages/ProWorks.Umbraco.AI.PageEvaluator

### 2. Configure an AI profile

In the Umbraco backoffice, go to **Settings → Umbraco.AI → Profiles** and create or verify an AI profile (Anthropic Claude is recommended for evaluation tasks).

### 3. Create an Evaluator Configuration

Go to **Settings → AI Add-ons → Page Evaluator**.

1. Click **Create New Configuration**
2. Select the **Document Type** you want to evaluate
3. Choose the **AI Profile**
4. Optionally select specific **properties to evaluate** (if none are selected, all properties are sent)
5. Write or generate an evaluation prompt (use the **Prompt Builder** to auto-generate one from the document type's properties)
6. Optionally attach a **Context** resource from Umbraco.AI
7. Save and set the configuration to **Active**

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

## Architecture Notes

### Property resolution

Property values are resolved via Umbraco's `IApiContentBuilder` (the same service that powers the Content Delivery API) before being sent to the AI. This means:

- **Rich text** → HTML stripped to plain text
- **Media picker** → resolved metadata (name, alt text, dimensions, file type)
- **Block List / Block Grid** → recursively structured JSON with each block's properties
- **Multi-node tree picker** → referenced item names and content types
- **Text / textarea** → draft (unsaved) values override the published snapshot

If the node has not been published, raw draft values are used as a fallback.

**Property filtering**: Evaluator configurations can optionally specify a list of property aliases to include. When set, only those properties are sent to the AI — useful for large document types where only certain fields are relevant to evaluation.

**Content cleaning**: All string property values have HTML tags stripped and are truncated to 2,000 characters (with a `[...truncated]` marker) before serialization. This reduces token usage without losing meaningful content.

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

- `IAIChatService` (from `Umbraco.AI.Core.Chat`) orchestrates AI calls via the `AIChatBuilder` fluent pattern — never inject `IChatClient` or `IAIChatClientFactory` directly
- Context resources with `InjectionMode.Always` are injected into the system prompt
- `ChatOptions`: `Temperature = 0` for deterministic output, `ResponseFormat = Json` for structured responses, `Tools = []` to disable function calling
- Uses `[ComposeAfter(typeof(UmbracoAIComposer))]` to ensure correct DI registration order

---

## About ProWorks

[ProWorks Corporation](https://www.proworks.com/umbraco-platinum-partner/) is an **Umbraco Platinum Partner** based in Corvallis, Oregon. We have been building and maintaining Umbraco implementations since the early versions of the platform — certified across Umbraco 7 through 17 LTS — and we carry three Umbraco MVPs on staff. Platinum status at ProWorks reflects sustained delivery quality, deep platform expertise, and ongoing community involvement through open-source packages, conference talks, and ecosystem advisory boards. This package is one example of that work.

We work with organizations across regulated industries — credit unions, insurers, public agencies, and manufacturers — and have delivered projects for clients including NASA, Microsoft, and Cal Fire. Our approach is consultative: we will meet you where you are and recommend the right next step, even if that means doing less.

### AI Services

Beyond this open-source package — which evaluates individual pages on demand — ProWorks offers a **site-wide Content Evaluator service** that analyzes how AI systems understand your organization across your entire website. We deliver an **AI Perspective Report** covering your AI-inferred positioning, value propositions, audience signals, and content consistency — based entirely on your publicly available content. As AI systems increasingly answer questions directly before anyone visits your site, understanding how you are interpreted at scale is a practical first step.

Learn more at [proworks.com/ai](https://www.proworks.com/ai).

### Get in Touch

If you have questions about this package, need help with an Umbraco project, or want to discuss the site-wide AI evaluation service, [contact us through our website](https://www.proworks.com/contact).

---

## License

MIT
