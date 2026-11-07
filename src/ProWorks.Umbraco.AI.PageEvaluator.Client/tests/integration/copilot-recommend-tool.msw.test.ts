/**
 * T048 — Copilot `recommend_page_values` tool (`src/copilot/recommend-page-values.tool.api.ts`,
 * contracts/copilot-tools.md §2) against MSW handlers.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import RecommendPageValuesToolApi, { RECOMMEND_NEXT_STEP } from '../../src/copilot/recommend-page-values.tool.api.js';
import { resetReportStore, snapshotOf, storeReport } from '../../src/copilot/report-store.js';
import { getRecommendation, resetRecommendationStore } from '../../src/copilot/recommendation-store.js';
import type { CheckResult, EvaluationReportResponse, RecommendRequest } from '../../src/shared/types.js';
import {
  createToolHost,
  documentEntity,
  fakeDocumentWorkspace,
  fakeEntityAdapter,
  type FakeDocumentWorkspace,
  type FakeValue,
  type FakeWorkspaceOptions,
} from '../fixtures/copilot-fakes.js';

const BASE = '/umbraco/management/api/v1/page-evaluator';
const NODE_ID = '3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7';

const server = setupServer();
const hosts: HTMLElement[] = [];
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  for (const host of hosts.splice(0)) host.remove();
});
afterAll(() => server.close());
beforeEach(() => {
  resetReportStore();
  resetRecommendationStore();
});

const block = '<umb-rte-block data-content-key="b1"><!--Umbraco-Block--></umb-rte-block>';

const values: FakeValue[] = [
  { alias: 'title', value: 'Welcome' },
  { alias: 'metaDescription', value: '' },
  { alias: 'keywords', value: ['old'] },
  { alias: 'introText', value: { markup: `<p>Intro</p>${block}`, blocks: { layout: {}, contentData: [], settingsData: [], expose: [] } } },
  { alias: 'heroImage', value: [{ mediaKey: 'm1' }] },
  { alias: 'footer', value: 'Fine' },
];

const checks: CheckResult[] = [
  { checkNumber: 1, status: 'Pass', label: 'Footer', explanation: null, propertyAliases: ['footer'] },
  { checkNumber: 2, status: 'Warn', label: 'Title length', explanation: 'Title is short.', propertyAliases: ['title'] },
  { checkNumber: 3, status: 'Fail', label: 'Meta and keywords', explanation: 'Meta description is empty.', propertyAliases: ['metaDescription', 'keywords', 'heroImage'] },
  { checkNumber: 4, status: 'Fail', label: 'Introduction', explanation: 'Too vague.', propertyAliases: ['introText', 'title'] },
];

function reportResponse(overrides: Partial<EvaluationReportResponse> = {}): EvaluationReportResponse {
  return {
    parseFailed: false,
    score: null,
    checks,
    suggestions: null,
    rawResponse: null,
    cachedAt: '2026-11-03T10:15:00Z',
    overallScore: null,
    axisScores: null,
    propertyEditorAliases: {
      title: 'Umbraco.TextBox',
      metaDescription: 'Umbraco.TextArea',
      keywords: 'Umbraco.Tags',
      introText: 'Umbraco.RichText',
      heroImage: 'Umbraco.MediaPicker3',
      footer: 'Umbraco.TextBox',
    },
    propertyNames: { title: 'Title', metaDescription: 'Meta description', keywords: 'Keywords', introText: 'Introduction' },
    recommendationsEnabled: true,
    additionalRecommendableEditorAliases: [],
    samplingSettingsIgnored: null,
    culture: null,
    savedSinceEvaluation: false,
    ...overrides,
  };
}

function useRecommend(
  respond: (request: RecommendRequest, index: number) => Response = (request) =>
    HttpResponse.json({
      recommendedValues: Object.fromEntries(request.propertyAliases.map((a) => [a, `Better ${a}`])),
    }),
  cached: EvaluationReportResponse | null = null,
): RecommendRequest[] {
  const requests: RecommendRequest[] = [];
  server.use(
    http.post(`${BASE}/recommend`, async ({ request }) => {
      const body = (await request.json()) as RecommendRequest;
      requests.push(body);
      return respond(body, requests.length - 1);
    }),
    http.get(`${BASE}/evaluate/cached/:nodeId`, () =>
      // "Nothing cached" is 204 No Content since 17.6.1.
      cached === null ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(cached),
    ),
  );
  return requests;
}

function setup(options: FakeWorkspaceOptions = {}): { tool: RecommendPageValuesToolApi; workspace: FakeDocumentWorkspace } {
  const workspace = fakeDocumentWorkspace({ unique: NODE_ID, values, ...options });
  const host = createToolHost(fakeEntityAdapter(documentEntity(workspace)));
  hosts.push(host);
  return { tool: new RecommendPageValuesToolApi(host), workspace };
}

/** Stores a fresh report evaluated from the workspace's current values. */
function storeFresh(workspace: FakeDocumentWorkspace, report = reportResponse(), culture: string | null = null): void {
  const properties = Object.fromEntries(workspace.values.filter((v) => v.culture === null || v.culture === culture).map((v) => [v.alias, v.value]));
  storeReport(NODE_ID, culture, report, snapshotOf(properties), true);
}

