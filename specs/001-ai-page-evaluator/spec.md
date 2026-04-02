# Feature Specification: Umbraco AI Page Evaluator

**Feature Branch**: `001-ai-page-evaluator`
**Created**: 2026-03-30
**Status**: Draft
**Input**: User description — AI-powered page evaluation package for Umbraco back-office

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Content Editor Evaluates a Page (Priority: P1)

A content editor has a page open in the Umbraco back-office and wants to know whether
it is ready to publish. They trigger the AI Page Evaluator for the current document. The
evaluator sends the page's property values to an AI model using the prompt configured for
that document type, then displays a structured, readable report inside the back-office. The
report shows a score, a list of passing checks, a list of failing or warning checks with
actionable explanations, and a suggestions section. The editor can act on the feedback
without leaving the editing context.

**Why this priority**: This is the core value of the package. Without the evaluation
report, the package delivers nothing to end users. Every other story exists to support or
improve this one.

**Independent Test**: Install the package on a vanilla Umbraco v17 site, configure a
single evaluation prompt for one document type, open a node of that type, trigger the
evaluator, and verify a structured report appears with at minimum a score, a passing
section, and a failing/warning section.

**Acceptance Scenarios**:

1. **Given** an editor has a published or draft page open and a prompt is configured for
   its document type, **When** they trigger the AI Page Evaluator, **Then** a report
   appears showing a score (e.g., "14/17 checks passed"), a list of passing checks, and
   a prioritised list of items needing attention.
2. **Given** a content node's document type has no active evaluator configured, **When**
   any back-office user views that node, **Then** the evaluation trigger button is not
   displayed at all — no dead-end affordance is presented to any user regardless of their
   role.
3. **Given** the AI provider is unavailable or returns an error, **When** the editor
   triggers the evaluation, **Then** a user-friendly error message appears explaining that
   the evaluation could not be completed, with a retry option.
4. **Given** the AI returns a structured report, **When** the report is displayed, **Then**
   it is rendered as clean, readable HTML (not raw JSON or raw Markdown) using the
   Umbraco design system's visual language.

---

### User Story 2 - Administrator Configures an Evaluator Prompt per Document Type (Priority: P2)

A site administrator wants to define evaluation criteria for a specific document type
(e.g., Blog Post). They navigate to the Umbraco.AI Addons section in the back-office,
find the AI Page Evaluator configuration area, and either create a new evaluator or edit
an existing one. They select the target document type from a picker, choose an Umbraco.AI
Profile (the AI connection and model to use), optionally attach an Umbraco.AI Context
(a pre-configured set of shared instructions such as brand guidelines or tone of voice),
write or paste the evaluation prompt, give it a name and optional description, and save.
From this point forward, any editor who evaluates a node of that document type uses this
profile, context, and prompt combination.

**Why this priority**: Without prompt configuration, editors either see a "no evaluator
configured" message or rely on a single generic prompt. Per-document-type configuration
is what makes the package genuinely useful across diverse site content types.

**Independent Test**: In the Umbraco.AI Addons section, create a new evaluator prompt
for the Blog Post document type, save it, open a blog post node, trigger the evaluator,
and verify the configured prompt's checklist categories appear in the report.

**Acceptance Scenarios**:

1. **Given** an administrator is in the Umbraco.AI Addons section, **When** they open
   the Page Evaluator configuration, **Then** they see a list of all configured evaluators
   grouped by document type, with options to create, edit, or delete each one.
2. **Given** an admin creates a new evaluator, **When** they save it with a valid prompt,
   a selected document type, and a selected Umbraco.AI Profile, **Then** the evaluator is
   persisted and immediately active for all editors who evaluate nodes of that document
   type.
3. **Given** an admin attaches an Umbraco.AI Context to an evaluator, **When** an
   evaluation is triggered, **Then** the Context's shared instructions are included in the
   AI request alongside the evaluator's prompt and the page's property values.
4. **Given** an admin attempts to save an evaluator with an empty prompt, no document
   type selected, or no Umbraco.AI Profile selected, **When** they submit the form,
   **Then** validation errors appear identifying each missing field without losing their
   draft input.
5. **Given** an evaluator already exists for a document type, **When** an admin saves a
   new or updated evaluator for the same document type, **Then** that evaluator becomes
   the active one automatically — no explicit designation is required. Previous evaluators
   for that document type are retained in the list as inactive drafts.

---

### User Story 3 - Administrator Uses the Prompt Builder to Create a Quality Prompt (Priority: P3)

