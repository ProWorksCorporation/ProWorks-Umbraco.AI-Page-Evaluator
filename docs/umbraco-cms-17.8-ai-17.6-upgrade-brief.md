# Upgrade Brief: Umbraco CMS 17.6.2 → 17.8.0 and Umbraco.AI 17.3.4 → 17.6.1 (Page Evaluator)

**Purpose**: Input document for `/speckit.specify`. It covers moving ProWorks.Umbraco.AI.PageEvaluator from Umbraco CMS 17.6.2 / Umbraco.AI 17.3.4 to CMS **17.8.0** / Umbraco.AI **17.6.1**, and adopting the new platform features listed in §6. Write the spec from this document. Use §9 for user stories and acceptance criteria, and §10 for points to settle in `/speckit.clarify`.

**Suggested `/speckit.specify` input**: "Upgrade the Page Evaluator to Umbraco CMS 17.8.0 and Umbraco.AI 17.6.1 (package version 17.6.0), as described in docs/umbraco-cms-17.8-ai-17.6-upgrade-brief.md. Raise the package's minimum CMS and Umbraco.AI versions, fix the backoffice HTTP client network-error regression, warn admins when an AI profile's own system prompt will be sent with evaluator calls, show Umbraco.AI's AI disclosure notice, and move the e2e suite to Umbraco's new acceptance-test helpers. Source checkouts: C:\Repositories\Umbraco-CMS (17.6.2), C:\Repositories\Umbraco-CMS-v17-latest (17.8.0), C:\Repositories\Umbraco.AI (17.6.1)."

**Comparison basis** (all read-only analysis, 2026-11-02):

- **CMS**: `C:\Repositories\Umbraco-CMS-v17-latest`, `release-17.6.2..release-17.8.0`. That is 332 commits and includes 17.7.0, 17.7.1 and 17.7.2; the last merge is `be5247850ae`. `C:\Repositories\Umbraco-CMS` sits at 17.6.2.
- **Umbraco.AI**: `C:\Repositories\Umbraco.AI` monorepo, release `2026.10.12` (branch `review/17-latest`), compared using the per-product tags `Umbraco.AI@17.3.4..Umbraco.AI@17.6.1`, `Umbraco.AI.Prompt@17.2.3..@17.4.0`, and so on. The repo also has 18.x tags, which were ignored.
- **Client check**: a scratch copy of the client was installed with `@umbraco-cms/backoffice@17.8.0` and `@umbraco-ui/uui@2.1.1`, then typechecked and tested. Nothing in the repo was changed.

**Branch**: work is expected on `feature/17.8.0-upgrade` (already created, clean), or on the branch speckit creates from it.

---

## 1. Decisions already made (by the package owner, 2026-11-02)

| # | Decision | Notes |
|---|---|---|
| D1 | **Raise the minimum versions** to Umbraco CMS **17.8.0** and Umbraco.AI **17.6.1** | Neither platform forces this: Umbraco.AI 17.6.1 still accepts CMS `[17.5.0, 18)`, and every server API the package uses is unchanged. The floors are raised for one supported runtime, the CMS 17.7.x security fixes, and Umbraco.AI 17.4+ features without runtime feature checks. Sites on older versions get the existing hard NU1605 error and can stay on 17.3.1 until they upgrade. |
| D2 | **Package version 17.6.0** | Follows the versioning policy: the package version tracks the Umbraco.AI minor it targets. |
| D3 | **Warn about profile system prompts and test that they don't break parsing.** If the live scenario shows a profile prompt distorting results, **add precedence wording** to the evaluator's prompts | See §5.1 and §6.1. The precedence wording is conditional on the live result, and it is a fix, not a documented limitation. |
| D4 | **Adopt** the e2e migration to `@umbraco-cms/acceptance-test-helpers`, the AI disclosure notice, and verification of Content/Media context resources | See §6. |
| D5 | **Scope**: an upgrade, plus new platform features where they replace a package workaround or are listed in D4 | Features that are still unavailable (§7) stay as workarounds. |

## 2. Overall risk: LOW–MEDIUM

