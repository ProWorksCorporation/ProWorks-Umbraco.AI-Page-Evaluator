/**
 * T026 — Vitest unit tests for evaluation-report.element.ts
 *
 * Tests: renders score, passing section, attention section, suggestions; handles null suggestions.
 *
 * RED STATE: These tests will fail to import until T035 creates
 * src/evaluation-modal/evaluation-report.element.ts
 */
import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
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
      { checkNumber: 1, status: 'Pass', label: 'Title', explanation: null, propertyAliases: null },
      { checkNumber: 2, status: 'Pass', label: 'Featured Image', explanation: null, propertyAliases: null },
      { checkNumber: 3, status: 'Fail', label: 'Meta Description', explanation: 'Empty.', propertyAliases: null },
      { checkNumber: 4, status: 'Warn', label: 'Browser Title', explanation: 'Too long.', propertyAliases: null },
    ],
    suggestions: 'Consider adding internal links.',
    rawResponse: null,
    cachedAt: null,
    overallScore: null,
    axisScores: null,
    propertyEditorAliases: {},
    propertyNames: {},
    recommendationsEnabled: true,
    additionalRecommendableEditorAliases: [],
    ...overrides,
  };
}

/** Mounts the element and waits for Lit's first render (a single microtask is not enough for UmbLitElement). */
async function renderReport(report: EvaluationReportResponse): Promise<HTMLElement> {
  const el = document.createElement(ELEMENT_TAG) as HTMLElement & {
    report: EvaluationReportResponse;
    propertyEditorAliases: Record<string, string>;
    updateComplete: Promise<boolean>;
  };
  el.report = report;
  // The modal passes the editor-alias map as its own property (as evaluation-modal.element does).
  el.propertyEditorAliases = report.propertyEditorAliases;
  document.body.appendChild(el);
  await el.updateComplete;
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

  it('renders the summary counts derived from the checks', async () => {
    // The summary bar counts the checks themselves (4 total: 2 pass, 1 warn, 1 fail);
    // the AI-reported score.passed/total is no longer displayed there.
    const report = buildReport();
    const el = await renderReport(report);

    const summary = (query(el, '.score-total')?.textContent ?? '').replace(/\s+/g, ' ');
    expect(summary).toContain('4');
    expect(summary).toContain('evaluatePage_reportChecks');
    expect(getText(el)).toContain('2 evaluatePage_reportPassed');
  });

  it('renders passing item labels in the passing section', async () => {
    const report = buildReport();
    const el = await renderReport(report);

    const text = getText(el);
    expect(text).toContain('Title');
    expect(text).toContain('Featured Image');
  });

  it('renders fail and warn labels in the attention section', async () => {
    const report = buildReport();
    const el = await renderReport(report);

    const text = getText(el);
    expect(text).toContain('Meta Description');
    expect(text).toContain('Browser Title');
  });

  it('renders explanation text for failing checks', async () => {
    const report = buildReport();
    const el = await renderReport(report);

    const text = getText(el);
    expect(text).toContain('Empty.');
    expect(text).toContain('Too long.');
  });

  it('renders suggestions block when suggestions is non-null', async () => {
    const report = buildReport({ suggestions: 'Consider adding internal links.' });
    const el = await renderReport(report);

    expect(getText(el)).toContain('Consider adding internal links.');
  });

  it('hides suggestions block when suggestions is null', async () => {
    const report = buildReport({ suggestions: null });
    const el = await renderReport(report);

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
    const el = await renderReport(report);

    const icons = queryAll(el, 'uui-icon');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders exactly the correct number of passing checks', async () => {
    const report = buildReport(); // 2 pass, 1 fail, 1 warn
    const el = await renderReport(report);

    // Passing section should contain 2 items
    const passingItems = queryAll(el, '[data-status="Pass"], .check-pass');
    expect(passingItems.length).toBe(2);
  });

  it('renders exactly the correct number of attention checks', async () => {
    const report = buildReport(); // 2 pass, 1 fail, 1 warn
    const el = await renderReport(report);

    // Attention section should contain fail + warn = 2 items
    const attentionItems = queryAll(el, '[data-status="Fail"], [data-status="Warn"], .check-fail, .check-warn');
    expect(attentionItems.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Recommendation errors reach the UI with their type/category (research R12.3, T032)
// ---------------------------------------------------------------------------

const server = setupServer();

describe('evaluation-report.element — recommendation errors', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  async function clickGenerate(el: HTMLElement): Promise<void> {
    const button = Array.from(queryAll(el, 'uui-button')).find(
      (b) => b.getAttribute('label') === 'evaluatePage_recGenerate',
    );
    if (!button) throw new Error('Generate button not rendered');
    (button as HTMLElement).click();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    await (el as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
  }

  function recommendableReport(): EvaluationReportResponse {
    return buildReport({
      checks: [
        { checkNumber: 3, status: 'Fail', label: 'Meta Description', explanation: 'Empty.', propertyAliases: ['metaDescription'] },
      ],
      propertyEditorAliases: { metaDescription: 'Umbraco.TextBox' },
    });
  }

  it('shows the gateway-timeout message when /recommend returns a GatewayTimeout body', async () => {
    server.use(
      http.post('/umbraco/management/api/v1/page-evaluator/recommend', () =>
        HttpResponse.json({ type: 'GatewayTimeout', title: 'Gateway timeout', status: 504 }, { status: 504 }),
      ),
    );
    const el = await renderReport(recommendableReport());

    await clickGenerate(el);

    expect(getText(el)).toContain('evaluatePage_gatewayTimeoutMessage');
  });

  it('shows the category message when /recommend returns a temporaryRetryable body', async () => {
    server.use(
      http.post('/umbraco/management/api/v1/page-evaluator/recommend', () =>
        HttpResponse.json({ type: 'Error', title: 'Busy', status: 503, category: 'temporaryRetryable' }, { status: 503 }),
      ),
    );
    const el = await renderReport(recommendableReport());

    await clickGenerate(el);

    expect(getText(el)).toContain('evaluatePage_temporaryRetryableMessage');
  });
});

// ---------------------------------------------------------------------------
// Variability notice on the report (003-upgrade-umbraco-17-6 FR-015b)
// ---------------------------------------------------------------------------

describe('evaluation-report.element — variability notice', () => {
  it('shows the notice when the report was produced by a model that ignores temperature', async () => {
    const el = await renderReport(buildReport({ samplingSettingsIgnored: true }));

    const notice = query(el, '[role="status"]');
    expect(notice?.textContent).toContain('evaluatePage_samplingVariesNotice');
  });

  it.each([false, null])('does not show the notice when samplingSettingsIgnored is %s', async (value) => {
    const el = await renderReport(buildReport({ samplingSettingsIgnored: value }));

    expect(getText(el)).not.toContain('evaluatePage_samplingVariesNotice');
  });
});

// ---------------------------------------------------------------------------
// Rich-text Recommend + Apply with the embedded-block safeguard (003-upgrade-umbraco-17-6 FR-016)
// ---------------------------------------------------------------------------

describe('evaluation-report.element — rich-text recommendations', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const RECOMMEND_URL = '/umbraco/management/api/v1/page-evaluator/recommend';
  const currentBody = {
    markup: '<p>Old body</p><umb-rte-block data-content-key="blk-1"><!--Umbraco-Block--></umb-rte-block>',
    blocks: { layout: {}, contentData: [], settingsData: [], expose: [] },
  };

  async function renderRichTextReport(): Promise<HTMLElement> {
    const el = document.createElement(ELEMENT_TAG) as HTMLElement & {
      report: EvaluationReportResponse;
      propertyEditorAliases: Record<string, string>;
      properties: Record<string, unknown>;
      updateComplete: Promise<boolean>;
    };
    el.report = buildReport({
      checks: [{ checkNumber: 5, status: 'Fail', label: 'Body copy', explanation: 'Too short.', propertyAliases: ['bodyText'] }],
      propertyEditorAliases: { bodyText: 'Umbraco.RichText' },
    });
    el.propertyEditorAliases = { bodyText: 'Umbraco.RichText' };
    el.properties = { bodyText: currentBody };
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  function buttonLabels(el: HTMLElement): string[] {
    return Array.from(queryAll(el, 'uui-button')).map((b) => b.getAttribute('label') ?? '');
  }

  async function generate(el: HTMLElement): Promise<void> {
    const button = Array.from(queryAll(el, 'uui-button')).find(
      (b) => b.getAttribute('label') === 'evaluatePage_recGenerate',
    );
    if (!button) throw new Error('Generate button not rendered for the rich-text check');
    (button as HTMLElement).click();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    await (el as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
  }

  it('offers Apply and Copy when the recommendation keeps every embedded block', async () => {
    server.use(
      http.post(RECOMMEND_URL, () =>
        HttpResponse.json({
          recommendedValues: {
            bodyText: '<p>Better body</p><umb-rte-block data-content-key="blk-1"><!--Umbraco-Block--></umb-rte-block>',
          },
        }),
      ),
    );
    const el = await renderRichTextReport();

    await generate(el);

    expect(buttonLabels(el)).toContain('evaluatePage_recApply');
    expect(buttonLabels(el)).toContain('evaluatePage_recCopy');
    expect(getText(el)).not.toContain('evaluatePage_rteApplyBlockedMessage');
  });

  it('withholds Apply, keeps Copy and explains why when the recommendation drops a block', async () => {
    server.use(
      http.post(RECOMMEND_URL, () => HttpResponse.json({ recommendedValues: { bodyText: '<p>Better body, no block</p>' } })),
    );
    const el = await renderRichTextReport();

    await generate(el);

    expect(buttonLabels(el)).not.toContain('evaluatePage_recApply');
    expect(buttonLabels(el)).toContain('evaluatePage_recCopy');
    expect(getText(el)).toContain('evaluatePage_rteApplyBlockedMessage');
  });

  it('sends the rich-text markup (not "[object Object]") as the current value', async () => {
    let sentBody: unknown = null;
    server.use(
      http.post(RECOMMEND_URL, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ recommendedValues: { bodyText: null } });
      }),
    );
    const el = await renderRichTextReport();

    await generate(el);

    const properties = (sentBody as { properties: Record<string, string> } | null)?.properties ?? {};
    expect(properties['bodyText']).toBe(currentBody.markup);
  });

  it('shows the apply-failed message and does not mark the field applied when the modal reports a failed write', async () => {
    server.use(
      http.post(RECOMMEND_URL, () =>
        HttpResponse.json({
          recommendedValues: {
            bodyText: '<p>Better</p><umb-rte-block data-content-key="blk-1"><!--Umbraco-Block--></umb-rte-block>',
          },
        }),
      ),
    );
    const el = await renderRichTextReport();
    await generate(el);
    el.addEventListener('page-evaluator-rec-apply', (e) => {
      const { propertyAlias, checkNumber } = (e as CustomEvent<{ propertyAlias: string; checkNumber: number }>).detail;
      el.dispatchEvent(new CustomEvent('page-evaluator-rec-apply-failed', { detail: { propertyAlias, checkNumber } }));
    });

    const apply = Array.from(queryAll(el, 'uui-button')).find((b) => b.getAttribute('label') === 'evaluatePage_recApply');
    (apply as HTMLElement).click();
    await (el as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;

    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    await (el as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    expect(getText(el)).toContain('evaluatePage_applyFailedMessage');
    expect(getText(el)).not.toContain('evaluatePage_recApplied');
  });
});
