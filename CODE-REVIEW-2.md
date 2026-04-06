# Code Review #2 — Umbraco CMS & Umbraco.AI Best Practices

**Date:** 2026-04-06
**Branch:** main (post-merge of 002-code-review-fixes)
**Scope:** Full codebase review — C# server, TypeScript client, Umbraco.AI source cross-reference, web research

---

## HIGH Priority — Umbraco.AI API Misuse

### 1. [X] Context resources: raw `Settings` serialized instead of using `ResolveDataAsync` + `FormatDataForLlm`

[COMPLETE April 6th]

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs` lines 284-293

The code serializes `resource.Settings` directly into the system prompt. But `Settings` is the **configuration object** (e.g., a text resource's settings might contain `{ "content": "Brand voice text..." }`), not the resolved content. The Umbraco.AI resource type system provides a two-step pipeline:

- `IAIContextResourceType.ResolveDataAsync(settings)` — converts settings into resolved data (e.g., fetching content from a URL, resolving a content picker)
- `IAIContextResourceType.FormatDataForLlm(data)` — formats that data for LLM consumption

By skipping both, the PageEvaluator injects raw JSON config objects rather than properly formatted content. For simple "text" resources where `TSettings == TData`, this may work by accident (the default `ResolveDataAsync` returns settings as-is, and `FormatDataForLlm` serializes to JSON). But for any other resource type (URL-based, content-picker-based, etc.), the injected context will be wrong.

**Fix:** Inject `AIContextResourceTypeCollection` and use the proper resolution pipeline:

```csharp
var resourceType = _resourceTypes.GetByResourceTypeId(resource.ResourceTypeId);
var data = await resourceType.ResolveDataAsync(resource.Settings, ct);
if (data is not null)
    sb.AppendLine(resourceType.FormatDataForLlm(data));
```

**Source:** Verified against `Umbraco.AI.Core/Contexts/ResourceTypes/AIContextResourceTypeBase.cs` and `IAIContextResourceType.cs`

---

### 2. [X] Dead element file: `page-evaluator-action.element.ts`

[COMPLETE April 6th]

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/workspace-action/page-evaluator-action.element.ts`

This entire file defines a `PageEvaluatorActionElement` custom element (`page-evaluator-action`) that is never imported, referenced, or registered in any manifest. The workspace action in `entry-point.ts` (line 50) uses an `api` loader pointing to `page-evaluator-action.api.ts`, not an `element` loader. No manifest references this element.

The file also duplicates logic from both `page-evaluator-action.api.ts` (property extraction) and `page-evaluator-active-config.condition.ts` (active-config check).

**Fix:** Delete the file entirely.

---

## MEDIUM Priority — Best Practice Issues

### 3. [X] `AIChatBuilder`: missing `.WithName()` for audit/telemetry

