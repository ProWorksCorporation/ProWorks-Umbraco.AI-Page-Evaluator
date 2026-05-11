# Medium/Low Issue Fixes (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Issue 20 (missed high-severity duplicate API call), Issues 21–23 + 27 (missing C# test coverage), and Issues 28–31 (low-severity code quality items) from CODE-REVIEW-3.md.

**Architecture:** Mix of TypeScript refactoring (Issues 20, 30, 31), a one-line C# fix (Issue 28), a docs edit (Issue 29), and pure C# test additions (Issues 21, 22, 23, 27). No schema or migration changes.

**Tech Stack:** TypeScript 5.x strict, Lit 3.x, C# .NET 10, xUnit + NSubstitute

**Run tests:** `dotnet test` from repo root.
**Build client:** `cd src/ProWorks.Umbraco.AI.PageEvaluator.Client && npm run build`

---

### Task 1: Issue 29 — Fix EF Core version in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Open CLAUDE.md and locate the stale version string**

In the Active Technologies section, two lines read `EF Core 10.0.2`. The Package Version Constraints section correctly says `10.0.4`. The Active Technologies header is wrong.

- [ ] **Step 2: Fix the version string**

In `CLAUDE.md`, change every occurrence of `EF Core 10.0.2` to `EF Core 10.0.4`.

There are two occurrences in the Active Technologies bullet points at the top of the file.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: fix stale EF Core version in CLAUDE.md (10.0.2 → 10.0.4)"
```

---

### Task 2: Issue 28 — Fix `GetCurrentUserKey()` to throw instead of returning `Guid.Empty`

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`

**Context:**  
`GetCurrentUserKey()` currently returns `Guid.Empty` when no identity is present — a silent bug that would corrupt audit data. Fix it to throw. The test constructor uses `new DefaultHttpContext()` which has no identity, so any test that hits a controller action using `GetCurrentUserKey()` (Create, Update) will break. Fix the test setup to inject a valid claim.

`GetUserKey(this IIdentity identity)` reads the `"sub"` claim (`Constants.Security.OpenIdDictSubClaimType`).

- [ ] **Step 1: Write the failing test first**

