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
import { evaluatePage } from '../../src/shared/api-client.js';
import type { EvaluatePageRequest, EvaluationReportResponse } from '../../src/shared/types.js';

const BASE = '/umbraco/management/api/v1/page-evaluator';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const evaluateRequest: EvaluatePageRequest = {
  nodeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  documentTypeAlias: 'blogPost',
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
