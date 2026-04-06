# ProWorks-Umbraco-AI-Page-Evaluator Development Guidelines

Last updated: 2026-04-05 (rev 5)

## Active Technologies
- C# .NET 10, TypeScript 5.x (strict: true) + Umbraco CMS 17.2.2, Umbraco.AI 1.7.0 (Anthropic 1.2.2), EF Core 10.0.2, Microsoft.Extensions.AI 10.4.1, Lit 3.x via @umbraco-cms/backoffice/external/lit
- SQLite (dev), SQL Server (prod) via EF Core; evaluation cache in `umbracoAIEvaluationCache` table

- **Client**: TypeScript 5.x `strict: true`, Vite build, Lit web components
- **Server**: C# .NET 10, Umbraco CMS 17.2.2, EF Core 10.0.2
- **AI**: Umbraco.AI 1.7.0 ecosystem (Anthropic 1.2.2, OpenAI 1.1.3, Prompt 1.6.0, Agent 1.6.0, Agent.Copilot 1.0.0-alpha5)
- **Database**: SQLite (dev), SQL Server (prod) via separate EF Core migration projects
- **Content sync**: uSync 17.0.4

## Project Structure

```text
src/
  ProWorks.Umbraco.AI.PageEvaluator/              # RCL (Microsoft.NET.Sdk.Razor) — backoffice + composer
    wwwroot/                                       # Static web assets (StaticWebAssetBasePath: App_Plugins/ProWorks.AI.PageEvaluator)
      dist/                                        # Compiled JS from Client project
      umbraco-package.json
  ProWorks.Umbraco.AI.PageEvaluator.Client/        # TypeScript/Vite client source
    src/
      entry-point.ts                               # Registers all backoffice extensions
      evaluation-modal/
      evaluator-config/
      workspace-action/
  ProWorks.Umbraco.AI.PageEvaluator.Core/          # Domain models, interfaces
  ProWorks.Umbraco.AI.PageEvaluator.Persistence/   # EF Core DbContext, entities
  ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite/    # SQLite migrations + design-time factory
  ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer/ # SQL Server migrations
  ProWorks.Umbraco.AI.PageEvaluator.TestSite/      # Umbraco 17 test site (IIS Express)
tests/
  ProWorks.Umbraco.AI.PageEvaluator.Tests/
```

## Commands

```bash
# .NET build (stop IIS Express first)
dotnet build src/ProWorks.Umbraco.AI.PageEvaluator.TestSite

# Run tests
dotnet test

# Client build (after changes to TypeScript)
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build   # outputs to ../ProWorks.Umbraco.AI.PageEvaluator/wwwroot/

# Regenerate SQLite migration (delete old migration files first)
dotnet ef migrations add <Name> \
  --project src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite \
  --context UmbracoAIPageEvaluatorDbContext

# Regenerate SQL Server migration
dotnet ef migrations add <Name> \
  --project src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer \
  --context UmbracoAIPageEvaluatorDbContext
```

## Key Architecture Notes

### PageEvaluationService
- Injects `IAIChatService` (from `Umbraco.AI.Core.Chat`) — **never** inject `IChatClient` or `IAIChatClientFactory` directly
- Uses `AIChatBuilder` fluent pattern: `chat.WithAlias("proworks-page-evaluator").WithProfile(profileId).WithChatOptions(options)`
- ChatOptions: `Temperature = 0f`, `ResponseFormat = ChatResponseFormat.Json`, `Tools = []`, `MaxOutputTokens = 16384`
- Checks `ChatFinishReason.Length` after response to detect truncation
- Includes defensive preamble in user message to guard against prompt injection from content
- Filters properties by `config.PropertyAliases` when set; strips HTML tags and truncates at 2000 chars

### Backoffice Extensions
- Menu alias for Umbraco.AI Add-ons section: **`"Uai.Menu.Addons"`** (not `"Umb.Menu.Addons"`)
- The `entry-point.ts` registers: `condition`, `workspaceAction`, `modal`, `menuItem`, `workspace`, `workspaceView`
- After changing TypeScript source, rebuild the client and the RCL project

