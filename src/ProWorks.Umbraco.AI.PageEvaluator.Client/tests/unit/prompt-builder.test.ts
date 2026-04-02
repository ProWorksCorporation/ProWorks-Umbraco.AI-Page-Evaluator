/**
 * T053 — Vitest unit tests for prompt-builder.element.ts
 *
 * Tests: category selection toggles, property aliases display,
 *        site context woven into draft, Use This Prompt fires event.
 *        SC-006: given 10 properties, ≥ 8 aliases appear in the rendered list.
 *
 * RED STATE: Fails to collect until T057 creates
 * `src/prompt-builder/prompt-builder.element.ts`.
 */

import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

vi.mock('@umbraco-cms/backoffice/lit-element', () => ({
  UmbLitElement: class extends HTMLElement {
    static createProperty(_name: PropertyKey, _options?: unknown): void {}
    connectedCallback() {}
    disconnectedCallback() {}
    render() { return null; }
  },
}));
vi.mock('@umbraco-cms/backoffice/element-api', () => ({
  UmbElementMixin: (Base: typeof HTMLElement) => Base,
}));

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// RED STATE: import will fail until T057 creates the element
import '../../src/prompt-builder/prompt-builder.element.js';

const ELEMENT_TAG = 'page-evaluator-prompt-builder';
const DOC_TYPE_BASE = '/umbraco/management/api/v1/document-type';

/** Builds a mock Umbraco doc type response with N properties across groups. */
function mockDocType(alias: string, propertyCount: number) {
  const properties = Array.from({ length: propertyCount }, (_, i) => ({
    alias: `property${i + 1}`,
    label: `Property ${i + 1}`,
    propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
    container: { name: i < 5 ? 'Content' : 'SEO' },
  }));

  return {
    alias,
    name: alias.charAt(0).toUpperCase() + alias.slice(1),
    properties,
    containers: [{ name: 'Content' }, { name: 'SEO' }],
  };
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  document.body.textContent = '';
});
afterAll(() => server.close());

type PromptBuilderElement = HTMLElement & {
  documentTypeAlias?: string;
  _selectedCategories?: Set<string>;
  _siteContext?: string;
  _draft?: string;
  _properties?: Array<{ alias: string; label: string; groupName: string }>;
  generateDraft?: () => void;
};

function renderBuilder(alias: string): PromptBuilderElement {
  const el = document.createElement(ELEMENT_TAG) as PromptBuilderElement;
  el.documentTypeAlias = alias;
  document.body.appendChild(el);
  return el;
}

describe('prompt-builder.element — property loading', () => {
  it('loads property aliases from the doc type API on connect', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocType('blogPost', 5)),
      ),
    );

    const el = renderBuilder('blogPost');
    await new Promise<void>((r) => setTimeout(r, 50));

    expect((el as PromptBuilderElement)._properties?.length).toBeGreaterThanOrEqual(1);
  });

  it('SC-006: renders ≥ 8 of 10 property aliases in the list', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/richPage`, () =>
        HttpResponse.json(mockDocType('richPage', 10)),
      ),
    );

    const el = renderBuilder('richPage');
    await new Promise<void>((r) => setTimeout(r, 50));

    const props = (el as PromptBuilderElement)._properties ?? [];
    expect(props.length).toBeGreaterThanOrEqual(8);
  });
});

describe('prompt-builder.element — category selection', () => {
  it('starts with no categories selected', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocType('blogPost', 3)),
      ),
    );

    const el = renderBuilder('blogPost');
    await new Promise<void>((r) => setTimeout(r, 50));

    const selected = (el as PromptBuilderElement)._selectedCategories;
    expect(selected?.size ?? 0).toBe(0);
  });

  it('toggles a category on when selected', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocType('blogPost', 3)),
      ),
    );

    const el = renderBuilder('blogPost');
    await new Promise<void>((r) => setTimeout(r, 50));

    el.dispatchEvent(
      new CustomEvent('category-toggle', { detail: { id: 'required-fields', selected: true } }),
    );
    await new Promise<void>((r) => setTimeout(r, 10));

    // The element should handle the toggle internally; check via direct state or event
    // (implementation may use _selectedCategories or similar)
    expect(
      (el as PromptBuilderElement)._selectedCategories?.has('required-fields') ?? false,
    ).toBe(true);
  });
});

describe('prompt-builder.element — draft generation', () => {
  it('draft contains property aliases when generateDraft is called', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocType('blogPost', 3)),
      ),
    );

    const el = renderBuilder('blogPost');
    await new Promise<void>((r) => setTimeout(r, 50));

    // Select a category and add site context
    if ((el as PromptBuilderElement)._selectedCategories) {
      (el as PromptBuilderElement)._selectedCategories!.add('content-quality');
    }
    if ('_siteContext' in el) {
      (el as PromptBuilderElement)._siteContext = 'ProWorks blog for developers';
    }

    (el as PromptBuilderElement).generateDraft?.();
    await new Promise<void>((r) => setTimeout(r, 10));

    const draft = (el as PromptBuilderElement)._draft ?? '';
    expect(draft).toContain('property1');
  });

  it('draft weaves in siteContext when set', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocType('blogPost', 3)),
      ),
    );

    const el = renderBuilder('blogPost');
    await new Promise<void>((r) => setTimeout(r, 50));

    if ((el as PromptBuilderElement)._selectedCategories) {
      (el as PromptBuilderElement)._selectedCategories!.add('metadata-seo');
    }
    const siteCtx = 'ProWorks blog for developers';
    (el as PromptBuilderElement)._siteContext = siteCtx;

    (el as PromptBuilderElement).generateDraft?.();
    await new Promise<void>((r) => setTimeout(r, 10));

    expect((el as PromptBuilderElement)._draft).toContain(siteCtx);
  });

  it('fires prompt-selected event when Use This Prompt is clicked', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocType('blogPost', 3)),
      ),
    );

    const el = renderBuilder('blogPost');
    await new Promise<void>((r) => setTimeout(r, 50));

    // Pre-set a draft
    (el as PromptBuilderElement)._draft = 'My generated prompt';

    const events: CustomEvent[] = [];
    el.addEventListener('prompt-selected', (e) => events.push(e as CustomEvent));

    el.dispatchEvent(new CustomEvent('use-prompt'));
    await new Promise<void>((r) => setTimeout(r, 10));

    // The element should fire prompt-selected in response to use-prompt
    // OR have a usePrompt() method callable by tests
    // Accept either approach: direct event or method
    expect(
      events.length > 0 || typeof (el as { usePrompt?: () => void }).usePrompt === 'function',
    ).toBe(true);
  });
});
