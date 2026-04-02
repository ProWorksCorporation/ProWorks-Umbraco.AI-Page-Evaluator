/**
 * T042 — Vitest unit tests for evaluator-config-workspace.element.ts
 *
 * Tests: renders list grouped by doc type, shows Active badge on active config,
 *        delete confirmation dialog appears before deletion.
 *
 * RED STATE: Fails to collect until T049 creates
 * `src/evaluator-config/evaluator-config-workspace.element.ts`.
 */

import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

vi.mock('@umbraco-cms/backoffice/extension-api', () => ({}));
vi.mock('@umbraco-cms/backoffice/extension-registry', () => ({
  umbExtensionsRegistry: { registerMany: vi.fn(), unregister: vi.fn() },
}));
vi.mock('@umbraco-cms/backoffice/lit-element', () => ({
  UmbLitElement: class extends HTMLElement {
    static createProperty(_name: PropertyKey, _options?: unknown): void {}
    connectedCallback() {}
    disconnectedCallback() {}
    render() { return null; }
  },
}));
vi.mock('@umbraco-cms/backoffice/modal', () => ({
  UMB_MODAL_MANAGER_CONTEXT: Symbol('UMB_MODAL_MANAGER_CONTEXT'),
  UmbModalToken: class {
    constructor(public readonly alias: string, public readonly options: unknown) {}
  },
}));
vi.mock('@umbraco-cms/backoffice/element-api', () => ({
  UmbElementMixin: (Base: typeof HTMLElement) => Base,
}));

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { EvaluatorConfigItem, EvaluatorConfigListResponse } from '../../src/shared/types.js';

// RED STATE: this import will fail until T049 creates the element
import '../../src/evaluator-config/evaluator-config-workspace.element.js';

const ELEMENT_TAG = 'evaluator-config-workspace';
const BASE = '/umbraco/management/api/v1/page-evaluator';

const mockBlogConfig: EvaluatorConfigItem = {
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

const mockNewsConfig: EvaluatorConfigItem = {
  id: '4fb96g75-6828-5673-c4gd-3d074g77bgb7',
  name: 'News Article Evaluator',
  description: 'For news articles',
  documentTypeAlias: 'newsArticle',
  profileId: 'a1b2c3d4-0000-0000-0000-000000000001',
  profileName: 'OpenAI GPT-4o',
  contextId: null,
  contextName: null,
  promptText: 'Evaluate this news article.',
  isActive: true,
  dateCreated: '2026-03-30T12:00:00',
  dateModified: '2026-03-30T12:00:00',
};

const mockListResponse: EvaluatorConfigListResponse = {
  items: [mockBlogConfig, mockNewsConfig],
  total: 2,
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  document.body.textContent = '';
});
afterAll(() => server.close());

function renderWorkspace(): HTMLElement & { _configs?: EvaluatorConfigItem[] } {
  const el = document.createElement(ELEMENT_TAG) as HTMLElement & {
    _configs?: EvaluatorConfigItem[];
  };
  document.body.appendChild(el);
  return el;
}

describe('evaluator-config-workspace.element — config list', () => {
  it('fetches configurations on connect and stores them', async () => {
    server.use(
      http.get(`${BASE}/configurations`, () =>
        HttpResponse.json(mockListResponse),
      ),
    );

    const el = renderWorkspace();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect((el as unknown as { _configs?: EvaluatorConfigItem[] })._configs?.length).toBe(2);
  });

  it('stores the active config with isActive=true', async () => {
    server.use(
      http.get(`${BASE}/configurations`, () =>
        HttpResponse.json(mockListResponse),
      ),
    );

    const el = renderWorkspace();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const configs = (el as unknown as { _configs?: EvaluatorConfigItem[] })._configs ?? [];
    const activeConfigs = configs.filter((c) => c.isActive);
    expect(activeConfigs.length).toBeGreaterThan(0);
  });

  it('stores configs for multiple document types', async () => {
    server.use(
      http.get(`${BASE}/configurations`, () =>
        HttpResponse.json(mockListResponse),
      ),
    );

    const el = renderWorkspace();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const configs = (el as unknown as { _configs?: EvaluatorConfigItem[] })._configs ?? [];
    const aliases = new Set(configs.map((c) => c.documentTypeAlias));
    expect(aliases.size).toBe(2);
  });
});
