# ProWorks-Umbraco-AI-Page-Evaluator Development Guidelines

Last updated: 2026-07-02 (rev 13)

## Active Technologies

- **Client**: TypeScript 5.9.x `strict: true, noUncheckedIndexedAccess: true`, Vite 7.x build, Lit 3.x web components
- **Server**: C# .NET 10, Umbraco CMS 17.5.1, EF Core 10.0.6
- **AI**: Umbraco.AI 17.0.0 ecosystem (Anthropic 17.0.0, OpenAI 17.0.0, Prompt 17.0.0, Agent 17.0.0, Agent.Copilot 17.0.0) — CMS-aligned versioning succeeds the 1.x line
- **Database**: SQLite (dev), SQL Server (prod) via separate EF Core migration projects; evaluation cache in `umbracoAIEvaluationCache` table
- **Content sync**: uSync 17.3.5
- **UI Library**: `@umbraco-ui/uui` 1.18.1 — **not** 2.0.0; the latest Umbraco CMS v17 backoffice shell (17.5.1) still hard-depends on UUI `^1.18.1` as a regular (non-peer) dependency. UUI 2.0.0 targets the upcoming Umbraco v18 line and is not yet loaded by any v17 release — see `specs/004-upgrade-umbraco-ai-uui/research.md` §2a

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

### CycleDetectingApiContentBuilder
- `internal sealed` decorator for `IApiContentBuilder` in `Services/CycleDetectingApiContentBuilder.cs`
- Prevents `StackOverflowException` when a Block List contains a Content Picker referencing an ancestor (or itself), which causes `IApiContentBuilder.Build()` to re-enter recursively through `ContentPickerValueConverter`
- Uses `AsyncLocal<HashSet<Guid>?>` — null means no root call active; non-null means one is in flight. Self-activating: the root `Build()` initialises the set and clears it on return; callers need no changes
- Returns `null` + logs a `LogWarning` on cycle detection. `PageEvaluationService` already handles null via `?.Properties ?? new Dictionary<string, object?>()`
- DAG (non-cyclic re-visits) are correctly allowed: `finally { visited.Remove(content.Key) }` removes each key after processing so sibling paths can revisit the same node
- **DI registration** in `PageEvaluatorComposer`: locates the existing `IApiContentBuilder` `ServiceDescriptor`, removes it, and re-adds a factory descriptor that wraps the original with `CycleDetectingApiContentBuilder`. Three-branch factory handles `ImplementationInstance`, `ImplementationFactory`, and `ImplementationType` cases; preserves the original `Lifetime` (Singleton)
- **`AssemblyInfo.cs`** in the main project grants `InternalsVisibleTo` for both the test assembly and `DynamicProxyGenAssembly2` (required by NSubstitute to mock/spy through the `internal` boundary)

### PageEvaluationService
- Injects `IAIChatService` (from `Umbraco.AI.Core.Chat`) — **never** inject `IChatClient` or `IAIChatClientFactory` directly
- Uses `AIChatBuilder` fluent pattern: `chat.WithAlias("proworks-page-evaluator").WithProfile(profileId).WithChatOptions(options)`
- ChatOptions: `Temperature = 0f`, `ResponseFormat = ChatResponseFormat.Json`, `Tools = []`, `MaxOutputTokens = 16384`
- Checks `ChatFinishReason.Length` after response to detect truncation
- Includes defensive preamble in user message to guard against prompt injection from content
- Filters properties by `config.PropertyAliases` when set; strips HTML tags and truncates at 2000 chars
- Scoring JSON fields use **camelCase**: `"overallScore"` and `"axisScores"` — these match the C# property names. **Never** use `"overall_score"` / `"axis_scores"` (snake_case); the prompt template, parser, and `PromptBuilderElement` scoring snippet must all use the same camelCase names
- `CheckStatus` parsing is **case-insensitive** via the shared `ParseCheckStatus(string)` helper — both `TryParseJson` and `TryParseMarkdown` delegate to it; `"FAIL"`, `"fail"`, and `"Fail"` all map to `CheckStatus.Fail`
- `CheckResult.PropertyAliases: IReadOnlyList<string>?` — the JSON parser reads `"propertyAliases": [...]` (array, preferred); falls back to legacy `"propertyAlias": "..."` (string) and wraps it in a single-element list for backward compatibility with old cached AI responses. Empty `"propertyAliases": []` arrays are ignored (treated as null)

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
- Always import Lit primitives from **`@umbraco-cms/backoffice/external/lit`**: e.g. `import { html, css, customElement, state } from '@umbraco-cms/backoffice/external/lit'`
- The Vite external list does **not** need `/^lit/` or `/^@lit\//` entries — Lit is covered by the existing `/^@umbraco-cms\//` rule