### Workspace Action Visibility
- **Never use `element` alone** (without `kind`) for a `workspaceAction` manifest — Umbraco requires a `kind` to resolve the renderer; without it the action is never instantiated
- **Never use `disable()` to hide** — it greys the button but keeps it in the DOM
- To **completely hide** an action based on async state, register a `type: 'condition'` manifest with a class extending `UmbConditionBase` and set `this.permitted = true/false`. Add the condition alias to the `workspaceAction`'s `conditions` array alongside `Umb.Condition.WorkspaceAlias`
- `UmbConditionBase` is imported from `@umbraco-cms/backoffice/extension-registry`; use `this.consumeContext(...)` inside the constructor for async checks

### Lit Imports
- **Never** import from bare `lit` or `lit/decorators.js` — Umbraco 17's browser import map has no entry for these specifiers, causing a runtime `Failed to resolve module specifier` error
- Always import Lit primitives from **`@umbraco-cms/backoffice/external/lit`**: e.g. `import { html, css, LitElement, customElement, state } from '@umbraco-cms/backoffice/external/lit'`
- The Vite external list does **not** need `/^lit/` or `/^@lit\//` entries — Lit is covered by the existing `/^@umbraco-cms\//` rule

### Management API Client
- `@umbraco-cms/backoffice/external/backend-api` does **NOT** export `createClient` — it only exports `client` (the singleton) plus generated service classes. **Do not** attempt to import `createClient` from this path.
- Use **`umbHttpClient`** from `@umbraco-cms/backoffice/http-client` (re-exported as `apiClient` from `shared/api-client.ts`)
- `umbHttpClient` is the same `client` singleton; Umbraco's `app.element` configures it with `auth: () => authContext.getLatestToken()` before any extension `onInit` runs — **no `setConfig` call is needed** in our entry-point
- `entry-point.ts` `onInit` only needs to call `umbExtensionsRegistry.registerMany(manifests)` — no auth context consumption required
- All API call functions must include `security: [{ scheme: 'bearer', type: 'http' }]` so the client attaches the Bearer token on each request
- The Umbraco.AI packages use a different approach: their own generated SDK (bundled in their own chunks) that includes its own `createClient`. We cannot replicate that without a generated SDK of our own.

### RCL / Static Web Assets
- The main `ProWorks.Umbraco.AI.PageEvaluator` project uses `Microsoft.NET.Sdk.Razor` with `StaticWebAssetBasePath = App_Plugins/ProWorks.AI.PageEvaluator`
- Built JS lives in `wwwroot/dist/` — served at `/App_Plugins/ProWorks.AI.PageEvaluator/dist/` in dev via Static Web Assets middleware
- Do **not** add an `App_Plugins/` folder to this project; `wwwroot/` is the source of truth

### EF Core / SQLite
- Do **not** use `HasColumnType("nvarchar(max)")` in `OnModelCreating` — it breaks SQLite migrations. Leave unlimited strings without a column type and let each provider use its default (`TEXT` for SQLite, `nvarchar(max)` for SQL Server)
- A design-time factory exists at `UmbracoAIPageEvaluatorDbContextFactory.cs` in the Sqlite project
- Migration handler is `RunPageEvaluatorMigrationNotificationHandler` — fires on `UmbracoApplicationStartedNotification`

