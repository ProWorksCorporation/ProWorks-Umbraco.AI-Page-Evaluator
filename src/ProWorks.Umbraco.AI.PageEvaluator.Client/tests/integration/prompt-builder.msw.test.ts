/**
 * T054 — MSW integration test for document type property loading
 * via Umbraco Management API `GET /document-type/by-alias/{alias}`.
 *
 * Tests the fetch utility used by prompt-builder.element.ts to load
 * property aliases from the Umbraco Management API.
 *
 * RED STATE: Fails until T057 creates `src/prompt-builder/prompt-builder.element.ts`
 * which exports a `fetchDocTypeProperties` helper (or similar).
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// RED STATE: import will fail until T057 creates the module
import { fetchDocTypeProperties } from '../../src/prompt-builder/prompt-builder.element.js';
import type { DocumentTypePropertySummary } from '../../src/shared/types.js';

const DOC_TYPE_BASE = '/umbraco/management/api/v1/document-type';

const mockDocTypeResponse = {
  alias: 'blogPost',
  name: 'Blog Post',
  properties: [
    {
      alias: 'blogNavigationImage',
      label: 'Navigation Image',
      propertyEditorUiAlias: 'Umb.PropertyEditorUi.MediaPicker',
      container: { name: 'Content' },
    },
    {
      alias: 'postDate',
      label: 'Post Date',
      propertyEditorUiAlias: 'Umb.PropertyEditorUi.DateTimePicker',
      container: { name: 'Content' },
    },
    {
      alias: 'summary',
      label: 'Summary',
      propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextArea',
      container: { name: 'Content' },
    },
    {
      alias: 'metaDescription',
      label: 'Meta Description',
      propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextArea',
      container: { name: 'SEO' },
    },
    {
      alias: 'browserTitle',
      label: 'Browser Title',
      propertyEditorUiAlias: 'Umb.PropertyEditorUi.TextBox',
      container: { name: 'SEO' },
    },
  ],
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchDocTypeProperties', () => {
  it('returns property summaries from the Umbraco Management API', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocTypeResponse),
      ),
    );

    const props: DocumentTypePropertySummary[] = await fetchDocTypeProperties('blogPost');

    expect(props).toHaveLength(5);
  });

  it('maps alias, label, groupName and editorAlias correctly', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocTypeResponse),
      ),
    );

    const props = await fetchDocTypeProperties('blogPost');
    const first = props[0];

    expect(first?.alias).toBe('blogNavigationImage');
    expect(first?.label).toBe('Navigation Image');
    expect(first?.groupName).toBe('Content');
    expect(first?.editorAlias).toBe('Umb.PropertyEditorUi.MediaPicker');
  });

  it('groups properties correctly by container name', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/blogPost`, () =>
        HttpResponse.json(mockDocTypeResponse),
      ),
    );

    const props = await fetchDocTypeProperties('blogPost');
    const contentProps = props.filter((p) => p.groupName === 'Content');
    const seoProps = props.filter((p) => p.groupName === 'SEO');

    expect(contentProps).toHaveLength(3);
    expect(seoProps).toHaveLength(2);
  });

  it('throws when the document type alias is not found (404)', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/unknownType`, () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    await expect(fetchDocTypeProperties('unknownType')).rejects.toThrow();
  });

  it('returns empty array when doc type has no properties', async () => {
    server.use(
      http.get(`${DOC_TYPE_BASE}/by-alias/emptyType`, () =>
        HttpResponse.json({ alias: 'emptyType', name: 'Empty Type', properties: [] }),
      ),
    );

    const props = await fetchDocTypeProperties('emptyType');
    expect(props).toHaveLength(0);
  });
});
