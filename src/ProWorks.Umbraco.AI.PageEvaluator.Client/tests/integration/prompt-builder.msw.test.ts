/**
 * MSW integration tests for `fetchDocTypeProperties` (shared/api-client.ts), which the
 * prompt builder and evaluator form use to load a document type's properties from the
 * package's own endpoint `GET /page-evaluator/document-type/{alias}/properties`.
 *
 * Rewritten for 003-upgrade-umbraco-17-6: the original test targeted Umbraco's core
 * `/document-type/by-alias/{alias}` endpoint and a helper exported from the prompt-builder
 * element, neither of which is used any more.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { fetchDocTypeProperties } from '../../src/shared/api-client.js';

const BASE = '/umbraco/management/api/v1/page-evaluator';

const mockResponse = {
  alias: 'blogPost',
  name: 'Blog Post',
  properties: [
    { alias: 'blogNavigationImage', label: 'Navigation Image', groupName: 'Content', editorAlias: 'Umbraco.MediaPicker3' },
    { alias: 'postDate', label: 'Post Date', groupName: 'Content', editorAlias: 'Umbraco.DateTime' },
    { alias: 'summary', label: 'Summary', groupName: 'Content', editorAlias: 'Umbraco.TextArea' },
    { alias: 'metaDescription', label: 'Meta Description', groupName: 'SEO', editorAlias: 'Umbraco.TextArea' },
    { alias: 'browserTitle', label: 'Browser Title', groupName: 'SEO', editorAlias: 'Umbraco.TextBox' },
  ],
};

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('fetchDocTypeProperties', () => {
  it('returns the document type name and property summaries', async () => {
    server.use(http.get(`${BASE}/document-type/blogPost/properties`, () => HttpResponse.json(mockResponse)));

    const info = await fetchDocTypeProperties('blogPost');

    expect(info.name).toBe('Blog Post');
    expect(info.properties).toHaveLength(5);
  });

  it('maps alias, label, groupName and editorAlias', async () => {
    server.use(http.get(`${BASE}/document-type/blogPost/properties`, () => HttpResponse.json(mockResponse)));

    const [first] = (await fetchDocTypeProperties('blogPost')).properties;

    expect(first).toEqual({
      alias: 'blogNavigationImage',
      label: 'Navigation Image',
      groupName: 'Content',
      editorAlias: 'Umbraco.MediaPicker3',
    });
  });

  it('keeps the group name of every property', async () => {
    server.use(http.get(`${BASE}/document-type/blogPost/properties`, () => HttpResponse.json(mockResponse)));

    const { properties } = await fetchDocTypeProperties('blogPost');

    expect(properties.filter((p) => p.groupName === 'Content')).toHaveLength(3);
    expect(properties.filter((p) => p.groupName === 'SEO')).toHaveLength(2);
  });

  it('URL-encodes the alias', async () => {
    let requestedPath = '';
    server.use(
      http.get(`${BASE}/document-type/:alias/properties`, ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json({ ...mockResponse, properties: [] });
      }),
    );

    await fetchDocTypeProperties('my type');

    expect(requestedPath).toBe(`${BASE}/document-type/my%20type/properties`);
  });

  it('throws when the document type is not found (404)', async () => {
    server.use(
      http.get(`${BASE}/document-type/unknownType/properties`, () =>
        HttpResponse.json({ type: 'Error', title: 'Not found', status: 404 }, { status: 404 }),
      ),
    );

    await expect(fetchDocTypeProperties('unknownType')).rejects.toThrow();
  });

  it('returns an empty list when the document type has no properties', async () => {
    server.use(
      http.get(`${BASE}/document-type/empty/properties`, () =>
        HttpResponse.json({ alias: 'empty', name: 'Empty', properties: [] }),
      ),
    );

    expect((await fetchDocTypeProperties('empty')).properties).toHaveLength(0);
  });
});
