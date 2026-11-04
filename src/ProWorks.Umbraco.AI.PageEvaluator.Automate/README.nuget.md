# ProWorks Umbraco AI Page Evaluator — Automate

Adds an **Evaluate Page** step to [Umbraco Automate](https://umbraco.com/products/add-ons/automate/). The step evaluates the latest saved version of a page with its active ProWorks AI Page Evaluator configuration and gives later steps the overall score, a pass/fail verdict and an email-ready HTML report. Use it to put an AI quality gate in front of publishing: email the report to a reviewer and ask for approval, or publish pages that pass automatically.

## Requirements

| Dependency | Version |
|---|---|
| ProWorks.Umbraco.AI.PageEvaluator | the same version as this package (installed automatically) |
| Umbraco Automate | **17.5.1** or later 17.x |
| Umbraco CMS | 17.8.0 or later 17.x |
| Umbraco.AI | 17.6.1 or later 17.x |

**Why Automate 17.5.1?** Automate 17.0.0 and 17.5.0 continue a run after a step fails with a non-retryable error. In an "Evaluate → Publish" flow, a failed evaluation (no active configuration, a bad AI key, a guardrail block…) would still let the page be published. 17.5.1 stops the run.

## Install

```bash
dotnet add package ProWorks.Umbraco.AI.PageEvaluator.Automate
```

Then restart the site. **Evaluate Page** appears in the Automate step picker under **AI**.

Automate needs its own database connection: add a `umbracoAutomateDbDSN` connection string, or set `Umbraco:Automate:UseNamedConnectionString` to `umbracoDbDSN` to share the CMS database (see the Automate documentation). Until then Automate stays inactive and logs an error at startup.

### Before you build a flow

- **Service account permissions.** Automate runs steps as the workspace's service account. That account needs **Browse** on every page the step evaluates (a denial fails the step as *Authentication*), plus **Publish** if the flow publishes.
- **An active evaluator configuration** for each document type you evaluate (AI → Add-ons → Page Evaluator). Turn **scoring** on if you use a pass threshold.
- **Site URL.** The report's "Open in Umbraco" link uses `Umbraco:CMS:WebRouting:UmbracoApplicationUrl` (for example `https://www.example.com/`), falling back to the URL the site was first requested on. Automations run in the background, so set the URL explicitly; without one, the link is left out.
- **Filter the trigger.** Each fresh evaluation is an AI call. Filter Content Saved by document type, and use Automate's own run controls. The step reuses an up-to-date result when the page hasn't been saved since it was last evaluated by a step (`fromCache` is then `true`), and it isn't subject to the editors' 10-per-minute evaluation limit.

## Settings

| Setting | Description |
|---|---|
| **Page** | The content key of the page. Defaults to `${ trigger.contentKey }`; keep that for Content Saved / Content Published triggers. |
| **Language** | The culture to evaluate, e.g. `${ trigger.cultures[0] }`, or `${ loop.item }` inside a *For Each* over `${ trigger.cultures }`. Required for pages that vary by language; ignored for invariant pages. |
| **Pass threshold** | Optional. The minimum overall score, on the same **1–5** scale as the report (decimals allowed, e.g. `3.5`). Requires scoring on the configuration; otherwise the step fails as *ConfigurationError* before calling the AI. |
| **Fail on any failed check** | On by default. A page with any check in *Fail* status doesn't pass. Warnings never fail a page. |
| **Report language** | The language of the summary, HTML report and error messages: English, Español, Français, Dansk, Deutsch, Norsk bokmål, Svenska, Italiano, हिन्दी or Português. **Automatic** uses the page's language when it is one of these, otherwise English. The AI's own explanations stay in the language of your evaluator prompt. |

The settings contain no environment-specific IDs, so automations move between environments with Automate's Deploy support.

## Outputs

Bind them in later steps as `${ steps.<alias>.<output> }`, where `<alias>` is the alias you gave the Evaluate Page step (the examples below use `evaluate`).

| Output | Description |
|---|---|
| `overallScore` | Overall score (1–5); empty when scoring is off or the AI gave none |
| `passed` | `true` / `false` against the threshold and "Fail on any failed check"; empty when neither is set |
| `threshold` | The pass threshold used, if any |
| `passedChecks`, `failedChecks`, `warningChecks` | Check counts |
| `failedCheckTitles` | Titles of the failed checks |
| `summary` | One plain-text line (at most 500 characters), e.g. "Home: overall score 4/5; 3 passed, 1 failed, 1 warnings. Not passed." Not HTML-encoded: use it in subjects and notifications |
| `reportHtml` | The email-ready report: page, language, configuration, time, score, score breakdown, every check with its status and explanation, and an "Open in Umbraco" link. Inline styles only, no scripts or external images, and all page and AI text escaped, so it is safe as a Send Email body |
| `contentKey`, `culture` | The page and the culture evaluated (lower-case ISO code; empty for invariant pages) |
| `configName` | The evaluator configuration used |
| `evaluatedAt` | When the evaluation was produced (UTC) |
| `fromCache` | `true` when an up-to-date result was reused without an AI call |
| `parseFailed` | `true` when the AI response couldn't be read as a report (such a report never passes) |

### When the step fails

The run stops with a categorised, localized message (in the report language):

| Situation | Category |
|---|---|
| The Page setting isn't a content key, the page doesn't exist, the language is missing / unknown / not created on the page, or the document type has no active configuration | Validation |
| A pass threshold is set but the configuration has scoring off | ConfigurationError |
| An Umbraco.AI guardrail blocked the content (the message is the guardrail's) | Validation |
| The service account can't browse the page; the AI connection's key is rejected | Authentication |
| The AI model or request is invalid | ConfigurationError |
| The AI provider is rate-limited, overloaded or unreachable | RateLimiting / ServiceUnavailable (Automate retries) |
| Anything else | Unknown (Automate retries) |

## Flow 1: email the report and ask for approval

1. **Trigger: Content Saved**, filtered to the document types you evaluate.
2. **Evaluate Page** (alias `evaluate`): Page `${ trigger.contentKey }`, Language `${ trigger.cultures[0] }` (multilingual sites).
3. **Send Email** to the reviewers: subject `Review: ${ steps.evaluate.summary }`, body `${ steps.evaluate.reportHtml }`.
4. **Request Approval** (alias `approval`), e.g. "Publish this page? Score ${ steps.evaluate.overallScore }/5".
5. **Switch** on `${ steps.approval.approved }`:
   - `true` → **Publish Content** (`${ trigger.contentKey }`).
   - `false` → **Notify Editor** with `${ steps.approval.comment }`.

**The gate only holds when release goes through the automation.** Automate triggers run after the save, so they can't stop an editor from pressing Publish. To make the approval binding, remove the **Publish** permission from the editors' user group and let the automation's service account publish.

## Flow 2: publish pages that pass automatically

1. **Trigger: Content Saved**, filtered by document type.
2. **Evaluate Page** (alias `evaluate`) with **Pass threshold** `3.5` and **Fail on any failed check** on.
3. **Switch** on `${ steps.evaluate.passed }`:
   - `true` → **Publish Content**.
   - `false` → **Send Email** (`${ steps.evaluate.reportHtml }`) + **Request Approval** → **Switch** on `approved` → **Publish Content** or **Notify Editor**, as in flow 1.

How `passed` is worked out:

| Threshold | Fail on any failed check | `passed` is `true` when… |
|---|---|---|
| set | off | the overall score is at or above the threshold |
| set | on (default) | the score is at or above the threshold **and** no check failed |
| not set | on (default) | no check failed |
| not set | off | — (`passed` is empty: branch on other outputs) |

- The threshold uses the report's **1–5** scale, the same score editors see in the Evaluate Page modal.
- **Warnings never fail** a page; only checks in *Fail* status do.
- A threshold with **no overall score** in the report (the AI left it out, or the response couldn't be read) gives `passed = false`, and the summary says the score is missing, so the page goes to review.
- Switch compares `true` / `false` case-insensitively.
- **Decimal separators:** Automate's numeric Switch/If operators parse numbers with the server's culture. On a server running in, say, Danish, comparing `${ steps.evaluate.overallScore }` with `3.5` won't work as expected (`3,5` is the Danish form). Prefer the step's **Pass threshold** and branch on `passed`; if you compare the score directly, write the number in the server culture's format.

## More

Full documentation, the main package and source: https://github.com/ProWorksCorporation/ProWorks-Umbraco.AI-Page-Evaluator
