# Feature Brief: Copilot tools, Automate step and Deploy support (Page Evaluator 17.6.1)

Input for `/speckit.specify`. Written 2026-11-03 from a design conversation with the package owner.
Source checked: Umbraco.AI monorepo at `C:\Repositories\Umbraco.AI` (release 2026.10.12) and the
NuGet packages `Umbraco.Automate.Core` 17.5.1, `Umbraco.AI.Automate` 17.1.0, `Umbraco.AI.Deploy` 17.3.1,
`Umbraco.Deploy.Automate` 17.0.5.

## 1. Why

The Page Evaluator only runs when an editor clicks **Evaluate Page**. The Umbraco.AI ecosystem now has
three places where it can do more:

- **Copilot (Umbraco.AI.Agent.Copilot)**: editors want to ask "how does this page score?", get
  recommendations and have accepted ones written into the page, without leaving the chat.
- **Umbraco Automate**: a quality gate before release: score the page, email the report to a reviewer,
  wait for their approval, then publish.
- **Umbraco Deploy**: evaluator configurations are stored in the package's own database tables, so today
  they must be recreated by hand in every environment.

## 2. Decisions already made (by the package owner, 2026-11-03)

| # | Decision |
|---|----------|
| D1 | All three parts ship in **one release, 17.6.1**: the main package plus two new add-on packages, all versioned 17.6.1 (patch digit = this package's own features; Umbraco.AI stays 17.6.x). |
| D2 | Copilot can do all three: **evaluate** the page, **recommend** values when asked, and **write** accepted recommendations into the page. |
| D3 | Writes go through Copilot's normal approval: the editor approves each write, the change is **staged in the workspace, never saved**; the editor still clicks Save. |
| D4 | The Automate integration is an **"Evaluate Page" step** (an Automate action) whose outputs drive a release flow; the first target flow is: evaluate → email the report → request approval → publish. Branching, email, approval and publishing are Automate's own built-in steps. |
| D5 | The step outputs pass/fail against an optional threshold; the site builder decides in Automate whether passing pages publish automatically or every page waits for approval. Docs show both flows. |
| D6 | Deploy moves **all** evaluator configurations, **inactive ones included**, and the **source's active state wins** on the target (same as Umbraco.AI.Prompt.Deploy's `IsActive`). |
| D7 | The owner will add Umbraco Automate to the TestSite and configure Copilot there for validation. |
| D8 | What "passed" means is **the admin's choice per step**: a "Fail on any failed check" setting decides whether a failed check fails the page even when the score meets the threshold (§5.1). |
| D9 | Deploy **matches and adopts** configs that admins created by hand: on the first deploy, a target config with the same document type alias and name is treated as the same config and updated, so no duplicates appear (§6). |
| D10 | Server-generated text (the emailed HTML report, the summary, step error messages) is **localized in all 10 languages** (§5.5). |
| D11 | Deploy is validated on the **ProWorks website's Umbraco Cloud project** (§10). |

## 3. Packages and dependencies

| Package | Contains | New dependencies |
|---------|----------|------------------|
| `ProWorks.Umbraco.AI.PageEvaluator` 17.6.1 (existing) | Copilot tools (server and frontend), shared "evaluate saved draft" service, config saved/deleted notifications | none: Umbraco.AI.Core is already a dependency; Copilot types are not referenced at compile time (see §4.4) |
| `ProWorks.Umbraco.AI.PageEvaluator.Automate` 17.6.1 (new) | "Evaluate Page" Automate action, its settings/output types, email-ready report rendering | `Umbraco.Automate.Core [17.0.0, 18.0.0)`; main package `[17.6.1, 18.0.0)` |
| `ProWorks.Umbraco.AI.PageEvaluator.Deploy` 17.6.1 (new) | Deploy artifact, service connector, notification handlers | `Umbraco.AI.Deploy [17.3.1, 18.0.0)` (itself requires `Umbraco.AI.Startup [17.6.1, …)` and `Umbraco.Deploy.Infrastructure [17.0.2, …)`); main package `[17.6.1, 18.0.0)` |

