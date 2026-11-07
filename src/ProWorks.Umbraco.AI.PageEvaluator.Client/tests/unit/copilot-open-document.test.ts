/**
 * T044 — `resolveOpenDocument(host)` (`src/copilot/open-document.ts`): finds the document the Copilot user has
 * selected through the locally declared `UaiEntityAdapterContext` token and captures it like the workspace action.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { resolveOpenDocument } from '../../src/copilot/open-document.js';
import type { EntityAdapterContextLike, SelectedEntityLike } from '../../src/copilot/types.js';
import { createToolHost, fakeDocumentWorkspace, type FakeWorkspaceOptions } from '../fixtures/copilot-fakes.js';

const hosts: HTMLElement[] = [];

function createHost(adapter?: EntityAdapterContextLike): HTMLElement {
  const host = createToolHost(adapter);
  hosts.push(host);
  return host;
}

function adapterSelecting(selected: SelectedEntityLike | undefined): EntityAdapterContextLike {
  return { getHostElement: () => document.body, getSelectedEntity: () => selected };
}

function documentEntity(options: FakeWorkspaceOptions = {}, entityType = 'document'): SelectedEntityLike {
  const workspace = fakeDocumentWorkspace(options);
  return {
    entityContext: { entityType, unique: options.unique === undefined ? 'node-1' : options.unique },
    workspaceContext: workspace,
  };
}

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

describe('resolveOpenDocument', () => {
  it('returns noOpenPage when Copilot provides no entity adapter context', async () => {
    const result = await resolveOpenDocument(createHost());

    expect(result).toEqual({ ok: false, failure: { success: false, error: expect.objectContaining({ code: 'noOpenPage' }) as unknown } });
  });

  it('returns noOpenPage when nothing is selected', async () => {
    const result = await resolveOpenDocument(createHost(adapterSelecting(undefined)));

    expect(result.ok ? null : result.failure.error.code).toBe('noOpenPage');
  });

  it('returns noOpenPage when the selected entity is not a document', async () => {
    const result = await resolveOpenDocument(createHost(adapterSelecting(documentEntity({}, 'media'))));

    expect(result.ok ? null : result.failure.error.code).toBe('noOpenPage');
  });

  it('returns noOpenPage when the selected entity has no workspace context', async () => {
    const result = await resolveOpenDocument(
      createHost(adapterSelecting({ entityContext: { entityType: 'document', unique: 'node-1' }, workspaceContext: undefined })),
    );

    expect(result.ok ? null : result.failure.error.code).toBe('noOpenPage');
  });

  it('returns noOpenPage when the workspace context is not a document workspace', async () => {
    const result = await resolveOpenDocument(
      createHost(adapterSelecting({ entityContext: { entityType: 'document', unique: 'node-1' }, workspaceContext: {} })),
    );

    expect(result.ok ? null : result.failure.error.code).toBe('noOpenPage');
  });

  it('returns pageNotSaved when the document has no id yet', async () => {
    const result = await resolveOpenDocument(createHost(adapterSelecting(documentEntity({ unique: null }))));

    expect(result.ok ? null : result.failure.error.code).toBe('pageNotSaved');
  });

  it('returns pageNotSaved when the document id is empty', async () => {
    const result = await resolveOpenDocument(createHost(adapterSelecting(documentEntity({ unique: '' }))));

    expect(result.ok ? null : result.failure.error.code).toBe('pageNotSaved');
  });

  it('returns pageNotSaved for a page in create mode, which already has a key and no created variant', async () => {
    // Live QS-C13 (2026-11-05): a new page has a client-generated key and its variants are "NotCreated", so without the
    // getIsNew() check it was reported as cultureNotCreated ("no English version yet").
    const result = await resolveOpenDocument(
      createHost(
        adapterSelecting(
          documentEntity({
            isNew: true,
            variesByCulture: true,
            activeCulture: 'en-US',
            variants: [{ culture: 'en-US', state: 'NotCreated' }],
          }),
        ),
      ),
    );

    expect(result.ok ? null : result.failure.error.code).toBe('pageNotSaved');
  });

  it('returns cultureNotCreated when the viewed language has not been created', async () => {
    const result = await resolveOpenDocument(
      createHost(
        adapterSelecting(
          documentEntity({ variesByCulture: true, activeCulture: 'da-DK', variants: [{ culture: 'en-US', state: 'Draft' }] }),
        ),
      ),
    );

    expect(result.ok ? null : result.failure.error.code).toBe('cultureNotCreated');
  });

  it('returns the captured draft, the page name and the workspace context', async () => {
    const entity = documentEntity({
      unique: 'node-1',
      alias: 'landingPage',
      name: 'Forside',
      variesByCulture: true,
      activeCulture: 'da-DK',
      variants: [{ culture: 'da-DK', state: 'Draft' }],
      values: [
        { alias: 'title', value: 'Hej', culture: 'da-DK', segment: null },
        { alias: 'title', value: 'Hello', culture: 'en-US', segment: null },
      ],
    });

    const result = await resolveOpenDocument(createHost(adapterSelecting(entity)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document).toEqual({
      nodeId: 'node-1',
      documentTypeAlias: 'landingPage',
      culture: 'da-DK',
      cultureNotCreated: false,
      properties: { title: 'Hej' },
      name: 'Forside',
      workspaceContext: entity.workspaceContext,
    });
  });
});