### Lit Event Listener Lifecycle
- If `connectedCallback` adds event listeners on `this`, a matching `disconnectedCallback` **must** remove them — otherwise each re-connect duplicates the handler
- Listeners must be stored as **`private readonly` arrow fields** (not inline lambdas) so the same reference is used for both `addEventListener` and `removeEventListener`. `removeEventListener` performs strict equality (`===`) and will silently fail if the reference differs:
  ```typescript
  private readonly _onFoo = (e: Event): void => { /* ... */ };
  override connectedCallback(): void { super.connectedCallback(); this.addEventListener('foo', this._onFoo); }
  override disconnectedCallback(): void { super.disconnectedCallback(); this.removeEventListener('foo', this._onFoo); }
  ```
- For async methods that write to `@state()` properties, add `if (!this.isConnected) return;` guards before every state write to prevent writes to a detached element when the element is unmounted while an async call is in flight

### UmbLitElement & Localization
- All package components must extend **`UmbLitElement`** (from `@umbraco-cms/backoffice/lit-element`), not `LitElement` — this provides `this.localize.term('section_key')` via `UmbLocalizationController`
- Modal elements extend `UmbModalBaseElement` which already extends `UmbLitElement` — no base class change needed
- Localization file: `src/.../Client/src/localization/en.ts` — default-exports a **nested** object `{ section: { key: 'value' } }`. Umbraco's `UmbLocalizationRegistry` joins section + underscore + key, so `{ evaluatePage: { actionLabel: 'Evaluate Page' } }` resolves as `this.localize.term('evaluatePage_actionLabel')`
- **Never** use flat key format (`evaluatePage_actionLabel: 'value'`) in the localization file — the registry expects the nested structure
- The localization manifest (`type: 'localization'`) is registered in `entry-point.ts` with `meta: { culture: 'en' }` and `js: () => import('./localization/en.js')`
- All user-facing strings must go through localization — no hardcoded English strings in component templates

### Management API Client
- `@umbraco-cms/backoffice/external/backend-api` does **NOT** export `createClient` — it only exports `client` (the singleton) plus generated service classes. **Do not** attempt to import `createClient` from this path.
- Use **`umbHttpClient`** from `@umbraco-cms/backoffice/http-client` (re-exported as `apiClient` from `shared/api-client.ts`)
- `umbHttpClient` is the same `client` singleton; Umbraco's `app.element` configures it with `auth: () => authContext.getLatestToken()` before any extension `onInit` runs — **no `setConfig` call is needed** in our entry-point
- `entry-point.ts` `onInit` only needs to call `umbExtensionsRegistry.registerMany(manifests)` — no auth context consumption required
- Use `BEARER` exported from `shared/api-client.ts` for the `security` option on all API calls — do not redefine it locally
- The Umbraco.AI packages use a different approach: their own generated SDK (bundled in their own chunks) that includes its own `createClient`. We cannot replicate that without a generated SDK of our own.

### RCL / Static Web Assets
- The main `ProWorks.Umbraco.AI.PageEvaluator` project uses `Microsoft.NET.Sdk.Razor` with `StaticWebAssetBasePath = App_Plugins/ProWorks.AI.PageEvaluator`
- Built JS lives in `wwwroot/dist/` — served at `/App_Plugins/ProWorks.AI.PageEvaluator/dist/` in dev via Static Web Assets middleware
- Do **not** add an `App_Plugins/` folder to this project; `wwwroot/` is the source of truth

