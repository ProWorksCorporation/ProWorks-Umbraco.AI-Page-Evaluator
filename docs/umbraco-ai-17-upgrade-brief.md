# Upgrade Brief: Umbraco.AI 1.12.0 → 17.0.0 (Page Evaluator)

**Purpose**: Input document for spec-kit to generate a spec for upgrading ProWorks.Umbraco.AI.PageEvaluator from the Umbraco.AI 1.12.0 ecosystem to the 17.0.0 (CMS-aligned) release line.

**Comparison basis**: Local checkout `C:\Repositories\Umbraco.AI` (core 1.12.0, 2026-05-21) vs `C:\Repositories\umbraco.ai-latest` (`feature/v17-main`, release 2026.06.4, 2026-06-22). Changes span Umbraco.AI 1.13.0 → 1.14.0 → 17.0.0.

---

## 1. Version deltas

| Package (currently referenced) | Current | Target |
|---|---|---|
| Umbraco.AI (meta / Core / Startup / Web) | 1.12.0 | 17.0.0 |
| Umbraco.AI.Anthropic | 1.3.4 | 17.0.0 |
| Umbraco.AI.OpenAI | 1.2.4 | 17.0.0 |
| Umbraco.AI.Prompt | 1.8.6 | 17.0.0 |
| Umbraco.AI.Agent | 1.10.2 | 17.0.0 |
| Umbraco.AI.Agent.Copilot | 1.0.0 | 17.0.0 |
| Microsoft.Extensions.AI (+ Abstractions, + OpenAI) | 10.6.0 (pinned) | **10.7.0 minimum** |
| Anthropic SDK (transitive) | 12.20.1 floor | 12.29.1 floor |
| Umbraco CMS | 17.4.2 | unchanged — 17.0.0 line still targets `[17.4.0, 18)` |
| EF Core | 10.0.6 | unchanged |

Versioning note: Umbraco.AI adopted CMS-aligned major versioning; 17.0.0 succeeds 1.14.0. It is a major bump but most public APIs are unchanged (see §4).

---

## 2. REQUIRED code changes

### 2.1 Controller exception handling — provider error classification (breaking in practice)

Umbraco.AI 17.0.0 wraps every provider chat client in an `AIErrorClassifyingChatClient` decorator (innermost, directly around the provider SDK client). Provider SDK exceptions **no longer escape `IAIChatService` raw**. Instead, callers receive:

- `Umbraco.AI.Core.Providers.Errors.AIProviderException`
  - `Info` : `AIProviderErrorInfo` record (`Category`, `UserMessage`, `ProviderCode`, `RawMessage`)
  - `Category` : `AIProviderErrorCategory` enum — `Unknown`, `Transient` (HTTP 502/503/504/529, Anthropic `overloaded_error` incl. mid-stream SSE), `RateLimited` (429), `Authentication` (401/403), `InvalidRequest` (400), `NotFound` (404), `Cancelled`, `NetworkError` (DNS/TLS/connection failures)
  - `UserMessage` is safe to render to end users; original exception preserved as `InnerException`
  - `OperationCanceledException` still propagates unwrapped; already-classified exceptions are never double-wrapped

**Impact on `PageEvaluatorApiController`** — both the `POST /evaluate` (catch chain at ~line 367) and `POST /recommend` (~line 467) endpoints:

| Existing catch | Current mapping | After upgrade |
|---|---|---|
| `catch (HttpRequestException)` | 502 | **Dead code** — arrives as `AIProviderException` (`NetworkError`) |
| `catch (Exception) when name ends with "5xxException"` | 503 | **Dead code** — Anthropic 5xx/529 arrives as `AIProviderException` (`Transient`) |
| `catch (AIGuardrailBlockedException)` | 422 | Still valid — type unchanged (see §4) |
| generic `catch (Exception)` | 500 | Would now swallow all provider errors as 500 |

**Required change**: replace the `HttpRequestException` and `"5xxException"` name-sniffing catches with a single `catch (AIProviderException ex)` that branches on `ex.Category`. Suggested mapping (to be confirmed in spec):

- `Transient`, `RateLimited` → 503 (safe to retry; consider `Retry-After` for `RateLimited`)
- `NetworkError` → 502
- `Authentication`, `InvalidRequest`, `NotFound`, `Unknown` → 500 (or finer-grained if desired)
- Use `ex.UserMessage` as the ProblemDetails title (user-safe by design — removes the current "don't leak provider detail" workaround)
- Keep guardrail (422) and `OperationCanceledException` behavior unchanged

**Test impact**:
- `Fake5xxException` helper (type-name suffix trick) becomes obsolete — replace with real `AIProviderException` instances constructed with the desired `AIProviderErrorInfo`
- Tests asserting 502 on `HttpRequestException` need rework
- Add coverage for each `AIProviderErrorCategory` → HTTP status mapping

