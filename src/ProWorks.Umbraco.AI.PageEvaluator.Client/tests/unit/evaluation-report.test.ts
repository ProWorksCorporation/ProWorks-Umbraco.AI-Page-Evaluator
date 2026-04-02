/**
 * T026 — Vitest unit tests for evaluation-report.element.ts
 *
 * Tests: renders score, passing section, attention section, suggestions; handles null suggestions.
 *
 * RED STATE: These tests will fail to import until T035 creates
 * src/evaluation-modal/evaluation-report.element.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { EvaluationReportResponse } from '../../src/shared/types.js';

// Import the component under test — will FAIL until T035 creates this file.
import '../../src/evaluation-modal/evaluation-report.element.js';

const ELEMENT_TAG = 'page-evaluator-report';

function buildReport(
  overrides: Partial<EvaluationReportResponse> = {},
): EvaluationReportResponse {
  return {
    parseFailed: false,
    score: { passed: 14, total: 17, displayText: '14/17 checks passed' },
    checks: [
      { checkNumber: 1, status: 'Pass', label: 'Title', explanation: null },
      { checkNumber: 2, status: 'Pass', label: 'Featured Image', explanation: null },
      { checkNumber: 3, status: 'Fail', label: 'Meta Description', explanation: 'Empty.' },
      { checkNumber: 4, status: 'Warn', label: 'Browser Title', explanation: 'Too long.' },
    ],
    suggestions: 'Consider adding internal links.',
    rawResponse: null,
    ...overrides,
  };
}

function renderReport(report: EvaluationReportResponse): HTMLElement {
  const el = document.createElement(ELEMENT_TAG) as HTMLElement & { report: EvaluationReportResponse };
  el.report = report;
  document.body.appendChild(el);
  return el;
}

/** Returns the shadow root text content, falling back to the element's own text content. */
function getText(el: HTMLElement): string {
  return el.shadowRoot?.textContent ?? el.textContent ?? '';
}

/** Query within the shadow root, falling back to the element itself. */
function query(el: HTMLElement, selector: string): Element | null {
  return el.shadowRoot?.querySelector(selector) ?? el.querySelector(selector);
}

/** Query all within the shadow root, falling back to the element itself. */
function queryAll(el: HTMLElement, selector: string): NodeListOf<Element> {
  return el.shadowRoot?.querySelectorAll(selector) ?? el.querySelectorAll(selector);
}

describe('evaluation-report.element', () => {
  beforeEach(() => {
    document.body.textContent = '';
  });

  it('renders the score badge with correct text', async () => {
    const report = buildReport();
    const el = renderReport(report);
    await Promise.resolve(); // allow Lit update cycle

    expect(getText(el)).toContain('14');
    expect(getText(el)).toContain('17');
  });

  it('renders passing item labels in the passing section', async () => {
    const report = buildReport();
    const el = renderReport(report);
    await Promise.resolve();

    const text = getText(el);
    expect(text).toContain('Title');
    expect(text).toContain('Featured Image');
  });

  it('renders fail and warn labels in the attention section', async () => {
    const report = buildReport();
    const el = renderReport(report);
    await Promise.resolve();

    const text = getText(el);
    expect(text).toContain('Meta Description');
    expect(text).toContain('Browser Title');
  });

  it('renders explanation text for failing checks', async () => {
    const report = buildReport();
    const el = renderReport(report);
    await Promise.resolve();

    const text = getText(el);
    expect(text).toContain('Empty.');
    expect(text).toContain('Too long.');
  });

  it('renders suggestions block when suggestions is non-null', async () => {
    const report = buildReport({ suggestions: 'Consider adding internal links.' });
    const el = renderReport(report);
    await Promise.resolve();

    expect(getText(el)).toContain('Consider adding internal links.');
  });

  it('hides suggestions block when suggestions is null', async () => {
    const report = buildReport({ suggestions: null });
    const el = renderReport(report);
    await Promise.resolve();

    // The suggestions section text should be absent or the suggestions container hidden
    const suggestionContainer = query(el, '[data-testid="suggestions"], .suggestions');
    if (suggestionContainer !== null) {
      // If element exists, it must not display the suggestions text
      expect(suggestionContainer.textContent?.trim()).toBeFalsy();
    } else {
      // Suggestions section was not rendered at all — acceptable
      expect(getText(el)).not.toContain('Consider adding internal links.');
    }
  });

  it('renders uui-icon elements for check status icons', async () => {
    const report = buildReport();
    const el = renderReport(report);
    await Promise.resolve();

    const icons = queryAll(el, 'uui-icon');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders exactly the correct number of passing checks', async () => {
    const report = buildReport(); // 2 pass, 1 fail, 1 warn
    const el = renderReport(report);
    await Promise.resolve();

    // Passing section should contain 2 items
    const passingItems = queryAll(el, '[data-status="Pass"], .check-pass');
    expect(passingItems.length).toBe(2);
  });

  it('renders exactly the correct number of attention checks', async () => {
    const report = buildReport(); // 2 pass, 1 fail, 1 warn
    const el = renderReport(report);
    await Promise.resolve();

    // Attention section should contain fail + warn = 2 items
    const attentionItems = queryAll(el, '[data-status="Fail"], [data-status="Warn"], .check-fail, .check-warn');
    expect(attentionItems.length).toBe(2);
  });
});