- **One breaking change** (client): the regenerated backoffice HTTP client no longer rejects on network failure (§4, R6). `npm run typecheck` fails with 5 × TS2322 in `shared/api-client.ts`, and the network-failure unit test fails. This was reproduced against 17.8.0.
- **One build break when the floor is raised** (server): EF Core moves from 10.0.10 to 10.0.12 (§4, R2).
- **One Umbraco.AI behaviour change** that can change evaluation output: profile system prompts are now sent (§5.1).
- Everything else is version bumps plus regression checks.

**Existing users are affected too**: a site running the released **17.3.1** on a CMS 17.8 runtime has the R6 bug today. A network drop during evaluate or recommend shows a raw `TypeError` instead of the localized "network error" message. This only affects the failure path.

## 3. Version targets

| Item | Current | Target | Where |
|---|---|---|---|
| Package version | 17.3.1 | **17.6.0** | RCL `<Version>`, client `package.json` + `package-lock.json`, `wwwroot/umbraco-package.json` (enforced by `tests/unit/version-sync.test.ts`) |
| RCL CMS references: `Umbraco.Cms` meta (with `ExcludeAssets="build;buildTransitive"`), `Umbraco.Cms.Api.Management`, `Persistence.EFCore`, `.Sqlite`, `.SqlServer` | `[17.6.2, 18.0.0)` | **`[17.8.0, 18.0.0)`** | RCL csproj. Keep the `Umbraco.Cms` floor equal to the sub-package floors |
| RCL `Umbraco.AI.Core`, `Umbraco.AI.Startup` | `[17.3.4, 18.0.0)` | **`[17.6.1, 18.0.0)`** | RCL csproj, and Core/Persistence projects if they reference them |
| EF Core (`Microsoft.EntityFrameworkCore*`, `.Sqlite`, `.SqlServer`, `.Design`) | 10.0.10 | **10.0.12** | RCL, Persistence, Persistence.Sqlite, Persistence.SqlServer, TestSite (`.Design`), the test project, and the local `dotnet-ef` tool version in the CLAUDE.md commands |
| `Microsoft.Extensions.AI`, `.Abstractions`, `.OpenAI` | 10.7.0 | **10.7.0 (unchanged)** | CMS 17.8.0 doesn't reference Microsoft.Extensions.AI. Umbraco.AI 17.6.1 still requires `[10.7.0, 11)`, and Microsoft.Agents.AI 1.18 requires 10.7.0 |
| TestSite `Umbraco.Cms`, `Umbraco.Cms.DevelopmentMode.Backoffice` | 17.6.2 | **17.8.0** | exact versions |
| TestSite `Umbraco.AI` (meta) / `Umbraco.AI.Startup` | 17.3.5 / 17.3.5 | **17.6.1 / 17.6.1** | The meta-package pins Startup to exactly `[17.6.1]`. Set the explicit Startup reference to 17.6.1 or remove it |
| TestSite `Umbraco.AI.Agent` | 17.1.7 | **17.4.1** | Requires Startup ≥ 17.6.1 |
| TestSite `Umbraco.AI.Agent.Copilot` | 17.0.5 | **17.2.0** | Requires Agent.UI ≥ 17.3.0, which requires Agent ≥ 17.4.0 |
| TestSite `Umbraco.AI.Prompt` | 17.2.3 | **17.4.0** | Requires Startup ≥ 17.6.0 |
| TestSite `Umbraco.AI.Anthropic` | 17.1.0 | **17.1.3** | Requires Core ≥ 17.6.0. Anthropic SDK `[12.29.1, 13)` is unchanged |
| TestSite `Umbraco.AI.OpenAI` | 17.2.0 | **17.3.1** | Requires Core ≥ 17.6.0 |
| TestSite `uSync` | 17.3.5 | **latest uSync 17.x that supports CMS 17.8.0** | Not researched. Verify on NuGet, then re-run Settings → uSync → Import All |
| Test project CMS / Umbraco.AI | 17.6.2 / 17.3.4 | **17.8.0 / 17.6.1** | The test project stays on the package floor so tests exercise the minimum (existing policy) |
| npm devDependency `@umbraco-cms/backoffice` | `~17.6.2` | **`~17.8.0`** | Keep it pinned to the floor so the typings match the minimum runtime |
| npm `@umbraco-ui/uui` | `^2.0.2` | **`^2.1.1`** | Backoffice 17.8.0 peers `^2.1.1` |
| npm `@umbraco-ai/core` | `^17.3.4` (lock resolves 17.3.5) | **`^17.6.1`** | 17.6.1 is published and peers `@umbraco-cms/backoffice ^17.4.0` |
| npm peers | backoffice `>=17.6.2 <18`, uui `>=2.0.2 <3`, `@umbraco-ai/core` `>=17.3.4 <18` | backoffice **`>=17.8.0 <18`**, uui **`>=2.1.1 <3`**, `@umbraco-ai/core` **`>=17.6.1 <18`** | |
| e2e helpers | `@umbraco/playwright-testhelpers ^17.0.0-beta.1`, `@umbraco/json-models-builders ^2.0.45` (both now deprecated on npm) | **`@umbraco-cms/acceptance-test-helpers ~17.8.0`** | §6.3 |
| Node / npm / TypeScript / Lit / Vite | ≥24.13 / ≥11 / 5.9 / 3.x / 7.x | unchanged | The backoffice still declares the same `engines` and TypeScript 5.9.3 |