type Result = Record<string, unknown>;

async function run(tool: RecommendPageValuesToolApi, propertyAliases: unknown): Promise<Result> {
  return JSON.parse(JSON.stringify(await tool.execute({ propertyAliases }))) as Result;
}

function errorCode(result: Result): unknown {
  return (result['error'] as Result | undefined)?.['code'];
}

describe('recommend_page_values', () => {
  it('returns noReport when the page has not been evaluated', async () => {
    const requests = useRecommend();
    const { tool } = setup();

    const result = await run(tool, ['title']);

    expect(result).toEqual({ success: false, error: { code: 'noReport', message: 'Evaluate the page first.' } });
    expect(requests).toHaveLength(0);
  });

  it('uses the cached report when the store has none', async () => {
    const requests = useRecommend(undefined, reportResponse());
    const { tool } = setup();

    const result = await run(tool, ['metaDescription']);

    expect(result['success']).toBe(true);
    expect(requests).toHaveLength(1);
  });

  it('returns recommendationsDisabled when the configuration has recommendations off', async () => {
    useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace, reportResponse({ recommendationsEnabled: false }));

    expect(errorCode(await run(tool, ['metaDescription']))).toBe('recommendationsDisabled');
  });

  describe('out-of-date reports', () => {
    it('refuses after a fresh evaluation when the values on screen changed since', async () => {
      const requests = useRecommend();
      const { tool, workspace } = setup();
      storeFresh(workspace);
      await (workspace.setPropertyValue as unknown as (a: string, v: unknown) => Promise<void>)('title', 'Changed');

      const result = await run(tool, ['metaDescription']);

      expect(result).toEqual({ success: false, error: { code: 'reportOutOfDate', message: 'Run a fresh evaluation first.' } });
      expect(requests).toHaveLength(0);
    });

    it('accepts a fresh evaluation of the unsaved values on screen', async () => {
      useRecommend();
      const { tool, workspace } = setup({ hasUnpersistedChanges: true });
      storeFresh(workspace);

      expect((await run(tool, ['metaDescription']))['success']).toBe(true);
    });

    it('refuses a cached report when the editor has unsaved changes', async () => {
      useRecommend(undefined, reportResponse());
      const { tool } = setup({ hasUnpersistedChanges: true });

      expect(errorCode(await run(tool, ['metaDescription']))).toBe('reportOutOfDate');
    });

    it('refuses a cached report when the page was saved since it was produced', async () => {
      useRecommend(undefined, reportResponse({ savedSinceEvaluation: true }));
      const { tool } = setup();

      expect(errorCode(await run(tool, ['metaDescription']))).toBe('reportOutOfDate');
    });

    it('refuses a stored cached report when the values changed since it was read', async () => {
      useRecommend();
      const { tool, workspace } = setup();
      storeReport(NODE_ID, null, reportResponse(), snapshotOf({ title: 'Something else' }), false);
      workspace.setHasUnpersistedChanges(false);

      expect(errorCode(await run(tool, ['metaDescription']))).toBe('reportOutOfDate');
    });
  });

  it('skips aliases that no failing or warning check names, and editors that cannot be recommended', async () => {
    useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace);

    const result = await run(tool, ['footer', 'heroImage', 'unknownAlias', 'metaDescription']);

    expect(result['skipped']).toEqual([
      { propertyAlias: 'footer', reason: 'notFailing' },
      { propertyAlias: 'heroImage', reason: 'notRecommendable' },
      { propertyAlias: 'unknownAlias', reason: 'notFailing' },
    ]);
    expect((result['recommendations'] as Result[]).map((r) => r['propertyAlias'])).toEqual(['metaDescription']);
  });

  it("groups the aliases into one POST per check, with that check's label and explanation, and no cap", async () => {
    const requests = useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace);

    await run(tool, ['title', 'metaDescription', 'keywords', 'introText']);

    expect(requests.map((r) => ({ aliases: r.propertyAliases, label: r.checkLabel, explanation: r.checkExplanation }))).toEqual([
      { aliases: ['title', 'introText'], label: 'Introduction', explanation: 'Too vague.' },
      { aliases: ['metaDescription', 'keywords'], label: 'Meta and keywords', explanation: 'Meta description is empty.' },
    ]);
  });

  it('sends the node, culture and current values (rich text as markup) with each request', async () => {
    const requests = useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace);

    await run(tool, ['metaDescription']);

    expect(requests[0]).toMatchObject({
      nodeId: NODE_ID,
      culture: null,
      properties: { title: 'Welcome', metaDescription: '', keywords: '["old"]', introText: `<p>Intro</p>${block}`, footer: 'Fine' },
    });
  });

  it('creates a reference for each recommendation', async () => {
    useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace);

    const result = await run(tool, ['metaDescription', 'title']);

    expect(result['success']).toBe(true);
    expect(result['culture']).toBeNull();
    const recommendations = result['recommendations'] as Result[];
    expect(recommendations).toEqual([
      { reference: expect.stringMatching(/^rec_/) as unknown, propertyAlias: 'metaDescription', propertyName: 'Meta description', checkId: 3, value: 'Better metaDescription', canApply: true },
      { reference: expect.stringMatching(/^rec_/) as unknown, propertyAlias: 'title', propertyName: 'Title', checkId: 4, value: 'Better title', canApply: true },
    ]);
    const entry = getRecommendation(recommendations[0]?.['reference'] as string);
    expect(entry).toMatchObject({
      nodeId: NODE_ID,
      culture: null,
      propertyAlias: 'metaDescription',
      editorAlias: 'Umbraco.TextArea',
      value: 'Better metaDescription',
    });
  });

  it('keeps the viewed culture on the reference and reports the culture lower-cased', async () => {
    useRecommend();
    const { tool, workspace } = setup({
      variesByCulture: true,
      activeCulture: 'da-DK',
      variants: [{ culture: 'da-DK', state: 'Draft' }],
      values: [{ alias: 'metaDescription', value: '', culture: 'da-DK' }],
    });
    storeFresh(workspace, reportResponse({ culture: 'da-dk' }), 'da-DK');

    const result = await run(tool, ['metaDescription']);

    expect(result['culture']).toBe('da-dk');
    const reference = (result['recommendations'] as Result[])[0]?.['reference'] as string;
    expect(getRecommendation(reference)?.culture).toBe('da-DK');
  });

  it('reports canApply false with richTextBlocks when a rich-text recommendation drops an embedded block', async () => {
    useRecommend(() => HttpResponse.json({ recommendedValues: { introText: '<p>Better intro without the block</p>' } }));
    const { tool, workspace } = setup();
    storeFresh(workspace);

    const result = await run(tool, ['introText']);

    expect((result['recommendations'] as Result[])[0]).toMatchObject({
      propertyAlias: 'introText',
      canApply: false,
      applyBlockedReason: 'richTextBlocks',
    });
  });

  // Live Copilot test (2026-11-05): told only in the tool description, the model went straight from recommend to apply,
  // and Agent.UI's approval prompt can't show the value. The result itself must tell it to show the values and wait.
  it('tells the model to show the values and wait for the user before applying', async () => {
    useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace);

    const result = await run(tool, ['metaDescription']);

    expect(result['nextStep']).toBe(RECOMMEND_NEXT_STEP);
    expect(RECOMMEND_NEXT_STEP).toContain('exactly as written');
    expect(RECOMMEND_NEXT_STEP).toContain('Do not call apply_page_recommendation in this turn');
  });

  it('gives no apply instruction when there is nothing to apply', async () => {
    useRecommend(() => HttpResponse.json({ recommendedValues: { metaDescription: null } }));
    const { tool, workspace } = setup();
    storeFresh(workspace);

    const result = await run(tool, ['metaDescription']);

    expect(result['recommendations']).toEqual([]);
    expect(result).not.toHaveProperty('nextStep');
  });

  it('skips a field the AI returned nothing for', async () => {
    useRecommend(() => HttpResponse.json({ recommendedValues: { metaDescription: null } }));
    const { tool, workspace } = setup();
    storeFresh(workspace);

    const result = await run(tool, ['metaDescription', 'keywords']);

    expect(result['recommendations']).toEqual([]);
    expect(result['skipped']).toEqual([
      { propertyAlias: 'metaDescription', reason: 'noRecommendation' },
      { propertyAlias: 'keywords', reason: 'noRecommendation' },
    ]);
  });

  it('returns the recommendations made before a mid-way error, plus the error', async () => {
    useRecommend((request, index) =>
      index === 0
        ? HttpResponse.json({ recommendedValues: Object.fromEntries(request.propertyAliases.map((a) => [a, `Better ${a}`])) })
        : HttpResponse.json({ type: 'Error', title: 'Too many', status: 429, category: 'temporaryRetryable' }, { status: 429 }),
    );
    const { tool, workspace } = setup();
    storeFresh(workspace);

    const result = await run(tool, ['title', 'metaDescription']);

    expect(result['success']).toBe(false);
    expect((result['recommendations'] as Result[]).map((r) => r['propertyAlias'])).toEqual(['title']);
    expect(result['error']).toEqual({ code: 'rateLimited', message: expect.any(String) as unknown, checkId: 3 });
  });

  it.each([[[]], ['title'], [[1, 2]], [undefined]])('rejects invalid propertyAliases %j', async (aliases) => {
    useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace);

    expect(errorCode(await run(tool, aliases))).toBe('invalidArguments');
  });

  it('returns noOpenPage when no page is selected', async () => {
    useRecommend();
    const host = createToolHost(fakeEntityAdapter(undefined));
    hosts.push(host);

    expect(errorCode(await run(new RecommendPageValuesToolApi(host), ['title']))).toBe('noOpenPage');
  });

  it('never writes to the page', async () => {
    useRecommend();
    const { tool, workspace } = setup();
    storeFresh(workspace);

    await run(tool, ['metaDescription']);

    expect(workspace.setPropertyValue).not.toHaveBeenCalled();
  });
});
