/**
 * Copilot tool renderers (contracts/copilot-tools.md "Tool renderers"): Agent.UI renders these elements in the chat
 * for `recommend_page_values` and `apply_page_recommendation`, so the editor always sees the recommended values,
 * whatever the model says (live test 2026-11-05: the model went straight from recommend to apply, and the approval
 * prompt can't show the value).
 *
 * No localizations are registered in these tests, so `localize.term` renders the key names.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import '../../src/copilot/renderers/recommendations-renderer.element.js';
import '../../src/copilot/renderers/apply-renderer.element.js';
import {
  addRecommendation,
  deleteRecommendation,
  resetRecommendationStore,
} from '../../src/copilot/recommendation-store.js';
import type { PageEvaluatorToolStatus } from '../../src/copilot/types.js';

interface RendererElement extends HTMLElement {
  args: Record<string, unknown>;
  status: PageEvaluatorToolStatus;
  result?: unknown;
  updateComplete: Promise<boolean>;
}

const RECOMMENDATIONS_TAG = 'page-evaluator-copilot-recommendations';
const APPLY_TAG = 'page-evaluator-copilot-apply';

/** Creates the element the way Agent.UI's `uai-tool-renderer` does: construct, set props, attach. */
async function mount(
  tag: string,
  props: { args?: Record<string, unknown>; status: PageEvaluatorToolStatus; result?: unknown },
): Promise<RendererElement> {
  const el = document.createElement(tag) as RendererElement;
  el.args = props.args ?? {};
  el.status = props.status;
  if ('result' in props) el.result = props.result;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function update(
  el: RendererElement,
  props: { args?: Record<string, unknown>; status?: PageEvaluatorToolStatus; result?: unknown },
): Promise<void> {
  if (props.args !== undefined) el.args = props.args;
  if (props.status !== undefined) el.status = props.status;
  if ('result' in props) el.result = props.result;
  await el.updateComplete;
}

function root(el: HTMLElement): ShadowRoot {
  if (!el.shadowRoot) throw new Error('no shadow root');
  return el.shadowRoot;
}

function text(el: HTMLElement): string {
  return root(el).textContent ?? '';
}

function valueBlocks(el: HTMLElement): HTMLElement[] {
  return Array.from(root(el).querySelectorAll<HTMLElement>('.value'));
}

const HTML_VALUE = '<p>Welcome to <strong>ProWorks</strong></p>\n<p>Second <em>line</em></p>';

function recommendResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    success: true,
    culture: null,
    recommendations: [
      {
        reference: 'rec_aaaaaaaaaaaa',
        propertyAlias: 'metaDescription',
        propertyName: 'Meta description',
        checkId: 3,
        value: 'A better meta description.',
        canApply: true,
      },
      {
        reference: 'rec_bbbbbbbbbbbb',
        propertyAlias: 'introText',
        propertyName: '',
        checkId: 5,
        value: HTML_VALUE,
        canApply: false,
        applyBlockedReason: 'richTextBlocks',
      },
    ],
    skipped: [],
    nextStep: 'Show each recommended value to the user.',
    ...overrides,
  };
}

beforeEach(() => {
  document.body.textContent = '';
  resetRecommendationStore();
});

// ---------------------------------------------------------------------------
// recommend_page_values
// ---------------------------------------------------------------------------