**Publication check (verified 2026-11-02)**: `Umbraco.Cms` 17.8.0 is on NuGet, and its `Umbraco.Cms.Persistence.EFCore` nuspec depends on EF Core **10.0.12**, which confirms R2. `@umbraco-cms/acceptance-test-helpers@17.8.0` is on npm (published 2026-10-29). The latest uSync 17.x on NuGet is **17.5.2**; check that it supports CMS 17.8.0 before adopting it.

## 4. Required changes

**R1. NuGet floors and TestSite/test versions.** Apply the targets in §3. Update the csproj comments that mention 17.6.2 and 17.3.4.

**R2. EF Core 10.0.10 → 10.0.12.** Once the CMS floor is `[17.8.0, …)`, the package's own lower direct EF Core references become **NU1605 (package downgrade)**, which is an error by default. Bump every direct `Microsoft.EntityFrameworkCore*` reference listed in §3. A patch bump shouldn't need migrations regenerated. Confirm that the SQLite and SQL Server migrations still apply on a fresh database and on an upgraded one.

**R3. Fix `shared/api-client.ts` for the regenerated HTTP client (breaking).** In 17.8.0 (`core/backend-api/client/client.gen.ts`, commit `369c559ea9b`, `@hey-api/openapi-ts` peer ≥ 0.99.0), a fetch failure or request-build error with `throwOnError: false` now **returns** `{ error, response: undefined }` instead of rejecting. `response` is typed `response?: Response`. As a result:
- `ApiResult.response: Response` (`api-client.ts:63`) fails typecheck at lines 198, 213, 223, 235 and 257.
- At runtime, `send()` (`:89`) never sees the `TypeError`, so `checkResult` (`:81`) and the 404 checks (`:132`, `:204`) crash on `result.response.ok` / `.status`.

Fix: make `response` optional and have `send()` convert "no response" into `ApiError(0, …, null, 'NetworkError')`. Keep the existing reject→`NetworkError` path too, as cheap protection; it doesn't widen the support range. Update the network-failure unit/MSW tests for both shapes, and update the CLAUDE.md "Management API Client" section. `umbHttpClient` itself is still created with `throwOnError: true`, and every call must keep passing `throwOnError: false`.

**R4. TestSite SQLite connection string.** CMS 17.8 strips `Cache=Shared` from Umbraco's SQLite connection string and logs an Information message at startup (`652fc6791af`). It also changes `Mode=ReadWriteCreate` to `ReadWrite`. Remove `Cache=Shared` from `appsettings.Development.json` (around line 21). The evaluator's DbContext shares Umbraco's connection, so it is affected too.

**R5. Versioning and release notes.** Set 17.6.0 in all four version locations. Write `PackageReleaseNotes`, `README.md`, and `README.nuget.md` covering:
- the new minimums and that NU1605 is expected on older sites
- the profile system prompt behaviour (§5.1)
- the disclosure notice
- the network-error fix

