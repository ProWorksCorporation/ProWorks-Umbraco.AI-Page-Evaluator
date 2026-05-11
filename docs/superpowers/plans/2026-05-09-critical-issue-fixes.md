# Critical Issue Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 10 critical issues identified in CODE-REVIEW-3.md — 5 production bugs and 5 security vulnerabilities — before the package ships to production consumers.

**Architecture:** Issues are fixed in isolation, ordered from least-coupled to most-coupled. Repository atomicity fixes (Tasks 4–5) wrap existing EF Core operations in `db.Database.BeginTransactionAsync`. Security fixes (Tasks 8–9) add new constructor parameters to the controller and new registration calls in the composer.

**Tech Stack:** C# .NET 10, EF Core 10.0.4, ASP.NET Core rate limiting, Umbraco 17.2.2 (`IContentService`, `IAuthorizationService`, `ContentPermissionResource`), xUnit, NSubstitute

---

## File Map

| Task | Files Modified |
|------|---------------|
| 1 | `Core/Evaluation/EvaluationReport.cs`, `Services/PageEvaluationService.cs`, `Tests/Services/PageEvaluationServiceTests.cs` |
| 2 | `Services/AIEvaluatorConfigService.cs`, `Tests/Services/AIEvaluatorConfigServiceTests.cs` |
| 3 | `Controllers/PageEvaluatorApiController.cs` |
| 4 | `Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs` |
| 5 | `Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs` |
| 6 | `Services/AIEvaluatorConfigService.cs`, `Tests/Services/AIEvaluatorConfigServiceTests.cs` |
| 7 | `Controllers/PageEvaluatorApiController.cs`, `Tests/Controllers/PageEvaluatorApiControllerTests.cs` |
| 8 | `Composers/PageEvaluatorComposer.cs`, `TestSite/Program.cs` |
| 9 | `Controllers/PageEvaluatorApiController.cs`, `Tests/Controllers/PageEvaluatorApiControllerTests.cs` |

---

## Task 1: Guard EvaluationScore against zero total (Issue 5)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluation/EvaluationReport.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs` (~line 390)
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs`

**Context:** When the AI returns `"score": {"passed": 0, "total": 0}`, `TryParseJson` creates `EvaluationScore(0, 0)`. Any caller computing a pass rate divides by zero. The fix is to (a) make `EvaluationReport.Parsed` accept `EvaluationScore?` to match the existing nullable `Score` property, and (b) skip creating a score when total is 0, falling back to the checks count instead.

- [ ] **Step 1: Write failing tests**

Add to `PageEvaluationServiceTests.cs`:

```csharp
[Fact]
public async Task EvaluateAsync_WhenAiReturnsZeroTotalScore_UsesFallbackCheckCount()
{
    // AI returns score:{passed:0,total:0} but has real checks — total should come from checks
    string json = """
        {
          "score": { "passed": 0, "total": 0 },
          "checks": [
            { "checkNumber": 1, "status": "Pass", "label": "Title" },
            { "checkNumber": 2, "status": "Fail", "label": "Meta", "explanation": "Missing." }
          ],
          "suggestions": null
        }
        """;
    SetupChatResponse(json);

    EvaluationReport report = await _sut.EvaluateAsync(_nodeId, _alias, _properties);

    Assert.NotNull(report.Score);
    Assert.Equal(2, report.Score!.Total);   // falls back to checks.Count
    Assert.Equal(1, report.Score.Passed);   // counts actual Pass statuses
}

[Fact]
public async Task EvaluateAsync_WhenAiReturnsZeroTotalAndNoChecks_ScoreIsNull()
{
    string json = """
        {
          "score": { "passed": 0, "total": 0 },
          "checks": [],
          "suggestions": null
        }
        """;
    SetupChatResponse(json);

    EvaluationReport report = await _sut.EvaluateAsync(_nodeId, _alias, _properties);

    // Empty result: either parse fails or score is null with empty checks
    Assert.True(report.ParseFailed || report.Score is null);
}
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "WhenAiReturnsZeroTotalScore_UsesFallbackCheckCount|WhenAiReturnsZeroTotalAndNoChecks_ScoreIsNull" --no-build
```

Expected: compile error or test failure.

- [ ] **Step 3: Make `EvaluationReport.Parsed` accept nullable `EvaluationScore`**

In `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluation/EvaluationReport.cs`, change the `Parsed` factory method signature:

```csharp
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
```

- [ ] **Step 4: Fix `TryParseJson` in `PageEvaluationService`**

In `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs`, replace lines ~464–471 (the final score computation block):

```csharp
// Old code (approximately lines 464–471):
// if (score is null && checks.Count == 0)
//     return null;
// int passCount = score?.Passed ?? checks.Count(c => c.Status == CheckStatus.Pass);
// int totalCount = score?.Total ?? checks.Count;
// EvaluationScore finalScore = new(passCount, totalCount);
// return EvaluationReport.Parsed(finalScore, checks, suggestions, overallScore, axisScores);

