# High-Severity Issue Fixes (CODE-REVIEW-3 Issues 11-19) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 9 high-severity issues surfaced in CODE-REVIEW-3 — 5 TypeScript client bugs and 4 C# server bugs — without introducing regressions.

**Architecture:** TypeScript tasks (1-5) target Lit web components in the Client project; C# tasks (6-9) target `PageEvaluationService`, `EvaluationReport`, and the config repository/service/controller. Every C# change has a corresponding xUnit test. TypeScript changes are verified by `npm run build` (TypeScript strict compilation) plus manual browser smoke-testing.

**Tech Stack:** TypeScript 5.x strict, Lit 3.x via `@umbraco-cms/backoffice/external/lit`, C# .NET 10, xUnit, NSubstitute, EF Core 10

---

## File Map

| File | Change |
|------|--------|
| `src/.../Client/src/prompt-builder/prompt-builder.element.ts` | Task 1 — add `disconnectedCallback` |
| `src/.../Client/src/evaluation-modal/evaluation-modal.element.ts` | Task 2 — add `isConnected` guards |
| `src/.../Client/src/evaluator-config/evaluator-form.element.ts` | Tasks 3, 4 — reset aliases; try/catch `_loadConfig` |
| `src/.../Client/src/evaluation-modal/evaluation-warning.element.ts` | Task 5 — localize suffix |
| `src/.../Client/src/localization/en.ts` | Task 5 — add `parseFailedSuffix` key |
| `src/.../PageEvaluator/Services/PageEvaluationService.cs` | Tasks 6, 7 — unified `ParseCheckStatus`; camelCase scoring fields |
| `src/.../PageEvaluator.Core/Evaluation/EvaluationReport.cs` | Task 8 — convert to `record` |
| `tests/.../Evaluation/EvaluationReportTests.cs` | Task 8 — update for `record` equality |
| `tests/.../Services/PageEvaluationServiceTests.cs` | Tasks 6, 7 — new tests for case-insensitive parse and camelCase keys |
| `src/.../PageEvaluator.Core/Evaluators/IAIEvaluatorConfigRepository.cs` | Task 9 — add `SetActiveAsync` |
| `src/.../PageEvaluator.Core/Evaluators/IAIEvaluatorConfigService.cs` | Task 9 — add `SetActiveAsync` |
| `src/.../PageEvaluator/Services/AIEvaluatorConfigService.cs` | Task 9 — implement `SetActiveAsync` |
| `src/.../Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs` | Task 9 — implement `SetActiveAsync` |
| `src/.../PageEvaluator/Controllers/PageEvaluatorApiController.cs` | Task 9 — use `SetActiveAsync` in `ActivateConfigurationAsync` |
| `tests/.../Services/AIEvaluatorConfigServiceTests.cs` | Task 9 — test `SetActiveAsync` |
| `tests/.../Controllers/PageEvaluatorApiControllerTests.cs` | Task 9 — test `ActivateConfigurationAsync` uses `SetActiveAsync` |

---

## Task 1 (Issue 11): Fix Event Listener Leak in PromptBuilderElement

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts:79-87`

**Problem:** `connectedCallback` (line 82-87) attaches `'category-toggle'` and `'use-prompt'` listeners on `this`. There is no `disconnectedCallback` to remove them, causing duplicate handlers if the element is re-connected.

- [ ] **Step 1: Add `disconnectedCallback` to remove listeners**

The handlers must be stored as bound references so they can be removed. Replace the inline lambdas in `connectedCallback` with named arrow fields, and add `disconnectedCallback`:

```typescript
// After the @state() declarations and before connectedCallback, add two private fields:
private readonly _onCategoryToggle = (e: Event): void => {
  const { id, selected } = (e as CustomEvent<{ id: string; selected: boolean }>).detail;
  this._toggleCategory(id, selected);
};