**R6. CLAUDE.md** (new revision). Update:
- Active Technologies versions, and the TestSite note: Agent 17.4.1 needs Startup ≥ 17.6.1, replacing the old "17.3.5 because of Agent 17.1.7" reason
- the EF Core 10.0.12 rule
- the `umbHttpClient` network-error behaviour
- the e2e helper section
- the profile system prompt middleware
- the disclosure notice
- the `AddAuditLogFeatureAlias` note (the audit log now shows our aliases)
- the undocumented `PageEvaluatorTestFeature`, which the Umbraco.AI analysis found exists in `Tests/PageEvaluatorTestFeature.cs` but isn't described

## 5. Behaviour changes to regression-test

### 5.1 Profile system prompt is now sent with every call (Umbraco.AI 17.5.0) — handled by §6.1

`AIProfileSystemPromptChatMiddleware` (`Umbraco.AI.Core/Chat/Middleware/AIProfileSystemPromptChatMiddleware.cs`, commit `8c48786`) prepends the profile's `AIChatProfileSettings.SystemPromptTemplate` as the **first** system message on every chat call through that profile, inline chat (`IAIChatService`) included. Before 17.5.0 it was never sent.

Notes:
- It is registered outermost.
- Context resources are merged into that same first system message.
- It can only be switched off **site-wide**, with `builder.AIChatMiddleware().Remove<AIProfileSystemPromptChatMiddleware>()`. That also affects Copilot, Prompt and agents, so the package must **not** remove it.

The consequence: a profile prompt such as "reply in a friendly, conversational tone" now precedes the evaluator's "JSON only" instructions and the defensive preamble. That can change report and recommendation output. Where the provider enforces the response schema (FR-017), the risk is mostly to the *content* of the report. On the no-schema fallback path (`IStructuredOutputSupportCache` hit, or editor schemas that aren't strict-representable), it can also break JSON parsing.

Also, Anthropic 17.1.3 now puts its prompt-cache marker on the first system message, which becomes the profile prompt. This is a cost effect only, and it is inferred rather than measured.

### 5.2 Other regression checks (no code change expected)

1. **Blocks resolved under `VariationContext`** (`9da05a846d1`). Block element variance now follows the culture of the owning property, read from `VariationContextAccessor.VariationContext.Culture`. `CultureAwareContentPropertyResolver` sets that context, so block and RTE-block output for culture-varying properties may differ slightly from 17.6.2. This is probably an improvement. **Verify** with the multilingual test page: the Danish `introText` block on `3e4f5a6b-…` should evaluate, recommend and Apply (with the placeholder safeguard) correctly.
2. **Preview access on the `GetById(preview: true)` fallback** (security fix, merge `45f784c8455`, new `IPreviewAccessEvaluator`). A draft is served only if the user behind the *website preview cookie* may browse it; with no preview session, everything is allowed. Management API calls normally have no preview identity, and the controller already enforces Browse. **Verify** that evaluating a culture that exists but isn't published still resolves draft values.
3. **Backoffice validation refactor and "keep the server-assigned key after create"** (`727de18549d`, `b9d4b375292`). These could affect validation messages after Apply's `setPropertyValue`. **Re-run** the Apply e2e specs, including Tags and rich text.
4. **`UmbracoApplicationStartedNotification` during unattended upgrade** is now wrapped in try/catch by `UnattendedUpgradeBackgroundService` (`25f5ab69d0a`). That is a safety net, not a replacement: **keep** the issue #25 runtime-level guards in `CacheInvalidationRules.InvalidateSafelyAsync`.
5. **Tags editor**: pasting comma- or newline-separated text now splits it into tags, the same rule as the package's `toTagArray` (`f7f168d19e8`). The value is still `string[]`, so Apply is unaffected. Keep `toTagArray`, because Apply writes the value directly and never goes through paste.
6. **Localization registry**: a localization file that fails to load is now logged and skipped instead of breaking the session. No impact; all ten package language files should still load.
7. **Audit log** (Umbraco.AI 17.6.0, migration `AddAuditLogFeatureAlias`): the AI audit log now shows `proworks-page-evaluator` and `proworks-page-evaluator-recommend` as the feature alias. **Verify** this and mention it in the README. Usage statistics still don't break down by feature, so the CLAUDE.md note stays.
8. **OpenAI 17.3.1** now recognises GPT-6 Luna and GPT-5.6 as reasoning models. `SamplingSupportService` picks that up automatically. **Verify** that the "scores may vary" notice appears for such a model if one is configured.
9. **Standard regression pass** (same as previous upgrades):
   - Evaluate Page action visibility for both condition paths (active-config and no-config/About Us)
   - modal: cached read, Re-run, guardrail 422, the four error buckets, gateway timeout/unreachable
   - Add-ons menu (`Uai.Menu.Addons` is unchanged)
   - config workspace, including the 409 concurrency path and cache invalidation on config change and on publish/unpublish
   - multilingual evaluate/recommend/Apply/cache per culture
   - unattended install on a fresh site, where the issue #25 scenario must not recur

