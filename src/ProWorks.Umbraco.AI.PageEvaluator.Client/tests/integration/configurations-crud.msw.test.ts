/**
 * T044 — MSW integration tests for all CRUD /configurations endpoints.
 *
 * Tests the TypeScript API client functions against MSW-intercepted HTTP responses.
 * These tests exercise the client-side fetch wrappers (api-client.ts) against
 * mocked server responses that mirror the contract in management-api.md.
 *
 * Tests: create, read (list + single), update, delete, 422 validation error.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { EvaluatorConfigItem, EvaluatorConfigListResponse } from '../../src/shared/types.js';
import {
  getConfigurations,
  getConfiguration,
  createConfiguration,
  updateConfiguration,
  deleteConfiguration,
} from '../../src/shared/api-client.js';

const BASE = '/umbraco/management/api/v1/page-evaluator';

const mockConfig: EvaluatorConfigItem = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  name: 'Blog Post Evaluator',
  description: null,
  documentTypeAlias: 'blogPost',
  profileId: 'a1b2c3d4-0000-0000-0000-000000000001',
  profileName: 'OpenAI GPT-4o',
  contextId: null,
  contextName: null,
  promptText: 'Evaluate this page.',
  isActive: true,
  dateCreated: '2026-03-30T12:00:00',
  dateModified: '2026-03-30T12:00:00',
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('GET /configurations', () => {
  it('returns the list response from the server', async () => {
    const listResponse: EvaluatorConfigListResponse = { items: [mockConfig], total: 1 };
    server.use(
      http.get(`${BASE}/configurations`, () => HttpResponse.json(listResponse)),
    );

    const result = await getConfigurations();

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(mockConfig.id);
  });

  it('returns empty list when no configs exist', async () => {
    const listResponse: EvaluatorConfigListResponse = { items: [], total: 0 };
    server.use(
      http.get(`${BASE}/configurations`, () => HttpResponse.json(listResponse)),
    );

    const result = await getConfigurations();

    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

describe('GET /configurations/{id}', () => {
  it('returns the config when found', async () => {
    server.use(
      http.get(`${BASE}/configurations/${mockConfig.id}`, () =>
        HttpResponse.json(mockConfig),
      ),
    );

    const result = await getConfiguration(mockConfig.id);

    expect(result.id).toBe(mockConfig.id);
    expect(result.name).toBe(mockConfig.name);
    expect(result.isActive).toBe(true);
  });

  it('throws when config is not found (404)', async () => {
    server.use(
      http.get(`${BASE}/configurations/unknown-id`, () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    await expect(getConfiguration('unknown-id')).rejects.toThrow('API 404');
  });
});

describe('POST /configurations', () => {
  it('returns created config on success (201)', async () => {
    server.use(
      http.post(`${BASE}/configurations`, () =>
        HttpResponse.json(mockConfig, { status: 201 }),
      ),
    );

    const result = await createConfiguration({
      name: 'Blog Post Evaluator',
      documentTypeAlias: 'blogPost',
      profileId: 'a1b2c3d4-0000-0000-0000-000000000001',
      promptText: 'Evaluate this page.',
    });

    expect(result.id).toBe(mockConfig.id);
    expect(result.isActive).toBe(true);
  });

  it('throws on validation error (422)', async () => {
    server.use(
      http.post(`${BASE}/configurations`, () =>
        HttpResponse.json(
          { errors: { name: ['Name is required'] } },
          { status: 422 },
        ),
      ),
    );

    await expect(
      createConfiguration({
        name: '',
        documentTypeAlias: 'blogPost',
        profileId: 'a1b2c3d4',
        promptText: 'Evaluate.',
      }),
    ).rejects.toThrow('API 422');
  });
});

describe('PUT /configurations/{id}', () => {
  it('returns updated config on success', async () => {
    const updated = { ...mockConfig, name: 'Updated Evaluator' };
    server.use(
      http.put(`${BASE}/configurations/${mockConfig.id}`, () =>
        HttpResponse.json(updated),
      ),
    );

    const result = await updateConfiguration(mockConfig.id, {
      name: 'Updated Evaluator',
      documentTypeAlias: 'blogPost',
      profileId: 'a1b2c3d4-0000-0000-0000-000000000001',
      promptText: 'Evaluate this page.',
    });

    expect(result.name).toBe('Updated Evaluator');
  });

  it('throws when config is not found (404)', async () => {
    server.use(
      http.put(`${BASE}/configurations/unknown-id`, () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    await expect(
      updateConfiguration('unknown-id', {
        name: 'Test',
        documentTypeAlias: 'blogPost',
        profileId: 'a1b2c3d4',
        promptText: 'Evaluate.',
      }),
    ).rejects.toThrow('API 404');
  });
});

describe('DELETE /configurations/{id}', () => {
  it('resolves without error on success (200)', async () => {
    server.use(
      http.delete(`${BASE}/configurations/${mockConfig.id}`, () =>
        HttpResponse.json({ message: 'Deleted' }),
      ),
    );

    await expect(deleteConfiguration(mockConfig.id)).resolves.toBeUndefined();
  });

  it('throws when config is not found (404)', async () => {
    server.use(
      http.delete(`${BASE}/configurations/unknown-id`, () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    await expect(deleteConfiguration('unknown-id')).rejects.toThrow('API 404');
  });
});
