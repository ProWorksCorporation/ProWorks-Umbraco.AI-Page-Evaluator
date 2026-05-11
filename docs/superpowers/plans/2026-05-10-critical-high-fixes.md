# Critical and High Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 critical and high-severity issues: global rate limiter bucket, Version=0 concurrency bypass, stale cache after doc-type alias rename, N+1 queries in config listing, TOCTOU race in cache upsert, timer leak in evaluator form, missing async state-write guards, and concurrent evaluation requests.

**Architecture:** Issues span the Composer (rate limiter), Service (version concurrency), Controller (cache invalidation, N+1), Persistence Cache (TOCTOU), and two TypeScript Lit components. C# changes follow the xUnit/NSubstitute TDD pattern. TypeScript changes are code-only (no test runner in this project).

**Tech Stack:** C# .NET 10 / xUnit / NSubstitute; TypeScript 5.x / Lit 3.x / `@umbraco-cms/backoffice`

---

### Task 1: Fix rate limiter to use per-user partitioned policy

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs`

The current `AddFixedWindowLimiter` creates a single global bucket shared across all users — 10 requests exhausted by one user denies all others. No unit test needed; this is DI infrastructure.

- [ ] **Step 1: Add using and replace rate limiter registration**

Open `src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs`.

Add `using Umbraco.Extensions;` after the existing `using` block at the top.

Replace the `AddRateLimiter` block (lines 35–42):

```csharp
        builder.Services.AddRateLimiter(options =>
            options.AddFixedWindowLimiter("PageEvaluatorEvaluate", o =>
            {
                o.PermitLimit = 10;
                o.Window = TimeSpan.FromMinutes(1);
                o.QueueLimit = 0;
            })
        );
```

With:

```csharp
        // Partitioned by user key so each back-office user gets their own 10 req/min bucket.
        // Falls back to IP address for unauthenticated requests.
        // Consuming apps must call app.UseRateLimiter() before app.UseUmbraco().
        builder.Services.AddRateLimiter(options =>
            options.AddPolicy("PageEvaluatorEvaluate", ctx =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: ctx.User.Identity?.GetUserKey()?.ToString()
                        ?? ctx.Connection.RemoteIpAddress?.ToString()
                        ?? "anonymous",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0,
                    }))
        );
```

- [ ] **Step 2: Build to confirm no compile errors**

```bash
dotnet build src/ProWorks.Umbraco.AI.PageEvaluator.TestSite
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs
git commit -m "fix: partition rate limiter by user key instead of global bucket"
```

---

### Task 2: Remove Version=0 concurrency bypass in UpdateAsync

**Files:**
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs`

The service silently substitutes `existing.Version` when the client sends `Version = 0`, defeating optimistic concurrency. The fix rejects version=0 with an `ArgumentException` so the controller returns 422.

- [ ] **Step 1: Update the existing version=0 test to expect an exception (RED)**

Open `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs`.

Replace the entire `UpdateAsync_FallsBackToExistingVersionPlusOne_WhenVersionIsZero` test:

```csharp
    [Fact]
    public async Task UpdateAsync_ThrowsArgumentException_WhenVersionIsZero()
    {
        var id = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var existing = ExistingConfig(id: id, profileId: profileId);
        existing.Version = 3;
        _repository.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
        MockProfileExists(profileId);

        var updated = NewConfig(id: id, profileId: profileId);
        updated.Version = 0;

        await Assert.ThrowsAsync<ArgumentException>(() => _sut.UpdateAsync(updated, Guid.NewGuid()));
    }
```

- [ ] **Step 2: Run the test to confirm RED**

```bash
dotnet test --filter "UpdateAsync_ThrowsArgumentException_WhenVersionIsZero"
```

Expected: FAIL — the current code does not throw, it substitutes existing.Version.

- [ ] **Step 3: Fix the bypass in AIEvaluatorConfigService.UpdateAsync**

Open `src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs`.

Replace lines 78–86 (from `config.DateCreated = existing.DateCreated;` through the `if (config.Version == 0)` block):

```csharp
        config.DateCreated = existing.DateCreated;
        config.CreatedByUserId = existing.CreatedByUserId;

        if (config.Version == 0)
            throw new ArgumentException(
                "Version is required for update. Reload the configuration and try again.", nameof(config));

        config.DateModified = DateTime.UtcNow;
        config.ModifiedByUserId = modifiedByUserId;
        config.IsActive = true;
```

- [ ] **Step 4: Run the test to confirm GREEN**