// Replace with:
if (score is null && checks.Count == 0)
    return null;

// If the AI returned total:0, treat it as absent and fall back to checks.Count.
int totalCount = (score?.Total > 0 ? score.Total : null) ?? checks.Count;
int passCount = (score?.Total > 0 ? score.Passed : null) ?? checks.Count(c => c.Status == CheckStatus.Pass);
EvaluationScore? finalScore = totalCount > 0 ? new EvaluationScore(passCount, totalCount) : null;

if (finalScore is null && checks.Count == 0)
    return null;

return EvaluationReport.Parsed(finalScore, checks, suggestions, overallScore, axisScores);
```

- [ ] **Step 5: Run tests to verify they pass**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "WhenAiReturnsZeroTotalScore_UsesFallbackCheckCount|WhenAiReturnsZeroTotalAndNoChecks_ScoreIsNull"
```

Expected: both tests pass.

- [ ] **Step 6: Run full test suite to confirm no regressions**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluation/EvaluationReport.cs
git add src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/PageEvaluationServiceTests.cs
git commit -m "fix: guard EvaluationScore against zero total from AI response"
```

---

## Task 2: Add PromptText maximum length validation (Issue 10)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs`

**Context:** `ValidateConfig` only checks that `PromptText` is non-empty. A multi-megabyte prompt is stored to the DB and sent to the AI on every evaluation, potentially exceeding the provider's context window. Add a 32 KB cap.

- [ ] **Step 1: Write failing test**

Add to `AIEvaluatorConfigServiceTests.cs`:

```csharp
[Fact]
public async Task CreateAsync_WhenPromptTextExceedsMaxLength_ThrowsArgumentException()
{
    var profileId = Guid.NewGuid();
    MockProfileExists(profileId);
    var config = NewConfig(profileId: profileId);
    config.PromptText = new string('x', 32_769); // one char over the 32 KB limit

    await Assert.ThrowsAsync<ArgumentException>(() =>
        _sut.CreateAsync(config, Guid.NewGuid()));
}

[Fact]
public async Task UpdateAsync_WhenPromptTextExceedsMaxLength_ThrowsArgumentException()
{
    var profileId = Guid.NewGuid();
    MockProfileExists(profileId);
    var existingId = Guid.NewGuid();
    var config = NewConfig(profileId: profileId);
    config.Id = existingId;
    config.PromptText = new string('x', 32_769);
    _repository.GetByIdAsync(existingId, Arg.Any<CancellationToken>())
        .Returns(NewConfig(profileId: profileId));

    await Assert.ThrowsAsync<ArgumentException>(() =>
        _sut.UpdateAsync(config, Guid.NewGuid()));
}
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "WhenPromptTextExceedsMaxLength"
```

Expected: fail (no length check exists yet).

- [ ] **Step 3: Add the constant and the length check**

In `src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs`, add a constant at the top of the class and update `ValidateConfig`:

```csharp
public sealed class AIEvaluatorConfigService : IAIEvaluatorConfigService
{
    // 32,768 characters ≈ 32 KB — prevents oversized prompts from bloating AI requests.
    private const int MaxPromptTextLength = 32_768;

    // ... existing fields ...

    private static void ValidateConfig(AIEvaluatorConfig config)
    {
        if (string.IsNullOrWhiteSpace(config.Name))
            throw new ArgumentException("Evaluator configuration name is required.", nameof(config));

        if (string.IsNullOrWhiteSpace(config.DocumentTypeAlias))
            throw new ArgumentException("Document type alias is required.", nameof(config));

        if (config.ProfileId == Guid.Empty)
            throw new ArgumentException("Profile ID is required.", nameof(config));

        if (string.IsNullOrWhiteSpace(config.PromptText))
            throw new ArgumentException("Prompt text is required.", nameof(config));

        if (config.PromptText.Length > MaxPromptTextLength)
            throw new ArgumentException(
                $"Prompt text must not exceed {MaxPromptTextLength:N0} characters.", nameof(config));
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "WhenPromptTextExceedsMaxLength"
```

