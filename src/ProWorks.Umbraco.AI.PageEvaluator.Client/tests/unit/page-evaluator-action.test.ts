/**
 * T027 — Vitest unit tests for page-evaluator-action.element.ts
 *
 * Tests: button hidden when GET active config returns 404;
 *        button visible when GET active config returns 200.
 *
 * The Umbraco back-office framework imports are mocked here so the test
 * does not require a running Umbraco instance.
 */

// vi.mock calls are hoisted before imports by Vitest — they intercept the
// @umbraco-cms/* imports before any component module is loaded.
import { vi, describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';

vi.mock('@umbraco-cms/backoffice/lit-element', () => ({
  UmbLitElement: class UmbLitElementStub extends HTMLElement {
    // Required by Lit's @state / @property decorators (legacyProperty path).
    static createProperty(_name: PropertyKey, _options?: unknown): void {
      // no-op — tests only need plain property access, not Lit reactivity
    }
    connectedCallback() {}
    disconnectedCallback() {}
    render() { return null; }
    async getContext(_token: unknown): Promise<unknown> { return undefined; }
  },
}));

vi.mock('@umbraco-cms/backoffice/document', () => ({
  UMB_DOCUMENT_WORKSPACE_CONTEXT: Symbol('UMB_DOCUMENT_WORKSPACE_CONTEXT'),
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
import type { EvaluatorConfigItem } from '../../src/shared/types.js';

// Import the component under test — hoisted mocks ensure its imports resolve.
import '../../src/workspace-action/page-evaluator-action.element.js';

const ELEMENT_TAG = 'page-evaluator-action';
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
afterEach(() => {
  server.resetHandlers();
  document.body.textContent = '';
});
afterAll(() => server.close());

function renderAction(documentTypeAlias: string): HTMLElement {
  const el = document.createElement(ELEMENT_TAG) as HTMLElement & {
    _hasConfig?: boolean;
    getContext: (token: unknown) => Promise<unknown>;
  };
  // Override getContext before appending so connectedCallback's async _checkActiveConfig
  // receives a workspace context that supplies the document type alias.
  el.getContext = async () => ({
    getContentTypeUnique: () => documentTypeAlias,
    getData: () => ({ unique: '', values: [] }),
  });
  document.body.appendChild(el);
  return el;
}

describe('page-evaluator-action.element — button visibility', () => {
  it('sets _hasConfig=false when GET active config returns 404', async () => {
    server.use(
      http.get(`${BASE}/configurations/active/unknownType`, () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    const el = renderAction('unknownType');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const hasConfig = (el as unknown as { _hasConfig?: boolean })._hasConfig;
    expect(hasConfig).toBe(false);
  });

  it('sets _hasConfig=true when GET active config returns 200', async () => {
    server.use(
      http.get(`${BASE}/configurations/active/blogPost`, () =>
        HttpResponse.json(mockConfig),
      ),
    );

    const el = renderAction('blogPost');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const hasConfig = (el as unknown as { _hasConfig?: boolean })._hasConfig;
    expect(hasConfig).toBe(true);
  });

  it('does not call POST /evaluate from the visibility check', async () => {
    let evaluateWasCalled = false;
    server.use(
      http.get(`${BASE}/configurations/active/blogPost`, () =>
        HttpResponse.json(mockConfig),
      ),
      http.post(`${BASE}/evaluate`, () => {
        evaluateWasCalled = true;
        return HttpResponse.json({});
      }),
    );

    renderAction('blogPost');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(evaluateWasCalled).toBe(false);
  });
});