```bash
dotnet test --filter "UpdateAsync_ThrowsArgumentException_WhenVersionIsZero"
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

```bash
dotnet test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs \
         tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs
git commit -m "fix: reject version=0 in UpdateAsync instead of silently bypassing concurrency check"
```

---

### Task 3: Fix old-alias cache invalidation when DocumentTypeAlias changes on update

**Files:**
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`

`UpdateConfigurationAsync` currently only invalidates `updated.DocumentTypeAlias`. If the user renamed the doc type alias, the old alias's cache entries remain stale. The fix fetches the existing config before the update to capture the old alias, then invalidates both if they differ.

**Important:** Adding the `GetByIdAsync` pre-check in the controller means existing tests that call `UpdateConfigurationAsync` without mocking `_configService.GetByIdAsync` will receive `null` (NSubstitute default) and return 404 prematurely. The fix is to add a catch-all default mock in the test constructor.

- [ ] **Step 1: Write failing test for dual cache invalidation**

Open `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`.

Add this test in the `// PUT /configurations/{id}` section:

```csharp
    [Fact]
    public async Task UpdateConfigurationAsync_WhenDocumentTypeAliasChanges_InvalidatesBothOldAndNewAliasCache()
    {
        var id = Guid.NewGuid();
        const string oldAlias = "blogPost";
        const string newAlias = "newsArticle";

        var existingConfig = new AIEvaluatorConfig
        {
            Id = id,
            Name = "Existing",
            DocumentTypeAlias = oldAlias,
            ProfileId = Guid.NewGuid(),
            PromptText = "Evaluate.",
            Version = 1,
        };
        _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existingConfig);

        var updatedConfig = new AIEvaluatorConfig
        {
            Id = id,
            Name = "Updated",
            DocumentTypeAlias = newAlias,
            ProfileId = existingConfig.ProfileId,
            PromptText = "Evaluate.",
            Version = 2,
        };
        _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(updatedConfig);

        _profileService.GetProfileAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((AIProfile?)null);

        var request = new UpdateEvaluatorConfigRequest
        {
            Name = "Updated",
            DocumentTypeAlias = newAlias,
            ProfileId = existingConfig.ProfileId,
            PromptText = "Evaluate.",
            Version = 1,
        };

        IActionResult result = await _sut.UpdateConfigurationAsync(id, request);

        Assert.IsType<OkObjectResult>(result);
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync(newAlias, Arg.Any<CancellationToken>());
        await _cacheRepository.Received(1).DeleteByDocumentTypeAliasAsync(oldAlias, Arg.Any<CancellationToken>());
    }
```

- [ ] **Step 2: Run the test to confirm RED**

```bash
dotnet test --filter "UpdateConfigurationAsync_WhenDocumentTypeAliasChanges_InvalidatesBothOldAndNewAliasCache"
```

Expected: FAIL — the controller currently only invalidates the new alias.

- [ ] **Step 3: Add a default GetByIdAsync mock to the test constructor**