**Doc impact**: CLAUDE.md "Controller" section describes the 502/`5xxException`/503 behavior — must be rewritten to describe the category-based mapping.

### 2.2 Microsoft.Extensions.AI pin bump

Umbraco.AI 17.0.0 requires M.E.AI `[10.7.0, 10.999.999)`. The Page Evaluator pins **10.6.0** in:

- `src/ProWorks.Umbraco.AI.PageEvaluator/ProWorks.Umbraco.AI.PageEvaluator.csproj` (`Microsoft.Extensions.AI`, `Microsoft.Extensions.AI.Abstractions`)
- `src/ProWorks.Umbraco.AI.PageEvaluator.TestSite/ProWorks.Umbraco.AI.PageEvaluator.TestSite.csproj` (adds `Microsoft.Extensions.AI.OpenAI`)

Bump all pins to 10.7.0 (keep `Microsoft.Extensions.AI` == `Microsoft.Extensions.AI.Abstractions` — mismatch causes `TypeLoadException`). Update the pin-rationale comments and the CLAUDE.md "Package Version Constraints" section.

### 2.3 Configuration `$` references now default-deny (breaking, from 1.14.0)

`$` configuration references in connection/model settings only resolve from `Umbraco:AI:Secrets` and `Umbraco:AI:Variables`. Anything else (e.g. `$Anthropic:ApiKey`, `$OpenAI:ApiKey`) silently stops resolving.

**Required**: audit the TestSite `appsettings.json` / user-secrets and any documented setup instructions (README, README-DEV). Either move values under the allowed sections or register prefixes in `Umbraco:AI:AllowedConfigurationKeyPrefixes`. Literal `$` in settings now needs `$$` escaping.

---

## 3. Changes to verify during upgrade (low risk, needs regression pass)

- **Guardrail 422 parity**: Umbraco.AI's own chat endpoints now also return 422 for guardrail blocks (previously 500). No conflict with the Page Evaluator's existing 422 handling; just re-verify the end-to-end guardrail test.
- **Usage telemetry** (new in 17.0.0): Umbraco.AI now reports extension-point adoption with system/custom classification. The Page Evaluator registers custom extensions (evaluator config, chat alias `proworks-page-evaluator`) and will be counted as "custom" — informational only, no action, but worth confirming nothing logs errors on startup.
- **Dedicated connection for custom AI connection strings** (17.0.0 feat): affects connection management UX/storage; verify existing connections and the active evaluator profile survive the upgrade migration on the TestSite.
- **Frontend**: `Uai.Menu.Addons` menu alias still exists (`section/constants.ts`); backoffice extension registration is unaffected. Re-verify menu item and workspace views render after the upgrade.

---

## 4. Confirmed UNCHANGED (no action)

Verified byte-identical or present-and-compatible between the two checkouts:

- `IAIChatService` (Umbraco.AI.Core.Chat) — identical
- `AIChatBuilder` — identical (`WithAlias`, `WithProfile`, `WithChatOptions` all intact)
- `AIGuardrailBlockedException` (Umbraco.AI.Core.Guardrails) — identical
- `IAIProfileService`, `IAIContextService` — identical
- `UmbracoAIComposer` — still `Umbraco.AI.Startup.Configuration` namespace (`[ComposeAfter]` attribute unchanged)
- `Uai.Menu.Addons` menu alias — still registered
- CMS target range `[17.4.0, 18)` — TestSite stays on 17.4.2; EF Core stays 10.0.6

## 5. Not applicable to this package (context only)

- 1.13.0 breaking: `IAIFileProcessingHandler.CanHandle(string)` → `CanHandleAsync(string, CancellationToken)` — Page Evaluator does not implement this interface
- 17.0.0 Agent breaking: AG-UI typed multimodal content, RunFinished/Interrupt spec alignment — Page Evaluator references Agent/Copilot packages but consumes no Agent APIs
- `IAIProvider.ClassifyError` added — breaking only for custom provider implementers
- New speech-to-text pipeline, test grader/guardrail evaluator infrastructure — unused

---

## 6. Suggested acceptance criteria for the spec

1. Solution builds against Umbraco.AI 17.0.0 packages with M.E.AI 10.7.0 pins; no downgrade warnings.
2. `POST /evaluate` and `POST /recommend` return: 422 on guardrail block, 503 on transient/rate-limited provider errors, 502 on network errors, 500 otherwise — driven by `AIProviderException.Category`, with `UserMessage` in the ProblemDetails title.
3. No remaining references to `HttpRequestException` catches or `"5xxException"` type-name checks (code, tests, CLAUDE.md).
4. All existing unit/integration tests pass; new tests cover each `AIProviderErrorCategory` mapping.
5. TestSite starts cleanly, connections/profiles resolve (incl. `$` reference audit), evaluation + recommendation + cache + re-run flows work end-to-end.
6. CLAUDE.md updated: Active Technologies versions, Package Version Constraints, Controller error-mapping section.
