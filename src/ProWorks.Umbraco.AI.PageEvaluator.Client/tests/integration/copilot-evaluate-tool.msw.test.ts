/**
 * T046 — Copilot `evaluate_current_page` tool (`src/copilot/evaluate-current-page.tool.api.ts`,
 * contracts/copilot-tools.md §1) against MSW handlers for the Management API.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import EvaluateCurrentPageToolApi from '../../src/copilot/evaluate-current-page.tool.api.js';
import { getStoredReport, resetReportStore, snapshotOf, storeReport } from '../../src/copilot/report-store.js';
import {
  addRecommendation,
  getRecommendation,
  resetRecommendationStore,
} from '../../src/copilot/recommendation-store.js';
import type { EvaluationReportResponse, EvaluatorConfigItem } from '../../src/shared/types.js';
import {
  createToolHost,
  documentEntity,
  fakeDocumentWorkspace,
  fakeEntityAdapter,
  type FakeDocumentWorkspace,
  type FakeWorkspaceOptions,
} from '../fixtures/copilot-fakes.js';

const BASE = '/umbraco/management/api/v1/page-evaluator';
const NODE_ID = '3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7';

const server = setupServer();
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

const hosts: HTMLElement[] = [];

const config: EvaluatorConfigItem = {
  id: 'cfg-1',
  name: 'Landing page checks',
  description: null,
  documentTypeAlias: 'landingPage',
  documentTypeName: 'Landing Page',
  profileId: 'profile-1',
  profileName: null,
  contextId: null,
  contextName: null,
  promptText: 'Check the page.',
  isActive: true,
  dateCreated: '2026-11-01T00:00:00Z',
  dateModified: '2026-11-01T00:00:00Z',
  propertyAliases: null,
  scoringEnabled: true,
  recommendationsEnabled: true,
  version: 1,
};

function reportResponse(overrides: Partial<EvaluationReportResponse> = {}): EvaluationReportResponse {
  return {
    parseFailed: false,
    score: { passed: 0, total: 1, displayText: '0/1' },
    checks: [{ checkNumber: 1, status: 'Fail', label: 'Meta description', explanation: 'Empty.', propertyAliases: ['metaDescription'] }],
    suggestions: null,
    rawResponse: null,
    cachedAt: '2026-11-03T10:15:00Z',
    overallScore: 2,
    axisScores: [{ name: 'SEO', score: 2, feedback: null }],
    propertyEditorAliases: { metaDescription: 'Umbraco.TextArea', title: 'Umbraco.TextBox' },
    propertyNames: { metaDescription: 'Meta description', title: 'Title' },
    recommendationsEnabled: true,
    additionalRecommendableEditorAliases: [],
    samplingSettingsIgnored: false,
    culture: null,
    savedSinceEvaluation: false,
    ...overrides,
  };
}

interface Calls {
  cached: URL[];
  evaluate: unknown[];
}

function useHandlers(options: {
  cached?: EvaluationReportResponse | 'notFound' | HttpResponse<null>;
  evaluate?: EvaluationReportResponse | (() => Response);
  activeConfig?: EvaluatorConfigItem | null;
}): Calls {
  const calls: Calls = { cached: [], evaluate: [] };
  server.use(
    http.get(`${BASE}/configurations/active/:alias`, () =>
      options.activeConfig === null
        ? HttpResponse.json({ title: 'Not found' }, { status: 404 })
        : HttpResponse.json(options.activeConfig ?? config),
    ),
    http.get(`${BASE}/evaluate/cached/:nodeId`, ({ request }) => {
      calls.cached.push(new URL(request.url));
      const cached = options.cached ?? 'notFound';
      if (cached === 'notFound') return HttpResponse.json({ title: 'Not cached' }, { status: 404 });
      if (cached instanceof Response) return cached;
      return HttpResponse.json(cached);
    }),
    http.post(`${BASE}/evaluate`, async ({ request }) => {
      calls.evaluate.push(await request.json());
      const evaluate = options.evaluate ?? reportResponse();
      return typeof evaluate === 'function' ? evaluate() : HttpResponse.json(evaluate);
    }),
  );
  return calls;
}

function setup(options: FakeWorkspaceOptions = {}): { tool: EvaluateCurrentPageToolApi; workspace: FakeDocumentWorkspace } {
  const workspace = fakeDocumentWorkspace({
    unique: NODE_ID,
    alias: 'landingPage',
    name: 'Home',
    values: [
      { alias: 'title', value: 'Welcome' },
      { alias: 'metaDescription', value: '' },
    ],
    ...options,
  });
  const host = createToolHost(fakeEntityAdapter(documentEntity(workspace)));
  hosts.push(host);
  return { tool: new EvaluateCurrentPageToolApi(host), workspace };
}

type Result = Record<string, unknown>;

async function run(tool: EvaluateCurrentPageToolApi, args: Record<string, unknown> = {}): Promise<Result> {
  return JSON.parse(JSON.stringify(await tool.execute(args))) as Result;
}

function errorCode(result: Result): unknown {
  return (result['error'] as Record<string, unknown> | undefined)?.['code'];
}

describe('evaluate_current_page', () => {
  it('returns the cached result without evaluating', async () => {
    const calls = useHandlers({ cached: reportResponse() });
    const { tool } = setup();

    const result = await run(tool);

    expect(calls.evaluate).toHaveLength(0);
    expect(result['success']).toBe(true);
    expect(result['fromCache']).toBe(true);
    expect(result['outOfDate']).toBe(false);
    expect(result['configName']).toBe('Landing page checks');
    expect(result['page']).toEqual({ nodeId: NODE_ID, name: 'Home', documentTypeAlias: 'landingPage', culture: null });
    expect(result['recommendable']).toEqual([
      { propertyAlias: 'metaDescription', propertyName: 'Meta description', checkId: 1, checkStatus: 'Fail', canApply: true },
    ]);
  });

  it('asks the cache for the viewed culture of a culture-varying page', async () => {
    const calls = useHandlers({ cached: reportResponse({ culture: 'da-dk' }) });
    const { tool } = setup({
      variesByCulture: true,
      activeCulture: 'da-DK',
      variants: [{ culture: 'da-DK', state: 'Draft' }],
      values: [{ alias: 'title', value: 'Hej', culture: 'da-DK' }],
    });

    const result = await run(tool);

    expect(calls.cached[0]?.searchParams.get('culture')).toBe('da-DK');
    expect((result['page'] as Result)['culture']).toBe('da-dk');
  });

  it('marks a cached result out of date when the page was saved since (savedSinceEvaluation)', async () => {
    useHandlers({ cached: reportResponse({ savedSinceEvaluation: true }) });
    const { tool } = setup();

    const result = await run(tool);

    expect(result['outOfDate']).toBe(true);
    expect(result['outOfDateReasons']).toEqual(['savedSinceEvaluation']);
    expect(result['note']).toEqual(expect.any(String));
  });

  it('marks a cached result out of date when the editor has unsaved changes', async () => {
    useHandlers({ cached: reportResponse() });
    const { tool } = setup({ hasUnpersistedChanges: true });

    const result = await run(tool);

    expect(result['outOfDateReasons']).toEqual(['unsavedChanges']);
  });

  it('evaluates the captured values when nothing is cached, and the result is up to date', async () => {
    const calls = useHandlers({ cached: 'notFound' });
    const { tool } = setup({ hasUnpersistedChanges: true });

    const result = await run(tool);

    expect(calls.evaluate).toEqual([
      {
        nodeId: NODE_ID,
        documentTypeAlias: 'landingPage',
        culture: null,
        properties: { title: 'Welcome', metaDescription: '' },
      },
    ]);
    expect(result['fromCache']).toBe(false);
    expect(result['outOfDate']).toBe(false);
  });

  it('runs a fresh evaluation when fresh is true, without reading the cache, and stores the report with a snapshot', async () => {
    const calls = useHandlers({ cached: reportResponse({ savedSinceEvaluation: true }) });
    const { tool } = setup({ hasUnpersistedChanges: true });

    const result = await run(tool, { fresh: true });

    expect(calls.cached).toHaveLength(0);
    expect(calls.evaluate).toHaveLength(1);
    expect(result['fromCache']).toBe(false);
    expect(result['outOfDate']).toBe(false);
    expect(result['outOfDateReasons']).toEqual([]);
    const stored = getStoredReport(NODE_ID, null);
    expect(stored?.snapshot).toBe(snapshotOf({ title: 'Welcome', metaDescription: '' }));
    expect(stored?.fresh).toBe(true);
    expect(stored?.report.checks).toHaveLength(1);
  });

  it('stores a cached report as not fresh, with a snapshot of the values on screen', async () => {
    useHandlers({ cached: reportResponse() });
    const { tool } = setup();

    await run(tool);

    expect(getStoredReport(NODE_ID, null)).toMatchObject({
      fresh: false,
      snapshot: snapshotOf({ title: 'Welcome', metaDescription: '' }),
    });
  });

  it('returns noActiveConfig without evaluating when the document type has no active configuration', async () => {
    const calls = useHandlers({ activeConfig: null });
    const { tool } = setup();

    const result = await run(tool, { fresh: true });

    expect(result).toEqual({ success: false, error: { code: 'noActiveConfig', message: expect.any(String) as unknown } });
    expect(calls.evaluate).toHaveLength(0);
  });

  it.each([
    ['429 rate limit', () => HttpResponse.json({ type: 'Error', title: 'Too many', status: 429, category: 'temporaryRetryable' }, { status: 429 }), 'rateLimited'],
    ['404 no config', () => HttpResponse.json({ title: 'No active config' }, { status: 404 }), 'noActiveConfig'],
    ['network failure', () => HttpResponse.error(), 'networkError'],
    ['503 provider', () => HttpResponse.json({ type: 'Error', title: 'Busy', status: 503, category: 'temporaryRetryable' }, { status: 503 }), 'providerUnavailable'],
  ])('maps a %s to %s', async (_case, response, code) => {
    useHandlers({ evaluate: response });
    const { tool } = setup();

    const result = await run(tool, { fresh: true });

    expect(result['success']).toBe(false);
    expect(errorCode(result)).toBe(code);
  });

  it('maps a cache read error', async () => {
    useHandlers({ cached: HttpResponse.json({ type: 'Error', title: 'Bad culture', status: 400, category: 'invalidCulture' }, { status: 400 }) });
    const { tool } = setup();

    expect(errorCode(await run(tool))).toBe('invalidCulture');
  });

  it('returns noOpenPage without calling the server when no page is selected', async () => {
    const calls = useHandlers({});
    const host = createToolHost(fakeEntityAdapter(undefined));
    hosts.push(host);

    const result = await run(new EvaluateCurrentPageToolApi(host));

    expect(errorCode(result)).toBe('noOpenPage');
    expect(calls.cached).toHaveLength(0);
    expect(calls.evaluate).toHaveLength(0);
  });

  it('returns pageNotSaved for a page that has never been saved', async () => {
    const calls = useHandlers({});
    const { tool } = setup({ unique: '' });

    expect(errorCode(await run(tool))).toBe('pageNotSaved');
    expect(calls.evaluate).toHaveLength(0);
  });

  it('never throws', async () => {
    const adapter = fakeEntityAdapter(undefined);
    adapter.getSelectedEntity = () => {
      throw new Error('adapter exploded');
    };
    const host = createToolHost(adapter);
    hosts.push(host);

    const result = await run(new EvaluateCurrentPageToolApi(host));

    expect(errorCode(result)).toBe('unexpected');
    expect(JSON.stringify(result)).not.toContain('exploded');
  });

  it('clears the stored reports and recommendations of other pages', async () => {
    useHandlers({ cached: reportResponse() });
    storeReport('other-node', null, reportResponse(), '{}', false);
    const other = addRecommendation({ nodeId: 'other-node', culture: null, propertyAlias: 'title', editorAlias: undefined, value: 'x' });
    const { tool } = setup();

    await run(tool);

    expect(getStoredReport('other-node', null)).toBeUndefined();
    expect(getRecommendation(other.reference)).toBeUndefined();
  });

  it('never calls the adapter write or save methods', async () => {
    useHandlers({ cached: reportResponse() });
    const workspace = fakeDocumentWorkspace({ unique: NODE_ID, values: [{ alias: 'title', value: 'x' }] });
    const adapter = fakeEntityAdapter(documentEntity(workspace));
    const host = createToolHost(adapter);
    hosts.push(host);

    await run(new EvaluateCurrentPageToolApi(host), { fresh: true });

    expect(adapter.applyValueChange).not.toHaveBeenCalled();
    expect(adapter.saveSelectedEntity).not.toHaveBeenCalled();
    expect(workspace.setPropertyValue).not.toHaveBeenCalled();
  });
});