[COMPLETE April 6th — implemented alongside #1]

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs` lines 98-104

The builder call uses `.WithAlias("proworks-page-evaluator")` but not `.WithName()` or `.WithDescription()`. The `AIChatBuilder` supports these for display in Umbraco.AI's audit log and telemetry dashboard. Without them, the alias is used as the display name, which is less readable.

**Fix:** Add `.WithName("ProWorks Page Evaluator")` and optionally `.WithDescription("Evaluates page content against configured criteria")` to the builder chain.

**Source:** Verified against `Umbraco.AI.Core/InlineChat/AIInlineChatBuilder.cs` lines 67-82

---

### 4. [X] Several Lit components extend `LitElement` instead of `UmbLitElement`

[COMPLETE April 5th — switched 3 components to UmbLitElement, created en.ts localization file, registered localization manifest, replaced all hardcoded strings with this.localize.term() calls, deleted unused localization.ts]

**Files:**
- `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-report.element.ts` line 17
- `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-warning.element.ts` line 8
- `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts` line 68

`UmbLitElement` (from `@umbraco-cms/backoffice/lit-element`) provides localization via `UmbLocalizationController`, theme awareness, and proper controller host behavior for `consumeContext`. All backoffice components should use it as the base class.

**Fix:** Change `extends LitElement` to `extends UmbLitElement` and update the import.

---

### 5. `confirm()` used for delete instead of `UMB_CONFIRM_MODAL`

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-config-workspace.element.ts` line 112

Browser native `confirm()` is inconsistent with the Umbraco backoffice UX. Umbraco provides `UMB_CONFIRM_MODAL` for themed, localizable confirmation dialogs.

**Fix:**
```typescript
const modalManager = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
const result = await modalManager.open(this, UMB_CONFIRM_MODAL, {
  data: { headline: 'Delete Configuration', content: 'Are you sure...?' }
}).onSubmit();
```

---

### 6. DELETE endpoint returns 200 instead of 204 No Content

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs` line 196

```csharp
return Ok(new { message = "Deleted" });
```

REST convention and Umbraco Management API pattern is `NoContent()` for successful deletes.

**Fix:** Replace with `return NoContent();`

---

### 7. Version field claims concurrency but has no EF Core concurrency token

**Files:**
- `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/AIEvaluatorConfig.cs` line 53
- `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Factories/AIEvaluatorConfigEntityFactory.cs` line 64

The `Version` property is documented as "Used for optimistic concurrency and audit history" and is incremented on save, but neither `[ConcurrencyCheck]` nor `.IsConcurrencyToken()` is configured in EF Core. Two concurrent updates will silently overwrite each other.

**Fix:** Either add `.IsConcurrencyToken()` in `OnModelCreating` for the `Version` column, or update the XML doc to not claim optimistic concurrency.

---

### 8. Regex compiled on every call in `StripHtmlTags`

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs` line 247

```csharp
return Regex.Replace(input, "<[^>]+>", string.Empty).Trim();
```

This recompiles the regex on every property of every evaluation. On .NET 10, use `[GeneratedRegex]` or a `static readonly Regex` with `RegexOptions.Compiled`.

**Fix:**
```csharp
[GeneratedRegex("<[^>]+>")]
private static partial Regex HtmlTagRegex();

private static string StripHtmlTags(string input)
{
    if (!input.Contains('<'))
        return input;
    return HtmlTagRegex().Replace(input, string.Empty).Trim();
}
```

---

### 9. `BEARER` security constant duplicated in 3 files

**Files:**
- `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/api-client.ts` line 34
- `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts` line 10
- `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts` line 23

The `BEARER` security descriptor `[{ scheme: 'bearer', type: 'http' }]` is defined identically in three files.

**Fix:** Export from `api-client.ts` and import in the other two files.

---

### 10. Double API call on `PromptBuilderElement` mount

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts` lines 78-95

`connectedCallback` calls `_loadProperties()` when `documentTypeAlias` is set, then `updated()` fires again because the property changed, causing a duplicate fetch.

**Fix:** Remove the `connectedCallback` load and rely solely on `updated()`.

---

### 11. Localization module defined but unused

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/localization.ts`

Defines `LOCALIZATION_KEYS` and `DEFAULT_STRINGS` that are never imported. All user-facing strings are hardcoded English. The entry-point does not register any localization resources.

**Fix:** Either integrate with `UmbLocalizationController` (requires `UmbLitElement` base class per issue #4) or delete `localization.ts`.

---

## LOW Priority — Polish

### 12. `ActivateConfigurationAsync` relies on implicit `IsActive = true` side effect

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs` lines 170-178

Passes the existing config to `UpdateAsync` without explicitly setting `IsActive`. Works only because the service unconditionally sets `IsActive = true` in `UpdateAsync`. If the service logic changes, this endpoint silently breaks.

**Fix:** Either set `existing.IsActive = true` before calling `UpdateAsync`, or add a dedicated `ActivateAsync` method on the service.

---

### 13. Request DTOs lack `[Required]` annotations

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs` lines 388-426

`EvaluatePageRequest`, `CreateEvaluatorConfigRequest`, and `UpdateEvaluatorConfigRequest` have no data annotations. Adding `[Required]` would enable ASP.NET model validation for faster feedback and standard error shapes.

---

### 14. N+1 async calls in `GetConfigurationsAsync`

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs` lines 60-64

```csharp
foreach (AIEvaluatorConfig config in configs)
    items.Add(await ToResponseAsync(config, cancellationToken));
```

Each iteration triggers sequential `GetProfileAsync`/`GetContextAsync` calls. Could use `Task.WhenAll` for parallelization.

---

### 15. `checkResult` in `api-client.ts` reads response body twice

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/api-client.ts` lines 36-42

`response.text()` may return empty if `umbHttpClient` already consumed the body stream into `result.data`/`result.error`. Should check `result.error` first.

**Fix:**
```typescript
if (!result.response.ok) {
  const detail = result.error ? JSON.stringify(result.error) : `HTTP ${result.response.status}`;
  throw new Error(`API error: ${detail}`);
}
```

---

### 16. `EvaluationReport` is a `class` while sibling types are `record`

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluation/EvaluationReport.cs`

`EvaluationScore` and `CheckResult` are `record` types, but `EvaluationReport` is a `class` with `{ get; init; }` properties. Making it a `record` would provide structural equality, `ToString()`, and consistency.

---

### 17. `ApiErrorResponse` type defined but never used

**File:** `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/types.ts` lines 104-109

Dead code — remove it.

---

## What Was Done Well

- Correct use of `IAIChatService` with `AIChatBuilder` fluent pattern (non-obsolete overload)
- Prompt injection defense with defensive preamble in user messages
- Thorough cache invalidation on config mutations and content publish
- Proper `[ComposeAfter(typeof(UmbracoAIComposer))]` ordering
- `ControllerBase` instead of obsolete `UmbracoApiController`
- Correct authorization policies (`BackOfficeAccess` + `SectionAccessSettings`)
- EF Core patterns follow Umbraco conventions (`IEFCoreScopeProvider`, `AsNoTracking()`)
- All CLAUDE.md rules followed: Lit imports, workspace action `kind`, `umbHttpClient`, bearer security, menu alias
- Truncation detection via `ChatFinishReason.Length`
- Comprehensive test suite (72 tests)
- Clean entry-point pattern with proper manifest registration and cleanup