### EF Core / SQLite
- Do **not** use `HasColumnType("nvarchar(max)")` in `OnModelCreating` — it breaks SQLite migrations. Leave unlimited strings without a column type and let each provider use its default (`TEXT` for SQLite, `nvarchar(max)` for SQL Server)
- A design-time factory exists at `UmbracoAIPageEvaluatorDbContextFactory.cs` in the Sqlite project
- Migration handler is `RunPageEvaluatorMigrationNotificationHandler` — fires on `UmbracoApplicationStartedNotification`
- `Version` column on `EvaluatorConfigs` is configured as `.IsConcurrencyToken()` — EF Core adds `WHERE Version = @original` to UPDATE statements. The repository must set `db.Entry(existing).Property(e => e.Version).OriginalValue` to the client-supplied version before saving; the controller catches `DbUpdateConcurrencyException` and returns 409 Conflict

### Evaluation Cache
- Cached results are stored in `umbracoAIEvaluationCache` — one row per content node (keyed on `NodeId`)
- `IEvaluationCacheRepository` is registered as Singleton in `UmbracoBuilderExtensions`
- The API controller is responsible for cache read/write — `PageEvaluationService` has no knowledge of caching
- Cache is **invalidated automatically** (all rows for the affected `DocumentTypeAlias`) whenever a config is created, updated, activated, or deleted — call `_cacheRepository.DeleteByDocumentTypeAliasAsync(alias, ct)` in any controller action that mutates a config
- Cache is also **invalidated on content publish** via `ContentPublishedNotificationHandler` — deletes cache entries for each published node
- `EvaluationReport.WithCachedAt(DateTime)` returns a copy with `CachedAt` set — used by the controller before returning the response so the frontend knows when the result was cached
- `EvaluationReport.WithPropertyEditorAliases(IReadOnlyDictionary<string, string>)` returns a copy with `PropertyEditorAliases` set — called by the controller **after** the cache write so the map is never persisted to the cache; always derived fresh from `IContentTypeService` at response time
- The modal checks `GET /evaluate/cached/{nodeId}` on open; falls through to `POST /evaluate` only when no cache entry exists or when the user clicks **Re-run Evaluation**