describe('recommendations renderer', () => {
  it.each<PageEvaluatorToolStatus>(['pending', 'streaming', 'executing'])(
    'shows a compact loading state while %s',
    async (status) => {
      const el = await mount(RECOMMENDATIONS_TAG, { status, args: { propertyAliases: ['title'] } });
      expect(text(el)).toContain('pageEvaluatorCopilot_recommendationsLoading');
      expect(root(el).querySelector('ul')).toBeNull();
    },
  );

  it('lists each recommendation with its field name (falling back to the alias) and its value', async () => {
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result: recommendResult() });

    const items = Array.from(root(el).querySelectorAll('ul.recommendations > li'));
    expect(items).toHaveLength(2);
    expect(items[0]?.querySelector('.field')?.textContent?.trim()).toBe('Meta description');
    expect(items[1]?.querySelector('.field')?.textContent?.trim()).toBe('introText');
    expect(valueBlocks(el).map((v) => v.textContent)).toEqual(['A better meta description.', HTML_VALUE]);
    expect(text(el)).not.toContain('pageEvaluatorCopilot_recommendationsLoading');
  });

  it('shows HTML in a value as text, never as elements', async () => {
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result: recommendResult() });

    const block = valueBlocks(el)[1];
    expect(block?.textContent).toBe(HTML_VALUE);
    expect(block?.children).toHaveLength(0);
    expect(root(el).querySelector('strong, em, p')).toBeNull();
  });

  it('labels the list and each value block for screen readers', async () => {
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result: recommendResult() });

    expect(root(el).querySelector('ul.recommendations')?.getAttribute('aria-label')).toBe(
      'pageEvaluatorCopilot_recommendationsHeading',
    );
    for (const block of valueBlocks(el)) {
      expect(block.getAttribute('tabindex')).toBe('0');
      const labelId = block.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      expect(root(el).getElementById(labelId ?? '')?.classList.contains('field')).toBe(true);
    }
  });

  it('notes when a recommendation cannot be applied, with the embedded-block reason for rich text', async () => {
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result: recommendResult() });
    const items = Array.from(root(el).querySelectorAll('ul.recommendations > li'));

    expect(items[0]?.textContent).not.toContain('pageEvaluatorCopilot_notApplicable');
    expect(items[1]?.textContent).toContain('pageEvaluatorCopilot_notApplicableRichTextBlocks');
  });

  it('uses the generic note when a recommendation cannot be applied for another reason', async () => {
    const result = recommendResult({
      recommendations: [
        { reference: 'rec_c', propertyAlias: 'custom', propertyName: 'Custom', checkId: 1, value: 'x', canApply: false },
      ],
    });
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result });

    expect(text(el)).toContain('pageEvaluatorCopilot_notApplicableGeneric');
    expect(text(el)).not.toContain('pageEvaluatorCopilot_notApplicableRichTextBlocks');
  });

  it('ends with the hint to ask Copilot to apply', async () => {
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result: recommendResult() });
    expect(text(el)).toContain('pageEvaluatorCopilot_recommendationsHint');
  });

  it('lists skipped fields with their reason', async () => {
    const result = recommendResult({
      skipped: [
        { propertyAlias: 'title', reason: 'notFailing' },
        { propertyAlias: 'tags', reason: 'notRecommendable' },
        { propertyAlias: 'summary', reason: 'noRecommendation' },
      ],
    });
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result });

    const skipped = root(el).querySelector('.skipped')?.textContent ?? '';
    expect(skipped).toContain('pageEvaluatorCopilot_skippedHeading');
    expect(skipped).toContain('title');
    expect(skipped).toContain('pageEvaluatorCopilot_skippedNotFailing');
    expect(skipped).toContain('tags');
    expect(skipped).toContain('pageEvaluatorCopilot_skippedNotRecommendable');
    expect(skipped).toContain('summary');
    expect(skipped).toContain('pageEvaluatorCopilot_skippedNoRecommendation');
  });

  it('shows "none" and no hint when nothing was recommended', async () => {
    const result = recommendResult({ recommendations: [], skipped: [{ propertyAlias: 'title', reason: 'notFailing' }] });
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result });

    expect(text(el)).toContain('pageEvaluatorCopilot_recommendationsNone');
    expect(text(el)).not.toContain('pageEvaluatorCopilot_recommendationsHint');
    expect(root(el).querySelector('ul.recommendations')).toBeNull();
  });

  it('shows a tool failure with its message', async () => {
    const result = { success: false, error: { code: 'noReport', message: 'Evaluate the page first.' } };
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result });

    const error = root(el).querySelector('[role="alert"]');
    expect(error?.textContent).toContain('pageEvaluatorCopilot_recommendationsFailed');
    expect(error?.textContent).toContain('Evaluate the page first.');
    expect(root(el).querySelector('ul.recommendations')).toBeNull();
  });

  it('keeps the recommendations that succeeded before a part-way failure', async () => {
    const result = recommendResult({
      success: false,
      error: { code: 'providerUnavailable', message: 'The AI provider is temporarily unavailable.', checkId: 5 },
      recommendations: [
        { reference: 'rec_a', propertyAlias: 'metaDescription', propertyName: 'Meta description', checkId: 3, value: 'Kept', canApply: true },
      ],
    });
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'complete', result });

    expect(valueBlocks(el).map((v) => v.textContent)).toEqual(['Kept']);
    expect(root(el).querySelector('[role="alert"]')?.textContent).toContain('The AI provider is temporarily unavailable.');
  });

  it('shows an Agent.UI error result (an object or a plain string)', async () => {
    const el = await mount(RECOMMENDATIONS_TAG, { status: 'error', result: { error: 'Tool exploded' } });
    expect(root(el).querySelector('[role="alert"]')?.textContent).toContain('Tool exploded');

    await update(el, { result: 'Aborted' });
    expect(root(el).querySelector('[role="alert"]')?.textContent).toContain('Aborted');
  });

  it('ignores a malformed result instead of throwing', async () => {
    const el = await mount(RECOMMENDATIONS_TAG, {
      status: 'complete',
      result: { recommendations: [{ propertyAlias: 42 }, null, 'x'], skipped: 'nope' },
    });
    expect(text(el)).toContain('pageEvaluatorCopilot_recommendationsNone');
  });
});