## 6. New platform features to adopt (in scope, D3/D4)

### 6.1 Profile system prompt warning and parsing resilience (P2)

- **Admin warning**: when an administrator selects or views an AI profile in the evaluator config form (`evaluator-config/evaluator-form.element.ts`) and that profile has a non-empty `SystemPromptTemplate`, show an inline notice. The notice should explain that the profile's own instructions are sent ahead of the evaluator's and may change or break results, and suggest a dedicated profile with no system prompt for the evaluator.
  - Use the existing inline-notice pattern (`role="status"` + `icon-info`, `--uui-color-warning*`). Localize it in all ten language files.
  - The form already fetches per-profile data through `refreshSamplingSupport(profileId)` → `GET /profiles/{profileId}/sampling-support` (`SectionAccessSettings`). The builder may extend that response, for example with `hasSystemPrompt: boolean`, or add a sibling endpoint. The response should say **whether** a prompt exists rather than return the prompt text (builder's call; see §10).
- **Parsing resilience tests**: automated server tests showing that evaluate and recommend responses still parse when the model adds prose before or after the JSON, or wraps it in a code fence. That's the realistic failure mode when a conflicting profile prompt is present on the no-schema path. Use the existing `TryParseJson → TryParseMarkdown → Failed` chain. If a realistic case fails, harden the parser.
- **Live validation scenario** (quickstart/manual, not CI, because it depends on the LLM): on the TestSite, give the evaluator's profile a conflicting system prompt. Confirm that evaluate and recommend still return parsed results on Anthropic and OpenAI with schema enforcement on, and record what happens on the no-schema fallback path. Include at least these conflicting prompts:
- a tone instruction ("reply in a friendly, conversational tone")
- a language instruction ("always reply in English") against a Danish (`da-DK`) recommendation
- a format instruction ("answer in prose, never JSON")
- **If distortion is found** (`Owner decision`, see D3), meaning no parseable JSON, the recommendation language overridden, or tone leaking into report text: add precedence wording to the evaluate system prompt (`BuildSystemPromptAsync`) and to the recommend prompts (`BuildRecommendSystemPrompt`). The wording says the package's output-format and language rules override any earlier instructions. Keep it short, and put it with the existing defensive preamble.
  - This changes the prompt for **every** site, including those whose profiles have no system prompt. Re-run the live evaluate/recommend validation on Anthropic and OpenAI without a profile prompt to confirm there's no regression.
  - Update any server tests that assert on prompt text.
  - Keep the camelCase scoring field names and the scoring snippet in `PromptBuilderElement` consistent.
- Fixing a distortion found this way is release-blocking for 17.6.0. A distortion the precedence wording can't fix goes into README and quickstart as a known limitation.

### 6.2 AI disclosure notice (P3)

Umbraco.AI 17.4.0 added `<uai-disclosure-notice location="…">` (`Umbraco.AI.Web.StaticAssets/Client/src/disclosure/components/disclosure-notice.element.ts`). It follows the site-wide `AISettings.DisclosureNoticeMode` setting (Always / Dismissible / Off). Dismissal is remembered **per `location`**, and the element is styled with `--uai-disclosure-notice-background`, `-padding` and `-border-radius`.

Show it in the evaluation report modal and where recommendations are shown. The builder chooses the `location` value(s), for example one shared `proworks-page-evaluator` so a single dismissal covers both, and the exact placement. Import or registration follows how the package already uses `<uai-profile-picker>` from `@umbraco-ai/core`. The floor of 17.6.1 (D1) means no runtime feature check is needed. With mode Off, nothing renders. The element reads the global `UAI_DISCLOSURE_CONTEXT`, so it works inside the package's modal. **Umbraco.AI's default mode is `Always`**, so editors will see the notice after upgrading unless the site changes the setting. Say so in the release notes and README, including how to turn it off or make it dismissible.

### 6.3 Move the e2e suite to `@umbraco-cms/acceptance-test-helpers` (P3)

Since 17.6.2, CMS acceptance tests use the in-repo `@umbraco-cms/acceptance-test-helpers`. It is published on npm at 17.8.0 under the `@umbraco-cms` scope; its README wrongly says `@umbraco/acceptance-test-helpers`, which returns 404. It bundles the `test` fixture, `ConstantHelper`, `UiHelpers` and builders (`DocumentBuilder`, `DocumentTypeBuilder`, …). It doesn't depend on the now-deprecated `@umbraco/playwright-testhelpers` or `@umbraco/json-models-builders`.

Its `umbracoApi` fixture uses the same mechanism as the package's workaround: `Bearer [redacted]` plus context cookies, a refresh POST, and `storageState` (`lib/helpers/ApiHelpers.ts:119-122,253-267`). So it should work with CMS 17's HttpOnly cookies, and `tests/e2e/management-api.ts` (`ManagementApi`) could be retired. Its comment calling the helper package "unpublished" is wrong.

**Gate**: when the helper's refresh fails, it falls back to a full password login. With the TestSite's `AllowConcurrentLogins: false`, that may sign out other sessions. Retire `management-api.ts` only if the helper fixture runs the whole suite reliably with a dedicated automation user. Otherwise move to the new package for UI helpers and builders and keep `ManagementApi` (§10). Update `playwright.config.ts`, `tests/e2e/auth.setup.ts`, and the CLAUDE.md e2e notes. Existing specs, such as `tags-apply.spec.ts` with its create/delete-in-`finally` data, must keep passing.

### 6.4 Verify Content/Media context resources (P3)

Umbraco.AI 17.4.0 added context resource types that pull in live CMS content or media, gated by the acting user's permissions. The package passes contexts through generically, via `ProcessResourceForLlmAsync` and `<uai-context-picker>`, so no code change is expected. `ProcessResourceForLlmAsync` runs the resource type's `ResolveDataAsync`, and for a user without access `ContentResourceType` returns `null` rather than throwing. Add a check, e2e or a documented quickstart scenario, that an evaluator config whose profile or context includes a Content resource evaluates successfully. It should also confirm that an editor without access to that content gets no leaked content and no error. The context picker gained an optional `readonlyHint`, which is not needed.

## 7. Workarounds that must stay (no platform replacement exists in 17.8.0 / 17.6.1)

| Package workaround | Why it stays | Evidence |
|---|---|---|
| `shared/apply-value.ts` instead of Umbraco.AI's `applyValueChange` | Still culture-blind (`values.find(v => v.alias === …)`) and its default value preparer still `JSON.parse`s plain strings | `document.adapter.ts:337-347`, `value-preparers/resolver.ts:43-45` |
| `SchemaRejectionClassifier` + `IStructuredOutputSupportCache` | Umbraco.AI has no public structured-output capability check. The core error classifier and provider error codes are unchanged | grep for StructuredOutput/SupportsJsonSchema finds nothing new |
| `StrictSchemaCompatibility.IsStrictRepresentable` (copy of Prompt's rule) | `AIPromptSchemaCompatibility` is unchanged between Prompt 17.2.3 and 17.4.0, so the copy is still accurate | no commits on the file |
| `role="status"` inline notices | Neither CMS 17.8.0 nor UUI 2.1.1 adds an alert/callout element; the only new generic element is `umb-separator` | UUI `custom-elements.json` tag diff is empty |
| Culture from `splitView.getActiveVariants()[0]` | `UmbVariantResolver` (now exported) reads `UMB_VARIANT_CONTEXT`, which resolves to the UI language outside a property dataset. `UmbDocumentCurrentVariantResolver` is not public | `core/variant/variant-resolver.ts` |
| Scoring via the evaluator prompt | Umbraco.AI 17.6.0's Decision capability (yes/no, pick-one and score questions with typed answers) is `[Experimental("UMBRACOAI_DECISION")]`, behind `Umbraco:AI:Experimental:Decision`, and only the TypeSafe provider implements it | Out of scope; could be a future spec |

## 8. Verified unchanged — no action (evidence summary)

**CMS server, 17.6.2 → 17.8.0**:
- `IApiContentBuilder` and its singleton registration (`UmbracoBuilder.CoreServices.cs:506`), so the `CycleDetectingApiContentBuilder` decorator is still safe
- `IOutputExpansionStrategy(Accessor)`
- `IPublishedContentCache.GetById` (interface)
- `IVariationContextAccessor` / `HybridVariationContextAccessor`
- `ILanguageService`, `IContentTypeService.CompositionPropertyTypes`
- `IContentService.GetById`; its new default-implemented `Move` overload is harmless to NSubstitute mocks
- `IsCultureAvailable`, `GetUserKey()`; culture casing is now canonical, which the package's case-insensitive handling already covers
- value schemas for TextBox, TextArea, Markdown, Tags and RichText, so `CmsValueSchemas.cs` and `CmsValueSchemaContractTests` stay valid
- `ContentPublishedNotification.PublishedCultures` / `ContentUnpublishedNotification.UnpublishedCultures`
- `IRuntimeState` / `RuntimeLevel`
- `AddUmbracoDbContext(shareUmbracoConnection)`
- `AuthorizationPolicies`, `ContentPermissionResource`, `ActionBrowse`
- `ComposeAfter`
- `HideBackOfficeTokensHandler`
- Delivery API rich-text parser: `data-content-id` and block placeholders unchanged
- `PackageManifestCacheBuster` (`?umb__rnd=` rule still applies)
- no rate limiter registered by CMS, so the `UseRateLimiter()` guidance stands
- about 60 new `[Obsolete]` attributes, none used by the package, and `TreatWarningsAsErrors` is off
- Management API v1.1 versioning added, with no impact on the package's v1 routes

**CMS client**:
- `UMB_DOCUMENT_WORKSPACE_CONTEXT` (`splitView.getActiveVariants`, `getVariesByCulture`, `setPropertyValue(alias, value, UmbVariantId)`, `structure.*`)
- `UmbVariantId`, `UmbLitElement`, `UmbConditionBase`, `UmbWorkspaceActionBase`, `UmbModalBaseElement`/`umbOpenModal`/`umbConfirmModal`
- workspace action `kind: 'default'` and the other manifest types
- API error interceptor: `isProblemDetailsLike`, the 404 rebuild, the GatewayTimeout/GatewayUnreachable status rewrites. Rebuilt responses now also keep `Umb-*` headers
- localization culture codes, with no new languages
- the rich-text `{ markup, blocks }` value and `<umb-rte-block>`/`<umb-rte-block-inline>` placeholders
- the Tags value `string[]`
- `package.json` exports and the import map
- the UUI v1 compatibility shims from 17.6.1, still present
- all 17 UUI components and 39 `--uui-*` custom properties the package uses still exist in UUI 2.1.1
- about 30 new deprecations, none used by the package
- lint passes against 17.8.0 typings

**Umbraco.AI 17.3.4 → 17.6.1**:
- `IAIChatService`
- `AIChatBuilder`, including the private `_alias`/`_chatOptions`/`_outputSchema` fields read by the tests' reflection
- `AIOutputSchema.FromJsonSchema`
- options-override middleware: still `ResponseFormat = override ?? options`, so keep `ResponseFormat = null`
- `AIProviderException` / `AIProviderErrorInfo` / `AIProviderErrorCategory`, with no new categories
- `AIErrorClassifyingChatClient` cancellation handling
- `AIGuardrailBlockedException`; blocked calls are now also recorded as "Blocked" in usage
- `IAIProfileService`, `IAIContextService`
- the `AIProviderCollection…GetSettingsSupport` sampling capability path
- `UmbracoAIComposer` namespace
- `$`-config default-deny resolver
- `Uai.Menu.Addons`
- the `@umbraco-ai/core` exports and pickers the package uses
- no API-compat suppressions touch the package's APIs
- consumers get new Umbraco.AI EF migrations that run automatically at startup, with no config changes

## 9. Suggested user stories and acceptance criteria

**US1 (P1): Existing behaviour survives the upgrade.** Editors evaluate (fresh and cached), recommend, Apply/Copy, and see localized error states, all unchanged, on CMS 17.8.0 / Umbraco.AI 17.6.1, including multilingual pages and embedded RTE blocks.
- AC: the full §5.2 regression pass, `dotnet test` green, client `typecheck && lint && test` green against 17.8.0 typings, and the e2e suite green.

**US2 (P1): Installation and upgrade are safe.**
- The package installs on a CMS 17.8.0 / Umbraco.AI 17.6.1 site.
- Installing on an older site fails with NU1605 rather than mixing versions (QS-21-style check against a 17.7.x scratch site).
- An unattended fresh install with a content-publishing starter kit succeeds (issue #25 scenario).
- Existing evaluator configs and cache rows survive, with migrations applying on SQLite and SQL Server.
- No NU1605 or other new warnings in the package's own build.

**US3 (P1): Network failures show the right message on 17.8.**
- AC: with the network dropped mid-request, evaluate, recommend, cached read and config calls show the localized network-error message, never a raw `TypeError`.
- AC: unit/MSW tests cover the 17.8 "returned without a response" shape.

**US4 (P2): Admins are warned about profile system prompts.**
- AC: choosing a profile with a system prompt shows the localized notice. Choosing one without shows nothing. The notice is in all ten languages.
- AC: parsing-resilience tests pass.
- AC: the live scenario in §6.1 is recorded in quickstart.
- AC: with a profile prompt saying "always reply in English", a recommendation for a `da-DK` property still comes back in Danish. If precedence wording was needed to get there, the evaluate and recommend live validation without a profile prompt shows no regression.

**US5 (P3): AI disclosure notice.**
- AC: with mode Always, the notice shows in the report and recommendation UI.
- AC: with Dismissible, it can be dismissed and stays dismissed at that location.
- AC: with Off, nothing renders.

**US6 (P3): Modern e2e tooling.**
- AC: Playwright specs run on `@umbraco-cms/acceptance-test-helpers ~17.8.0`, and the deprecated packages are removed.
- AC: `management-api.ts` is retired if the §6.3 gate passes; otherwise the reason is documented.
- AC: `npm install` prints no deprecation notices for these packages.

**US7 (P3): Content/Media context resources work.** AC as in §6.4.

**Documentation**: README, README.nuget and CLAUDE.md are updated (R5, R6), and the version-sync test passes at 17.6.0.

## 10. Open points for `/speckit.clarify` (minor, builder's calls unless changed)

These are the calls I made in this brief. Override any during clarify.

1. **Profile prompt notice placement and data**: the notice appears in the evaluator config form only, not in the config list or the editor's modal. The server returns a boolean `hasSystemPrompt`, never the prompt text. A profile edited *after* the config was saved is caught the next time an admin opens that config.
2. **Disclosure `location`**: a single location value shared by the report and the recommendation UI, so one dismissal covers both.
3. **e2e fallback**: if the new helper's `umbracoApi` fixture can't coexist with `AllowConcurrentLogins: false`, use the new package for UI helpers and builders and keep `ManagementApi`.
4. **No 17.3.2 hotfix**: the network-error fix (R3) ships only in 17.6.0. Sites on CMS 17.8 that keep 17.3.1 keep the raw-`TypeError` behaviour on network drops. A 17.3.2 patch with the same fix is possible if wanted.
5. **Live-LLM checks** (§6.1 live scenario, §5.2 item 8) are quickstart/manual validation, not CI gates.