Expected: both tests pass.

- [ ] **Step 5: Run full test suite**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs
git commit -m "fix: enforce 32 KB maximum length on PromptText to prevent oversized AI requests"
```

---

## Task 3: Add request size limit to the evaluate endpoint (Issue 9)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`

**Context:** `POST /evaluate` deserialises `Dictionary<string, object?>` values before the 2000-char truncation in `CleanProperties` runs. A request with multi-megabyte property values holds them fully in memory. A 1 MB request body cap prevents this.

- [ ] **Step 1: Add the `[RequestSizeLimit]` attribute**

In `PageEvaluatorApiController.cs`, add the attribute to `EvaluateAsync`. Add `using Microsoft.AspNetCore.Mvc;` if not present (it is already present). Add the attribute on the action:

```csharp
[HttpPost("evaluate")]
[EnableRateLimiting("PageEvaluatorEvaluate")]
[RequestSizeLimit(1 * 1024 * 1024)] // 1 MB cap on the evaluation request body
public async Task<IActionResult> EvaluateAsync(
    [FromBody] EvaluatePageRequest request,
    CancellationToken cancellationToken = default)
{
    // ... existing body unchanged ...
```

- [ ] **Step 2: Verify the attribute is present**

```powershell
dotnet build src/ProWorks.Umbraco.AI.PageEvaluator/ProWorks.Umbraco.AI.PageEvaluator.csproj
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
git commit -m "fix: add 1 MB request size limit to evaluate endpoint"
```

---

## Task 4: Make `SaveAsync` atomic — active-one rule race condition (Issue 1)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs`

**Context:** `SaveAsync` first calls `ExecuteUpdateAsync` to deactivate all other configs, then calls `SaveChangesAsync` to save the active one. These are two separate DB round-trips with no transaction. Two concurrent activate requests can interleave and leave two configs both `IsActive = true`. Wrapping both in `BeginTransactionAsync` makes the entire activation atomic.

- [ ] **Step 1: Wrap `SaveAsync` body in an explicit transaction**

Replace the `SaveAsync` method body in `EFCoreAIEvaluatorConfigRepository.cs`:

```csharp
public async Task SaveAsync(AIEvaluatorConfig config, CancellationToken cancellationToken = default)
{
    using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
    await scope.ExecuteWithContextAsync<object?>(async db =>
    {
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Active-one rule: deactivate all existing configs for this alias before saving.
            if (config.IsActive)
            {
                await db.EvaluatorConfigs
                    .Where(e => e.DocumentTypeAlias == config.DocumentTypeAlias && e.Id != config.Id)
                    .ExecuteUpdateAsync(
                        s => s.SetProperty(e => e.IsActive, false),
                        cancellationToken);
            }

            AIEvaluatorConfigEntity? existing = await db.EvaluatorConfigs
                .FirstOrDefaultAsync(e => e.Id == config.Id, cancellationToken);

            if (existing is null)
            {
                AIEvaluatorConfigEntity newEntity = AIEvaluatorConfigEntityFactory.ToEntity(config);
                newEntity.IsActive = true;
                db.EvaluatorConfigs.Add(newEntity);
            }
            else
            {
                // Set the original Version to the client-supplied value so EF Core's
                // concurrency check (WHERE Version = @original) detects conflicts.
                db.Entry(existing).Property(e => e.Version).OriginalValue = config.Version;
                AIEvaluatorConfigEntityFactory.ApplyToEntity(config, existing);
                existing.IsActive = true;
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

- [ ] **Step 2: Run the full test suite to confirm no regressions**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs
git commit -m "fix: wrap SaveAsync active-one rule in explicit transaction to prevent concurrent activation race"
```

---

## Task 5: Make `DeleteAsync` atomic — delete + promote not transactional (Issue 2)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs`

**Context:** `DeleteAsync` calls `SaveChangesAsync` to delete the record, then calls it again to promote the next config. A crash between the two calls leaves all configs for the doc type inactive (none is active). Wrapping both calls in a single transaction makes the delete + promote atomic.

- [ ] **Step 1: Wrap `DeleteAsync` body in an explicit transaction**

Replace the `DeleteAsync` method body:

