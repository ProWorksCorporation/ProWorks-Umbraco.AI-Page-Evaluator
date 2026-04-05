# Quickstart: Code Review Fixes

## Prerequisites

- .NET 10 SDK
- Node.js 20+
- Umbraco.AI packages v1.7.0+

## Build & Test

```bash
# Full solution build
dotnet build src/ProWorks.Umbraco.AI.PageEvaluator.TestSite

# Run C# tests
dotnet test

# Client build (after TypeScript changes)
cd src/ProWorks.Umbraco.AI.PageEvaluator.Client
npm run build

# Run test site
# Open in Visual Studio → Set TestSite as startup → F5 (IIS Express)
```

## Phase-Specific Notes

### Phase 1 (Critical Fixes)
Files to modify:
- `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs` — context resolution, logging
- `src/ProWorks.Umbraco.AI.PageEvaluator/Composers/PageEvaluatorComposer.cs` — remove BuildServiceProvider

**Verify**: Run test site, trigger an evaluation with a context configured. Check logs for metadata-only at Information level.

### Phase 2 (Security Hardening)
Files to modify:
- `src/ProWorks.Umbraco.AI.PageEvaluator/Controllers/PageEvaluatorApiController.cs` — exception handling, auth, user ID, prompt injection preamble

**Verify**: Log in as non-admin user, attempt POST /configurations → expect 403. Run evaluation with malicious prompt text → expect objective evaluation.

### Phase 3 (AI Best Practices)
Files to modify:
- `src/ProWorks.Umbraco.AI.PageEvaluator/Services/PageEvaluationService.cs` — IAIChatService, chat options, prompt dedup

**Verify**: Run evaluation, check that temperature=0 and JSON response format are set. Verify notifications fire (add a temporary handler or check telemetry).

### Phase 4 (Cost Optimization)
Files to modify:
- Domain: `src/ProWorks.Umbraco.AI.PageEvaluator.Core/Evaluators/AIEvaluatorConfig.cs`
- Entity: `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/AIEvaluatorConfigEntity.cs`
- Factory: `src/ProWorks.Umbraco.AI.PageEvaluator.Persistence/Evaluators/AIEvaluatorConfigEntityFactory.cs`
- Migrations: Both SQLite and SQL Server projects
- Controller DTOs: `PageEvaluatorApiController.cs`
- Service: `PageEvaluationService.cs` — property filtering, content truncation, HTML stripping
- Client: `evaluator-form.element.ts`, `types.ts`, `api-client.ts`
- New: Notification handler for `ContentPublishedNotification`

**Verify**: Configure property aliases on an evaluator, run evaluation, verify only selected properties in prompt. Publish content, verify cache invalidated.

### Phase 5 (Cleanup)
Files to modify:
- `PageEvaluatorApiController.cs` — base class change, rate limiting attribute
- `PageEvaluatorComposer.cs` — rate limiter registration
- `entry-point.ts` — type signatures
- `appsettings.json` (test site) — rate limit config

**Verify**: Build with zero obsolete warnings. Rapidly trigger evaluations → expect 429 on second request.

## Regenerating Migrations (Phase 4)

```bash
# Delete existing migration files first, then:
dotnet ef migrations add AddPropertyAliases \
  --project src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite \
  --context UmbracoAIPageEvaluatorDbContext

dotnet ef migrations add AddPropertyAliases \
  --project src/ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer \
  --context UmbracoAIPageEvaluatorDbContext
```

## Test Site Access

- URL: https://localhost:44318/umbraco
- Login: admin@example.com / SecureP@ssw0rd!