### Package Version Constraints
- **All** `Microsoft.Extensions.AI*` packages must be pinned to `10.7.0` — required by `Umbraco.AI.Core 17.0.0`'s `[10.7.0, 10.999.999)` range and Anthropic SDK `12.29.1` (pulled by `Umbraco.AI.Anthropic 17.0.0`). Do NOT downgrade below `10.7.0`.
- `Microsoft.Extensions.AI` and `Microsoft.Extensions.AI.Abstractions` must always be the same version — mismatches cause `TypeLoadException: FunctionApprovalRequestContent`
- EF Core must be `10.0.6` (required by `Umbraco.Cms.Persistence.EFCore 17.5.1`)
- Umbraco.AI 1.14.0+ (carried forward into 17.0.0) makes `$`-style configuration references **default-deny**: `$Section:Key` in connection/model settings only resolves from `Umbraco:AI:Secrets` and `Umbraco:AI:Variables`. Other prefixes must be explicitly allow-listed via `Umbraco:AI:AllowedConfigurationKeyPrefixes`, and a literal `$` in a setting value now needs `$$` escaping. This package's own TestSite configures AI connections through the backoffice UI (not `appsettings.json` literals) and is unaffected, but downstream consumers of this package that reference `$`-style secrets/variables in their own `appsettings.json` should audit those references after upgrading.

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
- Evaluate endpoint has `[EnableRateLimiting("PageEvaluatorEvaluate")]` and `[RequestSizeLimit(1 * 1024 * 1024)]`
- `GET /evaluate/cached/{nodeId}` and `POST /evaluate` both verify content node existence (`IContentService.GetById(Guid)`) and Browse permission (`IAuthorizationService.AuthorizeAsync` with `ContentPermissionResource.WithKeys(ActionBrowse.ActionLetter, nodeId)` + `AuthorizationPolicies.ContentPermissionByResource`) — returns 404 if node not found, 403 if unauthorized
- `POST /evaluate` uses the canonical `DocumentTypeAlias` from the content node (`content.ContentType.Alias`), not the client-supplied value
- `POST /evaluate` and `POST /recommend` error responses: 404 on `InvalidOperationException` (no active config, `EvaluateAsync` only); **422** on `AIGuardrailBlockedException` (guardrail policy blocked the content — `ex.Message` is forwarded as `title`); AI provider failures are classified via `AIProviderException` (namespace `Umbraco.AI.Core.Providers.Errors`) — Umbraco.AI 17.0.0 wraps every provider chat client in an `AIErrorClassifyingChatClient` decorator, so provider SDK exceptions (`HttpRequestException`, Anthropic 5xx overloads, etc.) never reach the controller raw anymore. A single `catch (AIProviderException ex)` branches on `ex.Category` via the private `MapProviderError` helper: `Transient`/`RateLimited` → **503** (`category: "temporaryRetryable"`); `NetworkError` → **502** (`category: "connectivity"`); `Authentication` → **500** (`category: "authenticationConfiguration"`); `InvalidRequest`/`NotFound`/`Unknown` → **500** (`category: "unclassified"`). Every other unexpected exception → **500** with no `category` field. `OperationCanceledException` is not caught and propagates normally (Umbraco.AI never wraps it — cancellation surfaces as `AIProviderErrorCategory.Cancelled` info only in contexts that don't reach this controller).
- The response body's `category` field (added alongside the pre-existing `title`) is the wire-format discriminator the client uses to pick a localized message — necessary because `authenticationConfiguration` and `unclassified` share HTTP 500 and can't be told apart by status code alone. `title` remains an English, non-localized fallback for logging/display purposes only; it is **not** `ex.UserMessage` verbatim (that string is Umbraco.AI's own non-localized text) — this package composes its own `title` per bucket in `MapProviderError`.
- Full failure detail (`ex.Category`, `ex.ProviderCode`, and the original `ex.InnerException`) is always logged server-side via `_logger.LogError(ex, "...", ex.Category, ex.ProviderCode, request.NodeId)` before the response is returned — never included in the response body.
- **Every custom error body on this controller MUST include `type` (literal `"Error"`) and `status` (the same int passed to `StatusCode(...)`) alongside `title`, not just `{ title }` or `{ title, category }`.** Umbraco's backoffice registers a global response interceptor (`UmbApiInterceptorController.addErrorInterceptor`) on the shared `umbHttpClient` singleton used by every backoffice extension. For any non-2xx response that isn't 401/403/404, it runs `isProblemDetailsLike(body)` — requiring `'type' in body && 'title' in body && 'status' in body` — and if that check fails, it **silently discards the real body** and substitutes a hardcoded generic fallback (`type: "ServerError"`, "A fatal server error occurred..."), stripping any custom `category`/`title` before our own client code ever sees it. This was discovered when the `authenticationConfiguration` bucket's server log and raw Network-tab response were both correct but the rendered UI showed the generic fallback anyway. 404 responses are unconditionally rebuilt by this same interceptor regardless of body shape (a separate, pre-existing, out-of-scope limitation) — this constraint only applies to non-404 error statuses.
- Guardrails are configured at the **profile level** in Umbraco.AI, not per-evaluator config. `AIGuardrailBlockedException` (namespace `Umbraco.AI.Core.Guardrails`) is thrown by `IAIChatService` when a pre- or post-generate guardrail fires. The controller catches it and returns 422 so the frontend can display a specific "blocked by guardrail" message rather than a generic error.
- In tests, construct `AIProviderException` directly via `new AIProviderException(new AIProviderErrorInfo(category, userMessage, providerCode, rawMessage))` for each `AIProviderErrorCategory` value — no fake/sentinel exception types are needed (the pre-17.0.0 `Fake5xxException` type-name-suffix trick is obsolete and has been removed).
- `GetCurrentUserKey()` uses `HttpContext.User.Identity?.GetUserKey()` (from `Umbraco.Extensions`) — throws `InvalidOperationException` if the identity is missing (all controller actions that call it are protected by `[Authorize]`, so this is an unexpected edge case). In controller unit tests, inject `new Claim("sub", Guid.NewGuid().ToString())` into the `HttpContext.User` — `GetUserKey()` reads the `"sub"` claim (`Constants.Security.OpenIdDictSubClaimType`)
- **Activation uses `SetActiveAsync`** (`IAIEvaluatorConfigService.SetActiveAsync(id, ct)`) — **never** route activation through `UpdateAsync`. `SetActiveAsync` only toggles the `IsActive` flag and does not bump `Version` or `DateModified`, which is intentional (toggling active is an administrative action, not a content change)
- **`UpdateAsync` preserves `IsActive`** — it copies the existing record's `IsActive` state onto the incoming config before saving. Do **not** add `config.IsActive = true` in `UpdateAsync`; that would silently activate inactive configs on edit

### Recommendations (POST /recommend)
- `RecommendRequest.PropertyAliases: IReadOnlyList<string>` — one or more property aliases to generate recommendations for in a single call; 400 returned if the list is empty or any alias is not found on the document type
- `RecommendResponse.RecommendedValues: Dictionary<string, string?>` — keyed by alias; null value means the AI returned nothing actionable for that field
- Backend validates all aliases against the document type first (before any AI call), pre-resolves schemas per alias, then loops a separate AI call per alias; empty-aliases 400 guard is placed **after** auth and config checks (not before) so authorization is enforced first
- `BuildPropertyEditorAliases(string documentTypeAlias)` — private controller helper; calls `_contentTypeService.Get(alias).CompositionPropertyTypes.ToDictionary(p => p.Alias, p => p.PropertyEditorAlias)`; returns empty dict when content type is not found
- `BuildRecommendSystemPrompt` branches on editor type: schema-based → schema JSON prompt; `IsTagsEditor` → JSON array prompt (`{"recommendedValue": [...]}` with natural-language strings); `IsRichTextEditor` → clean HTML prompt; all others → plain text prompt
- `IsTagsEditor(string)` — matches `"Umbraco.Tags"` (case-insensitive)
- `IsRichTextEditor(string)` — matches `"Umbraco.RichText"` and `"Umbraco.TinyMCE"` (case-insensitive)
- Frontend `EvaluationReportElement` uses two static sets to classify properties: `_FULL_RECOMMEND_EDITORS` (`TextBox`, `TextArea`, `Markdown`, `Tags` — full recommend + apply) and `_COPY_ONLY_EDITORS` (`RichText`, `TinyMCE` — recommend + copy only, no Apply button)
- `_canRecommend(alias)` and `_canApply(alias)` consult `propertyEditorAliases` first, then `_isAdditionalEditor(editorAlias)`, then fall back to a value-content heuristic (values starting with `{`, `[`, or `umb://` are treated as complex) when the map is unavailable
- Per-alias applied/copied state tracked in `_appliedAliases: Map<number, Set<string>>` and `_copiedAliases: Map<number, Set<string>>` — both use immutable copy-on-write (`new Map(existing)`, `new Set(existing)`) to trigger Lit reactivity
- `_isAdditionalEditor(editorAlias)` — compares case-insensitively against `this.additionalRecommendableEditorAliases`; editors in this list behave the same as `_FULL_RECOMMEND_EDITORS` (both Recommend and Apply shown)
- `additionalRecommendableEditorAliases` property on `EvaluationReportElement` is populated from `EvaluationReport.AdditionalRecommendableEditorAliases`, which the controller sets from `IOptions<PageEvaluatorOptions>` at response time — **never stored in the cache**

### Server Configuration (`PageEvaluatorOptions`)
- `Configuration/PageEvaluatorOptions.cs` — bound from `ProWorks:PageEvaluator` in `appsettings.json`; registered in `PageEvaluatorComposer` via `builder.Services.Configure<PageEvaluatorOptions>(builder.Config.GetSection("ProWorks:PageEvaluator"))`
- `AdditionalRecommendableEditorAliases: List<string>` — editor aliases from third-party packages that should receive Recommend + Apply buttons; treated as plain text on the backend (same fallback prompt as all other unrecognised editors); injected into the controller via `IOptions<PageEvaluatorOptions>`

### Rate Limiter Registration
- `PageEvaluatorComposer` registers the `"PageEvaluatorEvaluate"` fixed-window rate limiter policy (10 requests per user per minute) via `builder.Services.AddRateLimiter`
- Registering the policy requires two usings: `using Microsoft.AspNetCore.Builder;` (for `AddRateLimiter`) AND `using Microsoft.AspNetCore.RateLimiting;` (for `AddFixedWindowLimiter`) — neither alone is sufficient
- **Consuming apps must call `app.UseRateLimiter()` BEFORE `app.UseUmbraco()`** in their middleware pipeline; without it `[EnableRateLimiting]` is silently a no-op