An administrator setting up an evaluator for the first time does not know how to write an
effective evaluation prompt. The Page Evaluator configuration provides a Prompt Builder
panel that surfaces the selected document type's property aliases, compositions, and any
attached document types, and offers suggested checklist category templates (e.g., Required
Fields, SEO & Meta, Content Quality, Visibility & URL). The admin can select which
categories to include, review template-generated checklist items that incorporate the
document type's property aliases, customise the text, and export the assembled prompt into
the prompt text area. Prompt assembly is template-based in v1; no AI model is invoked
during prompt construction.

**Why this priority**: The Prompt Builder reduces the barrier for non-technical
administrators to create accurate and comprehensive prompts. Without it, admins must
understand the Umbraco property alias system and craft prompts manually, which is
error-prone. It is a quality-of-life improvement, not a blocker for core functionality.

**Independent Test**: In the Page Evaluator configuration, open the Prompt Builder for
the Blog Post document type, verify that property aliases from the document type appear,
select at least two checklist categories, generate a prompt draft, and confirm the draft
appears correctly in the prompt textarea.

**Acceptance Scenarios**:

1. **Given** an admin opens the Prompt Builder for a selected document type, **When** the
   builder loads, **Then** it displays all property aliases available on that document type
   and its compositions, organised by tab or group as configured in the Umbraco back-office.
2. **Given** an admin selects one or more checklist categories from the suggested list,
   **When** they click "Generate Prompt Draft", **Then** the builder assembles a prompt
   draft incorporating the selected categories and property aliases, which the admin can
   review and edit before transferring it to the evaluator.
3. **Given** an admin has customised the generated draft in the builder, **When** they
   click "Use This Prompt", **Then** the edited draft is inserted into the evaluator's
   prompt textarea, replacing any prior content, and the builder closes.
4. **Given** an admin provides additional site context (e.g., site name, target audience,
   brand voice guidelines) in a free-text "Site Context" field, **When** a prompt is
   generated, **Then** that context is woven into the prompt's system-level instructions
   so the AI evaluates pages against site-specific standards.

---

### Edge Cases

- What happens when a document type has no property editors beyond the node name? The
  evaluator must still submit the available data and return a meaningful (if limited) report.
- What happens if the evaluation prompt exceeds the AI provider's context-window limit?
  Context window limits are model-specific and only knowable at evaluation time via the
  resolved profile. In v1 no pre-save detection is performed; if the provider rejects the
  request due to token limits the error surfaces as a standard 502 AI provider error with
  a retry option (FR-011). Proactive limit detection in the configuration UI is deferred
  to v2.
- What happens when a document type is deleted after an evaluator prompt has been
  configured for it? The orphaned evaluator remains visible in the configuration list with
  no special marking in v1 — it simply never matches a live node and is effectively inert.
  Orphan detection (warning badge, reassign option) is deferred to v2.
- What happens if two editors simultaneously evaluate the same page? Each evaluation runs
  independently; results are not shared or locked between sessions.
- What happens if the AI response cannot be parsed into the PASS/FAIL/WARN format? The
  raw AI response is displayed inside the slide-in dialog beneath a warning banner with a
  link to the evaluator configuration for prompt refinement. The report is not discarded.
- What happens when the page has unpublished changes that differ from the published
  version? The evaluator sends the currently open draft (including unsaved changes shown
  in the editor) to reflect the state the editor is actively working on.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a triggerable evaluation action available on any
  content node in the Umbraco back-office, implemented as a slide-in overlay dialog
  triggered by a button in the workspace header or toolbar. The dialog slides in from the
  right, overlays the editor, and is dismissed by the editor when they are done reviewing
  the report. A persistent sidebar mode is out of scope for v1.
- **FR-002**: The system MUST send the current page's property values (including nested
  block list content), the configured evaluation prompt, and any attached Umbraco.AI
  Context instructions to the AI provider using the Umbraco.AI Profile selected on the
  evaluator configuration when an evaluation is triggered.
- **FR-003**: The system MUST render the AI's evaluation response as structured,
  readable HTML within the back-office using Umbraco UI Library components — raw JSON
  or raw Markdown MUST NOT be presented directly to the editor.
- **FR-004**: The system MUST display the following sections in every evaluation report:
  an overall score (checks passed out of total), a "Passing Items" section, an "Items
  Needing Attention" section (failures and warnings with explanations), and a
  "Suggestions" section.
- **FR-005**: The evaluation trigger button MUST only be rendered when an active
  evaluator configuration exists for the current node's document type. If no active
  evaluator is configured, the button MUST be hidden entirely — for all users regardless
  of role. Discoverability for administrators is handled through the Page Evaluator
  configuration list in the Umbraco.AI Addons section, which shows which document types
  have no evaluator set up.