```csharp
public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
{
    using IEfCoreScope<UmbracoAIPageEvaluatorDbContext> scope = _scopeProvider.CreateScope();
    await scope.ExecuteWithContextAsync<object?>(async db =>
    {
        AIEvaluatorConfigEntity? entity = await db.EvaluatorConfigs
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (entity is null)
            return null;

        bool wasActive = entity.IsActive;
        string alias = entity.DocumentTypeAlias;

        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            db.EvaluatorConfigs.Remove(entity);
            await db.SaveChangesAsync(cancellationToken);

            // If the deleted record was active, promote the next most-recent one.
            if (wasActive)
            {
                AIEvaluatorConfigEntity? next = await db.EvaluatorConfigs
                    .Where(e => e.DocumentTypeAlias == alias)
                    .OrderByDescending(e => e.DateModified)
                    .FirstOrDefaultAsync(cancellationToken);

                if (next is not null)
                {
                    next.IsActive = true;
                    await db.SaveChangesAsync(cancellationToken);
                }
            }

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

- [ ] **Step 2: Run the full test suite**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/EFCoreAIEvaluatorConfigRepository.cs
git commit -m "fix: wrap DeleteAsync delete+promote in explicit transaction to prevent partial state on crash"
```

---

## Task 6: Fix stale `Version` returned from `UpdateAsync` (Issue 4)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs`

**Context:** `ApplyToEntity` stores `domain.Version + 1` to the DB. But `UpdateAsync` returns the original domain object, which still has `Version = N`. The controller builds the API response from this stale object and sends `version: N` to the client. The next update from that client (using the response version as its concurrency token) will 409 because the DB already has `N+1`. Fix: increment `config.Version` in `UpdateAsync` after the repository save to reflect what was committed.

- [ ] **Step 1: Write the failing test**

Add to `AIEvaluatorConfigServiceTests.cs`:

```csharp
[Fact]
public async Task UpdateAsync_ReturnsVersionIncrementedByOne()
{
    var profileId = Guid.NewGuid();
    MockProfileExists(profileId);
    var configId = Guid.NewGuid();
    var config = NewConfig(profileId: profileId);
    config.Id = configId;
    config.Version = 3;

    _repository.GetByIdAsync(configId, Arg.Any<CancellationToken>())
        .Returns(NewConfig(profileId: profileId));

    var result = await _sut.UpdateAsync(config, Guid.NewGuid());

    Assert.Equal(4, result.Version); // committed Version is input+1
}
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "UpdateAsync_ReturnsVersionIncrementedByOne"
```

Expected: fails (current code returns Version = 3, not 4).

- [ ] **Step 3: Fix `UpdateAsync` to increment version after save**

In `AIEvaluatorConfigService.cs`, change the end of `UpdateAsync` from:

```csharp
        await _repository.SaveAsync(config, cancellationToken);
        return config;
```

to:

```csharp
        await _repository.SaveAsync(config, cancellationToken);
        config.Version += 1; // Reflect what ApplyToEntity committed to the DB (domain.Version + 1).
        return config;
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "UpdateAsync_ReturnsVersionIncrementedByOne"
```

Expected: passes.

- [ ] **Step 5: Run full test suite**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator/Services/AIEvaluatorConfigService.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Services/AIEvaluatorConfigServiceTests.cs
git commit -m "fix: return incremented Version from UpdateAsync so the client receives the committed version"
```

---

## Task 7: Catch `DbUpdateConcurrencyException` in `ActivateConfigurationAsync` (Issue 3)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`

**Context:** `ActivateConfigurationAsync` calls `_configService.UpdateAsync`, which in turn calls the repository's `SaveAsync`. Under concurrent edits, EF Core throws `DbUpdateConcurrencyException`. `UpdateConfigurationAsync` already catches it and returns 409. `ActivateConfigurationAsync` does not — so it surfaces as an unhandled 500.

- [ ] **Step 1: Write the failing test**

Add to `PageEvaluatorApiControllerTests.cs`. First add the required using at the top of the file if not present:
```csharp
using Microsoft.EntityFrameworkCore;
```

Then add the test:

```csharp
[Fact]
public async Task ActivateConfigurationAsync_WhenConcurrencyConflict_Returns409()
{
    var id = Guid.NewGuid();
    var existing = new AIEvaluatorConfig
    {
        Id = id,
        Name = "Test",
        DocumentTypeAlias = "blogPost",
        ProfileId = Guid.NewGuid(),
        PromptText = "Evaluate.",
        IsActive = false,
        Version = 2,
    };

    _configService.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(existing);
    _configService.UpdateAsync(Arg.Any<AIEvaluatorConfig>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
        .ThrowsAsync(new DbUpdateConcurrencyException("Concurrency conflict."));

    IActionResult result = await _sut.ActivateConfigurationAsync(id);

    var conflict = Assert.IsType<ConflictObjectResult>(result);
    Assert.Equal(409, conflict.StatusCode);
}
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "ActivateConfigurationAsync_WhenConcurrencyConflict_Returns409"
```

