# Quickstart: Umbraco AI Page Evaluator

Use this guide to verify the package is working end-to-end after installation.

## Prerequisites

- Umbraco v17 site running locally
- `Umbraco.AI` package installed and configured with at least one Profile
- `ProWorks.Umbraco.AI.PageEvaluator` NuGet package installed
- At least one document type with content nodes

---

## Step 1: Verify the Package Appears in Umbraco.AI Addons

1. Log in to the Umbraco back-office
2. Navigate to the **Umbraco.AI** section in the left navigation
3. Click **Addons**
4. Confirm **AI Page Evaluator** appears as an entry in the Addons list

**Expected**: The AI Page Evaluator tile/entry is visible.
**If missing**: Check that the NuGet package installed correctly and the `App_Plugins` folder
contains `ProWorks.AI.PageEvaluator/umbraco-package.json`.

---

## Step 2: Create an Evaluator Configuration

1. Click **AI Page Evaluator** in the Addons section
2. Click **Create Evaluator**
3. Fill in:
   - **Name**: `Test Evaluator`
   - **Document Type**: Select any available document type (e.g. `Article`)
   - **Profile**: Select the Umbraco.AI profile you configured (e.g. `OpenAI GPT-4o`)
   - **Context**: Leave blank for now
   - **Prompt**: Paste a simple evaluation prompt, e.g.:
     ```
     You are a content quality checker. Evaluate the following page properties.
     For each check, respond with PASS or FAIL and a brief explanation.
     Check 1: Node name is set and not the default.
     Check 2: At least one content block is present.
     ```
4. Click **Save**

**Expected**: The evaluator appears in the list with an **Active** badge.

---

## Step 3: Verify the Evaluate Button Appears on a Content Node

1. Navigate to the **Content** section
2. Open a node of the document type you selected in Step 2 (e.g. an Article)
3. Look at the workspace action bar (bottom of the editor)

**Expected**: An **Evaluate Page** button is visible.
**If missing**: Confirm the EvaluatorConfiguration was saved as active for that document type
by re-checking the Addons config list.

4. Open a node of a *different* document type (one with no evaluator configured)

**Expected**: The **Evaluate Page** button is **not visible** — the workspace action is hidden.

---

## Step 4: Run an Evaluation

1. Return to the Article node from Step 3
2. Click **Evaluate Page**
3. The slide-in dialog opens — confirm you see the progress indicator with status messages:
   - "Sending page data…"
   - "Waiting for AI response…"
   - "Rendering report…"
4. Wait for the report to load (up to 30 seconds)

**Expected**: A structured report appears showing:
- A score (e.g. "2/2 checks passed")
- A **Passing Items** section
- An **Items Needing Attention** section (if any checks failed)
- A **Suggestions** section (if the AI provided any)

5. Close the dialog by clicking the **×** or pressing **Escape**

**Expected**: The dialog closes and the content editor is fully accessible again.

---

## Step 5: Test the Parse-Failure Warning Banner

1. Edit the evaluator from Step 2 and replace the prompt text with a vague instruction
   that will cause the AI to return freeform text rather than structured PASS/FAIL output:
   ```
   Describe this page in a few sentences.
   ```
2. Save and re-run the evaluation on the same Article node

**Expected**: The slide-in dialog shows a **warning banner** stating the response could not
be structured, with a link to the evaluator configuration. The raw AI response text is
displayed below the banner.

---

## Step 6: Test the Prompt Builder

1. Return to the AI Page Evaluator Addons section
2. Click **Create Evaluator** and select a document type
3. Click **Open Prompt Builder**
4. Confirm the document type's property aliases appear, grouped by tab/group
5. Select at least two checklist categories (e.g. **Required Fields** and **Metadata & SEO**)
6. Enter a value in the **Site Context** field (e.g. "Mold Inspection Sciences, US homeowner audience")
7. Click **Generate Prompt Draft**

**Expected**: A prompt draft appears in the builder incorporating the selected categories,
the document type's property aliases, and the site context.

8. Click **Use This Prompt** — confirm the draft appears in the evaluator's prompt textarea.

---

## Validation Checklist

- [ ] Addons entry visible in Umbraco.AI section
- [ ] Evaluator configuration saves without error
- [ ] Active badge shown on most recently saved config
- [ ] Evaluate button visible only on nodes with an active evaluator
- [ ] Slide-in dialog opens with progress status messages
- [ ] Structured report renders with score, passing, and attention sections
- [ ] Parse-failure banner displays with link to config when AI returns freeform text
- [ ] Prompt Builder surfaces property aliases for selected document type
- [ ] Generated prompt draft transfers to the evaluator form