- **FR-006**: The system MUST register itself as an entry in the Umbraco.AI Addons
  section, providing a configuration interface where administrators can create, edit, and
  delete evaluator configurations assigned to specific document types. Active/inactive state
  is managed automatically by the active-one rule: the most recently saved configuration
  for a document type becomes active with no explicit designation required. The Addons
  entry MUST be visible to any back-office user with access to the Umbraco.AI section.
- **FR-007**: The system MUST enforce that each active evaluator configuration has exactly
  one document type assigned, one Umbraco.AI Profile selected, and a non-empty prompt
  text. An attached Umbraco.AI Context is optional.
- **FR-016**: The evaluator configuration form MUST include an Umbraco.AI Profile picker
  that lists all profiles configured in the Umbraco.AI settings. The selected profile
  determines the AI connection, provider, and model used when the evaluator runs.
- **FR-017**: The evaluator configuration form MUST include an optional Umbraco.AI
  Context picker that lists all contexts configured in the Umbraco.AI settings. When
  a Context is selected, its shared instructions (brand guidelines, tone of voice, site
  rules, etc.) are merged into the AI request at evaluation time alongside the evaluator's
  own prompt.
- **FR-008**: The system MUST provide a Prompt Builder tool within the evaluator
  configuration that surfaces all property aliases for the selected document type and its
  compositions, organised by property group. The builder assembles the final prompt from
  predefined category templates combined with the surfaced property aliases and the Site
  Context field — no AI model is called during prompt construction in v1.
- **FR-009**: The Prompt Builder MUST offer at minimum these suggested checklist
  categories for selection: Required Fields, Metadata & SEO, Content Quality, Schema &
  Structured Data, Accessibility & Visibility, and Calls to Action.
- **FR-010**: The Prompt Builder MUST accept a free-text "Site Context" field (site name,
  audience, brand guidelines) that is incorporated into the generated prompt as
  system-level instructions.
- **FR-011**: The system MUST handle AI provider errors gracefully, displaying a
  user-friendly error message with a retry option and without exposing raw error details
  to content editors.