In the constructor of `PageEvaluatorApiControllerTests`, add a default `GetByIdAsync` mock after the existing `defaultContent` setup. This prevents existing `UpdateConfigurationAsync` tests (which don't set up `GetByIdAsync`) from returning 404 prematurely once the controller gains a pre-check.

Find the constructor body that ends with:

```csharp
        var identity = new ClaimsIdentity(
            [new Claim("sub", Guid.NewGuid().ToString())],
            "test");
        _sut.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
    }
```

Add before that closing brace:

```csharp
        // Default: GetByIdAsync returns a valid config for any ID so UpdateConfigurationAsync
        // tests that don't set up their own mock still get past the pre-check.
        // Tests that need specific behavior override this with their own setup.
        _configService.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(BuildConfig("blogPost"));
```

- [ ] **Step 4: Fix UpdateConfigurationAsync in the controller**

Open `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`.

Replace the entire `UpdateConfigurationAsync` method body:

```csharp
    [HttpPut("configurations/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    public async Task<IActionResult> UpdateConfigurationAsync(
        Guid id,
        [FromBody] UpdateEvaluatorConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        // Capture the old alias before the update so we can invalidate its cache entries
        // if the DocumentTypeAlias changes.
        AIEvaluatorConfig? existing = await _configService.GetByIdAsync(id, cancellationToken);
        if (existing is null)
            return NotFound(new { title = $"Evaluator configuration '{id}' not found." });
        string oldAlias = existing.DocumentTypeAlias;

        var config = new AIEvaluatorConfig
        {
            Id = id,
            Name = request.Name,
            Description = request.Description,
            DocumentTypeAlias = request.DocumentTypeAlias,
            ProfileId = request.ProfileId,
            ContextId = request.ContextId,
            PromptText = request.PromptText,
            PropertyAliases = request.PropertyAliases,
            ScoringEnabled = request.ScoringEnabled,
            Version = request.Version,
        };

        try
        {
            AIEvaluatorConfig updated = await _configService.UpdateAsync(config, GetCurrentUserKey(), cancellationToken);
            await _cacheRepository.DeleteByDocumentTypeAliasAsync(updated.DocumentTypeAlias, cancellationToken);
            if (!string.Equals(oldAlias, updated.DocumentTypeAlias, StringComparison.OrdinalIgnoreCase))
                await _cacheRepository.DeleteByDocumentTypeAliasAsync(oldAlias, cancellationToken);
            return Ok(await ToResponseAsync(updated, cancellationToken));
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { title = "This configuration was modified by another user. Please reload and try again." });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { title = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return UnprocessableEntity(new { errors = new Dictionary<string, string[]> { [ex.ParamName ?? "config"] = [ex.Message] } });
        }
    }
```

- [ ] **Step 5: Run the new test to confirm GREEN**

```bash
dotnet test --filter "UpdateConfigurationAsync_WhenDocumentTypeAliasChanges_InvalidatesBothOldAndNewAliasCache"
```

Expected: PASS.

- [ ] **Step 6: Run all tests**

```bash
dotnet test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs \
         tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs
git commit -m "fix: invalidate old and new alias cache when DocumentTypeAlias changes on update"
```

---

### Task 4: Fix N+1 queries in GetConfigurationsAsync

**Files:**
- Modify: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`

`GetConfigurationsAsync` loops over all configs calling `ToResponseAsync` per item. Each `ToResponseAsync` call makes independent `GetProfileAsync` and `GetContextAsync` calls. With N configs, this is 2N sequential service calls. The fix pre-fetches all distinct profiles and contexts in parallel using `Task.WhenAll`, then maps using lookup dictionaries.

- [ ] **Step 1: Write failing test**

Add this test in the `// GET /configurations` section of `PageEvaluatorApiControllerTests.cs`:

```csharp
    [Fact]
    public async Task GetConfigurationsAsync_WithTwoConfigsSharingProfile_FetchesProfileOnce()
    {
        var profileId = Guid.NewGuid();
        var configs = new List<AIEvaluatorConfig>
        {
            new() { Id = Guid.NewGuid(), Name = "A", DocumentTypeAlias = "blogPost",
                    ProfileId = profileId, PromptText = "p", Version = 1 },
            new() { Id = Guid.NewGuid(), Name = "B", DocumentTypeAlias = "newsItem",
                    ProfileId = profileId, PromptText = "p", Version = 1 },
        };
        _configService.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns((IReadOnlyList<AIEvaluatorConfig>)configs);
        _profileService.GetProfileAsync(profileId, Arg.Any<CancellationToken>())
            .Returns(new AIProfile { Alias = "test", Name = "Test Profile", ConnectionId = Guid.Empty });

        await _sut.GetConfigurationsAsync();

        await _profileService.Received(1).GetProfileAsync(profileId, Arg.Any<CancellationToken>());
    }
```

- [ ] **Step 2: Run the test to confirm RED**

```bash
dotnet test --filter "GetConfigurationsAsync_WithTwoConfigsSharingProfile_FetchesProfileOnce"
```

Expected: FAIL — `GetProfileAsync` is currently called twice (once per config).

- [ ] **Step 3: Refactor GetConfigurationsAsync and add a sync ToResponse helper**

Open `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`.

Replace `GetConfigurationsAsync`:

```csharp
    [HttpGet("configurations")]
    public async Task<IActionResult> GetConfigurationsAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<AIEvaluatorConfig> configs = await _configService.GetAllAsync(cancellationToken);

        // Pre-fetch all distinct profiles and contexts in parallel to avoid N+1 service calls.
        Guid[] profileIds = configs
            .Select(c => c.ProfileId).Where(id => id != Guid.Empty).Distinct().ToArray();
        Guid[] contextIds = configs
            .Select(c => c.ContextId).Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToArray();

        AIProfile?[] profileResults = await Task.WhenAll(
            profileIds.Select(id => _profileService.GetProfileAsync(id, cancellationToken)));
        AIContext?[] contextResults = await Task.WhenAll(
            contextIds.Select(id => _contextService.GetContextAsync(id, cancellationToken)));

        var profileNames = profileIds
            .Zip(profileResults, (id, p) => (id, name: p?.Name))
            .ToDictionary(x => x.id, x => x.name);
        var contextNames = contextIds
            .Zip(contextResults, (id, c) => (id, name: c?.Name))
            .ToDictionary(x => x.id, x => x.name);

        var items = configs.Select(c => ToResponse(c, profileNames, contextNames)).ToList();
        return Ok(new { items, total = items.Count });
    }
```

Add the following private sync helper immediately before the existing `ToResponseAsync` method (before `// Private helpers`):

```csharp
    private EvaluatorConfigResponse ToResponse(
        AIEvaluatorConfig config,
        Dictionary<Guid, string?> profileNames,
        Dictionary<Guid, string?> contextNames)
    {
        profileNames.TryGetValue(config.ProfileId, out string? profileName);
        string? contextName = config.ContextId.HasValue
            && contextNames.TryGetValue(config.ContextId.Value, out string? cn) ? cn : null;
        string? documentTypeName = _contentTypeService.Get(config.DocumentTypeAlias)?.Name;

        return new EvaluatorConfigResponse
        {
            Id = config.Id,
            Name = config.Name,
            Description = config.Description,
            DocumentTypeAlias = config.DocumentTypeAlias,
            DocumentTypeName = documentTypeName,
            ProfileId = config.ProfileId,
            ProfileName = profileName,
            ContextId = config.ContextId,
            ContextName = contextName,
            PromptText = config.PromptText,
            IsActive = config.IsActive,
            DateCreated = config.DateCreated,
            DateModified = config.DateModified,
            PropertyAliases = config.PropertyAliases,
            ScoringEnabled = config.ScoringEnabled,
            Version = config.Version,
        };
    }
```

- [ ] **Step 4: Run the new test to confirm GREEN**

```bash
dotnet test --filter "GetConfigurationsAsync_WithTwoConfigsSharingProfile_FetchesProfileOnce"
```

Expected: PASS.

- [ ] **Step 5: Run all tests**

```bash
dotnet test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs \
         tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs
git commit -m "fix: pre-fetch profiles/contexts via Task.WhenAll to eliminate N+1 in GetConfigurationsAsync"
```

---

### Task 5: Fix TOCTOU race in cache SaveAsync with a transaction

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Cache/EFCoreEvaluationCacheRepository.cs`

The read-then-insert upsert has no transaction. Concurrent evaluations can both read no existing row and both attempt an insert, causing a primary key violation. The fix wraps the upsert in a transaction matching the pattern used in `EFCoreAIEvaluatorConfigRepository`.

No new test needed — race conditions require concurrent threads against a real DB; correctness is covered by existing save tests.

- [ ] **Step 1: Wrap the upsert in a transaction**

Open `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Cache/EFCoreEvaluationCacheRepository.cs`.

Replace `SaveAsync` (the entire method, lines 51–83):

```csharp
    public async Task SaveAsync(EvaluationCacheEntry entry, CancellationToken cancellationToken = default)
    {
        string reportJson = JsonSerializer.Serialize(entry.Report, SerializerOptions);

        using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<object?>(async db =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                EvaluationCacheEntity? existing = await db.EvaluationCache
                    .FirstOrDefaultAsync(e => e.NodeId == entry.NodeId, cancellationToken);

                if (existing is null)
                {
                    db.EvaluationCache.Add(new EvaluationCacheEntity
                    {
                        NodeId = entry.NodeId,
                        DocumentTypeAlias = entry.DocumentTypeAlias,
                        ReportJson = reportJson,
                        CachedAt = entry.CachedAt,
                    });
                }
                else
                {
                    existing.DocumentTypeAlias = entry.DocumentTypeAlias;
                    existing.ReportJson = reportJson;
                    existing.CachedAt = entry.CachedAt;
                }

                await db.SaveChangesAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);
            }
            catch
            {
                await tx.RollbackAsync(cancellationToken);
                throw;
            }

            return null;
        });

        scope.Complete();
    }