private readonly _onUsePrompt = (): void => this.usePrompt();
```

Then update `connectedCallback` and add `disconnectedCallback`:

```typescript
override connectedCallback(): void {
  super.connectedCallback();
  this.addEventListener('category-toggle', this._onCategoryToggle);
  this.addEventListener('use-prompt', this._onUsePrompt);
}

override disconnectedCallback(): void {
  super.disconnectedCallback();
  this.removeEventListener('category-toggle', this._onCategoryToggle);
  this.removeEventListener('use-prompt', this._onUsePrompt);
}
```

The two private fields should be inserted between `@state() private _error: string | null = null;` (line 77) and `override connectedCallback()` (line 79).

- [ ] **Step 2: Build to verify TypeScript compiles**

```
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts
git commit -m "fix: remove category-toggle and use-prompt listeners in disconnectedCallback"
```

---

## Task 2 (Issue 12): Guard `_runEvaluation` Against Writes After Unmount

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-modal.element.ts:81-101`

**Problem:** `_runEvaluation` (line 81) sets `this._modalState` at lines 86, 97, 99 and `this._progressKey` at lines 87, 90. If the modal is unmounted while the async AI call is in flight, these writes target a disconnected element — a memory leak and potential Lit warning.

- [ ] **Step 1: Add `isConnected` guard before every state write in `_runEvaluation`**

Replace the entire `_runEvaluation` method body:

```typescript
private async _runEvaluation(): Promise<void> {
  const data = this.data;
  if (!data) return;

  try {
    if (!this.isConnected) return;
    this._modalState = 'loading';
    this._progressKey = PROGRESS_KEYS.sending;
    await this._tick();

    if (!this.isConnected) return;
    this._progressKey = PROGRESS_KEYS.waiting;
    const report = await evaluatePage(data);

    if (!this.isConnected) return;
    this._progressKey = PROGRESS_KEYS.rendering;
    await this._tick();

    if (!this.isConnected) return;
    this._report = report;
    this._modalState = report.parseFailed ? 'parse-failed' : 'success';
  } catch {
    if (!this.isConnected) return;
    this._modalState = 'error';
  }
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-modal.element.ts
git commit -m "fix: guard _runEvaluation state writes with isConnected check"
```

---