- **FR-015**: If the AI response cannot be parsed into the structured PASS/FAIL/WARN
  report format, the system MUST display the raw AI response text inside the slide-in
  dialog beneath a warning banner stating that the response could not be structured (e.g.,
  "The AI response could not be formatted as a structured report. Raw output is shown
  below."). The warning banner MUST include a link to the evaluator configuration so the
  admin can refine the prompt.
- **FR-014**: The evaluation trigger action MUST be available to any back-office user who
  has read access to the content node being evaluated. No additional permission or user
  group membership is required. The action is non-destructive and does not modify content.
- **FR-013**: While an evaluation is in progress, the slide-in dialog MUST display a
  progress indicator alongside sequential status messages that step through the evaluation
  phases: "Sending page data…", "Waiting for AI response…", and "Rendering report…".
  The loading state MUST remain visible until the full report is ready to display.
- **FR-012**: The evaluation MUST use the current draft state of the node (the version
  visible in the editor at time of evaluation), not only the last-published version.

### Key Entities

- **EvaluatorConfiguration**: Represents a saved evaluation setup. Has a display name,
  an optional description, an assigned document type, a selected Umbraco.AI Profile
  (required), an optional Umbraco.AI Context reference, a prompt text, an active/inactive
  state, and optional metadata (created date, last-modified date, author). The most
  recently saved configuration for a given document type is automatically the active one;
  all others for that document type are inactive. Multiple configurations per document
  type are permitted but only one is active at any time.
- **EvaluationReport**: The structured result of a single evaluation run. Contains an
  overall score (passed/total), an ordered list of check results (each with a status of
  PASS, FAIL, or WARN, a label, and an explanation), and a free-text suggestions block.
  Not persisted between sessions in v1.
- **PromptBuilderSession**: Transient state representing an in-progress prompt composition
  within the builder UI. Holds the selected document type, the list of selected checklist
  categories, the site context text, and the assembled draft prompt. Discarded on close.
- **DocumentTypePropertySummary**: A read-only projection of a document type's property
  aliases, labels, and groups used to populate the Prompt Builder's field list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A content editor can trigger a page evaluation and receive a rendered report
  within 30 seconds of clicking the evaluate action under normal network conditions.
- **SC-002**: A site administrator can create a complete, working evaluator configuration
  for a new document type — including using the Prompt Builder — in under 10 minutes,
  without requiring developer assistance.
- **SC-003**: Every evaluation report displays a clear score, at minimum one categorised
  section (Passing or Needing Attention), and at least one actionable recommendation,
  regardless of the page's content completeness level.
- **SC-004**: The evaluation UI is visually indistinguishable from native Umbraco back-
  office components — no custom colours, no raw markdown, and no layout shifts that would
  cause a user to perceive it as a third-party widget rather than a native feature.
- **SC-005**: When no evaluator is configured for the current document type, the
  evaluation trigger button is absent from the workspace for 100% of users — no broken
  affordance, error state, or empty dialog is ever presented to a content editor.
- **SC-006**: The Prompt Builder surfaces at minimum 80% of a document type's registered
  property aliases in its field list, covering properties from the document type itself
  and all of its compositions.

## Assumptions

- The package is installed alongside the Umbraco.AI package (version compatible with
  Umbraco v17) and relies on its Profile and Context systems for AI connection selection
  and shared instructions; this package does not manage AI provider keys, models, or
  shared context content independently.
- At least one Umbraco.AI Profile must be configured in the Umbraco.AI settings before
  an evaluator configuration can be saved; the package does not create or manage profiles.
- The target back-office is Umbraco v17; compatibility with earlier versions is out of
  scope for v1.
- Evaluation results are not persisted between browser sessions in v1; the report is
  ephemeral and exists only for the duration of the current editor session.
- The package runs evaluations on-demand only; automatic evaluation on page load or on
  save is out of scope for v1.
- The AI provider is expected to return responses in either JSON or Markdown format;
  the package normalises either format into the structured HTML report.
- Multi-language / variant content (Umbraco Culture & Hostnames) is out of scope for v1;
  the evaluator operates on the invariant or default language variant.
- The package ships as a NuGet package containing compiled back-office JavaScript; a
  separate npm-only distribution is out of scope for v1.
- Administrators configuring evaluators are assumed to have Umbraco back-office access
  with at minimum the "Settings" section permission.
- No additional permission check is required to trigger an evaluation; any back-office
  user with read access to a content node may evaluate it. Granular permission control
  is out of scope for v1.

## Clarifications

### Session 2026-03-30

- Q: What happens if the AI response cannot be parsed into the structured report format?
  → A: Display the raw AI response inside the slide-in dialog beneath a warning banner
  that explains the issue and links to the evaluator configuration for prompt refinement.
  Response is never silently discarded. FR-015 added; edge case documented.
- Q: Where should the package configuration appear in the back-office? → A: The package
  MUST register as an entry in the Umbraco.AI Addons section. All references to
  "Umbraco.AI settings section" updated to "Umbraco.AI Addons section". FR-006 updated
  to specify Addons registration explicitly.
- Q: Should the evaluator use Umbraco.AI Profiles and Contexts rather than its own
  provider config? → A: Yes. Each EvaluatorConfiguration MUST include an Umbraco.AI
  Profile picker (required — selects AI connection and model) and an Umbraco.AI Context
  picker (optional — injects shared brand/site instructions at evaluation time). The
  package manages neither profiles nor contexts itself. FR-007, FR-016, FR-017 added;
  EvaluatorConfiguration entity, US2 narrative, FR-002, and Assumptions updated.
- Q: Should the evaluation trigger be hidden when no evaluator is configured for a
  document type? → A: Yes — the trigger button is hidden entirely for all users when no
  active evaluator exists for that document type. No dead-end affordance is shown.
  Administrator discoverability is handled via the Page Evaluator configuration list in
  the Umbraco.AI Addons section. US1 Scenario 2, FR-005, and SC-005 updated.
- Q: Who can trigger the evaluation action? → A: Any back-office user with read access
  to the content node. No additional permission required. FR-014 and Assumptions updated.
- Q: What does the editor see while the evaluation is running? → A: Progress indicator
  with sequential status messages stepping through "Sending page data…", "Waiting for AI
  response…", "Rendering report…". Full report displays only when complete. FR-013 added.
- Q: When multiple evaluator configurations exist for the same document type, which one
  is used? → A: Last-saved wins automatically. The most recently saved or updated
  evaluator for a document type becomes the active one with no explicit designation.
  Prior configurations are retained as inactive drafts. FR-007 and the EvaluatorConfiguration
  entity updated to reflect this.
- Q: Should the Prompt Builder assemble prompts via template logic or by calling an AI
  model to generate the prompt text? → A: Template assembly only in v1. No AI call during
  prompt construction. The property alias list, selected checklist categories, and Site
  Context field are combined using predefined text templates.
  **Future enhancement (v2):** AI-assisted prompt generation — the Prompt Builder would
  send the document type field list, selected categories, and Site Context to an AI model
  (via the Umbraco.AI provider integration) to write a full prompt draft. The admin would
  review and edit before saving. Prerequisite resolved: `IChatClient` (Microsoft.Extensions.AI)
  is confirmed available via Umbraco.AI's DI registration; no further spike required before
  committing to v2 implementation.