```

- [ ] **Step 2: Run all tests**

```bash
dotnet test
```

Expected: All tests pass (transaction does not affect test behavior since tests use in-memory or mocked contexts).

- [ ] **Step 3: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Cache/EFCoreEvaluationCacheRepository.cs
git commit -m "fix: wrap cache upsert in transaction to prevent TOCTOU PK violations under concurrency"
```

---

### Task 6: Fix timer leak and add isConnected guards in EvaluatorFormElement

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts`

Two issues in one file:
1. `_docTypeSearchTimer` is never cleared when the element disconnects, leaking a pending callback.
2. `_loadConfig` and `_loadDocTypeInfo` write to `@state()` properties after `await` without checking `this.isConnected`, causing writes to a detached element if the user navigates away during the fetch.

- [ ] **Step 1: Add disconnectedCallback to clear the debounce timer**

Open `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts`.

Add the following method immediately after the `updated()` method (after line 188):

```typescript
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._docTypeSearchTimer !== null) {
      clearTimeout(this._docTypeSearchTimer);
      this._docTypeSearchTimer = null;
    }
  }
```

- [ ] **Step 2: Add isConnected guards to _loadConfig**

Replace `_loadConfig` (starting at line 209):

```typescript
  private async _loadConfig(id: string): Promise<void> {
    this._loadError = null;
    try {
      const config: EvaluatorConfigItem = await getConfiguration(id);
      if (!this.isConnected) return;
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
      void this._loadDocTypeInfo(config.documentTypeAlias);
    } catch {
      if (!this.isConnected) return;
      this._loadError = this.localize.term('evaluatorConfig_formLoadError');
    }
  }
