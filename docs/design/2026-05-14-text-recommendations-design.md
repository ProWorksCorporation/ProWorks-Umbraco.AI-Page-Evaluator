# Text Recommendations Design

**Date:** 2026-05-14
**Branch:** feature/recommendation-for-text
**Status:** Approved

## Overview

Add on-demand AI text recommendations to the evaluation report modal. When a check item has a `propertyAlias` and its status is Fail or Warn, a "Generate recommendation" button appears. Clicking it calls a new `POST /recommend` endpoint and displays the result in the check item. The user can apply the recommended value directly to the Umbraco document workspace (immediate apply, no save required by the feature — the user still saves the document manually), regenerate, or copy.

---

## Section 1 — Feature Scope

**In scope:**
- On-demand recommendation generation per check item (button-triggered, not bundled with evaluation)
- Recommendations for any property editor, with best-effort JSON Schema constraints when available
- Immediate workspace apply: recommended value written to the in-memory document workspace via `applyValueChange()`
- Regenerate and Copy actions on the recommendation result
- Generate button visible only for Fail/Warn checks that have a non-null `propertyAlias`

**Out of scope:**
- Automatic recommendation generation at evaluation time
- Batch apply (apply all at once) — each item applies independently
- Recommendation history or undo beyond normal Umbraco workspace state
- Non-text property types (images, files) — schema fallback handles these gracefully but the AI output may not be meaningful

---

## Section 2 — CheckResult Extension

`CheckResult` gains a nullable `PropertyAlias` field declared by the AI in the evaluation response.

**C# (`CheckResult.cs`):**
```csharp
public sealed record CheckResult(
    int CheckNumber,
    CheckStatus Status,
    string Label,
    string? Explanation,
    string? PropertyAlias);
```

**TypeScript (`types.ts`):**
```ts
export interface CheckResult {
  checkNumber: number;
  status: 'pass' | 'fail' | 'warn';
  label: string;
  explanation?: string;
  propertyAlias: string | null;
}
```

**Evaluation system prompt update:**

The system prompt's JSON output format is extended to include `"propertyAlias"` per check:

```json
{
  "checks": [
    {
      "checkNumber": 1,
      "status": "fail",
      "label": "Meta description is missing",
      "explanation": "...",
      "propertyAlias": "metaDescription"
    }
  ]
}
```

The AI is instructed: set `propertyAlias` to the Umbraco property alias if the check maps to a specific editable property on the document; set it to `null` for structural or computed checks (e.g., "page has no H1") where no single property owns the value.

`TryParseJson()` in `PageEvaluationService` is updated to read `propertyAlias` from each check element (nullable string).

---

## Section 3 — Modal Context Threading