The add-ons keep sites without Automate or Deploy free of those dependencies, mirroring how Umbraco
ships `Umbraco.AI.Automate` and `Umbraco.AI.Prompt.Deploy` separately. The CMS floor stays **17.8.0**.
`Umbraco.AI.Deploy` 17.3.1 is the current release compatible with Umbraco.AI 17.6.1 (its version
doesn't track Umbraco.AI's).

## 4. Part A: Copilot tools (main package)

### 4.1 What the editor can do

1. **Evaluate**: "How does this page score?" runs the active evaluator config for the page's document
   type and Copilot discusses the report (score, passed and failed checks, explanations).
   - It evaluates **what is on screen**, unsaved changes included, for the culture being viewed,
     exactly as the Evaluate Page button does (builder's call as decided in conversation).
   - It returns the cached report when one exists (like opening the modal) and re-runs when the editor
     asks for a fresh evaluation. A fresh run updates the cache, so the Evaluate Page modal shows the same report.
2. **Recommend**: "Fix the failing checks" / "suggest a better meta description" calls the existing
   recommend logic (`POST /recommend` behaviour: per-editor prompts, schema handling, language line,
   rich-text rules). Copilot shows the suggested values.
3. **Apply**: when the editor accepts, the value is written into the field. Copilot shows its standard
   approval prompt first; the change is staged in the workspace and not saved.

### 4.2 Tools to provide

| Tool | Kind | Scope | Notes |
|------|------|-------|-------|
| evaluate current page | frontend (`uaiAgentFrontendTool`) | page-evaluator read | Reads the open document workspace (culture, values) the same way `workspace-action` does and calls the existing endpoints (`GET /evaluate/cached/{nodeId}`, `POST /evaluate`). Returns a compact JSON report for the model. |
| recommend values | frontend | page-evaluator read | Calls `POST /recommend` with one or more aliases. **Check-based only** (builder's call): only for aliases named by a Fail/Warn check in the current report, with that check's label and explanation, exactly where the report offers Recommend (`_FULL_RECOMMEND_EDITORS`, `AdditionalRecommendableEditorAliases`), and only when the config has recommendations enabled. Free-form requests ("write a better meta description" with no failing check) are out of scope for 17.6.1. |
| apply recommendation | frontend, `isDestructive: true` | page-evaluator write | Writes **exactly the recommended value** (builder's call): recommend returns a reference per alias, held client-side for the conversation, and apply takes that reference, so the model can't change or invent the text. To adjust it, the editor edits the field after applying. Reuses `shared/apply-value.ts` `applyRecommendedValue` so Tags → `string[]`, rich text → `{ markup, blocks }`, culture-aware writes and validation-message clearing all carry over. **The rich-text safeguard applies**: refuse (with a reason the model can relay) when `canApplyRichText` fails. Never use Copilot's generic `set_value` or Umbraco.AI's `applyValueChange` for these values (CLAUDE.md "Language awareness"). |
| `evaluate_page` (server) | server (`AIToolBase` + `[AITool]`) | page-evaluator read | Evaluates a node's **latest saved draft** by id (+ optional culture) for agents that have no open workspace (e.g. Automate's "Run AI Agent"). Shares the saved-draft service with the Automate step (§5.3). Builder's call to include; low cost because the service is needed anyway. |

- Define our own tool scopes with `[AIToolScope]` / the frontend equivalent: a read scope and a
  destructive write scope, domain "Page Evaluator", so admins can grant agents evaluate/recommend without
  write.
- Tools run as the signed-in user. Server tools use the same node-exists → Browse-permission → culture
  checks as the controller (404/403/400 order); frontend tools inherit them from the endpoints.
- The evaluate rate limit (10/min/user) must still apply to tool-initiated evaluations.

### 4.3 Report shape for the model

Return a compact, model-friendly object (no HTML): overall score (when scoring is enabled), axis scores,
each check's id/title/status/explanation/property aliases, the culture, cached-at time, and which
properties can be recommended/applied. Keep the "scores may vary" information out of it, as in the
editor's report since 17.6.0.

### 4.4 Loading without Copilot installed

`uaiAgentFrontendTool` is defined by `@umbraco-ai/agent-ui` (Umbraco.AI.Agent.UI), which is **not** a
dependency of this package. Register the frontend tool manifests so that a site without the Agent
packages just ignores them (unknown manifest types must not error), and type the manifests locally
rather than importing from `@umbraco-ai/agent-ui`. Server tools only need Umbraco.AI.Core. Verify both
on a site **without** Agent/Copilot (no errors in the browser console or log).

## 5. Part B: Automate "Evaluate Page" step (`.Automate` add-on)

### 5.1 Step definition

An `ActionBase<TSettings, TOutput>` action (`[Action(...)]`, `Group = "AI"`), modelled on
`Umbraco.AI.Automate`'s `AskScoreDecisionAction`.

**Settings**
- Content: the node to evaluate (binding, normally the trigger's content key).
- Culture: optional; required for culture-varying document types (same normalisation as the
  controller: invariant → ignored; unknown/not-created culture → step fails with a validation error).
- Pass threshold: optional, on the **same 1–5 scale as the report's overall score** (decimals allowed,
  e.g. 3.5). When set, the page's config must have scoring enabled, otherwise the step fails with a clear
  configuration error.
- Fail on any failed check (D8): boolean. When on, a check with status Fail makes `passed` false even if
  the score meets the threshold (warnings never do). Default **on**, the safer choice for auto-publish
  flows (builder's call). It can also be used without a threshold: `passed` is then "no failed checks".
- Report language: optional; see §5.5.

**Outputs** (bindable in later steps, e.g. `${ steps.evaluate.passed }`)
- `overallScore` (1–5, nullable), `passed` (null only when there is neither a threshold nor
  "Fail on any failed check"), `threshold`
- When a threshold is set but the report has no overall score (the AI left it out, or the response
  couldn't be parsed), `passed` is **false**, so the page goes to review rather than the run stopping
  (builder's call); a parse failure is also reflected in `summary`.
- `passedChecks`, `failedChecks`, `warningChecks` (counts), `failedCheckTitles`
- `summary`: short plain-text summary
- `reportHtml`: **email-ready HTML** report (inline styles only, no scripts or external assets; safe
  to put in Automate's Send Email body), including the page name, culture, score, each check, and a
  link to the page in the backoffice
- `contentKey`, `culture`, `configName`, `evaluatedAt`

### 5.2 Behaviour

- Uses the page's **active evaluator config** (same prompt, checks, profile, context). No active config
  for the document type → step fails (validation category) with a message naming the type.
- Evaluates the **latest saved draft** (the page is not published yet in a pre-release flow).
- Saves the result to the evaluation cache so an editor who opens Evaluate Page sees what the reviewer saw.
  The existing publish rule still clears that entry when the automation publishes the page; that's
  accepted (the reviewer has the report by email), and the cache invalidation rules don't change.
- AI failures map to Automate step error categories (see `StepErrorCategoryMapping` in
  Umbraco.AI.Automate for the pattern); guardrail blocks fail the step with the guardrail's message.
- Runs under the automation's identity; Browse checks follow Automate's own model for content steps.

### 5.3 Shared "evaluate saved draft" service (main package)

Today the evaluator receives draft values from the browser (`EvaluateRequest.Properties`). The step and
the server tool need a server-side equivalent: read the node's latest saved version for a culture via
`IContentService`, produce the same property dictionary the browser sends, and call
`IPageEvaluationService.EvaluateAsync`. Put it in the main package so both callers share it, and keep
the culture rules of `CultureAwareContentPropertyResolver` (the `VariationContext` scope must always be
restored).

### 5.4 Documented example flows

1. **Approval for every page**: Content Saved (filtered to chosen document types) → Evaluate Page →
   Send Email (`reportHtml`) → Request Approval (prompt includes the score) → Switch on
   `approved` → Publish Content / Notify Editor with the reviewer's comment.
2. **Auto-publish passing pages**: Content Saved → Evaluate Page (threshold) → Switch on `passed` →
   Publish Content / Send Email + Request Approval → Publish or Notify Editor.

### 5.5 Localized server-generated text (D10)

`reportHtml`, `summary` and the step's error messages are shown to people, so they're localized in the
same 10 languages as the backoffice (`en` source of truth, `es`, `fr`, `da`, `de`, `nb`, `sv`, `it`,
`hi`, `pt`). The package has only client-side localization today, so this needs a server-side
mechanism (builder's call; e.g. Umbraco's `ILocalizedTextService` with package language files, or
embedded resources), with a test that every language defines the same keys (like
`localization-keys.test.ts`). Reuse the client's wording where the same label exists.

- Language used: the step's "Report language" setting when set; otherwise the evaluated content's
  culture mapped to a supported language (e.g. `da-DK` → `da`); otherwise English (builder's call).
- Only the package's own labels and messages are localized. The AI's explanations stay in the prompt's
  language, as in the editor's report.

Note in the docs: Automate triggers fire **after** the event (outbox dispatch), so the gate only holds
when release goes through the automation (e.g. editors lack Publish permission). Blocking the editor's
own Publish button is out of scope (§8).

## 6. Part C: Deploy support (`.Deploy` add-on)

Modelled on `Umbraco.AI.Prompt.Deploy` (read its `CLAUDE.md`); uses
`UmbracoAIProfileDependentEntityServiceConnectorBase<TArtifact, TEntity>` from Umbraco.AI.Deploy.

- **Entity**: evaluator configuration, own UDI entity type (e.g. `proworks-ai-evaluator-config`),
  disk-based, git-friendly artifacts like the Prompt package. Identity is the config's `Id` (Guid).
- **Match and adopt (D9)**: when no target config has the artifact's `Id`, a target config with the same
  `DocumentTypeAlias` **and** `Name` (case-insensitive, trimmed) is treated as the same config and
  updated, and from then on it must keep matching by identity on every later deploy (e.g. by taking the
  source's `Id`, or a stored mapping; builder's call). With several candidates, adopt none, deploy as a
  new config and log a warning. Target-only configs that match nothing are left alone.
- **Artifact contents**: Name, Description, DocumentTypeAlias, ProfileId (as profile UDI dependency),
  ContextId (as context UDI dependency, optional), PromptText, PropertyAliases, ScoringEnabled,
  RecommendationsEnabled, IsActive. **Not** deployed: DateCreated/DateModified, CreatedBy/ModifiedBy
  user ids, `Version` (the target keeps its own concurrency counter), and the evaluation cache.
- **Ordering**: process after connections, profiles and contexts (Umbraco.AI.Deploy's passes 1–2), as
  Prompt.Deploy does in pass 3.
- **Active state (D6)**: the target ends up matching the source. Deploying an active config deactivates
  any other active config for the same document type on the target (one active per type); deploying an
  inactive config never activates another. Use the repository's `SetActiveAsync`, never `UpdateAsync`,
  to change activation (CLAUDE.md "Controller").
- **Cache**: clear the evaluation cache for every affected document type after an import, as the
  controller does for any config change.
- **Missing document type on the target**: the config still deploys (it's keyed by alias), matching how
  the backoffice allows it today. Builder's call whether to log a warning.
- **Notifications (main package)**: the package doesn't raise any today. Add
  `EvaluatorConfigSavedNotification` and `EvaluatorConfigDeletedNotification` (raised by the config
  service on create/update/activate/delete) so the Deploy add-on can write/remove artifacts, like
  Prompt.Deploy's `AIPromptSavedDeployRefresherNotificationAsyncHandler`.
- Automations that use the Evaluate Page step move with **Umbraco.Deploy.Automate**; nothing extra needed,
  but the step's settings must serialise cleanly (no environment-specific ids except content keys).

## 7. Constraints that still apply (CLAUDE.md)

- Client: Lit from `@umbraco-cms/backoffice/external/lit`, `UmbLitElement`, nested localization in all
  10 languages, `apiClient` calls with `throwOnError: false`, no `@state()` mutation in place.
- Server: AI calls go through `IEvaluatorChatExecutor` / `IAIChatService`; keep aliases
  `proworks-page-evaluator` and `proworks-page-evaluator-recommend` so tool-initiated calls show
  correctly in the audit log (builder's call whether tool calls get their own alias).
- Error bodies keep `type`/`title`/`status`; SQLite cache writes stay write-first.
- Version sync: csproj, `package.json`/lock and `umbraco-package.json` all 17.6.1 (`version-sync.test.ts`).
- Brief, per-version release notes (README-DEV): lead with the three new integrations.

## 8. Out of scope

- Blocking the editor's own Publish button when a page fails (would need a cancelling
  `ContentPublishingNotification` handler and adds an AI call to every publish). Possible later.
- Deploying the evaluation cache or audit/usage data.
- Copilot auto-saving or auto-publishing; batch "fix everything" without per-write approval.
- An Umbraco.AI "Run AI Agent"-specific integration beyond the server `evaluate_page` tool.

## 9. Suggested user stories

- **US1 (P1) Evaluate and improve a page from Copilot.** Editor asks Copilot to evaluate the open page,
  asks for recommendations on failing fields, accepts one, sees it staged in the field, clicks Save.
  *Accept:* report matches the modal's for the same content/culture; recommend refused when the config
  disables recommendations; apply needs approval, never saves, respects Tags/rich-text/culture rules and
  the block safeguard; tools absent from agents without the scope; no errors on a site without Copilot.
- **US2 (P1) Gate release with an Automate approval flow.** Admin builds flow 1 (§5.4); saving a page
  emails the reviewer an HTML report and creates an approval; approving publishes, rejecting notifies.
  *Accept:* outputs bind in later steps; threshold on the 1–5 scale; "Fail on any failed check" on
  makes a failed check fail the page; email text in the chosen language; threshold without scoring fails clearly; no active config fails
  clearly; culture-varying pages evaluate the chosen culture; the cache shows the same report.
- **US3 (P2) Auto-publish pages that pass.** Flow 2 (§5.4). *Accept:* `passed` reflects the threshold;
  failing pages go to approval.
- **US4 (P2) Move evaluator configs between environments.** Admin creates/edits/activates configs in
  development; Deploy moves them to a second environment with profile/context dependencies resolved.
  *Accept:* inactive configs deploy; a hand-made target config with the same type and name is adopted,
  not duplicated; source active state wins and keeps one active per type; deletes
  propagate; cache cleared for affected types; Version/user/date fields not overwritten.
- **US5 (P3) Agents without an open page.** An agent (e.g. in Automate's Run AI Agent) calls
  `evaluate_page` for a node id. *Accept:* saved draft evaluated; Browse permission enforced.

## 10. Validation environment

- TestSite: owner adds Umbraco Automate and configures Copilot (D7). Umbraco.Deploy.Automate is
  needed there too if automations should move between environments.
- Deploy is validated on the **ProWorks website's Umbraco Cloud project** (D11), which also exercises
  the git-based artifact flow. Include a first-deploy check where the target already has hand-made
  configs (D9).
- Regression: a scratch site with only the main package (no Agent, Automate or Deploy) must still
  install and run cleanly.

## 11. Builder's calls (decided in conversation; change only with a reason)

- Copilot evaluates on-screen (unsaved) values; the server tool and the Automate step evaluate the saved draft.
- Main package holds the Copilot tools; Automate and Deploy are add-ons.
- One "Page Evaluator" tool-scope domain with separate read and write scopes.
- Automate step results are written to the evaluation cache; publishing still clears them.
- Threshold on the report's 1–5 scale; "Fail on any failed check" defaults on; a missing score with a
  threshold gives `passed = false`.
- Copilot recommendations are check-based only; apply writes exactly the recommended value.
- Report language falls back from the step setting to the content culture to English.
- Deploy adoption with several name matches adopts none and logs a warning.
