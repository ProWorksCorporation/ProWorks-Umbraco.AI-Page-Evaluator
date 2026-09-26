# ProWorks-Umbraco-AI-Page-Evaluator Development Guidelines

Last updated: 2026-09-24 (rev 14)

## Active Technologies

- **Client**: TypeScript 5.9.x `strict: true, noUncheckedIndexedAccess: true`, Vite 7.x build, Lit 3.x web components
- **Server**: C# .NET 10, Umbraco CMS 17.6.2, EF Core 10.0.10
- **AI**: Umbraco.AI 17.3.4 ecosystem (Anthropic 17.1.0, OpenAI 17.2.0, Prompt 17.2.3, Agent 17.1.7, Agent.Copilot 17.0.5 on the TestSite; neither is a package dependency). The TestSite runs Umbraco.AI **17.3.5** because Agent 17.1.7 requires `Umbraco.AI.Startup >= 17.3.5`; the package floor and the test project stay on **17.3.4** so tests exercise the minimum — CMS-aligned versioning succeeds the 1.x line
- **Toolchain**: Node ≥ 24.13 / npm ≥ 11 (required by `@umbraco-cms/backoffice` 17.6 and UUI 2); `package.json` declares `engines`
- **Database**: SQLite (dev), SQL Server (prod) via separate EF Core migration projects; evaluation cache in `umbracoAIEvaluationCache` table
- **Content sync**: uSync 17.3.5
- **UI Library**: `@umbraco-ui/uui` **2.0.2** — CMS 17.6 moved the backoffice to UUI 2 (peer `^2.0.2`; `@umbraco-ui/uui-css` no longer exists). 17.6.0 shipped without the UUI v1 compatibility shims, so **17.6.0 is unsupported**; this package requires 17.6.2+. Client peer ranges: backoffice `>=17.6.2 <18`, uui `>=2.0.2 <3`, `@umbraco-ai/core` `>=17.3.4 <18` (npm `latest` for `@umbraco-ai/core` is the v18 line). The devDependency on `@umbraco-cms/backoffice` is pinned `~17.6.2` so typings match the minimum supported runtime
- **Tests**: xUnit + NSubstitute (server); Vitest + happy-dom + MSW (client, with `element-internals-polyfill` in `tests/setup/vitest.setup.ts` because happy-dom lacks `attachInternals()`, which UUI 2 form controls call); Playwright + `@umbraco/playwright-testhelpers` (e2e, `playwright.config.ts` + `tests/e2e/auth.setup.ts`; env `URL`, `UMBRACO_URL`, `UMBRACO_USER_LOGIN`, `UMBRACO_USER_PASSWORD`). Lit elements must be awaited with `await el.updateComplete` in tests — a single microtask is not enough for `UmbLitElement`

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
npm run typecheck && npm run lint && npm test   # client gates (Vitest unit + MSW integration)

# E2E against a running TestSite (Playwright; run `npx playwright install chromium` once)
URL=https://localhost:44318 UMBRACO_URL=https://localhost:44318 \
UMBRACO_USER_LOGIN=admin@example.com UMBRACO_USER_PASSWORD='SecureP@ssw0rd!' npm run test:e2e

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
- Calls the AI through **`IEvaluatorChatExecutor`** (`Services/EvaluatorChatExecutor.cs`), which wraps `IAIChatService` (from `Umbraco.AI.Core.Chat`) — **never** inject `IChatClient` or `IAIChatClientFactory` directly
- Resolves content through **`ICultureAwareContentPropertyResolver`** (see "Language awareness") — the service no longer takes `IUmbracoContextAccessor`/`IApiContentBuilder`
- Request: alias `proworks-page-evaluator`, `Temperature = 0f`, `Tools = []`, `MaxOutputTokens = 16384`, schema `ChatSchemas.EvaluationReport(config.ScoringEnabled)`
- After the call it sets `EvaluationReport.SamplingSettingsIgnored` from `ISamplingSupportService.IsTemperatureSupportedAsync(profileId, response.ModelId)` — **persisted** in the cache so cached reports keep the "scores may vary" notice for the model that produced them
- Checks `ChatFinishReason.Length` after response to detect truncation
- Includes defensive preamble in user message to guard against prompt injection from content
- Filters properties by `config.PropertyAliases` when set; strips HTML tags and truncates at 2000 chars
- Scoring JSON fields use **camelCase**: `"overallScore"` and `"axisScores"` — these match the C# property names. **Never** use `"overall_score"` / `"axis_scores"` (snake_case); the prompt template, parser, and `PromptBuilderElement` scoring snippet must all use the same camelCase names
- `CheckStatus` parsing is **case-insensitive** via the shared `ParseCheckStatus(string)` helper — both `TryParseJson` and `TryParseMarkdown` delegate to it; `"FAIL"`, `"fail"`, and `"Fail"` all map to `CheckStatus.Fail`
- `CheckResult.PropertyAliases: IReadOnlyList<string>?` — the JSON parser reads `"propertyAliases": [...]` (array, preferred); falls back to legacy `"propertyAlias": "..."` (string) and wraps it in a single-element list for backward compatibility with old cached AI responses. Empty `"propertyAliases": []` arrays are ignored (treated as null)