Expected: fails (unhandled exception, not 409).

- [ ] **Step 3: Add the catch block to `ActivateConfigurationAsync`**

In `PageEvaluatorApiController.cs`, replace `ActivateConfigurationAsync` with:

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
        existing.IsActive = true;
        AIEvaluatorConfig updated = await _configService.UpdateAsync(existing, GetCurrentUserKey(), cancellationToken);
        await _cacheRepository.DeleteByDocumentTypeAliasAsync(updated.DocumentTypeAlias, cancellationToken);
        return Ok(await ToResponseAsync(updated, cancellationToken));
    }
    catch (DbUpdateConcurrencyException)
    {
        return Conflict(new { title = "This configuration was modified by another user. Please reload and try again." });
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests --filter "ActivateConfigurationAsync_WhenConcurrencyConflict_Returns409"
```

Expected: passes.

- [ ] **Step 5: Run full test suite**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs
git commit -m "fix: catch DbUpdateConcurrencyException in ActivateConfigurationAsync and return 409"
```

---

## Task 8: Register the rate limiter policy in the package composer (Issue 7)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs`
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/Program.cs`

**Context:** `[EnableRateLimiting("PageEvaluatorEvaluate")]` on `EvaluateAsync` silently has no effect unless both (a) a rate-limit policy with that name is registered via `AddRateLimiter` and (b) `UseRateLimiter()` is in the middleware pipeline. Neither is done anywhere. The package must register the default policy; consuming apps must call `UseRateLimiter()`.

- [ ] **Step 1: Add `AddRateLimiter` to the composer**

Add the required using to `PageEvaluatorComposer.cs`:
```csharp
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
```

Update `Compose`:

```csharp
public void Compose(IUmbracoBuilder builder)
{
    // Persistence layer: EFCore repository + migration handler.
    builder.AddUmbracoAIPageEvaluatorPersistence();

    // Application services.
    builder.Services.AddScoped<IAIEvaluatorConfigService, AIEvaluatorConfigService>();
    builder.Services.AddScoped<IPageEvaluationService, PageEvaluationService>();

    // Rate limiter: 10 AI evaluation requests per user per minute (per back-office user key).
    // Consuming apps must call app.UseRateLimiter() in their middleware pipeline.
    builder.Services.AddRateLimiter(options =>
        options.AddFixedWindowLimiter("PageEvaluatorEvaluate", o =>
        {
            o.PermitLimit = 10;
            o.Window = TimeSpan.FromMinutes(1);
            o.QueueLimit = 0;
        })
    );

    // Invalidate cached evaluations when content is published.
    builder.AddNotificationAsyncHandler<ContentPublishedNotification, ContentPublishedNotificationHandler>();
}
```

- [ ] **Step 2: Add `UseRateLimiter()` to the TestSite pipeline**

In `src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/Program.cs`, add `app.UseRateLimiter()` before `app.UseUmbraco()`:

```csharp
WebApplication app = builder.Build();

await app.BootUmbracoAsync();

app.UseRateLimiter(); // Required for [EnableRateLimiting] attributes to be enforced.

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();
```

- [ ] **Step 3: Build the TestSite to verify no compilation errors**

```powershell
dotnet build src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/ProWorks.Umbraco.AI.PageEvaluator.TestSite.csproj
```

Expected: build succeeds.

- [ ] **Step 4: Run full test suite**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs
git add src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/Program.cs
git commit -m "fix: register PageEvaluatorEvaluate rate limiter policy in composer; wire UseRateLimiter in TestSite"
```

---

## Task 9: Add content node authorization to the evaluate endpoints (Issues 6 & 8)

**Files:**
- Modify: `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs`
- Test: `tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs`

**Context:** `POST /evaluate` and `GET /evaluate/cached/{nodeId}` do not verify whether the requesting back-office user has permission to access the content node being evaluated. Any valid back-office user can evaluate or retrieve cached analysis for any node. Fix: look up the content node via `IContentService` and authorize using Umbraco's `ContentPermissionResource` / `ContentPermissionByResource` policy. As a side effect, the canonical `DocumentTypeAlias` is read from the node instead of trusted from the client (fixes Issue 8).

**New using statements required** at top of `PageEvaluatorApiController.cs`:
```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Cms.Core.Services;
```

- [ ] **Step 1: Write failing tests**

First, update the test class fields and constructor in `PageEvaluatorApiControllerTests.cs` to add the two new dependencies:

```csharp
// Add these two fields alongside the existing mocks:
private readonly IContentService _contentService = Substitute.For<IContentService>();
private readonly IAuthorizationService _authorizationService = Substitute.For<IAuthorizationService>();
```

Update the constructor to wire the defaults needed for all existing tests to keep passing, and to pass the new mocks to the SUT. Note that the controller constructor signature will change in Step 3 — for now, add the fields and update this after Step 3:

```csharp
public PageEvaluatorApiControllerTests()
{
    // Default: any node exists and any user is authorized (so existing tests are unaffected)
    var defaultContent = Substitute.For<IContent>();
    defaultContent.ContentType.Alias.Returns("blogPost");
    _contentService.GetById(Arg.Any<Guid>()).Returns(defaultContent);
    _authorizationService
        .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object>(), Arg.Any<string>())
        .Returns(AuthorizationResult.Success());

    // Constructor call updated in Step 3 after the controller signature changes.
    _sut = new PageEvaluatorApiController(
        _evaluationService, _configService, _profileService, _contextService,
        _contentTypeService, _cacheRepository, _logger,
        _contentService, _authorizationService);  // NEW parameters

    _sut.ControllerContext = new ControllerContext
    {
        HttpContext = new DefaultHttpContext(),
    };
}
```

Add the new authorization-specific tests:

```csharp
// ---------------------------------------------------------------------------
// POST /evaluate — authorization
// ---------------------------------------------------------------------------

[Fact]
public async Task EvaluateAsync_WhenContentNodeNotFound_Returns404()
{
    var request = new EvaluatePageRequest
    {
        NodeId = Guid.NewGuid(),
        DocumentTypeAlias = "blogPost",
        Properties = new(),
    };

    _contentService.GetById(request.NodeId).Returns((IContent?)null);

    IActionResult result = await _sut.EvaluateAsync(request);

    Assert.IsType<NotFoundObjectResult>(result);
    // Evaluation service must NOT have been called.
    await _evaluationService.DidNotReceive()
        .EvaluateAsync(Arg.Any<Guid>(), Arg.Any<string>(),
            Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>());
}

[Fact]
public async Task EvaluateAsync_WhenUserLacksPermission_Returns403()
{
    var nodeId = Guid.NewGuid();
    var content = Substitute.For<IContent>();
    content.ContentType.Alias.Returns("blogPost");
    _contentService.GetById(nodeId).Returns(content);

    _authorizationService
        .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object>(), Arg.Any<string>())
        .Returns(AuthorizationResult.Failed());

    var request = new EvaluatePageRequest { NodeId = nodeId, DocumentTypeAlias = "blogPost", Properties = new() };
    IActionResult result = await _sut.EvaluateAsync(request);

    var statusResult = Assert.IsType<ObjectResult>(result);
    Assert.Equal(403, statusResult.StatusCode);
}

[Fact]
public async Task EvaluateAsync_UsesCanonicalDocTypeAliasFromContentNode_NotClientSupplied()
{
    // Client claims "wrongAlias" but the content node's actual type is "blogPost"
    var nodeId = Guid.NewGuid();
    var content = Substitute.For<IContent>();
    content.ContentType.Alias.Returns("blogPost"); // canonical alias
    _contentService.GetById(nodeId).Returns(content);

    _evaluationService
        .EvaluateAsync(nodeId, "blogPost", Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>())
        .Returns(EvaluationReport.Parsed(new EvaluationScore(1, 1), [], null));

    var request = new EvaluatePageRequest
    {
        NodeId = nodeId,
        DocumentTypeAlias = "wrongAlias", // client sends wrong alias
        Properties = new(),
    };
    IActionResult result = await _sut.EvaluateAsync(request);

    // Evaluation was called with the canonical alias, not the client-supplied one
    await _evaluationService.Received(1)
        .EvaluateAsync(nodeId, "blogPost", Arg.Any<IReadOnlyDictionary<string, object?>>(), Arg.Any<CancellationToken>());
    Assert.IsType<OkObjectResult>(result);
}

// ---------------------------------------------------------------------------
// GET /evaluate/cached/{nodeId} — authorization
// ---------------------------------------------------------------------------

[Fact]
public async Task GetCachedEvaluationAsync_WhenContentNodeNotFound_Returns404()
{
    var nodeId = Guid.NewGuid();
    _contentService.GetById(nodeId).Returns((IContent?)null);

    IActionResult result = await _sut.GetCachedEvaluationAsync(nodeId);

    Assert.IsType<NotFoundObjectResult>(result);
    // Cache must NOT have been queried.
    await _cacheRepository.DidNotReceive().GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
}

[Fact]
public async Task GetCachedEvaluationAsync_WhenUserLacksPermission_Returns403()
{
    var nodeId = Guid.NewGuid();
    var content = Substitute.For<IContent>();
    content.ContentType.Alias.Returns("blogPost");
    _contentService.GetById(nodeId).Returns(content);

    _authorizationService
        .AuthorizeAsync(Arg.Any<ClaimsPrincipal>(), Arg.Any<object>(), Arg.Any<string>())
        .Returns(AuthorizationResult.Failed());

    IActionResult result = await _sut.GetCachedEvaluationAsync(nodeId);

    var statusResult = Assert.IsType<ObjectResult>(result);
    Assert.Equal(403, statusResult.StatusCode);
}
```

- [ ] **Step 2: Run tests to verify they fail (compile errors expected until Step 3)**

```powershell
dotnet build tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: compile error — controller constructor does not accept 9 parameters yet.

- [ ] **Step 3: Update the controller constructor and inject `IContentService` + `IAuthorizationService`**

In `PageEvaluatorApiController.cs`, add the two new fields and update the constructor. Add the new using statements at the top of the file:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Umbraco.Cms.Core.Actions;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Cms.Core.Services;
```

Add new fields alongside the existing ones:

```csharp
private readonly IContentService _contentService;
private readonly IAuthorizationService _authorizationService;
```

Update the constructor:

```csharp
public PageEvaluatorApiController(
    IPageEvaluationService evaluationService,
    IAIEvaluatorConfigService configService,
    IAIProfileService profileService,
    IAIContextService contextService,
    IContentTypeService contentTypeService,
    IEvaluationCacheRepository cacheRepository,
    ILogger<PageEvaluatorApiController> logger,
    IContentService contentService,
    IAuthorizationService authorizationService)
{
    _evaluationService = evaluationService;
    _configService = configService;
    _profileService = profileService;
    _contextService = contextService;
    _contentTypeService = contentTypeService;
    _cacheRepository = cacheRepository;
    _logger = logger;
    _contentService = contentService;
    _authorizationService = authorizationService;
}
```

- [ ] **Step 4: Add the authorization guard to `EvaluateAsync`**

Replace the body of `EvaluateAsync` up to (but not including) the try/catch block. The new check goes at the top of the action, before the existing try block:

```csharp
[HttpPost("evaluate")]
[EnableRateLimiting("PageEvaluatorEvaluate")]
[RequestSizeLimit(1 * 1024 * 1024)]
public async Task<IActionResult> EvaluateAsync(
    [FromBody] EvaluatePageRequest request,
    CancellationToken cancellationToken = default)
{
    // Verify the content node exists and the requesting user has Browse access.
    IContent? content = _contentService.GetById(request.NodeId);
    if (content is null)
        return NotFound(new { title = $"Content node '{request.NodeId}' not found." });

    AuthorizationResult authResult = await _authorizationService.AuthorizeAsync(
        User,
        ContentPermissionResource.WithKeys(ActionBrowse.ActionLetter, request.NodeId),
        AuthorizationPolicies.ContentPermissionByResource);
    if (!authResult.Succeeded)
        return StatusCode(StatusCodes.Status403Forbidden,
            new { title = "You do not have permission to evaluate this content node." });

    // Use the canonical alias from the DB, not the client-supplied value.
    string documentTypeAlias = content.ContentType.Alias;

    try
    {
        EvaluationReport report = await _evaluationService.EvaluateAsync(
            request.NodeId,
            documentTypeAlias,
            request.Properties,
            cancellationToken);

        DateTime cachedAt = DateTime.UtcNow;
        await _cacheRepository.SaveAsync(new EvaluationCacheEntry
        {
            NodeId = request.NodeId,
            DocumentTypeAlias = documentTypeAlias,
            Report = report,
            CachedAt = cachedAt,
        }, cancellationToken);

        return Ok(report.WithCachedAt(cachedAt));
    }
    catch (InvalidOperationException ex)
    {
        return NotFound(new { title = ex.Message });
    }
    catch (HttpRequestException ex)
    {
        _logger.LogError(ex, "[PageEvaluator] AI provider error during evaluation of node {NodeId}.", request.NodeId);
        return StatusCode(502, new
        {
            title = "The AI provider returned an error. Please try again later.",
        });
    }
    catch (Exception ex) when (ex is not OperationCanceledException)
    {
        _logger.LogError(ex, "[PageEvaluator] Unexpected error during evaluation of node {NodeId}.", request.NodeId);
        return StatusCode(500, new
        {
            title = "An unexpected error occurred during evaluation. Please try again later.",
        });
    }
}
```

- [ ] **Step 5: Add the authorization guard to `GetCachedEvaluationAsync`**

Replace `GetCachedEvaluationAsync` with:

```csharp
[HttpGet("evaluate/cached/{nodeId:guid}")]
public async Task<IActionResult> GetCachedEvaluationAsync(
    Guid nodeId,
    CancellationToken cancellationToken = default)
{
    // Verify the content node exists and the requesting user has Browse access.
    IContent? content = _contentService.GetById(nodeId);
    if (content is null)
        return NotFound(new { title = $"Content node '{nodeId}' not found." });

    AuthorizationResult authResult = await _authorizationService.AuthorizeAsync(
        User,
        ContentPermissionResource.WithKeys(ActionBrowse.ActionLetter, nodeId),
        AuthorizationPolicies.ContentPermissionByResource);
    if (!authResult.Succeeded)
        return StatusCode(StatusCodes.Status403Forbidden,
            new { title = "You do not have permission to view the cached evaluation for this content node." });

    EvaluationCacheEntry? entry = await _cacheRepository.GetAsync(nodeId, cancellationToken);
    if (entry is null)
        return NotFound(new { title = $"No cached evaluation for node '{nodeId}'." });

    return Ok(entry.Report.WithCachedAt(entry.CachedAt));
}
```

- [ ] **Step 6: Run tests to verify all new and existing tests pass**

```powershell
dotnet test tests/ProWorks.Umbraco.AI.PageEvaluator.Tests
```

Expected: all tests pass, including the new authorization tests and all existing evaluate/cache tests.

- [ ] **Step 7: Build the full solution to verify no regressions elsewhere**

```powershell
dotnet build src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/ProWorks.Umbraco.AI.PageEvaluator.TestSite.csproj
```

Expected: build succeeds (Umbraco DI auto-resolves the new constructor parameters from the service container).

- [ ] **Step 8: Commit**

```powershell
git add src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs
git add tests/ProWorks.Umbraco.AI.PageEvaluator.Tests/Controllers/PageEvaluatorApiControllerTests.cs
git commit -m "fix: add content node authorization to evaluate endpoints; use canonical document type alias from node"
```

---

## Self-Review

### Spec coverage

| Issue | Task | Status |
|-------|------|--------|
| 1. Race condition: concurrent activate → both IsActive=true | Task 4 | Covered |
| 2. Delete + promote not atomic | Task 5 | Covered |
| 3. Unhandled DbUpdateConcurrencyException in Activate | Task 7 | Covered |
| 4. Stale Version returned from Activate | Task 6 | Covered |
| 5. EvaluationScore Total==0 divide-by-zero | Task 1 | Covered |
| 6. No node-level auth on evaluate endpoints | Task 9 | Covered |
| 7. Rate limiter silently no-op | Task 8 | Covered |
| 8. Client-supplied DocumentTypeAlias trusted in cache | Task 9 | Covered (canonical alias used) |
| 9. No payload size limit on Properties | Task 3 | Covered |
| 10. PromptText has no server-side length cap | Task 2 | Covered |

### Placeholder scan

No TBDs, TODOs, or incomplete steps found.

### Type consistency

- `EvaluationScore?` (nullable) used consistently after Task 1 change to `Parsed` signature.
- `IContent`, `IAuthorizationService`, `ContentPermissionResource`, `ActionBrowse`, `AuthorizationPolicies` — all from `Umbraco.Cms.Core` / `Umbraco.Cms.Web.Common` which are already referenced by the project.
- `AuthorizationResult.Success()` / `AuthorizationResult.Failed()` — from `Microsoft.AspNetCore.Authorization`, already in scope.
- `IContentService.GetById(Guid)` — uses the GUID overload matching the `nodeId: Guid` parameter. ✓