The evaluation modal must be able to consume `UMB_DOCUMENT_WORKSPACE_CONTEXT` to apply recommended values. This requires the modal to be opened with `umbOpenModal` (which threads the caller's context chain) rather than `modalManagerCtx.open`.

**Change in `page-evaluator-action.api.ts`:**
```ts
// Before
modalManagerCtx.open(this, EVALUATION_MODAL, { ... });

// After
umbOpenModal(this, EVALUATION_MODAL, { ... });
```

`EvaluationModalValue` stays `Record<string, never>` — the modal return value is unused since apply is immediate.

**In `evaluation-modal.element.ts`:**
```ts
this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (ctx) => {
  this._workspaceContext = ctx;
});
```

Apply is performed via the same adapter pattern as the Umbraco.AI Prompt addon:
```ts
adapter.applyValueChange(this._workspaceContext, {
  unique: this._workspaceContext.getUnique(),
  alias: propertyAlias,
  value: recommendedValue,
  variantId: currentVariantId,
});
```

---

## Section 4 — Recommend Endpoint

### Request / Response

```
POST /umbraco/api/v1/page-evaluator/recommend
Authorization: Bearer <token>
Content-Type: application/json

{
  "nodeId": "guid",
  "propertyAlias": "metaDescription",
  "checkLabel": "Meta description is missing",
  "checkExplanation": "No meta description was found...",
  "properties": {
    "pageTitle": "Home",
    "bodyText": "Welcome to..."
  }
}
```

```json
{ "recommendedValue": "string or structured object or null" }
```

### Server-Side Orchestration

1. Verify the content node exists and the caller has Browse permission (same guards as `POST /evaluate`).
2. Load the active evaluator config for the document type.
3. Resolve the property's data type:
   - `IContentTypeService.Get(content.ContentType.Alias)` → find property group/type with matching alias → get `DataTypeKey`
4. Schema lookup (two-step):
   - `IPropertyEditorSchemaService.SupportsSchema(editorAlias)` — synchronous check
   - If `true` → `await GetSchemaAsync(dataTypeKey)` → include `JsonObject` schema in AI prompt
   - If `false` → fall back: include editor alias + natural language description only
5. Build focused one-shot AI prompt via `IAIChatService` / `AIChatBuilder`:
   - `WithAlias("proworks-page-evaluator")`
   - `WithProfile(config.AIProfileId)`
   - `WithChatOptions(new ChatOptions { Temperature = 0.3f, ResponseFormat = ChatResponseFormat.Json, Tools = [], MaxOutputTokens = 2048 })`
   - System prompt: instructs AI to generate a replacement value for the specified field using the page content as context; includes schema (if available) as a format constraint
   - User message: check label + explanation + page properties (passed from client) + schema or editor type description
6. Parse response JSON → extract `recommendedValue`
7. Return `{ recommendedValue: object | null }`

### AI Prompt Structure (Recommend)

**System (with schema):**
> You are an SEO and content assistant. Generate a replacement value for the field described below. The value must conform to the provided JSON Schema. Return JSON: `{"recommendedValue": <value>}`.
> Field: {checkLabel}
> Schema: {jsonSchema}

**System (without schema — fallback):**
> You are an SEO and content assistant. Generate a replacement value for the field described below. The field uses the "{editorAlias}" editor. Return plain text wrapped in JSON: `{"recommendedValue": "<text>"}`.
> Field: {checkLabel}

**User message (both paths):**
> Issue: {checkExplanation}
> Current page content:
> {properties as key: value pairs}

### Error Responses

| Condition | Status |
|---|---|
| Node not found | 404 |
| No active config for document type | 404 |
| Property alias not found on document type | 400 |
| Guardrail blocked (`AIGuardrailBlockedException`) | 422 |
| AI provider HTTP error (`HttpRequestException`) | 502 |
| AI provider 5xx transient (type name ends `5xxException`) | 503 |
| Unexpected exception | 500 |

Rate limiting: `[EnableRateLimiting("PageEvaluatorEvaluate")]` (shared policy, 10 req/user/min).
Size limit: `[RequestSizeLimit(1 * 1024 * 1024)]`.

---

## Section 5 — Frontend UX

### Check Item States

Each check item with `propertyAlias != null` and status `fail` or `warn` cycles through four states:

| State | Display |
|---|---|
| **default** | "Generate recommendation" button (`uui-button look="secondary" compact`) |
| **generating** | `uui-loader` (3-dot bounce) + "Generating recommendation…" text; button hidden |
| **result** | Recommendation box with suggested value, Apply / Regenerate / Copy buttons |
| **applied** | Recommendation box with green left-border accent and "Applied to field" label; Apply button removed |

Pass-status checks and checks with `propertyAlias == null` show no generate button.

### Recommendation Box

```
┌─ violet-blue left border ────────────────────────┐
│ ✦ SUGGESTED VALUE                                │
│ Explore our Umbraco development services —       │
│ from custom builds to full CMS implementations.  │
│ [Apply to field]  [↺ Regenerate]  [⧉ Copy]      │
└──────────────────────────────────────────────────┘
```

After apply, left border turns forest-green and label changes to "✓ Applied to field"; Apply button is removed.

### UUI Components

| UI element | UUI component |
|---|---|
| Generate button | `<uui-button look="secondary" compact>` |
| Loading state | `<uui-loader>` |
| Apply button | `<uui-button look="primary" color="positive" compact>` |
| Regenerate / Copy | `<uui-button look="secondary" compact>` |
| Button group | `<uui-action-bar>` |
| Wand icon | `<uui-icon name="icon-wand">` |
| Sync icon | `<uui-icon name="icon-sync">` |
| Copy icon | `<uui-icon name="icon-clipboard-copy">` |

### Key CSS Tokens

- Rec box unreviewed: left border `var(--uui-color-default)` (#283a97 violet-blue)
- Rec box applied: left border `var(--uui-color-positive)` (#0b8152 forest-green)
- Generate button bg: `var(--uui-color-surface-alt)` (#f7f7f8)
- Apply button bg: `var(--uui-color-positive)`
- Button border-radius: `var(--uui-border-radius-3)` (15px)

---

## Section 6 — Data Flow Summary

```
[Workspace Action]
  umbOpenModal(this, EVALUATION_MODAL, ...)   ← threads workspace context chain
       │
[Evaluation Modal]
  consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT)
  GET /evaluate/cached/{nodeId} or POST /evaluate
       │ EvaluationReport (CheckResult[] with propertyAlias)
  render check list
       │
  [user clicks Generate on a check item]
       │
  POST /recommend { nodeId, propertyAlias, checkLabel, checkExplanation, properties }
       │ { recommendedValue }
  display rec box
       │
  [user clicks Apply]
       │
  adapter.applyValueChange(workspaceContext, { alias, value, variantId })
  → value written to in-memory workspace
  [user saves document manually]
```

---

## Section 7 — Files Changed

### New files
- `src/.../Client/src/evaluation-modal/recommendation-state.ts` — per-check recommendation state type (`idle | generating | result | applied`)

### Modified files

**C# server:**
- `Core/Evaluation/CheckResult.cs` — add `string? PropertyAlias`
- `Services/PageEvaluationService.cs` — extend system prompt + `TryParseJson()` for `propertyAlias`
- `Controllers/PageEvaluatorApiController.cs` — add `POST /recommend` action
- `Core/Recommend/` (new) — `RecommendRequest.cs`, `RecommendResponse.cs` (request/response models)

**TypeScript client:**
- `shared/types.ts` — add `propertyAlias: string | null` to `CheckResult`; add `RecommendRequest`, `RecommendResponse` types
- `evaluation-modal/evaluation-modal.element.ts` — consume `UMB_DOCUMENT_WORKSPACE_CONTEXT`; wire recommend call and apply
- `evaluation-modal/evaluation-report.element.ts` — render generate button, loading state, rec box per check item
- `workspace-action/page-evaluator-action.api.ts` — switch `modalManagerCtx.open` → `umbOpenModal`

**No schema changes** — `umbracoAIEvaluationCache` stores serialized `EvaluationReport`; adding `PropertyAlias` to `CheckResult` is additive; existing cached rows with `null` for the new field are valid.

---

## Open Questions / Decisions Made

| Question | Decision |
|---|---|
| When to generate recommendations | On-demand (button per check item) |
| Which checks get a Generate button | Fail + Warn checks with non-null `propertyAlias` |
| How AI declares the property alias | In the evaluation `CheckResult` JSON (AI sets it) |
| Apply mechanism | Immediate workspace apply via `applyValueChange()`; user saves manually |
| Context for recommendation AI | Client re-sends the page properties from the evaluation response |
| Property type scope | Any property; JSON Schema when available, fallback to editor alias otherwise |
| Schema lookup | `SupportsSchema(editorAlias)` first; `GetSchemaAsync(dataTypeKey)` only if true |
| Approach | Server-side full orchestration (Approach A) |