// ---------------------------------------------------------------------------
// apply_page_recommendation
// ---------------------------------------------------------------------------

function stage(value = HTML_VALUE): string {
  return addRecommendation({
    nodeId: 'node-1',
    culture: null,
    propertyAlias: 'introText',
    propertyName: 'Introduction',
    editorAlias: 'Umbraco.RichText',
    value,
  }).reference;
}

const APPLIED = {
  success: true,
  propertyAlias: 'introText',
  culture: null,
  saved: false,
  message: 'Staged in the editor. The user must click Save to keep it.',
};

describe('apply renderer', () => {
  it.each<PageEvaluatorToolStatus>(['pending', 'streaming', 'awaiting_approval', 'executing'])(
    'shows the stored value it will write while %s',
    async (status) => {
      const reference = stage();
      const el = await mount(APPLY_TAG, { status, args: { reference } });

      expect(root(el).querySelector('.field')?.textContent?.trim()).toBe('Introduction');
      expect(text(el)).toContain('pageEvaluatorCopilot_applyWillWrite');
      expect(text(el)).toContain('pageEvaluatorCopilot_applyStagedNote');
      const block = valueBlocks(el)[0];
      expect(block?.textContent).toBe(HTML_VALUE);
      expect(block?.children).toHaveLength(0);
      expect(root(el).querySelector('strong, em, p')).toBeNull();
    },
  );

  it('labels the value block with the field name', async () => {
    const el = await mount(APPLY_TAG, { status: 'awaiting_approval', args: { reference: stage('Plain') } });
    const block = valueBlocks(el)[0];
    expect(block?.getAttribute('tabindex')).toBe('0');
    expect(root(el).getElementById(block?.getAttribute('aria-labelledby') ?? '')?.textContent?.trim()).toBe('Introduction');
  });

  it('keeps the field and value after the entry is deleted and the tool completes', async () => {
    const reference = stage('Short intro');
    const el = await mount(APPLY_TAG, { status: 'awaiting_approval', args: { reference } });

    deleteRecommendation(reference);
    await update(el, { status: 'executing' });
    await update(el, { status: 'complete', result: APPLIED });

    expect(root(el).querySelector('.field')?.textContent?.trim()).toBe('Introduction');
    expect(text(el)).toContain('pageEvaluatorCopilot_applyApplied');
    expect(valueBlocks(el).map((v) => v.textContent)).toEqual(['Short intro']);
    expect(text(el)).not.toContain('pageEvaluatorCopilot_applyNotFound');
    expect(text(el)).not.toContain('pageEvaluatorCopilot_applyWillWrite');
  });

  it('waits for the arguments before looking the reference up', async () => {
    const el = await mount(APPLY_TAG, { status: 'pending', args: {} });
    expect(text(el)).not.toContain('pageEvaluatorCopilot_applyNotFound');

    const reference = stage('Later');
    await update(el, { status: 'awaiting_approval', args: { reference } });
    expect(valueBlocks(el).map((v) => v.textContent)).toEqual(['Later']);
  });

  it('says "not found" when the reference is not in the store', async () => {
    const el = await mount(APPLY_TAG, { status: 'awaiting_approval', args: { reference: 'rec_unknown12345' } });
    expect(text(el)).toContain('pageEvaluatorCopilot_applyNotFound');
    expect(valueBlocks(el)).toHaveLength(0);
  });

  it('shows "not found" for an unknownRecommendation failure instead of the model-facing text', async () => {
    const result = { success: false, error: { code: 'unknownRecommendation', message: 'Get a new recommendation with recommend_page_values.' } };
    const el = await mount(APPLY_TAG, { status: 'complete', args: { reference: 'rec_unknown12345' }, result });
    expect(text(el)).toContain('pageEvaluatorCopilot_applyNotFound');
    expect(text(el)).not.toContain('recommend_page_values');
  });

  it('shows a refusal from the tool with its message and the field', async () => {
    const reference = stage('Value');
    const el = await mount(APPLY_TAG, { status: 'awaiting_approval', args: { reference } });
    await update(el, {
      status: 'complete',
      result: { success: false, error: { code: 'readOnly', message: "The field is read-only for the user, so the value can't be written." } },
    });

    const alert = root(el).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('pageEvaluatorCopilot_applyNotApplied');
    expect(alert?.textContent).toContain('read-only');
    expect(root(el).querySelector('.field')?.textContent?.trim()).toBe('Introduction');
    expect(text(el)).not.toContain('pageEvaluatorCopilot_applyApplied');
  });

  it('shows a denied approval (Agent.UI error status) with its message', async () => {
    const reference = stage('Value');
    const el = await mount(APPLY_TAG, { status: 'awaiting_approval', args: { reference } });
    await update(el, { status: 'error', result: { error: 'User cancelled the operation' } });

    const alert = root(el).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('pageEvaluatorCopilot_applyNotApplied');
    expect(alert?.textContent).toContain('User cancelled the operation');
    expect(text(el)).not.toContain('pageEvaluatorCopilot_applyStagedNote');
  });

  it('falls back to the result alias when rendered after the entry was already removed', async () => {
    const el = await mount(APPLY_TAG, { status: 'complete', args: { reference: 'rec_gone12345678' }, result: APPLIED });

    expect(root(el).querySelector('.field')?.textContent?.trim()).toBe('introText');
    expect(text(el)).toContain('pageEvaluatorCopilot_applyApplied');
    expect(text(el)).not.toContain('pageEvaluatorCopilot_applyNotFound');
  });

  it('looks up a new reference when the arguments change', async () => {
    const first = stage('First');
    const second = addRecommendation({
      nodeId: 'node-1',
      culture: null,
      propertyAlias: 'title',
      editorAlias: 'Umbraco.TextBox',
      value: 'Second',
    }).reference;
    const el = await mount(APPLY_TAG, { status: 'awaiting_approval', args: { reference: first } });
    await update(el, { args: { reference: second } });

    expect(root(el).querySelector('.field')?.textContent?.trim()).toBe('title');
    expect(valueBlocks(el).map((v) => v.textContent)).toEqual(['Second']);
  });
});