In `PageEvaluatorApiControllerTests.cs`, add a test confirming the happy path still works after the identity is set. This test will fail until the controller fix is applied (because `GetCurrentUserKey()` currently silently returns `Guid.Empty` instead of a real key — the test itself won't break, but we verify behavior).

Actually: add the user claim setup to the test constructor first (so existing tests don't break when we make `GetCurrentUserKey` throw).

In `PageEvaluatorApiControllerTests` constructor, after creating `_sut`, add:

```csharp
// Provide a real user identity so GetCurrentUserKey() can read the "sub" claim
var userKey = Guid.NewGuid();
var identity = new ClaimsIdentity(
    [new Claim(Constants.Security.OpenIdDictSubClaimType, userKey.ToString())],
    "test");
_sut.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
```

Add `using Umbraco.Cms.Core;` to the test file's usings (for `Constants`). `ClaimsPrincipal` and `ClaimsIdentity` are already available via `System.Security.Claims`.

- [ ] **Step 2: Run existing tests to verify they still pass**

```bash
dotnet test --filter "PageEvaluatorApiControllerTests"
```

Expected: all tests pass (the `sub` claim is now provided).

- [ ] **Step 3: Fix `GetCurrentUserKey()` in the controller**

In `PageEvaluatorApiController.cs`, change:

```csharp
private Guid GetCurrentUserKey()
    => HttpContext.User.Identity?.GetUserKey() ?? Guid.Empty;
```

to:

```csharp
private Guid GetCurrentUserKey()
    => HttpContext.User.Identity?.GetUserKey()
        ?? throw new InvalidOperationException("Authenticated user key not found on the current request.");
```

- [ ] **Step 4: Run all tests to verify no regressions**

```bash
dotnet test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs
git commit -m "fix: GetCurrentUserKey throws on missing identity instead of returning Guid.Empty"
```

---

### Task 3: Issue 20 — Extract `fetchDocTypeProperties` to `shared/api-client.ts`

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/api-client.ts`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts`

**Context:**  
`fetchDocTypeProperties` is defined in `prompt-builder.element.ts` but `evaluator-form.element.ts` duplicates the same endpoint call inline in two separate methods: `_resolveDocTypeName` (reads `.name`) and `_loadAvailableProperties` (reads `.properties`). The fix: move the function to `api-client.ts` with an expanded return type `{ name, properties }`, update prompt-builder to use the imported version, and collapse the two evaluator-form methods into one `_loadDocTypeInfo` call.

The `/page-evaluator/document-type/{alias}/properties` endpoint returns `{ alias, name, properties[] }`.

- [ ] **Step 1: Add `DocumentTypeInfo` interface and `fetchDocTypeProperties` to `api-client.ts`**

At the end of `src/.../shared/api-client.ts`, add (also add `DocumentTypePropertySummary` to the existing import from `./types.js`):

```typescript
// In the imports at the top, add DocumentTypePropertySummary:
import type {
  CreateEvaluatorConfigRequest,
  DocumentTypePropertySummary,
  EvaluatePageRequest,
  EvaluationReportResponse,
  EvaluatorConfigItem,
  EvaluatorConfigListResponse,
  UpdateEvaluatorConfigRequest,
} from './types.js';
```

Then at the bottom of the file:

```typescript
// ---------------------------------------------------------------------------
// Document type properties endpoint
// ---------------------------------------------------------------------------

export interface DocumentTypeInfo {
  readonly name: string;
  readonly properties: DocumentTypePropertySummary[];
}

export async function fetchDocTypeProperties(
  documentTypeAlias: string,
): Promise<DocumentTypeInfo> {
  const result = await apiClient.get({
    security: BEARER,
    url: `${BASE}/document-type/${encodeURIComponent(documentTypeAlias)}/properties`,
  });
  if (!result.response.ok) {
    const text = await result.response.text().catch(() => '');
    throw new Error(`API ${result.response.status}: ${text}`);
  }
  const data = result.data as {
    name: string;
    properties: readonly { alias: string; label: string; groupName: string; editorAlias: string }[];
  };
  return {
    name: data.name,
    properties: data.properties.map((p) => ({
      alias: p.alias,
      label: p.label,
      groupName: p.groupName,
      editorAlias: p.editorAlias,
    })),
  };
}
```

- [ ] **Step 2: Run TypeScript build to verify no errors in api-client.ts**

```bash
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds (the new function compiles cleanly).

- [ ] **Step 3: Update `prompt-builder.element.ts`**

Remove the three blocks in `prompt-builder.element.ts`:
1. The `// Umbraco Management API helper` comment block through the end of the `fetchDocTypeProperties` function (lines 7–49 in the file)
2. The two local interfaces `UmbracoDocTypeProperty` and `UmbracoDocTypeResponse`

Replace the old import line:
```typescript
import { apiClient, BEARER } from '../shared/api-client.js';
```
with:
```typescript
import { fetchDocTypeProperties } from '../shared/api-client.js';
```

Update `_loadProperties` to use `.properties` from the new return type:
```typescript
private async _loadProperties(): Promise<void> {
  this._loading = true;
  this._error = null;
  try {
    this._properties = (await fetchDocTypeProperties(this.documentTypeAlias)).properties;
  } catch {
    this._error = this.localize.term('promptBuilder_loadError');
  } finally {
    this._loading = false;
  }
}
```

- [ ] **Step 4: Update `evaluator-form.element.ts`**

Add `fetchDocTypeProperties` to the import from `api-client.js`:
```typescript
import {
  apiClient,
  BEARER,
  createConfiguration,
  fetchDocTypeProperties,
  getConfiguration,
  updateConfiguration,
} from '../shared/api-client.js';
```

Delete the `_resolveDocTypeName` method entirely (lines 229–244).

Delete the `_loadAvailableProperties` method entirely (lines 297–314).

Add a new combined method in their place:

```typescript
private async _loadDocTypeInfo(alias: string): Promise<void> {
  this._availableProperties = [];
  try {
    const info = await fetchDocTypeProperties(alias);
    this._docTypeDisplayName = info.name;
    this._availableProperties = info.properties;
    if (this._propertyAliases.length === 0 && info.properties.length > 0) {
      this._propertyAliases = info.properties.map((p) => p.alias);
    }
  } catch {
    // Non-critical — the checkbox list simply won't appear
  }
}
```

In `_loadConfig`, replace the two fire-and-forget calls:
```typescript
// OLD:
void this._resolveDocTypeName(config.documentTypeAlias);
void this._loadAvailableProperties(config.documentTypeAlias);
// NEW:
void this._loadDocTypeInfo(config.documentTypeAlias);
```

In `_selectDocType`, update to call `_loadDocTypeInfo` and remove the `this._docTypeDisplayName = detail.name` line (since `_loadDocTypeInfo` sets it):
```typescript
private async _selectDocType(id: string, name: string): Promise<void> {
  this._docTypeShowSuggestions = false;
  this._docTypeSuggestions = [];
  this._docTypeDisplayName = name;
  try {
    const result = await apiClient.get({
      security: BEARER,
      url: `/umbraco/management/api/v1/document-type/${encodeURIComponent(id)}`,
    });
    if (result.response.ok && result.data) {
      const detail = result.data as { alias: string };
      this._documentTypeAlias = detail.alias;
      this._propertyAliases = [];
      void this._loadDocTypeInfo(detail.alias);
    }
  } catch {
    this._errors = { ...this._errors, documentTypeAlias: this.localize.term('evaluatorConfig_documentTypeAliasError') };
  }
}
```

- [ ] **Step 5: Build the client and verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/shared/api-client.ts
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/prompt-builder/prompt-builder.element.ts
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts
git add src/ProWorks.Umbraco.AI.PageEvaluator/wwwroot/dist/
git commit -m "refactor: extract fetchDocTypeProperties to shared api-client, collapse two duplicate evaluator-form API calls"
```

---

### Task 4: Issue 30 — Move `_groupByDocType()` out of `render()`

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-config-workspace.element.ts`

**Context:**  
`_groupByDocType()` is called inside `render()`, so it runs O(n log n) on every reactive state change (mouse move, focus, etc.). The fix: cache the result in a `@state() private _groupedConfigs` field, compute it once in `_loadConfigs()` and after `_handleDelete()` removes an item.

- [ ] **Step 1: Add `_groupedConfigs` state property**

After the existing state declarations near the top of the class (around line 100), add:

```typescript
@state() private _groupedConfigs: Map<string, EvaluatorConfigItem[]> = new Map();
```

- [ ] **Step 2: Update `_loadConfigs` to compute `_groupedConfigs`**

At the end of the `try` block in `_loadConfigs`, after setting `this._configs`, add:

```typescript
this._groupedConfigs = this._groupByDocType();
```

Full updated method:

```typescript
private async _loadConfigs(): Promise<void> {
  this._loading = true;
  this._error = null;
  try {
    const response: EvaluatorConfigListResponse = await getConfigurations();
    this._configs = [...response.items];
    this._groupedConfigs = this._groupByDocType();
  } catch {
    this._error = this.localize.term('evaluatorConfig_loadError');
  } finally {
    this._loading = false;
  }
}
```

- [ ] **Step 3: Update `_handleDelete` to recompute `_groupedConfigs`**

After `this._configs = this._configs.filter(...)`, add:

```typescript
this._groupedConfigs = this._groupByDocType();
```

Full updated `_handleDelete`:

```typescript
private async _handleDelete(id: string): Promise<void> {
  try {
    await umbConfirmModal(this, {
      headline: this.localize.term('evaluatorConfig_deleteConfirmHeadline'),
      content: this.localize.term('evaluatorConfig_deleteConfirmContent'),
      color: 'danger',
      confirmLabel: this.localize.term('evaluatorConfig_deleteButton'),
    });
  } catch {
    return;
  }
  try {
    await deleteConfiguration(id);
    this._configs = this._configs.filter((c) => c.id !== id);
    this._groupedConfigs = this._groupByDocType();
  } catch {
    this._error = this.localize.term('evaluatorConfig_deleteError');
  }
}
```

- [ ] **Step 4: Update `render()` to use `_groupedConfigs`**

In the `render()` method, remove:

```typescript
const groups = this._groupByDocType();
```

And replace every reference to `groups` with `this._groupedConfigs`:

```typescript
${this._groupedConfigs.size === 0
  ? html`<p>${this.localize.term('evaluatorConfig_emptyState')}</p>`
  : Array.from(this._groupedConfigs.entries()).map(
      ([alias, items]) => html`
        <uui-box headline=${items[0]?.documentTypeName ?? alias}>
          ...
```

- [ ] **Step 5: Build the client and verify no TypeScript errors**

```bash
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-config-workspace.element.ts
git add src/ProWorks.Umbraco.AI.PageEvaluator/wwwroot/dist/
git commit -m "perf: cache _groupByDocType result in state field, compute only on data changes not every render"
```

---

### Task 5: Issue 31 — Fix dead CSS `.doc-type-suggestion-alias` by adding alias display

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts`

**Context:**  
`.doc-type-suggestion-alias` CSS is defined (lines 165–169) but the suggestion template renders only `<span>${s.name}</span>` with no alias element. `_docTypeSuggestions` only carries `{ id, name }`. Umbraco's `/item/document-type/search` API also returns `alias`. Update the state type to include `alias?`, pass it through from the search response, and render it in the dropdown.

- [ ] **Step 1: Update `_docTypeSuggestions` state type**

Change:
```typescript
@state() private _docTypeSuggestions: Array<{ id: string; name: string }> = [];
```
to:
```typescript
@state() private _docTypeSuggestions: Array<{ id: string; name: string; alias?: string }> = [];
```

- [ ] **Step 2: Update the search response cast in `_searchDocTypes`**

Change:
```typescript
const data = result.data as { items: Array<{ id: string; name: string }> };
```
to:
```typescript
const data = result.data as { items: Array<{ id: string; name: string; alias?: string }> };
```

- [ ] **Step 3: Update the suggestion template in `render()`**

Find the suggestion dropdown template (around line 466):
```typescript
${this._docTypeSuggestions.map(s => html`
  <div class="doc-type-suggestion"
    @mousedown=${() => void this._selectDocType(s.id, s.name)}>
    <span>${s.name}</span>
  </div>
`)}
```

Replace with:
```typescript
${this._docTypeSuggestions.map(s => html`
  <div class="doc-type-suggestion"
    @mousedown=${() => void this._selectDocType(s.id, s.name)}>
    <span>${s.name}</span>
    ${s.alias ? html`<span class="doc-type-suggestion-alias">${s.alias}</span>` : nothing}
  </div>
`)}
```

Verify `nothing` is already imported from `@umbraco-cms/backoffice/external/lit` (it is — it's in the existing import at line 1).

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts
git add src/ProWorks.Umbraco.AI.PageEvaluator/wwwroot/dist/
git commit -m "fix: show document type alias in suggestion dropdown, activate dead .doc-type-suggestion-alias CSS"
```

---

### Task 6: Issue 21 — C# tests for `GetDocumentTypeProperties` controller endpoint

**Files:**
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`

**Context:**  
The `GetDocumentTypeProperties(string alias)` endpoint (line 369 of the controller) has no tests. It calls `_contentTypeService.Get(alias)`, returns 404 if null, maps properties with `p.Name ?? p.Alias` fallback and `CompositionPropertyGroups` for group name (defaults to `"General"` when no group matches).

`IContentType`, `IPropertyType` are interfaces (NSubstitute can mock them). `PropertyGroup` is a concrete Umbraco class — use `new PropertyGroup(true) { Name = "..." }` with `PropertyTypes` set via the group's collection. Actually, for simplicity, `CompositionPropertyGroups` can return an empty collection and the group name defaults to `"General"`.

The controller response uses anonymous types — test them with `System.Reflection` (already imported in the test file).

- [ ] **Step 1: Write failing tests**

Add the following test region to `PageEvaluatorApiControllerTests.cs` (before the closing brace of the class):

```csharp
// ---------------------------------------------------------------------------
// GET /document-type/{alias}/properties
// ---------------------------------------------------------------------------

[Fact]
public void GetDocumentTypeProperties_WhenAliasExists_Returns200WithMappedProperties()
{
    // Arrange
    const string alias = "blogPost";
    var contentType = Substitute.For<IContentType>();
    contentType.Alias.Returns(alias);
    contentType.Name.Returns("Blog Post");

    var prop = Substitute.For<IPropertyType>();
    prop.Alias.Returns("pageTitle");
    prop.Name.Returns("Page Title");
    prop.PropertyEditorAlias.Returns("Umbraco.TextBox");

    contentType.CompositionPropertyTypes.Returns(new[] { prop });
    contentType.CompositionPropertyGroups.Returns(Enumerable.Empty<PropertyGroup>());

    _contentTypeService.Get(alias).Returns(contentType);

    // Act
    IActionResult result = _sut.GetDocumentTypeProperties(alias);

    // Assert
    var ok = Assert.IsType<OkObjectResult>(result);
    Assert.NotNull(ok.Value);
    var type = ok.Value!.GetType();
    Assert.Equal(alias, (string)type.GetProperty("alias")!.GetValue(ok.Value)!);
    Assert.Equal("Blog Post", (string)type.GetProperty("name")!.GetValue(ok.Value)!);
}

[Fact]
public void GetDocumentTypeProperties_WhenAliasNotFound_Returns404()
{
    _contentTypeService.Get("unknown").Returns((IContentType?)null);

    IActionResult result = _sut.GetDocumentTypeProperties("unknown");

    Assert.IsType<NotFoundObjectResult>(result);
}

[Fact]
public void GetDocumentTypeProperties_WhenPropertyNameIsNull_FallsBackToAlias()
{
    const string alias = "article";
    var contentType = Substitute.For<IContentType>();
    contentType.Alias.Returns(alias);
    contentType.Name.Returns("Article");

    var prop = Substitute.For<IPropertyType>();
    prop.Alias.Returns("bodyText");
    prop.Name.Returns((string?)null);  // Name is null — should fall back to alias
    prop.PropertyEditorAlias.Returns("Umbraco.TinyMCE");

    contentType.CompositionPropertyTypes.Returns(new[] { prop });
    contentType.CompositionPropertyGroups.Returns(Enumerable.Empty<PropertyGroup>());

    _contentTypeService.Get(alias).Returns(contentType);

    IActionResult result = _sut.GetDocumentTypeProperties(alias);

    var ok = Assert.IsType<OkObjectResult>(result);
    Assert.NotNull(ok.Value);

    // Verify the properties collection uses alias as label fallback
    var propertiesValue = ok.Value!.GetType().GetProperty("properties")!.GetValue(ok.Value)!;
    var propertiesList = ((IEnumerable<object>)propertiesValue).ToList();
    Assert.Single(propertiesList);
    var firstProp = propertiesList[0];
    var label = (string)firstProp.GetType().GetProperty("label")!.GetValue(firstProp)!;
    Assert.Equal("bodyText", label);  // Falls back to alias when Name is null
}
```

Add missing usings if not present (check for `IContentType`, `IPropertyType`, `PropertyGroup`, `Enumerable`):
- `using Umbraco.Cms.Core.Models;` — covers `IContentType`, `PropertyGroup`
- `using System.Linq;` — for `Enumerable.Empty` and `ToList`
- `using System.Collections.Generic;` — for `IEnumerable<object>`

`IPropertyType` is in `Umbraco.Cms.Core.Models` as well (via `IPropertyType`).

- [ ] **Step 2: Run the new tests to confirm they fail (no controller change needed — tests are new)**

```bash
dotnet test --filter "GetDocumentTypeProperties"
```

Expected: tests pass (the implementation already exists in the controller — we're just adding coverage).

- [ ] **Step 3: Commit**

```bash
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs
git commit -m "test: add coverage for GetDocumentTypeProperties endpoint (200, 404, null-name fallback)"
```

---

### Task 7: Issue 22 — C# test for `ApplyToEntity` version increment

**Files:**
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Persistence/AIEvaluatorConfigEntityFactoryTests.cs`

**Context:**  
`ApplyToEntity` at line 66 sets `entity.Version = domain.Version + 1`. This version-increment behavior has no dedicated test. The existing tests in this file only cover `ScoringEnabled`. The existing `BuildEntity(bool)` and `BuildDomain(bool)` helpers set `Version = 1`.

- [ ] **Step 1: Write the failing test**

Add to `AIEvaluatorConfigEntityFactoryTests.cs`:

```csharp
[Fact]
public void ApplyToEntity_IncrementsVersionByOne()
{
    var entity = BuildEntity(scoringEnabled: false);   // Version = 1
    var domain = BuildDomain(scoringEnabled: false);   // Version = 1

    AIEvaluatorConfigEntityFactory.ApplyToEntity(domain, entity);

    Assert.Equal(2, entity.Version);  // domain.Version + 1 = 1 + 1 = 2
}

[Fact]
public void ApplyToEntity_VersionIsAlwaysDomainVersionPlusOne()
{
    var entity = BuildEntity(scoringEnabled: false);
    entity.Version = 5;

    var domain = BuildDomain(scoringEnabled: false);
    domain.Version = 7;  // domain.Version wins — entity.Version is ignored

    AIEvaluatorConfigEntityFactory.ApplyToEntity(domain, entity);

    Assert.Equal(8, entity.Version);  // 7 + 1
}
```

Note: `BuildDomain` returns an object initializer. If `AIEvaluatorConfig` has `init`-only setters, confirm `domain.Version = 7;` compiles. If `Version` is `init`-only, construct a new domain with `Version = 7` instead.

- [ ] **Step 2: Run the tests**

```bash
dotnet test --filter "ApplyToEntity_Increments"
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Persistence/AIEvaluatorConfigEntityFactoryTests.cs
git commit -m "test: add ApplyToEntity version increment coverage for AIEvaluatorConfigEntityFactory"
```

---

### Task 8: Issue 23 — C# tests for `PropertyAliases` JSON round-trip

**Files:**
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Persistence/AIEvaluatorConfigEntityFactoryTests.cs`

**Context:**  
`SerializePropertyAliases` (line 72) and `DeserializePropertyAliases` (line 74–78) in `AIEvaluatorConfigEntityFactory.cs` have no test coverage. Key behaviors:
- `SerializePropertyAliases(["a","b"])` → `'["a","b"]'` (JSON)
- `SerializePropertyAliases([])` → `null` (empty list → null, not `"[]"`)
- `SerializePropertyAliases(null)` → `null`
- `DeserializePropertyAliases('["x"]')` → `["x"]`
- `DeserializePropertyAliases(null)` → `null`
- `DeserializePropertyAliases("not-json")` → `null` (malformed JSON → null, no exception)

Test these via the public `ToEntity` and `ToDomain` methods.

- [ ] **Step 1: Write the failing tests**

Add to `AIEvaluatorConfigEntityFactoryTests.cs`:

```csharp
// ---------------------------------------------------------------------------
// PropertyAliases serialization round-trip
// ---------------------------------------------------------------------------

[Fact]
public void ToEntity_SerializesPropertyAliasesToJson()
{
    var domain = new AIEvaluatorConfig
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        DocumentTypeAlias = "homePage",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        PropertyAliases = ["title", "bodyText"],
    };

    var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

    Assert.Equal("""["title","bodyText"]""", entity.PropertyAliases);
}

[Fact]
public void ToEntity_WhenPropertyAliasesIsEmpty_StoresNull()
{
    var domain = new AIEvaluatorConfig
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        DocumentTypeAlias = "homePage",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        PropertyAliases = [],
    };

    var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

    Assert.Null(entity.PropertyAliases);
}

[Fact]
public void ToEntity_WhenPropertyAliasesIsNull_StoresNull()
{
    var domain = new AIEvaluatorConfig
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        DocumentTypeAlias = "homePage",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        PropertyAliases = null,
    };

    var entity = AIEvaluatorConfigEntityFactory.ToEntity(domain);

    Assert.Null(entity.PropertyAliases);
}

[Fact]
public void ToDomain_DeserializesPropertyAliasesFromJson()
{
    var entity = new AIEvaluatorConfigEntity
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        DocumentTypeAlias = "homePage",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        PropertyAliases = """["alpha","beta"]""",
    };

    var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

    Assert.NotNull(domain.PropertyAliases);
    Assert.Equal(2, domain.PropertyAliases!.Count);
    Assert.Equal("alpha", domain.PropertyAliases[0]);
    Assert.Equal("beta", domain.PropertyAliases[1]);
}

[Fact]
public void ToDomain_WhenPropertyAliasesJsonIsNull_ReturnsNull()
{
    var entity = new AIEvaluatorConfigEntity
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        DocumentTypeAlias = "homePage",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        PropertyAliases = null,
    };

    var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

    Assert.Null(domain.PropertyAliases);
}

[Fact]
public void ToDomain_WhenPropertyAliasesJsonIsMalformed_ReturnsNull()
{
    var entity = new AIEvaluatorConfigEntity
    {
        Id = Guid.NewGuid(),
        Name = "Test",
        DocumentTypeAlias = "homePage",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        PropertyAliases = "not-valid-json!!!",
    };

    var domain = AIEvaluatorConfigEntityFactory.ToDomain(entity);

    Assert.Null(domain.PropertyAliases);  // catch (JsonException) → null
}
```

Note: `AIEvaluatorConfigEntity` needs to be accessible in the test project. It's in `ProWorks.Umbraco.AI.PageEvaluator.Persistence`. Verify the test project references this assembly — it does, since `AIEvaluatorConfigEntityFactory` (in the same assembly) is already tested in this file.

- [ ] **Step 2: Run the new tests**

```bash
dotnet test --filter "PropertyAliases"
```

Expected: all 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Persistence/AIEvaluatorConfigEntityFactoryTests.cs
git commit -m "test: add PropertyAliases JSON round-trip coverage for AIEvaluatorConfigEntityFactory"
```

---

### Task 9: Issue 27 — C# test for published-property resolution path in `PageEvaluationService`

**Files:**
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs`

**Context:**  
`ResolveProperties` in `PageEvaluationService` (lines 162–196) has three paths:
1. No UmbracoContext → use raw draft values (already covered by the default test setup)
2. Context available but node not in published cache → use raw draft values (no test)
3. Context available and node published → call `IApiContentBuilder.Build(publishedContent)` and use returned properties (no test)

The current test constructor stubs `TryGetUmbracoContext` to return `false`. For path 3, create a new test that builds its own local service with a context stub that returns `true`.

NSubstitute `out` parameter pattern:
```csharp
contextAccessor
    .TryGetUmbracoContext(out Arg.Any<IUmbracoContext?>())
    .ReturnsForAnyArgs(x => { x[0] = ctx; return true; });
```

`IUmbracoContext.Content` is `IPublishedContentCache` from `Umbraco.Cms.Core.PublishedCache`.  
`IPublishedContentCache.GetById(Guid)` returns `IPublishedContent?`.  
`IApiContentBuilder.Build(IPublishedContent)` returns `IApiContent?`.  
`IApiContent.Properties` is `IDictionary<string, object?>`.

- [ ] **Step 1: Write the failing test**

Add the following tests to `PageEvaluationServiceTests.cs` (in a new region after the existing tests, before the helper methods):

```csharp
// ---------------------------------------------------------------------------
// ResolveProperties: published cache paths
// ---------------------------------------------------------------------------

[Fact]
public async Task EvaluateAsync_WhenPublishedContextAvailable_CallsApiContentBuilder()
{
    // Arrange: fresh doubles so we don't pollute the class-level stubs
    var contextAccessor = Substitute.For<IUmbracoContextAccessor>();
    var contentBuilder = Substitute.For<IApiContentBuilder>();
    var configService = Substitute.For<IAIEvaluatorConfigService>();
    var chatService = Substitute.For<IAIChatService>();
    var contextService = Substitute.For<IAIContextService>();
    var contextProcessor = Substitute.For<IAIContextProcessor>();
    var logger = Substitute.For<ILogger<PageEvaluationService>>();

    const string documentTypeAlias = "blogPost";
    var nodeId = Guid.NewGuid();
    configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
        .Returns(BuildConfig(documentTypeAlias));

    // Stub context to return a live context with a matching published node
    var publishedContent = Substitute.For<IPublishedContent>();
    var contentCache = Substitute.For<IPublishedContentCache>();
    contentCache.GetById(nodeId).Returns(publishedContent);

    var ctx = Substitute.For<IUmbracoContext>();
    ctx.Content.Returns(contentCache);

    contextAccessor
        .TryGetUmbracoContext(out Arg.Any<IUmbracoContext?>())
        .ReturnsForAnyArgs(x => { x[0] = ctx; return true; });

    // Stub the builder to return resolved properties
    var apiContent = Substitute.For<IApiContent>();
    apiContent.Properties.Returns(new Dictionary<string, object?> { ["title"] = "Published Title" });
    contentBuilder.Build(publishedContent).Returns(apiContent);

    chatService.GetChatResponseAsync(
            Arg.Any<Action<AIChatBuilder>>(),
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<CancellationToken>())
        .Returns(new ChatResponse(new ChatMessage(ChatRole.Assistant,
            """{"score":{"passed":1,"total":1},"checks":[{"checkNumber":1,"status":"Pass","label":"T","explanation":null}],"suggestions":null}""")));

    var sut = new PageEvaluationService(
        configService, contextService, contextProcessor, chatService, contextAccessor, contentBuilder, logger);

    // Act
    EvaluationReport report = await sut.EvaluateAsync(nodeId, documentTypeAlias, new Dictionary<string, object?>());

    // Assert: content builder was called with the published content (path 3)
    contentBuilder.Received(1).Build(publishedContent);
    Assert.False(report.ParseFailed);
}

[Fact]
public async Task EvaluateAsync_WhenNodeNotInPublishedCache_UsesDraftProperties()
{
    var contextAccessor = Substitute.For<IUmbracoContextAccessor>();
    var contentBuilder = Substitute.For<IApiContentBuilder>();
    var configService = Substitute.For<IAIEvaluatorConfigService>();
    var chatService = Substitute.For<IAIChatService>();
    var contextService = Substitute.For<IAIContextService>();
    var contextProcessor = Substitute.For<IAIContextProcessor>();
    var logger = Substitute.For<ILogger<PageEvaluationService>>();

    const string documentTypeAlias = "blogPost";
    var nodeId = Guid.NewGuid();
    configService.GetActiveForDocumentTypeAsync(documentTypeAlias, Arg.Any<CancellationToken>())
        .Returns(BuildConfig(documentTypeAlias));

    // Context is available but GetById returns null (node not published)
    var contentCache = Substitute.For<IPublishedContentCache>();
    contentCache.GetById(nodeId).Returns((IPublishedContent?)null);

    var ctx = Substitute.For<IUmbracoContext>();
    ctx.Content.Returns(contentCache);

    contextAccessor
        .TryGetUmbracoContext(out Arg.Any<IUmbracoContext?>())
        .ReturnsForAnyArgs(x => { x[0] = ctx; return true; });

    chatService.GetChatResponseAsync(
            Arg.Any<Action<AIChatBuilder>>(),
            Arg.Any<IEnumerable<ChatMessage>>(),
            Arg.Any<CancellationToken>())
        .Returns(new ChatResponse(new ChatMessage(ChatRole.Assistant,
            """{"score":{"passed":1,"total":1},"checks":[{"checkNumber":1,"status":"Pass","label":"T","explanation":null}],"suggestions":null}""")));

    var sut = new PageEvaluationService(
        configService, contextService, contextProcessor, chatService, contextAccessor, contentBuilder, logger);

    var draftProps = new Dictionary<string, object?> { ["title"] = "Draft Title" };

    // Act
    EvaluationReport report = await sut.EvaluateAsync(nodeId, documentTypeAlias, draftProps);

    // Assert: content builder was NOT called (path 2 — node not in published cache)
    contentBuilder.DidNotReceive().Build(Arg.Any<IPublishedContent>());
    Assert.False(report.ParseFailed);
}
```

Add any missing usings:
- `using Umbraco.Cms.Core.PublishedCache;` — for `IPublishedContentCache`
- `using Umbraco.Cms.Core.Models.PublishedContent;` — for `IPublishedContent` (already covered by `Umbraco.Cms.Core.DeliveryApi`)
- `using Umbraco.Cms.Core.DeliveryApi;` — for `IApiContent` (already imported)

Verify `IPublishedContent` is already imported (it is, as `Umbraco.Cms.Core.Models` is likely already referenced transitively).

- [ ] **Step 2: Run the new tests**

```bash
dotnet test --filter "WhenPublishedContext|WhenNodeNotInPublished"
```

Expected: both tests pass.

- [ ] **Step 3: Run the full test suite**

```bash
dotnet test
```

Expected: all tests pass. Count should be 121 (up from 119 before this plan).

- [ ] **Step 4: Commit**

```bash
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs
git commit -m "test: add coverage for published-property resolution paths in PageEvaluationService"
```
