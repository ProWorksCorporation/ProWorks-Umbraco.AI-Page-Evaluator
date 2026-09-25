/**
 * T028 — MSW integration tests for POST /evaluate (via api-client.ts)
 *
 * Tests: success with structured report, parse-failed response, 502 AI error.
 *
 * These tests exercise the typed api-client fetch wrappers against mock HTTP handlers.
 * The api-client already exists (T020), so these tests will pass once the MSW
 * server setup is correct.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ApiError, evaluatePage, getCachedEvaluation, recommend } from '../../src/shared/api-client.js';
import type { EvaluatePageRequest, EvaluationReportResponse } from '../../src/shared/types.js';

const BASE = '/umbraco/management/api/v1/page-evaluator';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const evaluateRequest: EvaluatePageRequest = {
  nodeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  documentTypeAlias: 'blogPost',
  culture: 'da-DK',
  properties: {
    title: 'My Blog Post',
    summary: 'A short summary.',
  },
};

const structuredReport: EvaluationReportResponse = {
  parseFailed: false,
  score: { passed: 14, total: 17, displayText: '14/17 checks passed' },
  checks: [
    { checkNumber: 1, status: 'Pass', label: 'Blog Navigation Image', explanation: null },
    { checkNumber: 2, status: 'Fail', label: 'Meta Description', explanation: 'Meta description is empty.' },
    { checkNumber: 7, status: 'Warn', label: 'Browser Title', explanation: 'Title exceeds 60 characters.' },
  ],
  suggestions: 'Consider adding internal links to related blog posts.',
  rawResponse: null,
};

const parseFailedReport: EvaluationReportResponse = {
  parseFailed: true,
  score: null,
  checks: [],
  suggestions: null,
  rawResponse: 'Here is my evaluation of the blog post: The post looks mostly complete but...',
};

describe('POST /evaluate — evaluatePage()', () => {
  it('returns a structured report on successful AI evaluation', async () => {
    server.use(
      http.post(`${BASE}/evaluate`, () => HttpResponse.json(structuredReport)),
    );

    const report = await evaluatePage(evaluateRequest);

    expect(report.parseFailed).toBe(false);
    expect(report.score).not.toBeNull();
    expect(report.score!.passed).toBe(14);
    expect(report.score!.total).toBe(17);
    expect(report.checks).toHaveLength(3);
    expect(report.checks[1]?.status).toBe('Fail');
    expect(report.checks[1]?.explanation).toBe('Meta description is empty.');
    expect(report.suggestions).toBe('Consider adding internal links to related blog posts.');
    expect(report.rawResponse).toBeNull();
  });

  it('returns parseFailed=true with rawResponse when AI response is unstructured', async () => {
    server.use(
      http.post(`${BASE}/evaluate`, () => HttpResponse.json(parseFailedReport)),
    );

    const report = await evaluatePage(evaluateRequest);

    expect(report.parseFailed).toBe(true);
    expect(report.score).toBeNull();
    expect(report.checks).toHaveLength(0);
    expect(report.suggestions).toBeNull();
    expect(report.rawResponse).toContain('evaluation of the blog post');
  });

  it('throws when the server returns 502 AI provider error', async () => {
    server.use(
      http.post(`${BASE}/evaluate`, () =>
        HttpResponse.json(
          { title: 'AI provider error', detail: 'The request to the AI provider failed.' },
          { status: 502 },
        ),
      ),
    );

    await expect(evaluatePage(evaluateRequest)).rejects.toThrow('502');
  });

  it('throws when the server returns 404 (no active config)', async () => {
    server.use(
      http.post(`${BASE}/evaluate`, () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    await expect(evaluatePage(evaluateRequest)).rejects.toThrow('404');
  });

  it('sends the correct request body including nodeId and properties', async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${BASE}/evaluate`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(structuredReport);
      }),
    );

    await evaluatePage(evaluateRequest);

    const body = capturedBody as EvaluatePageRequest;
    expect(body.nodeId).toBe(evaluateRequest.nodeId);
    expect(body.documentTypeAlias).toBe('blogPost');
    expect(body.properties).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 003-upgrade-umbraco-17-6 — error typing (contracts/error-responses.md, research R12.3)
// ---------------------------------------------------------------------------

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('Expected the promise to reject');
}

describe('error typing — gateway types and throwOnError', () => {
  it('surfaces the CMS 17.6 GatewayTimeout type from a 504 body', async () => {
    server.use(
      http.post(`${BASE}/evaluate`, () =>
        HttpResponse.json({ type: 'GatewayTimeout', title: 'Gateway timeout', status: 504 }, { status: 504 }),
      ),
    );

    const err = await rejectionOf(evaluatePage(evaluateRequest));

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(504);
    expect((err as ApiError).type).toBe('GatewayTimeout');
  });

  it('surfaces the GatewayUnreachable type from a 522 body', async () => {
    server.use(
      http.post(`${BASE}/evaluate`, () =>
        HttpResponse.json({ type: 'GatewayUnreachable', title: 'Gateway unreachable', status: 522 }, { status: 522 }),
      ),
    );

    const err = await rejectionOf(evaluatePage(evaluateRequest));

    expect((err as ApiError).type).toBe('GatewayUnreachable');
  });

  it('rejects recommend() with an ApiError carrying the error category', async () => {
    server.use(
      http.post(`${BASE}/recommend`, () =>
        HttpResponse.json(
          { type: 'Error', title: 'Temporarily unavailable', status: 503, category: 'temporaryRetryable' },
          { status: 503 },
        ),
      ),
    );

    const err = await rejectionOf(
      recommend({
        nodeId: evaluateRequest.nodeId,
        propertyAliases: ['metaDescription'],
        checkLabel: 'Meta description',
        checkExplanation: null,
        culture: null,
        properties: {},
      }),
    );

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).category).toBe('temporaryRetryable');
    expect((err as ApiError).status).toBe(503);
  });

  it('resolves getCachedEvaluation to null on 404 instead of throwing', async () => {
    server.use(
      http.get(`${BASE}/evaluate/cached/:nodeId`, () =>
        HttpResponse.json({ type: 'Error', title: 'No cached evaluation', status: 404 }, { status: 404 }),
      ),
    );

    await expect(getCachedEvaluation(evaluateRequest.nodeId, null)).resolves.toBeNull();
  });

  it('maps a network failure to ApiError(status 0, type NetworkError)', async () => {
    server.use(http.post(`${BASE}/evaluate`, () => HttpResponse.error()));

    const err = await rejectionOf(evaluatePage(evaluateRequest));

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
    expect((err as ApiError).type).toBe('NetworkError');
  });
});

describe('language awareness — culture on the wire (FR-018)', () => {
  it('requests the cached evaluation for a culture with ?culture=', async () => {
    let search = '';
    server.use(
      http.get(`${BASE}/evaluate/cached/:nodeId`, ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ type: 'Error', title: 'none', status: 404 }, { status: 404 });
      }),
    );

    await getCachedEvaluation(evaluateRequest.nodeId, 'da-DK');

    expect(search).toBe('?culture=da-DK');
  });

  it('sends no query string for invariant documents', async () => {
    let search = 'unset';
    server.use(
      http.get(`${BASE}/evaluate/cached/:nodeId`, ({ request }) => {
        search = new URL(request.url).search;
        return HttpResponse.json({ type: 'Error', title: 'none', status: 404 }, { status: 404 });
      }),
    );

    await getCachedEvaluation(evaluateRequest.nodeId, null);

    expect(search).toBe('');
  });

  it('includes the culture in the evaluate body', async () => {
    let body: unknown = null;
    server.use(
      http.post(`${BASE}/evaluate`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(structuredReport);
      }),
    );

    await evaluatePage(evaluateRequest);

    expect((body as { culture: string | null }).culture).toBe('da-DK');
  });

  it('surfaces a cultureNotCreated error body as an ApiError category', async () => {
    server.use(
      http.post(`${BASE}/evaluate`, () =>
        HttpResponse.json(
          { type: 'Error', title: 'No content in da-DK yet', status: 400, category: 'cultureNotCreated' },
          { status: 400 },
        ),
      ),
    );

    const err = await rejectionOf(evaluatePage(evaluateRequest));

    expect((err as ApiError).category).toBe('cultureNotCreated');
    expect((err as ApiError).status).toBe(400);
  });
});