### Evaluation Cache
- Cached results are stored in `umbracoAIEvaluationCache` — one row per content node (keyed on `NodeId`)
- `IEvaluationCacheRepository` is registered as Singleton in `UmbracoBuilderExtensions`
- The API controller is responsible for cache read/write — `PageEvaluationService` has no knowledge of caching
- Cache is **invalidated automatically** (all rows for the affected `DocumentTypeAlias`) whenever a config is created, updated, activated, or deleted — call `_cacheRepository.DeleteByDocumentTypeAliasAsync(alias, ct)` in any controller action that mutates a config
- Cache is also **invalidated on content publish** via `ContentPublishedNotificationHandler` — deletes cache entries for each published node
- `EvaluationReport.WithCachedAt(DateTime)` returns a copy with `CachedAt` set — used by the controller before returning the response so the frontend knows when the result was cached
- The modal checks `GET /evaluate/cached/{nodeId}` on open; falls through to `POST /evaluate` only when no cache entry exists or when the user clicks **Re-run Evaluation**

### Package Version Constraints
- `Microsoft.Extensions.AI.*` must all be pinned to the same version (currently `10.4.1`) — mismatches between `Microsoft.Extensions.AI` and `Abstractions` cause `TypeLoadException: FunctionApprovalRequestContent`. The package csproj pins **both** `Microsoft.Extensions.AI` and `Microsoft.Extensions.AI.Abstractions` to `10.4.1` to raise the NuGet floor for consumers (root cause: `Umbraco.AI.Core` only declares `>= 10.2.0` for the main package, allowing 10.3.0 to be resolved alongside 10.4.1 Abstractions)
- `Umbraco.AI.OpenAI 1.1.3` is **excluded from the TestSite** — its DLL was compiled against a private OpenAI SDK build that has `GetResponsesClient(string modelId)`, a signature that doesn't exist in the public `OpenAI 2.9.1` release (which has `GetResponsesClient()` with no parameter). Re-add when a compatible `Umbraco.AI.OpenAI` version ships. Use Anthropic profiles for all testing.
- EF Core must be `10.0.2` (required by `Umbraco.Cms.Persistence.EFCore 17.2.2`)

## TestSite

- URL: `https://localhost:44318`
- Back-office: `https://localhost:44318/umbraco`
- Login: `admin@example.com` / `SecureP@ssw0rd!`
- Database: SQLite (`umbraco.sqlite.db` in project root)
- uSync content files: `uSync/v17/Content/` — import via **Settings → uSync → Import All** after changes

## uSync Content Format Notes

- Rich text (RTE) values are stored as JSON: `{"blocks":{...},"markup":"<unicode-escaped HTML>"}`
- HTML in markup uses Unicode escapes: `\u003C` = `<`, `\u003E` = `>`, `\u0026amp;` = `&`
- MNTP (multi-node picker) values: `["umb://document/{guidNoHyphens}", ...]`
- MultiUrlPicker values: `[{"name":"...","target":"","udi":"umb://document/{guidNoHyphens}","url":"","icon":"icon-document","type":"DOCUMENT"}]`

## Umbraco.AI Integration

- `UmbracoAIComposer` is in `Umbraco.AI.Startup.Configuration` namespace (package: `Umbraco.AI.Startup`)
- Use `[ComposeAfter(typeof(UmbracoAIComposer))]` on `PageEvaluatorComposer`
- `IAIProfileService` and `IAIContextService` are registered by the `Umbraco.AI` meta-package (not `Umbraco.AI.Core` alone)
- `IAIChatService` (from `Umbraco.AI.Core.Chat`) is the correct injection point — replaces the older `IAIChatClientFactory`
- `AIChatBuilder` (from `Umbraco.AI.Core.InlineChat`) — `.WithAlias()`, `.WithProfile(Guid)`, `.WithChatOptions(ChatOptions)`, `.WithContextItems()`. Internal properties not accessible from external assemblies.

### Controller
- `PageEvaluatorApiController` extends `ControllerBase` (not the obsolete `UmbracoApiController`)
- Config CRUD endpoints require `[Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]`
- Evaluate endpoint has `[EnableRateLimiting("PageEvaluatorEvaluate")]` — consuming app must register the rate limiter policy
- `GetCurrentUserKey()` uses `HttpContext.User.Identity?.GetUserKey()` (from `Umbraco.Extensions`)