### Evaluator chat executor (enforced response schemas — FR-017)
- `IEvaluatorChatExecutor.ExecuteAsync(EvaluatorChatRequest)` is the only place that builds `AIChatBuilder` calls. With a schema it calls `chat.WithOutputSchema(AIOutputSchema.FromJsonSchema(schema))` and leaves **`ChatOptions.ResponseFormat = null`** — a non-null `ResponseFormat` in `WithChatOptions` overrides the schema in Umbraco.AI's options-override middleware and silently cancels it. Without a schema it uses `ChatResponseFormat.Json`
- On a schema rejection (`SchemaRejectionClassifier`: `InvalidRequest` + provider code `invalid_json_schema` or a raw message mentioning `json_schema`/`response_format`/`text.format`/`output_config`/`schema`) it logs a Warning, marks `(profileId, profile.Version)` in the singleton `IStructuredOutputSupportCache`, and retries **once** without the schema. Any other error — and a failed retry — propagates to the controller's normal mapping
- Schemas live in `ChatSchemas` (object root, every property required, `additionalProperties: false`, nullable = `["t","null"]`); Anthropic silently drops a schema whose root lacks `properties`/`required`. Editor-provided schemas go through `StrictSchemaCompatibility.IsStrictRepresentable` (a copy of Umbraco.AI.Prompt's internal rule) and are **not** enforced when they contain untyped/`{}` nodes (e.g. Block List)
- Parsing is unchanged: `TryParseJson → TryParseMarkdown → Failed` for both paths
- Umbraco.AI 17.3 strips `Temperature`/`TopP` for models whose provider declares them unsupported (OpenAI reasoning/GPT-5, newer Claude) — `ISamplingSupportService` reads that declaration via `AIProviderCollection.GetById(...).TryGetCapability<IAIChatCapability>(…).GetSettingsSupport(modelId)` (two-state: unsupported only when declared)
- In tests, run the captured `Action<AIChatBuilder>` on `new AIChatBuilder()` and read its private `_alias`/`_chatOptions`/`_outputSchema` fields by reflection (no public getters)

### Language awareness (FR-018)
- **Capture**: the workspace action takes the viewed culture from `UMB_DOCUMENT_WORKSPACE_CONTEXT.splitView.getActiveVariants()[0]` (left pane — same rule core uses) when `getVariesByCulture()`; it sends only that culture's values + invariant values (segmented values skipped) and flags `cultureNotCreated` (no variant entry, or `state` not a string / `'NotCreated'`). **Never use `UMB_VARIANT_CONTEXT` outside a property dataset** — there it resolves to the UI language
- **Server resolution**: `CultureAwareContentPropertyResolver` reads `IPublishedContentCache.GetById(preview: false, key)`, falling back to `preview: true` when not published in the culture; maps with `IOutputExpansionStrategy.MapContentProperties` (not `IApiContentBuilder.Build`, which returns null for non-routable cultures) inside a `VariationContext` scope that is **always restored in `finally`** (`HybridVariationContextAccessor` stores it in the request cache — never resolve cultures in parallel in one request). Nested pickers still go through the decorated builder, so cycle detection still applies
- **Controller**: `NormaliseCultureAsync` — invariant doc types → `""` (supplied culture ignored); varying → must match an `ILanguageService.GetAllAsync()` ISO code (400 `invalidCulture`) and exist on the node (`IsCultureAvailable`, else 400 `cultureNotCreated`); result is the lower-cased ISO code. Order: 404 node → 403 permission → 400 culture
- **Recommendations** add `Write the recommended value in {EnglishName} ({culture}).`; the report's own text stays in the prompt's language
- **Apply** writes with `ctx.setPropertyValue(alias, value, UmbVariantId.Create({ culture, segment: null }))` via `shared/apply-value.ts` — culture only when both the document and the property vary. **Never use Umbraco.AI's `applyValueChange`**: it looks up values culture-blind and `JSON.parse`s plain strings (`42`/`true`/`"quoted"` would be stored as the wrong type)
- Because nothing `JSON.parse`s any more, `apply-value.ts` must convert per editor: rich text → `{ markup, blocks }`; **Tags → `string[]`** (`toTagArray`: JSON array string or comma/newline-separated text, trimmed, blanks and exact duplicates dropped). The Tags editor's value is `Array<string>`; writing a string breaks it (regression caught 2026-09-25 by `tests/e2e/tags-apply.spec.ts`)

### Rich-text Apply (FR-016)
- `Umbraco.RichText`/`Umbraco.TinyMCE` are full Recommend + Apply editors. Apply builds `{ markup, blocks }`, keeping the current variant's `blocks` (or a fresh `createEmptyBlocks()`), and normalises Delivery-API placeholders (`data-content-id` → `data-content-key`, restores `<!--Umbraco-Block-->`)
- **Safeguard**: Apply is shown only when `canApplyRichText(current, recommended)` — the recommendation keeps every `<umb-rte-block>`/`<umb-rte-block-inline>` placeholder **exactly once** (none missing, duplicated or unknown). Otherwise the report shows `evaluatePage_rteApplyBlockedMessage` and keeps Copy. The editor only prunes orphaned blocks on its own change events, so a dropped placeholder would otherwise orphan block data
- **Rich text never uses the editor's value schema.** `Umbraco.RichText` implements `IValueSchemaProvider` (a `{markup, blocks}` object schema), so `RecommendAsync` skips `IPropertyEditorSchemaService` for `IsRichTextEditor` aliases: otherwise the generic schema branch wins, the model returns the storage object instead of HTML, and the rich-text prompt (keep-placeholders instruction included) never runs. Unit tests that mock `SupportsSchema(RichText) = false` can't catch this; keep the `…WithAnEditorSchema…` tests
- As a safety net `GetRecommendationAsync` still unwraps a storage-shaped rich-text value (`{"markup": "…", "blocks": …}`, JSON string or object) to its markup (`UnwrapRichTextStorageShape`), and the prompt says the value must be an HTML string. Escaped quotes would otherwise hide kept placeholders from `canApplyRichText` (seen live 2026-09-24)
- The recommend prompt switches to a "keep every placeholder" instruction when the current markup contains placeholders; a failed write (`applyRecommendedValue` → `false`) dispatches `page-evaluator-rec-apply-failed` back to the report (shows `evaluatePage_applyFailedMessage`, reverts "Applied")
- The modal listens on its host, so `e.target` is retargeted — use `e.composedPath()[0]` to reach the report element

### Inline notices
- There is no alert/callout element in the 17.6 backoffice. Use core's pattern: `<div role="status">` + `<uui-icon name="icon-info">` styled in `static styles` with `--uui-color-warning*` (or `--uui-color-default*`) and `--uui-border-radius` — no inline `style=`

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
- **Supported languages**: `en` (source of truth), `es`, `fr`, `da`, `de`, `nb` (Norwegian Bokmål — not `no`), `sv`, `it`, `hi`, `pt` — one file per culture in `src/localization/`, each registered as its own `type: 'localization'` manifest in `entry-point.ts` with a matching `meta: { culture: '<code> }`. Culture codes match Umbraco's own core language files (`Umbraco.Web.UI.Client/src/packages/core/localization/manifests.ts`) — always verify the exact code there before adding a new language rather than guessing (e.g. Norwegian is `nb`, not `no`; Portuguese-Brazil would be `pt-BR`, not `pt`, if ever added as a distinct variant). When adding a new key, update **all** language files, not just `en.ts` — a missing key in a non-English file silently falls back to the raw key name in the backoffice UI rather than erroring.
- All user-facing strings must go through localization — no hardcoded English strings in component templates

### Management API Client
- `@umbraco-cms/backoffice/external/backend-api` does **NOT** export `createClient` — it only exports `client` (the singleton) plus generated service classes. **Do not** attempt to import `createClient` from this path.
- Use **`umbHttpClient`** from `@umbraco-cms/backoffice/http-client` (re-exported as `apiClient` from `shared/api-client.ts`)
- `umbHttpClient` is the same `client` singleton; Umbraco's `app.element` configures it with `auth: () => authContext.getLatestToken()` before any extension `onInit` runs — **no `setConfig` call is needed** in our entry-point
- `entry-point.ts` `onInit` only needs to call `umbExtensionsRegistry.registerMany(manifests)` — no auth context consumption required
- Use `BEARER` exported from `shared/api-client.ts` for the `security` option on all API calls — do not redefine it locally
- **`umbHttpClient` is created with `throwOnError: true`** (core `backend-api/client.gen.ts`), so without opting out every non-2xx call rejects with the raw body and `checkResult`/`404 → null` branches never run. **Every call in `shared/api-client.ts` passes `throwOnError: false`**; `checkResult` builds `ApiError(status, detail, category, type)` from `result.error`, and the private `send()` wrapper turns a fetch `TypeError` (network drop) into `ApiError(0, …, null, 'NetworkError')`
- `localizationKeyForError({ type, category }, fallback)` (`shared/error-category.ts`) picks the message: `type` first (`GatewayTimeout`, `GatewayUnreachable`, `NetworkError`), then `category`, then the fallback. Don't render the interceptor's English `title`/`detail` for those types (`shouldHideErrorDetail`)
- The Umbraco.AI packages use a different approach: their own generated SDK (bundled in their own chunks) that includes its own `createClient`. We cannot replicate that without a generated SDK of our own.

### RCL / Static Web Assets
- The main `ProWorks.Umbraco.AI.PageEvaluator` project uses `Microsoft.NET.Sdk.Razor` with `StaticWebAssetBasePath = App_Plugins/ProWorks.AI.PageEvaluator`
- Built JS lives in `wwwroot/dist/` — served at `/App_Plugins/ProWorks.AI.PageEvaluator/dist/` in dev via Static Web Assets middleware
- Do **not** add an `App_Plugins/` folder to this project; `wwwroot/` is the source of truth

### EF Core / SQLite
- `AddUmbracoDbContext<T>(…)` must use the **`shareUmbracoConnection: true`** overload (the old overloads are obsolete in 17.6 and warn); the evaluator's tables live in the Umbraco database
- Do **not** add `SqliteRetryingExecutionStrategy` to this DbContext: retrying strategies reject user-initiated transactions, and the context shares Umbraco's connection/transaction
- Regenerate migrations with a local `dotnet-ef` (`dotnet tool install dotnet-ef --version 10.0.10 --tool-path <dir>`) — see Commands
- Do **not** use `HasColumnType("nvarchar(max)")` in `OnModelCreating` — it breaks SQLite migrations. Leave unlimited strings without a column type and let each provider use its default (`TEXT` for SQLite, `nvarchar(max)` for SQL Server)
- A design-time factory exists at `UmbracoAIPageEvaluatorDbContextFactory.cs` in the Sqlite project
- Migration handler is `RunPageEvaluatorMigrationNotificationHandler` — fires on `UmbracoApplicationStartedNotification`
- `Version` column on `EvaluatorConfigs` is configured as `.IsConcurrencyToken()` — EF Core adds `WHERE Version = @original` to UPDATE statements. The repository must set `db.Entry(existing).Property(e => e.Version).OriginalValue` to the client-supplied version before saving; the controller catches `DbUpdateConcurrencyException` and returns 409 Conflict

### Evaluation Cache
- Cached results are stored in `umbracoAIEvaluationCache` — one row per **(content node, culture)**, composite key `(NodeId, Culture)`; `Culture` is the lower-cased ISO code, or `""` for invariant documents and for rows cached before 17.3.0 (migration `AddEvaluationCacheCulture`, SQLite table rebuild keeps existing rows as `""`). Legacy `""` rows are never shown for a culture-varying document and are deleted when that node gets a culture-specific result
- Repository: `GetAsync(nodeId, culture)`, `SaveAsync(entry)` (upsert on the key), `DeleteAsync(nodeId, culture)`, `DeleteAllCulturesAsync(nodeId)`, `DeleteByDocumentTypeAliasAsync(alias)`
- `IEvaluationCacheRepository` is registered as Singleton in `UmbracoBuilderExtensions`
- The API controller is responsible for cache read/write — `PageEvaluationService` has no knowledge of caching
- Cache is **invalidated automatically** (all rows for the affected `DocumentTypeAlias`) whenever a config is created, updated, activated, or deleted — call `_cacheRepository.DeleteByDocumentTypeAliasAsync(alias, ct)` in any controller action that mutates a config
- Cache is also **invalidated on publish and unpublish** via `ContentPublishedNotificationHandler` and `ContentUnpublishedNotificationHandler`, sharing `CacheInvalidationRules`: using CMS 17.6's `PublishedCultures`/`UnpublishedCultures` (keyed by content key), a null map, an unlisted node or `"*"` clears **every** culture of the node; otherwise only the listed cultures (lower-cased) plus the legacy `""` row on culture-varying types
- **Publish/unpublish invalidation is best-effort and runtime-gated** (`CacheInvalidationRules.InvalidateSafelyAsync`, issue #25, 17.3.1): it does nothing below `RuntimeLevel.Run`, and logs a warning per entity instead of throwing (cancellation still propagates). This package's EF Core migration runs on `UmbracoApplicationStartedNotification` (the same pattern Umbraco.AI uses), so during an unattended install/upgrade a package that publishes content (e.g. Clean) would otherwise hit a missing `umbracoAIEvaluationCache` table (or, on upgrade, a missing column) and the exception aborted the whole unattended install. **Never let a notification handler throw into the operation that raised it**
- `EvaluationReport.SamplingSettingsIgnored` **is** stored in the cache (set before the write); `EvaluationReport.WithCulture(...)` is response-time only
- `EvaluationReport.WithCachedAt(DateTime)` returns a copy with `CachedAt` set — used by the controller before returning the response so the frontend knows when the result was cached
- `EvaluationReport.WithPropertyEditorAliases(IReadOnlyDictionary<string, string>)` returns a copy with `PropertyEditorAliases` set — called by the controller **after** the cache write so the map is never persisted to the cache; always derived fresh from `IContentTypeService` at response time
- The modal checks `GET /evaluate/cached/{nodeId}?culture=…` on open (no query for invariant documents); falls through to `POST /evaluate` only when no cache entry exists or when the user clicks **Re-run Evaluation**

### Package Versioning Policy
- **Current version: `17.3.1`** (targets Umbraco.AI 17.3.x). Keep `<Version>` (RCL csproj), client `package.json` + `package-lock.json`, **and `wwwroot/umbraco-package.json` `version`** identical — CMS 17.6 stamps `App_Plugins` script URLs with `?umb__rnd=<manifest version>-<hash>`, so a stale manifest version stops browsers picking up new scripts. `tests/unit/version-sync.test.ts` enforces this
- **This package's own NuGet version now tracks the Umbraco.AI package version it targets**, starting at `17.0.0` (changed 2026-07-03 from an independent `1.x` sequence, mirroring how the Umbraco.AI ecosystem itself moved to CMS-aligned versioning). `<Version>` in `ProWorks.Umbraco.AI.PageEvaluator.csproj` and `"version"` in `ProWorks.Umbraco.AI.PageEvaluator.Client/package.json` (plus its `package-lock.json`, kept in sync via `npm install` after any manual `package.json` version edit) must always match. The last package under the old scheme was `1.0.20` (nupkg for `1.0.19` is the latest actually published; `1.0.20` was staged but never packed/pushed). Future bumps: when Umbraco.AI's own major/minor version changes, bump this package's version to match; use the patch digit for this package's own fixes/features that don't correspond to an Umbraco.AI version bump.

### Package Version Constraints
- **All** `Microsoft.Extensions.AI*` packages must be pinned to `10.7.0` — required by `Umbraco.AI.Core 17.3.4`'s `[10.7.0, 10.999.999)` range and Anthropic SDK `12.29.1` (pulled by `Umbraco.AI.Anthropic 17.1.0`). Do NOT downgrade below `10.7.0`.
- **CMS / Umbraco.AI version ranges live on the RCL itself**: `Umbraco.Cms.Api.Management`, `Umbraco.Cms.Persistence.EFCore`, `.Sqlite`, `.SqlServer` `[17.6.2, 18.0.0)` and `Umbraco.AI.Core`/`Umbraco.AI.Startup` `[17.3.4, 18.0.0)`. The Core/Persistence project references are `PrivateAssets="all"` (bundled DLLs), so without direct RCL references the nuspec carries no CMS dependency and NuGet resolves CMS packages to Umbraco.AI's own `[17.5.0, …)` floor (mixed 17.5/17.6 assemblies + NU1903 advisories). TestSite/test projects use exact versions
- **The RCL also depends on the `Umbraco.Cms` meta-package `[17.6.2, 18.0.0)`** (with `ExcludeAssets="build;buildTransitive"`). Without it, installing on a 17.5.x site succeeds silently: NuGet lifts only the named sub-packages to 17.6.2 and leaves `Umbraco.Cms`, `StaticAssets` (the backoffice client), `Web.Website` etc. at 17.5.x — a mixed install (QS-21). With it, the site's own lower `Umbraco.Cms` reference is a hard **NU1605** error. `ExcludeAssets` keeps `Umbraco.Cms.Targets` (web-app targets that write `appsettings-schema*.json`/`umbraco-package-schema.json` into the project folder) out of this library; it only affects the path through this package, so consuming sites still get those targets from their own `Umbraco.Cms` reference. Keep the `Umbraco.Cms` floor equal to the sub-package floors
- **Possible future revert (decided 2026-09-25, not done):** the `Umbraco.Cms` dependency pulls the whole meta-package (`Web.Website`, `Api.Delivery`, ImageSharp, Examine, the Sqlite/SqlServer providers, and their composers via `AddComposers()`) into sites composed of individual CMS packages without `Umbraco.Cms` — a rare, non-template setup (e.g. a stripped-down headless site); class libraries and test projects that reference this package are unaffected in practice. If such a user reports a problem, revert by removing that one `PackageReference` from the RCL csproj. Consequence: installing on a pre-17.6.2 site becomes a **silent mixed install** again (QS-21 in `specs/003-upgrade-umbraco-17-6/validation.md`), so also restore the README/README.nuget/release-note wording to "upgrade Umbraco CMS and Umbraco.AI first" (drop the NU1605 wording) and re-run the QS-21 scratch-site check
- `Microsoft.Extensions.AI` and `Microsoft.Extensions.AI.Abstractions` must always be the same version — mismatches cause `TypeLoadException: FunctionApprovalRequestContent`
- EF Core must be `10.0.10` (required by `Umbraco.Cms.Persistence.EFCore 17.6.2`; approved 2026-09-24)
- Umbraco.AI 1.14.0+ (carried forward into 17.0.0) makes `$`-style configuration references **default-deny**: `$Section:Key` in connection/model settings only resolves from `Umbraco:AI:Secrets` and `Umbraco:AI:Variables`. Other prefixes must be explicitly allow-listed via `Umbraco:AI:AllowedConfigurationKeyPrefixes`, and a literal `$` in a setting value now needs `$$` escaping. This package's own TestSite configures AI connections through the backoffice UI (not `appsettings.json` literals) and is unaffected, but downstream consumers of this package that reference `$`-style secrets/variables in their own `appsettings.json` should audit those references after upgrading.

## TestSite

- URL: `https://localhost:44318`
- Back-office: `https://localhost:44318/umbraco`
- Login: `admin@example.com` / `SecureP@ssw0rd!`
- Database: SQLite (`umbraco.sqlite.db` in project root)
- uSync content files: `uSync/v17/Content/` — import via **Settings → uSync → Import All** after changes
- **Evaluator configs are not in uSync** (package DB tables). The e2e specs need active configs for `home` (named "Home Page Scoring Test") and `landingPage`, and **none** for `contentPage` (About Us checks the button is hidden)
- Multilingual test page: **ProWorks AI Page Evaluator** (`landingPage`, key `3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7`), `en-US` + `da-DK`; only the Danish `introText` embeds a block (`d3a0c1e2-5b7f-4c1a-9e2d-7f003da00001`). Our Services / Umbraco AI have no `da-DK` variant
- Views must use `Layout = "~/Views/Shared/_Layout.cshtml";` — a bare `Layout = "_Layout"` is parsed by Umbraco as a master-template alias and makes template create/import fail with `MasterTemplateNotFound`
- `AllowConcurrentLogins: false`: every login (e2e auth setup, scripts) signs that user out elsewhere — use a separate backoffice user for automation
- **E2E test data**: `@umbraco/playwright-testhelpers` 17.0.x's `umbracoApi` fixture doesn't work on CMS 17.6 (it reads the token from localStorage; 17.6 uses HttpOnly cookies). Use `umbracoUi` for UI and `tests/e2e/management-api.ts` (`ManagementApi`) + `@umbraco/json-models-builders` to create/delete data; it retries a 401 after reloading the backoffice (refresh tokens are single-use). Specs that need data the TestSite lacks create it and delete it in `finally` (see `tags-apply.spec.ts`)
- Calling the Management API from a script: send the `__Host-umbAccessToken`/`__Host-umbRefreshToken` cookies (e.g. from `tests/e2e/.auth/user.json`) **and** `Authorization: Bearer [redacted]` — CMS 17 hides tokens in cookies and swaps the real token in only for that placeholder (`HideBackOfficeTokensHandler`). Access tokens are short-lived; re-run the Playwright `setup` project on a 401. Umbraco.AI's own API is under `/umbraco/ai/management/api/v1/`

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
- `AIChatBuilder` (from `Umbraco.AI.Core.InlineChat`) — `.WithAlias()`, `.WithProfile(Guid)`, `.WithChatOptions(ChatOptions)`, `.WithOutputSchema(AIOutputSchema)`, `.WithContextItems()`, `.WithContexts(...)`, `.WithGuardrails(...)`. Internal properties not accessible from external assemblies.
- Aliases: evaluate `proworks-page-evaluator`, recommend `proworks-page-evaluator-recommend` (FR-019). The alias gives each a distinct `FeatureId` in the Umbraco.AI **audit log**; usage statistics do **not** break down by feature (use separate profiles for separate cost breakdowns)

### Controller
- `PageEvaluatorApiController` extends `ControllerBase` (not the obsolete `UmbracoApiController`)
- Config CRUD endpoints require `[Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]`
- Evaluate endpoint has `[EnableRateLimiting("PageEvaluatorEvaluate")]` and `[RequestSizeLimit(1 * 1024 * 1024)]`
- `GET /evaluate/cached/{nodeId}` and `POST /evaluate` both verify content node existence (`IContentService.GetById(Guid)`) and Browse permission (`IAuthorizationService.AuthorizeAsync` with `ContentPermissionResource.WithKeys(ActionBrowse.ActionLetter, nodeId)` + `AuthorizationPolicies.ContentPermissionByResource`) — returns 404 if node not found, 403 if unauthorized
- `POST /evaluate` uses the canonical `DocumentTypeAlias` from the content node (`content.ContentType.Alias`), not the client-supplied value
- `POST /evaluate` and `POST /recommend` error responses: 404 on `InvalidOperationException` (no active config, `EvaluateAsync` only); **422** on `AIGuardrailBlockedException` (guardrail policy blocked the content — `ex.Message` is forwarded as `title`); AI provider failures are classified via `AIProviderException` (namespace `Umbraco.AI.Core.Providers.Errors`) — Umbraco.AI 17.0.0 wraps every provider chat client in an `AIErrorClassifyingChatClient` decorator, so provider SDK exceptions (`HttpRequestException`, Anthropic 5xx overloads, etc.) never reach the controller raw anymore. A single `catch (AIProviderException ex)` branches on `ex.Category` via the private `MapProviderError` helper: `Transient`/`RateLimited` → **503** (`category: "temporaryRetryable"`); `Cancelled` → **503** (`category: "temporaryRetryable"`); `NetworkError` → **502** (`category: "connectivity"`); `Authentication` → **500** (`category: "authenticationConfiguration"`); `InvalidRequest`/`NotFound`/`Unknown` → **500** (`category: "unclassified"`). Every other unexpected exception → **500** with no `category` field. **Since Umbraco.AI 17.1.1, `AIErrorClassifyingChatClient` only rethrows `OperationCanceledException` for the caller's own token and wraps any other cancellation** — an HttpClient timeout becomes `Transient` (`ProviderCode "timeout"`) and anything else `Cancelled`, which is why `Cancelled` must map to a real bucket (it used to throw inside the catch block → unhandled 500). Editor-initiated cancellation still surfaces as `OperationCanceledException`, is not caught, and is not logged as an error.
- `POST /evaluate`, `GET /evaluate/cached` and `POST /recommend` also return **400** `{ type, title, status, category: "invalidCulture" | "cultureNotCreated" }` (see "Language awareness")
- `GET /profiles/{profileId}/sampling-support` (`SectionAccessSettings`) → `{ temperatureSupported }`; never 404s (unknown → `true`)
- The response body's `category` field (added alongside the pre-existing `title`) is the wire-format discriminator the client uses to pick a localized message — necessary because `authenticationConfiguration` and `unclassified` share HTTP 500 and can't be told apart by status code alone. `title` remains an English, non-localized fallback for logging/display purposes only; it is **not** `ex.UserMessage` verbatim (that string is Umbraco.AI's own non-localized text) — this package composes its own `title` per bucket in `MapProviderError`.
- Full failure detail (`ex.Category`, `ex.ProviderCode`, and the original `ex.InnerException`) is always logged server-side via `_logger.LogError(ex, "...", ex.Category, ex.ProviderCode, request.NodeId)` before the response is returned — never included in the response body.
- **Every custom error body on this controller MUST include `type` (literal `"Error"`) and `status` (the same int passed to `StatusCode(...)`) alongside `title`, not just `{ title }` or `{ title, category }`.** Umbraco's backoffice registers a global response interceptor (`UmbApiInterceptorController.addErrorInterceptor`) on the shared `umbHttpClient` singleton used by every backoffice extension. For any non-2xx response that isn't 401/403/404, it runs `isProblemDetailsLike(body)` — requiring `'type' in body && 'title' in body && 'status' in body` — and if that check fails, it **silently discards the real body** and substitutes a hardcoded generic fallback (`type: "ServerError"`, "A fatal server error occurred..."), stripping any custom `category`/`title` before our own client code ever sees it. This was discovered when the `authenticationConfiguration` bucket's server log and raw Network-tab response were both correct but the rendered UI showed the generic fallback anyway. 404 responses are unconditionally rebuilt by this same interceptor regardless of body shape (a separate, pre-existing, out-of-scope limitation) — this constraint only applies to non-404 error statuses. **Since CMS 17.6 the interceptor also rewrites 504/524/598 to `type: "GatewayTimeout"` and 521/522/523/525/526/530/599 to `type: "GatewayUnreachable"`** whatever the body — never use those statuses for our own error bodies; the client maps both types to their own localized messages.
- Guardrails are normally configured at the **profile level** in Umbraco.AI (the evaluator doesn't set per-call guardrails, although `AIChatBuilder.WithGuardrails(...)` exists). `AIGuardrailBlockedException` (namespace `Umbraco.AI.Core.Guardrails`) is thrown by `IAIChatService` when a pre- or post-generate guardrail fires. The controller catches it and returns 422 so the frontend can display a specific "blocked by guardrail" message rather than a generic error.
- In tests, construct `AIProviderException` directly via `new AIProviderException(new AIProviderErrorInfo(category, userMessage, providerCode, rawMessage))` for each `AIProviderErrorCategory` value — no fake/sentinel exception types are needed (the pre-17.0.0 `Fake5xxException` type-name-suffix trick is obsolete and has been removed).
- `GetCurrentUserKey()` uses `HttpContext.User.Identity?.GetUserKey()` (from `Umbraco.Extensions`) — throws `InvalidOperationException` if the identity is missing (all controller actions that call it are protected by `[Authorize]`, so this is an unexpected edge case). In controller unit tests, inject `new Claim("sub", Guid.NewGuid().ToString())` into the `HttpContext.User` — `GetUserKey()` reads the `"sub"` claim (`Constants.Security.OpenIdDictSubClaimType`)
- **Activation uses `SetActiveAsync`** (`IAIEvaluatorConfigService.SetActiveAsync(id, ct)`) — **never** route activation through `UpdateAsync`. `SetActiveAsync` only toggles the `IsActive` flag and does not bump `Version` or `DateModified`, which is intentional (toggling active is an administrative action, not a content change)
- **`UpdateAsync` preserves `IsActive`** — it copies the existing record's `IsActive` state onto the incoming config before saving. Do **not** add `config.IsActive = true` in `UpdateAsync`; that would silently activate inactive configs on edit

### Recommendations (POST /recommend)
- `RecommendRequest.PropertyAliases: IReadOnlyList<string>` — one or more property aliases to generate recommendations for in a single call; 400 returned if the list is empty or any alias is not found on the document type
- `RecommendResponse.RecommendedValues: Dictionary<string, string?>` — keyed by alias; null value means the AI returned nothing actionable for that field
- Backend validates all aliases against the document type first (before any AI call), pre-resolves schemas per alias, then loops a separate AI call per alias; empty-aliases 400 guard is placed **after** auth and config checks (not before) so authorization is enforced first
- `BuildPropertyEditorAliases(string documentTypeAlias)` — private controller helper; calls `_contentTypeService.Get(alias).CompositionPropertyTypes.ToDictionary(p => p.Alias, p => p.PropertyEditorAlias)`; returns empty dict when content type is not found
- **On a real site every core text/tag editor has a value schema** (`TextBox`/`TextArea`/`MarkdownEditor` → nullable string, `TextBox`/`TextArea` add `maxLength` when configured; `Tags` → array of strings; `RichText` → `{markup, blocks}` object), so the schema branch is the one that runs for them. The schema branch therefore also emits editor guidance via `AppendEditorGuidance`: plain text ("no HTML/markdown"), Markdown, Tags, plus "Keep the value to at most N characters" from `maxLength` (providers don't all enforce `maxLength` in structured outputs). The no-schema branches remain for third-party editors and failed schema lookups
- Recommend tests must use **real CMS schemas** from `tests/.../TestData/CmsValueSchemas.cs` (built from the actual CMS property editors), not `SupportsSchema(...) = false` stubs, which hid the schema branch; `CmsValueSchemaContractTests` fails if a CMS update changes a schema shape we rely on
- `BuildRecommendSystemPrompt` branches on editor type: schema-based → editor guidance + schema JSON prompt (never for rich text, see "Rich-text Apply"); `IsTagsEditor` → JSON array prompt (`{"recommendedValue": [...]}` with natural-language strings); `IsRichTextEditor` → clean HTML prompt; all others → plain text prompt
- `IsTagsEditor(string)` — matches `"Umbraco.Tags"` (case-insensitive)
- `IsRichTextEditor(string)` — matches `"Umbraco.RichText"` and `"Umbraco.TinyMCE"` (case-insensitive)
- Frontend `EvaluationReportElement` classifies properties with `_FULL_RECOMMEND_EDITORS` (`TextBox`, `TextArea`, `Markdown`, `Tags`, `RichText`, `TinyMCE` — full recommend + apply; rich-text Apply additionally requires the embedded-block safeguard, see "Rich-text Apply"). The old `_COPY_ONLY_EDITORS` set is gone
- `_canRecommend(alias)` and `_canApply(alias, recommended)` consult `propertyEditorAliases` first, then `_isAdditionalEditor(editorAlias)`, then fall back to a value-content heuristic (values starting with `{`, `[`, or `umb://` are treated as complex) when the map is unavailable
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
