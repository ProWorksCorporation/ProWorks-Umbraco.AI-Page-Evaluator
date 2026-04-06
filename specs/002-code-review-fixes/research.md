# Research: Code Review Fixes

## R1: IAIChatService API (Issue #9)

**Decision**: Use `IAIChatService.GetChatResponseAsync(Action<AIChatBuilder>, messages, ct)` from `Umbraco.AI.Core.Chat`.

**Rationale**: This is the higher-level abstraction that publishes `AIChatExecutingNotification` / `AIChatExecutedNotification`, provides telemetry, and duration tracking. The builder pattern (`AIChatBuilder`) allows setting profile, chat options, and context items fluently.

**Key API**:
```csharp
// Namespace: Umbraco.AI.Core.Chat
Task<ChatResponse> GetChatResponseAsync(
    Action<AIChatBuilder> configure,
    IEnumerable<ChatMessage> messages,
    CancellationToken cancellationToken = default);
```

**AIChatBuilder methods** (namespace `Umbraco.AI.Core.InlineChat`):
- `.WithAlias(string)` — identifier for telemetry
- `.WithProfile(Guid profileId)` — selects the AI profile
- `.WithChatOptions(ChatOptions)` — temperature, max tokens, response format, tools
- `.WithContextItems(IEnumerable<AIRequestContextItem>)` — inject context resources

**Alternatives considered**: Keep `IAIChatClientFactory` directly — rejected because it bypasses the Umbraco notification/telemetry pipeline.

## R2: AIContext Resource Resolution (Issue #1)

**Decision**: Manually iterate `AIContext.Resources` and format `Always`-mode resources into the system prompt. Do NOT use `IAIContextProcessor` (it resolves to internal/complex types). Do NOT use the `AIContextInjectingChatMiddleware` because the current code explicitly disables tools to avoid a known bug.

**Rationale**: `AIContext.Resources` is an `IList<AIContextResource>`. Each resource has:
- `Name` (string) — display name
- `Description` (string?) — optional description
- `Settings` (object?) — type-specific settings (the actual content)
- `InjectionMode` — `Always` (inject in prompt) or `OnDemand` (tool-based, skip for now)

The `Settings` object for text-type resources contains the actual content. For safety, serialize `Settings` to string and include it. Filter to `InjectionMode == Always` only.

**Combined approach with R1**: When using `IAIChatService`, also pass context items via `AIChatBuilder.WithContextItems()` if `AIRequestContextItem` can be constructed from our resources. If not feasible, fall back to manual prompt injection.

**Alternatives considered**:
- `IAIContextProcessor.ProcessContextForLlmAsync()` — would be ideal but the resolved types are complex; manual iteration is simpler and more transparent.
- Let middleware handle it — rejected because `Tools = []` is required to avoid an argument-type mismatch bug in the current Umbraco.AI build.

## R3: User Identity in Umbraco 17 (Issue #15)

**Decision**: Use `HttpContext.User.Identity?.GetUserKey()` extension method.

**Rationale**: Umbraco 17 stores the user GUID in the `"sub"` claim (`Constants.Security.OpenIdDictSubClaimType`). The `GetUserKey()` extension method on `IIdentity` (from `Umbraco.Extensions`) parses this claim and returns `Guid?`.

**Implementation**:
```csharp
private Guid GetCurrentUserId()
    => HttpContext.User.Identity?.GetUserKey() ?? Guid.Empty;
```

**Alternatives considered**: Manual claim parsing via `FindFirst("sub")` — rejected; the extension method is the canonical Umbraco approach.

## R4: Authorization Policies (Issue #6)

**Decision**: Use `AuthorizationPolicies.SectionAccessSettings` for configuration CRUD endpoints.

**Rationale**: This policy is defined in `Umbraco.Cms.Web.Common.Authorization` and restricts to users who have access to the Settings section. It's the standard Umbraco policy for admin-level operations.

**Implementation**: Add `[Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]` to configuration CRUD action methods. Keep `BackOfficeAccess` on the controller class for evaluate/cache endpoints.

**Alternatives considered**: Custom policy — rejected; `SectionAccessSettings` is the correct granularity.

## R5: Rate Limiting (Issue #7)

**Decision**: Use ASP.NET Core `Microsoft.AspNetCore.RateLimiting` middleware with a fixed-window per-user-per-node policy.

**Rationale**: Built into ASP.NET Core, no additional packages needed. Configure via `AddRateLimiter()` in the composer. The rate limit key combines user ID + node ID. Default: 1 request per 30 seconds, configurable via appsettings section `ProWorks:AI:PageEvaluator:RateLimitSeconds`.

**Implementation approach**:
- Register `RateLimiterOptions` with a named policy `"PageEvaluatorEvaluate"`
- Apply `[EnableRateLimiting("PageEvaluatorEvaluate")]` on `POST /evaluate`
- Use `FixedWindowRateLimiter` with `PermitLimit = 1, Window = TimeSpan.FromSeconds(config)`
- Partition key: `{userId}:{nodeId}` extracted from claims + request body

**Alternatives considered**: Custom middleware — rejected; the built-in rate limiter is well-tested and configurable.

## R6: Content Publish Cache Invalidation (Issue #14)

**Decision**: Use a `ContentPublishedNotification` handler that deletes cache entries by node ID.

**Rationale**: Simpler than hash comparison. When content is published, delete the cache row for that node's `NodeId`. The next evaluation modal open will trigger a fresh evaluation.

**Implementation**: Add `ContentPublishedNotificationHandler` that iterates published entities, extracts the node key, and calls `_cacheRepository.DeleteAsync(nodeKey, ct)`.

**Alternatives considered**: Hash comparison on read — more precise (avoids invalidation when non-evaluated properties change) but adds complexity. The notification handler approach is simpler and the cost of an unnecessary re-evaluation is low.