```

- [ ] **Step 3: Add isConnected guards to _loadDocTypeInfo**

Replace `_loadDocTypeInfo` (starting at line 229):

```typescript
  private async _loadDocTypeInfo(alias: string): Promise<void> {
    this._availableProperties = [];
    try {
      const info = await fetchDocTypeProperties(alias);
      if (!this.isConnected) return;
      this._docTypeDisplayName = info.name;
      this._availableProperties = info.properties;
      if (this._propertyAliases.length === 0 && info.properties.length > 0) {
        this._propertyAliases = info.properties.map((p) => p.alias);
      }
    } catch {
      if (!this.isConnected) return;
      if (!this._docTypeDisplayName) this._docTypeDisplayName = alias;
    }
  }
```

- [ ] **Step 4: TypeScript build**

```bash
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client && npm run build
```

Expected: Build succeeded, 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluator-config/evaluator-form.element.ts \
         src/ProWorks.Umbraco.AI.PageEvaluator/wwwroot/
git commit -m "fix: add disconnectedCallback timer cleanup and isConnected guards to EvaluatorFormElement"
```

---

### Task 7: Add in-flight guard and isConnected checks to EvaluationModalElement

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-modal.element.ts`

`_runEvaluation` can be called concurrently: once from `_checkCacheAndLoad` (on open) and again if the user clicks "Re-run" before the first finishes. The `_inFlight` guard prevents the second call from proceeding. Additionally, `_checkCacheAndLoad` calls `void this._runEvaluation()` after an `await` without checking `this.isConnected` first.

- [ ] **Step 1: Add _inFlight field**

Open `src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-modal.element.ts`.

Add `@state() private _inFlight = false;` after the `@state() private _report` line (after line 56):

```typescript
  @state() private _inFlight = false;
```

- [ ] **Step 2: Replace _runEvaluation with in-flight guard and finally cleanup**

Replace `_runEvaluation` (lines 81–106):

```typescript
  private async _runEvaluation(): Promise<void> {
    if (this._inFlight) return;
    this._inFlight = true;
    const data = this.data;
    if (!data) {
      this._inFlight = false;
      return;
    }

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
    } finally {
      this._inFlight = false;
    }
  }
```

- [ ] **Step 3: Add isConnected guard in _checkCacheAndLoad before calling _runEvaluation**

Replace `_checkCacheAndLoad` (lines 63–79):

```typescript
  private async _checkCacheAndLoad(): Promise<void> {
    const data = this.data;
    if (!data) return;

    try {
      const cached = await getCachedEvaluation(data.nodeId);
      if (cached) {
        if (!this.isConnected) return;
        this._report = cached;
        this._modalState = cached.parseFailed ? 'parse-failed' : 'success';
        return;
      }
    } catch {
      // Cache check failed — fall through to a fresh evaluation.
    }

    if (!this.isConnected) return;
    void this._runEvaluation();
  }
```

- [ ] **Step 4: TypeScript build**

```bash
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client && npm run build
```

Expected: Build succeeded, 0 TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/ProWorks.Umbraco.AI.PageEvaluator.Client/src/evaluation-modal/evaluation-modal.element.ts \
         src/ProWorks.Umbraco.AI.PageEvaluator/wwwroot/
git commit -m "fix: add in-flight guard and isConnected checks to EvaluationModalElement"
```
