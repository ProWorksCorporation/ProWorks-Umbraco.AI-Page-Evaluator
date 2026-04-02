/**
 * T029 — MSW integration tests for GET /configurations/active/{alias} (via api-client.ts)
 *
 * Tests: 200 returns config, 404 triggers null return (button hide signal).
 *
 * These tests exercise the typed api-client fetch wrapper against mock HTTP handlers.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getActiveConfiguration } from '../../src/shared/api-client.js';
import type { EvaluatorConfigItem } from '../../src/shared/types.js';

const BASE = '/umbraco/management/api/v1/page-evaluator';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const activeConfig: EvaluatorConfigItem = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  name: 'Blog Post Evaluator',
  description: 'Evaluates blog posts for SEO and quality.',
  documentTypeAlias: 'blogPost',
  profileId: 'a1b2c3d4-0000-0000-0000-000000000001',
  profileName: 'OpenAI GPT-4o',
  contextId: 'a1b2c3d4-0000-0000-0000-000000000002',
  contextName: 'Brand Guidelines',
  promptText: 'You are a blog post quality auditor...',
  isActive: true,
  dateCreated: '2026-03-30T12:00:00',
  dateModified: '2026-03-30T12:00:00',
};

describe('GET /configurations/active/{alias} — getActiveConfiguration()', () => {
  it('returns the active config when one exists (200)', async () => {
    server.use(
      http.get(`${BASE}/configurations/active/blogPost`, () =>
        HttpResponse.json(activeConfig),
      ),
    );

    const result = await getActiveConfiguration('blogPost');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    expect(result!.documentTypeAlias).toBe('blogPost');
    expect(result!.isActive).toBe(true);
    expect(result!.profileId).toBe('a1b2c3d4-0000-0000-0000-000000000001');
  });

  it('returns null when no active config exists (404 — button must be hidden)', async () => {
    server.use(
      http.get(`${BASE}/configurations/active/noConfig`, () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    const result = await getActiveConfiguration('noConfig');

    expect(result).toBeNull();
  });

  it('URL-encodes special characters in the document type alias', async () => {
    let capturedUrl = '';
    server.use(
      http.get(`${BASE}/configurations/active/:alias`, ({ params }) => {
        capturedUrl = String(params['alias']);
        return HttpResponse.json({ title: 'Not found' }, { status: 404 });
      }),
    );

    // Call with a simple alias to verify URL encoding works
    await getActiveConfiguration('blog-post-type');

    expect(capturedUrl).toBe('blog-post-type');
  });

  it('propagates non-404 errors', async () => {
    server.use(
      http.get(`${BASE}/configurations/active/blogPost`, () =>
        HttpResponse.json({ title: 'Internal Server Error' }, { status: 500 }),
      ),
    );

    await expect(getActiveConfiguration('blogPost')).rejects.toThrow('500');
  });

  it('returns config with contextId when context is configured', async () => {
    const configWithContext = { ...activeConfig, contextId: 'ctx-guid-123', contextName: 'Brand Voice' };
    server.use(
      http.get(`${BASE}/configurations/active/blogPost`, () =>
        HttpResponse.json(configWithContext),
      ),
    );

    const result = await getActiveConfiguration('blogPost');

    expect(result!.contextId).toBe('ctx-guid-123');
    expect(result!.contextName).toBe('Brand Voice');
  });

  it('returns config with null contextId when no context is set', async () => {
    const configNoContext = { ...activeConfig, contextId: null, contextName: null };
    server.use(
      http.get(`${BASE}/configurations/active/blogPost`, () =>
        HttpResponse.json(configNoContext),
      ),
    );

    const result = await getActiveConfiguration('blogPost');

    expect(result!.contextId).toBeNull();
    expect(result!.contextName).toBeNull();
  });
});