## Task 3 (Issue 13): Reset `_propertyAliases` Before Loading New Doc Type Properties

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts:270-289`

**Problem:** `_selectDocType` calls `_loadAvailableProperties` (line 284) without first clearing `this._propertyAliases`. `_loadAvailableProperties` has an auto-select guard at line 301: `if (this._propertyAliases.length === 0)` — it only auto-selects all properties when `_propertyAliases` is empty. Because `_propertyAliases` still holds the previous doc type's selections, the guard never fires and the checkboxes are blank for new selections.

- [ ] **Step 1: Reset `_propertyAliases` inside `_selectDocType` before calling `_loadAvailableProperties`**

In `_selectDocType`, after setting `this._documentTypeAlias = detail.alias` (line 281) and before the `void this._loadAvailableProperties(...)` call (line 284), add:

```typescript
this._propertyAliases = [];
void this._loadAvailableProperties(detail.alias);
```

The updated block (lines 279-285) becomes:

```typescript
if (result.response.ok && result.data) {
  const detail = result.data as { alias: string; name: string };
  this._documentTypeAlias = detail.alias;
  this._docTypeDisplayName = detail.name;
  // Clear previous doc type's property selections before loading new ones
  this._propertyAliases = [];
  void this._loadAvailableProperties(detail.alias);
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts
git commit -m "fix: reset _propertyAliases before loading properties for newly selected doc type"
```

---

## Task 4 (Issue 14): Add Try/Catch to `_loadConfig`

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts:206-221`

**Problem:** `_loadConfig` (line 206) calls `await getConfiguration(id)` at line 207 with no try/catch. An API error propagates as an unhandled promise rejection (called via `void this._loadConfig(...)` in `updated()`), leaving the form blank with no error message visible to the user.

- [ ] **Step 1: Add `_loadError` state field**

After the existing `@state()` declarations (look for `@state() _promptBuilderOpen = false;`) add:

```typescript
@state() private _loadError: string | null = null;
```

- [ ] **Step 2: Wrap `_loadConfig` body in try/catch**

Replace the entire `_loadConfig` method:

```typescript
private async _loadConfig(id: string): Promise<void> {
  this._loadError = null;
  try {
    const config: EvaluatorConfigItem = await getConfiguration(id);
    this._name = config.name;
    this._description = config.description ?? '';
    this._documentTypeAlias = config.documentTypeAlias;
    this._profileId = config.profileId;
    this._contextId = config.contextId ?? '';
    this._promptText = config.promptText;
    this._scoringEnabled = config.scoringEnabled;
    this._version = config.version;
    this._propertyAliases = config.propertyAliases ?? [];
    this._errors = {};
    void this._resolveDocTypeName(config.documentTypeAlias);
    void this._loadAvailableProperties(config.documentTypeAlias);
  } catch {
    this._loadError = this.localize.term('evaluatorConfig_loadError');
  }
}
```

- [ ] **Step 3: Show the load error in the form template**

Find the `render()` method and locate the outermost template return. At the very top of the form body (before the first `<uui-box>` or section), add a conditional error banner:

```typescript
${this._loadError
  ? html`<uui-tag color="danger" style="margin-bottom: 1rem;">${this._loadError}</uui-tag>`
  : nothing}
```

Import `nothing` from `@umbraco-cms/backoffice/external/lit` if it is not already imported (check the existing imports at line 1).

- [ ] **Step 4: Build to verify TypeScript compiles**

```
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts
git commit -m "fix: catch errors in _loadConfig and display load error banner"
```

---

## Task 5 (Issue 15): Localize Hardcoded Suffix in `EvaluationWarningElement`

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-warning.element.ts:52`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/localization/en.ts:31`

**Problem:** Line 52 of `evaluation-warning.element.ts` contains the hardcoded English string `to improve structured output.` — it follows the localized link text but is a raw string literal in the template, violating the "all user-facing strings must go through localization" rule in CLAUDE.md.

- [ ] **Step 1: Add the new localization key to `en.ts`**

In `en.ts`, the `evaluatePage` section currently ends (lines 31-32) with:
```typescript
parseFailedLinkText: 'Refine the evaluator prompt',
```

Add the new key immediately after:
```typescript
parseFailedLinkText: 'Refine the evaluator prompt',
parseFailedSuffix: 'to improve structured output.',
```

- [ ] **Step 2: Replace the hardcoded literal in `evaluation-warning.element.ts`**

Current template at line 51-53:
```typescript
<a href="/umbraco/section/ai/page-evaluator">${this.localize.term('evaluatePage_parseFailedLinkText')}</a>
to improve structured output.
```

Replace with:
```typescript
<a href="/umbraco/section/ai/page-evaluator">${this.localize.term('evaluatePage_parseFailedLinkText')}</a>
${this.localize.term('evaluatePage_parseFailedSuffix')}
```

- [ ] **Step 3: Build to verify TypeScript compiles**

```
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-warning.element.ts
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/localization/en.ts
git commit -m "fix: localize hardcoded 'to improve structured output.' suffix in evaluation warning"
```

---

## Task 6 (Issue 17): Unify `CheckStatus` Parsing to Case-Insensitive

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs:413-418`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs`

**Problem:** `TryParseJson` (line 413-418) uses a case-sensitive switch — only `"Fail"` and `"Warn"` match; any other casing (e.g., `"fail"`, `"WARN"`) silently becomes `Pass`. `TryParseMarkdown` (line 564-569) already uses `ToUpperInvariant()` and handles `"WARNING"`. This inconsistency means the JSON path can silently mislabel check statuses.

- [ ] **Step 1: Write failing tests for case-insensitive JSON parsing**

Add these two tests to `PageEvaluationServiceTests.cs`, inside the `// JSON parse (happy path)` section:

```csharp
[Fact]
public async Task EvaluateAsync_WhenJsonStatusIsLowercase_ParsesCorrectly()
{
    const string documentTypeAlias = "blogPost";
    _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
        .Returns(BuildConfig(documentTypeAlias));

    var jsonResponse = """
        {
          "score": { "passed": 1, "total": 3 },
          "checks": [
            { "checkNumber": 1, "status": "fail", "label": "Title", "explanation": null },
            { "checkNumber": 2, "status": "warn", "label": "Meta", "explanation": null },
            { "checkNumber": 3, "status": "pass", "label": "Image", "explanation": null }
          ],
          "suggestions": null
        }
        """;
    MockChatResponse(jsonResponse);

    EvaluationReport report = await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>());

    Assert.Equal(CheckStatus.Fail, report.Checks[0].Status);
    Assert.Equal(CheckStatus.Warn, report.Checks[1].Status);
    Assert.Equal(CheckStatus.Pass, report.Checks[2].Status);
}

[Fact]
public async Task EvaluateAsync_WhenJsonStatusIsUppercase_ParsesCorrectly()
{
    const string documentTypeAlias = "blogPost";
    _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
        .Returns(BuildConfig(documentTypeAlias));

    var jsonResponse = """
        {
          "score": { "passed": 0, "total": 2 },
          "checks": [
            { "checkNumber": 1, "status": "FAIL", "label": "Title", "explanation": null },
            { "checkNumber": 2, "status": "WARNING", "label": "Meta", "explanation": null }
          ],
          "suggestions": null
        }
        """;
    MockChatResponse(jsonResponse);

    EvaluationReport report = await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>());

    Assert.Equal(CheckStatus.Fail, report.Checks[0].Status);
    Assert.Equal(CheckStatus.Warn, report.Checks[1].Status);
}
```

- [ ] **Step 2: Run the new tests to verify they fail**

```
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "EvaluateAsync_WhenJsonStatusIsLowercase_ParsesCorrectly|EvaluateAsync_WhenJsonStatusIsUppercase_ParsesCorrectly"
```

Expected: both tests FAIL (lowercase `"fail"` maps to `Pass` in the current case-sensitive switch).

- [ ] **Step 3: Extract `ParseCheckStatus` helper and update `TryParseJson`**

In `PageEvaluationService.cs`, add this private static method immediately before `TryParseJson`:

```csharp
private static CheckStatus ParseCheckStatus(string status) =>
    status.ToUpperInvariant() switch
    {
        "FAIL" => CheckStatus.Fail,
        "WARN" or "WARNING" => CheckStatus.Warn,
        _ => CheckStatus.Pass,
    };
```

Then update the switch in `TryParseJson` (lines 413-418) from:

```csharp
CheckStatus status = statusStr switch
{
    "Fail" => CheckStatus.Fail,
    "Warn" => CheckStatus.Warn,
    _ => CheckStatus.Pass,
};
```

to:

```csharp
CheckStatus status = ParseCheckStatus(statusStr);
```

Then update the switch in `TryParseMarkdown` (lines 564-569) from:

```csharp
CheckStatus status = parts[0].ToUpperInvariant() switch
{
    "FAIL" => CheckStatus.Fail,
    "WARN" or "WARNING" => CheckStatus.Warn,
    _ => CheckStatus.Pass,
};
```

to:

```csharp
CheckStatus status = ParseCheckStatus(parts[0]);
```

- [ ] **Step 4: Run all tests to verify they pass**

```
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs
git commit -m "fix: unify CheckStatus parsing to case-insensitive via shared ParseCheckStatus helper"
```

---

## Task 7 (Issue 18): Standardize Scoring Fields to camelCase

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs:329-334, 429, 439`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts:136`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs`

**Problem:** The JSON prompt template (line 329-334) uses `"overall_score"` and `"axis_scores"` (snake_case) while all other fields in the same template (`score`, `checks`, `checkNumber`, `suggestions`) are camelCase. The parser reads the same snake_case keys (lines 429, 439). `prompt-builder.element.ts` line 136 also emits these snake_case keys in the scoring instruction snippet. Standardizing to camelCase (`overallScore`, `axisScores`) is consistent with the rest of the API contract and the C# property names.

- [ ] **Step 1: Write a failing test for camelCase scoring field parsing**

Add this test to `PageEvaluationServiceTests.cs` in the `// JSON parse (happy path)` section:

```csharp
[Fact]
public async Task EvaluateAsync_WhenJsonUsesCamelCaseScoringFields_ParsesScores()
{
    const string documentTypeAlias = "blogPost";
    _configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
        .Returns(BuildConfig(documentTypeAlias, scoringEnabled: true));

    var jsonResponse = """
        {
          "score": { "passed": 2, "total": 2 },
          "checks": [
            { "checkNumber": 1, "status": "Pass", "label": "Title", "explanation": null },
            { "checkNumber": 2, "status": "Pass", "label": "Meta", "explanation": null }
          ],
          "suggestions": null,
          "overallScore": 4.5,
          "axisScores": [
            { "name": "Clarity", "score": 4, "feedback": "Good" },
            { "name": "SEO", "score": 5, "feedback": null }
          ]
        }
        """;
    MockChatResponse(jsonResponse);

    EvaluationReport report = await _sut.EvaluateAsync(Guid.NewGuid(), documentTypeAlias, new Dictionary<string, object?>());

    Assert.Equal(4.5, report.OverallScore);
    Assert.NotNull(report.AxisScores);
    Assert.Equal(2, report.AxisScores!.Count);
    Assert.Equal("Clarity", report.AxisScores[0].Name);
    Assert.Equal(4, report.AxisScores[0].Score);
    Assert.Equal("Good", report.AxisScores[0].Feedback);
    Assert.Null(report.AxisScores[1].Feedback);
}
```

Also check the `BuildConfig` helper at the bottom of the test file and confirm it has a `scoringEnabled` parameter. If not, add one:

```csharp
// In BuildConfig helper, add scoringEnabled parameter:
private static AIEvaluatorConfig BuildConfig(
    string documentTypeAlias,
    string promptText = "Evaluate the page.",
    Guid? contextId = null,
    bool scoringEnabled = false) =>
    new()
    {
        Id = Guid.NewGuid(),
        Name = "Test Config",
        DocumentTypeAlias = documentTypeAlias,
        ProfileId = Guid.NewGuid(),
        ContextId = contextId,
        PromptText = promptText,
        ScoringEnabled = scoringEnabled,
        IsActive = true,
        DateCreated = DateTime.UtcNow,
        DateModified = DateTime.UtcNow,
    };
```

- [ ] **Step 2: Run the new test to verify it fails**

```
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "EvaluateAsync_WhenJsonUsesCamelCaseScoringFields_ParsesScores"
```

Expected: FAIL — `overallScore` is not found because the parser looks for `overall_score`.

- [ ] **Step 3: Update the prompt template in `PageEvaluationService.cs`**

In the `if (config.ScoringEnabled)` block (lines 322-334), replace:

```csharp
"overall_score": <number 1-5, decimal allowed>,
"axis_scores": [
```

with:

```csharp
"overallScore": <number 1-5, decimal allowed>,
"axisScores": [
```

- [ ] **Step 4: Update the parser in `PageEvaluationService.cs`**

At line 429, replace:

```csharp
if (root.TryGetProperty("overall_score", out JsonElement osEl)
```

with:

```csharp
if (root.TryGetProperty("overallScore", out JsonElement osEl)
```

At line 439, replace:

```csharp
if (root.TryGetProperty("axis_scores", out JsonElement axesEl)
```

with:

```csharp
if (root.TryGetProperty("axisScores", out JsonElement axesEl)
```

- [ ] **Step 5: Update the scoring snippet in `prompt-builder.element.ts`**

At line 136, replace:

```typescript
? '\n\nRate the page on a scale of 1-5 for each evaluation dimension listed above.\nProvide an overall_score (1-5) and individual axis_scores with brief feedback for each.'
```

with:

```typescript
? '\n\nRate the page on a scale of 1-5 for each evaluation dimension listed above.\nProvide an overallScore (1-5) and individual axisScores with brief feedback for each.'
```

- [ ] **Step 6: Run all tests to verify they pass**

```
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 7: Build client to verify TypeScript compiles**

```
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs
git commit -m "fix: standardize scoring JSON fields to camelCase (overallScore, axisScores)"
```

---

## Task 8 (Issue 19): Convert `EvaluationReport` to a `record`

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluation/EvaluationReport.cs`
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Evaluation/EvaluationReportTests.cs`

**Problem:** `WithCachedAt` (lines 72-82) manually copies all 8 fields to construct a new instance. If a new property is ever added to `EvaluationReport`, `WithCachedAt` silently drops it. Additionally, the XML doc comment on the class says "Transient — never persisted" which is incorrect — results are stored in the `umbracoAIEvaluationCache` table. Converting to a `record` allows `with { CachedAt = cachedAt }` and eliminates the manual copy.

**Note on `record` in tests:** `EvaluationReportTests` uses `Assert.Equal` and property assertions, not reference equality. Records add value-equality semantics. The test `Assert.Same(axis, copy.AxisScores)` (line 113) tests that the same list reference is preserved through `with {}` — this still holds for records.

- [ ] **Step 1: Convert `EvaluationReport` to a `record`**

Replace the entire `EvaluationReport.cs` content:

```csharp
namespace ProWorks.Umbraco.AI.PageEvaluator.Evaluation;

/// <summary>
/// The structured result of a single AI evaluation run.
/// Serialised as the response body of <c>POST /page-evaluator/evaluate</c>.
/// Results are cached in <c>umbracoAIEvaluationCache</c>.
/// </summary>
public sealed record EvaluationReport
{
    /// <summary>
    /// True when the AI response could not be parsed into structured form.
    /// When true, <see cref="RawResponse"/> is populated and <see cref="Score"/>/<see cref="Checks"/>
    /// should be treated as empty.
    /// </summary>
    public bool ParseFailed { get; init; }

    /// <summary>Pass/total counts. Null when <see cref="ParseFailed"/> is true.</summary>
    public EvaluationScore? Score { get; init; }

    /// <summary>Ordered list of individual check results.</summary>
    public IReadOnlyList<CheckResult> Checks { get; init; } = [];

    /// <summary>Free-text suggestions block from the AI response. May be null.</summary>
    public string? Suggestions { get; init; }

    /// <summary>
    /// Original AI response text. Populated only when <see cref="ParseFailed"/> is true
    /// so the front-end can display it beneath the warning banner (FR-015).
    /// </summary>
    public string? RawResponse { get; init; }

    /// <summary>
    /// UTC timestamp when this result was cached. Null when freshly computed and not yet persisted.
    /// Populated by the API controller after saving to cache.
    /// </summary>
    public DateTime? CachedAt { get; init; }

    /// <summary>
    /// Overall page score (1-5, decimal allowed) when the config has scoring enabled and the AI
    /// returned a valid value. Null when scoring is disabled, the AI omitted the field, or the
    /// value was outside [1.0, 5.0].
    /// </summary>
    public double? OverallScore { get; init; }

    /// <summary>
    /// Per-dimension axis scores when the config has scoring enabled and the AI returned a
    /// valid array. Null when scoring is disabled or the AI omitted the field.
    /// </summary>
    public IReadOnlyList<AxisScore>? AxisScores { get; init; }

    /// <summary>Creates a successfully parsed report.</summary>
    public static EvaluationReport Parsed(
        EvaluationScore? score,
        IReadOnlyList<CheckResult> checks,
        string? suggestions,
        double? overallScore = null,
        IReadOnlyList<AxisScore>? axisScores = null) =>
        new()
        {
            Score = score,
            Checks = checks,
            Suggestions = suggestions,
            OverallScore = overallScore,
            AxisScores = axisScores,
        };

    /// <summary>Creates a parse-failure report containing only the raw response text.</summary>
    public static EvaluationReport Failed(string rawResponse) =>
        new() { ParseFailed = true, RawResponse = rawResponse };

    /// <summary>Returns a copy of this report with the specified <see cref="CachedAt"/> timestamp.</summary>
    public EvaluationReport WithCachedAt(DateTime cachedAt) => this with { CachedAt = cachedAt };
}
```

- [ ] **Step 2: Run all tests**

```
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass. (`Assert.Same(axis, copy.AxisScores)` in `EvaluationReportTests` still passes because `with {}` copies the reference for `IReadOnlyList<AxisScore>`.)

- [ ] **Step 3: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluation/EvaluationReport.cs
git commit -m "refactor: convert EvaluationReport to record to eliminate manual field copy in WithCachedAt"
```

---

## Task 9 (Issue 16): Add Focused `SetActiveAsync` to Replace Full-Update Activation

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/IAIEvaluatorConfigRepository.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/IAIEvaluatorConfigService.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`

**Problem:** `ActivateConfigurationAsync` in the controller (lines 195-196) activates a config by calling `_configService.UpdateAsync(existing, ...)` after setting `existing.IsActive = true`. This runs a full update (bumps `Version`, updates `DateModified`, writes all fields) instead of a targeted "set active flag" operation. It also incorrectly updates `DateModified` when nothing content-relevant changed.

**Fix:** Add `SetActiveAsync(Guid id)` at each layer. The repository implementation loads the entity, sets `IsActive = true` on it (and `IsActive = false` on all others for the same doc type), and saves — all in one transaction. The controller calls the service method directly instead of `UpdateAsync`.

- [ ] **Step 1: Write a failing test in `AIEvaluatorConfigServiceTests`**

Add this test to `AIEvaluatorConfigServiceTests.cs`:

```csharp
[Fact]
public async Task SetActiveAsync_CallsRepositorySetActiveAsync()
{
    var id = Guid.NewGuid();

    await _sut.SetActiveAsync(id);

    await _repository.Received(1).SetActiveAsync(id, Arg.Any<CancellationToken>());
}
```

- [ ] **Step 2: Run the new test to verify it fails**

```
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "SetActiveAsync_CallsRepositorySetActiveAsync"
```

Expected: FAIL — `SetActiveAsync` does not exist yet.

- [ ] **Step 3: Add `SetActiveAsync` to `IAIEvaluatorConfigRepository`**

In `IAIEvaluatorConfigRepository.cs`, add after the `DeleteAsync` declaration:

```csharp
/// <summary>
/// Sets the specified configuration as the active one for its document type.
/// All other configurations for the same document type are set inactive.
/// Does nothing if the configuration does not exist.
/// </summary>
Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default);
```

- [ ] **Step 4: Add `SetActiveAsync` to `IAIEvaluatorConfigService`**

In `IAIEvaluatorConfigService.cs`, add after the `DeleteAsync` declaration:

```csharp
/// <summary>
/// Activates the specified configuration and deactivates all others for the same document type.
/// Does nothing if the configuration does not exist.
/// </summary>
Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default);
```

- [ ] **Step 5: Implement `SetActiveAsync` in `AIEvaluatorConfigService`**

In `AIEvaluatorConfigService.cs`, add:

```csharp
public Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default) =>
    _repository.SetActiveAsync(id, cancellationToken);
```

- [ ] **Step 6: Implement `SetActiveAsync` in `EFCoreAIEvaluatorConfigRepository`**

In `EFCoreAIEvaluatorConfigRepository.cs`, add:

```csharp
public async Task SetActiveAsync(Guid id, CancellationToken cancellationToken = default)
{
    using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
    await scope.ExecuteWithContextAsync(async db =>
    {
        AIEvaluatorConfigEntity? target = await db.EvaluatorConfigs
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (target is null) return;

        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await db.EvaluatorConfigs
                .Where(e => e.DocumentTypeAlias == target.DocumentTypeAlias && e.IsActive)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.IsActive, false), cancellationToken);

            target.IsActive = true;
            await db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    });
}
```

- [ ] **Step 7: Update `ActivateConfigurationAsync` in the controller to use `SetActiveAsync`**

In `PageEvaluatorApiController.cs`, replace the entire `ActivateConfigurationAsync` method body:

```csharp
[HttpPost("configurations/{id:guid}/activate")]
[Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
public async Task<IActionResult> ActivateConfigurationAsync(
    Guid id,
    CancellationToken cancellationToken = default)
{
    AIEvaluatorConfig? existing = await _configService.GetByIdAsync(id, cancellationToken);
    if (existing is null)
        return NotFound(new { title = $"Evaluator configuration '{id}' not found." });

    try
    {
        await _configService.SetActiveAsync(id, cancellationToken);
        await _cacheRepository.DeleteByDocumentTypeAliasAsync(existing.DocumentTypeAlias, cancellationToken);
        AIEvaluatorConfig? updated = await _configService.GetByIdAsync(id, cancellationToken);
        if (updated is null)
            return NotFound(new { title = $"Evaluator configuration '{id}' not found after activation." });
        return Ok(await ToResponseAsync(updated, cancellationToken));
    }
    catch (DbUpdateConcurrencyException)
    {
        return Conflict(new { title = "This configuration was modified by another user. Please reload and try again." });
    }
}
```

- [ ] **Step 8: Add a controller test for `SetActiveAsync` delegation**

In `PageEvaluatorApiControllerTests.cs`, add:

```csharp
[Fact]
public async Task ActivateConfigurationAsync_CallsSetActiveAsync_NotUpdateAsync()
{
    var id = Guid.NewGuid();
    var config = BuildConfig(id, "blogPost");
    _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(config);
    _configService.SetActiveAsync(id, Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);

    await _sut.ActivateConfigurationAsync(id);

    await _configService.Received(1).SetActiveAsync(id, Arg.Any<CancellationToken>());
    await _configService.DidNotReceive().UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
}
```

- [ ] **Step 9: Run all tests**

```
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/IAIEvaluatorConfigRepository.cs
git add src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/IAIEvaluatorConfigService.cs
git add src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs
git add src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs
git add src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs
git commit -m "feat: add SetActiveAsync to replace full UpdateAsync in activation flow"
```

---

## Self-Review

**Spec coverage:**

| Issue | Task | Covered? |
|-------|------|----------|
| 11 — Listener leak in PromptBuilderElement | Task 1 | ✅ `disconnectedCallback` removes both listeners |
| 12 — `_runEvaluation` writes after unmount | Task 2 | ✅ `isConnected` guards before every state write |
| 13 — `_propertyAliases` not reset in `_selectDocType` | Task 3 | ✅ `this._propertyAliases = []` added before `_loadAvailableProperties` call |
| 14 — `_loadConfig` has no try/catch | Task 4 | ✅ wrapped; `_loadError` state + banner added |
| 15 — Hardcoded English suffix in warning element | Task 5 | ✅ new `parseFailedSuffix` key; localize call in template |
| 16 — Activation goes through UpdateAsync | Task 9 | ✅ `SetActiveAsync` at all 3 layers; controller updated |
| 17 — JSON status parsing is case-sensitive | Task 6 | ✅ `ParseCheckStatus` helper is case-insensitive |
| 18 — Scoring fields are snake_case | Task 7 | ✅ `overallScore`/`axisScores` in template, parser, and TS snippet |
| 19 — `WithCachedAt` manual field copy; wrong comment | Task 8 | ✅ `record`; `with { CachedAt = ... }`; comment fixed |

**Placeholder scan:** No TBD, TODO, or "similar to" placeholders found.

**Type consistency:**
- `SetActiveAsync(Guid id, CancellationToken)` used consistently across interface, service, repository, and controller.
- `ParseCheckStatus(string)` defined before first use.
- `_loadError` declared as `@state() private _loadError: string | null = null` and consumed in template.
