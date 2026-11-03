/**
 * 005-upgrade-cms-17-8-ai-17-6 — US5 / FR-019, FR-020 (contracts/ui-notices.md §2)
 *
 * The evaluation modal renders Umbraco.AI's `<uai-disclosure-notice location="page-evaluator">` once,
 * wherever AI output is shown: the report (success, fresh or cached) and the raw-output warning
 * (parse-failed). It is not rendered for states without AI output. The element itself is defined by
 * Umbraco.AI at runtime (not under happy-dom), so this is a DOM-presence test.
 */
import { describe, expect, it, afterEach } from 'vitest';
import type { EvaluationReportResponse } from '../../src/shared/types.js';

import '../../src/evaluation-modal/evaluation-modal.element.js';

type ModalState = 'idle' | 'loading' | 'success' | 'parse-failed' | 'guardrail-blocked' | 'error' | 'culture-not-created';

type ModalElement = HTMLElement & {
  _modalState: ModalState;
  _report: EvaluationReportResponse | null;
  updateComplete: Promise<boolean>;
};

const report: EvaluationReportResponse = {
  parseFailed: false,
  score: { passed: 1, total: 1, displayText: '1/1 checks passed' },
  checks: [{ checkNumber: 1, status: 'Pass', label: 'Title', explanation: null, propertyAliases: null }],
  suggestions: null,
  rawResponse: null,
  cachedAt: '2026-11-02T10:00:00Z',
  overallScore: null,
  axisScores: null,
  propertyEditorAliases: {},
  propertyNames: {},
  recommendationsEnabled: true,
  additionalRecommendableEditorAliases: [],
};

async function renderModalIn(state: ModalState, modalReport: EvaluationReportResponse | null = report): Promise<ModalElement> {
  // No `data` is set, so connectedCallback makes no API call and the modal stays idle until we set its state.
  const el = document.createElement('page-evaluator-modal') as ModalElement;
  document.body.appendChild(el);
  await el.updateComplete;
  el._report = modalReport;
  el._modalState = state;
  await el.updateComplete;
  return el;
}

function disclosureNotices(el: HTMLElement): Element[] {
  return Array.from(el.shadowRoot?.querySelectorAll('uai-disclosure-notice') ?? []);
}

afterEach(() => {
  document.body.textContent = '';
});

describe('evaluation-modal — AI disclosure notice', () => {
  it('renders exactly one notice, with the page-evaluator location, above a successful report', async () => {
    const el = await renderModalIn('success');

    const notices = disclosureNotices(el);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.getAttribute('location')).toBe('page-evaluator');
    const reportEl = el.shadowRoot?.querySelector('page-evaluator-report');
    expect(reportEl).not.toBeNull();
    // Placed before the report (FR-019: covers the report and its recommendation panels).
    expect(notices[0]!.compareDocumentPosition(reportEl!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the notice above the raw AI output when parsing failed', async () => {
    const el = await renderModalIn('parse-failed', { ...report, parseFailed: true, rawResponse: 'raw AI text' });

    const notices = disclosureNotices(el);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.getAttribute('location')).toBe('page-evaluator');
    expect(el.shadowRoot?.querySelector('page-evaluator-warning')).not.toBeNull();
  });

  it.each(['idle', 'loading', 'error', 'guardrail-blocked', 'culture-not-created'] as const)(
    'renders no notice in the %s state (no AI output shown)',
    async (state) => {
      const el = await renderModalIn(state, null);

      expect(disclosureNotices(el)).toHaveLength(0);
    },
  );
});
