/**
 * T036 — `captureDocumentDraft(workspaceCtx)` (`src/shared/capture-draft.ts`).
 *
 * The workspace action and the Copilot evaluate tool must capture the open document identically
 * (006 spec FR-001; CLAUDE.md "Language awareness"): the viewed culture is the first active split-view
 * variant, only that culture's values plus invariant values are sent, segmented values are skipped, and a
 * culture the editor hasn't created yet is flagged.
 */
import { describe, it, expect } from 'vitest';
import { captureDocumentDraft, type DraftSourceWorkspace } from '../../src/shared/capture-draft.js';

interface FakeValue {
  alias: string;
  value: unknown;
  culture?: string | null;
  segment?: string | null;
}

interface FakeOptions {
  alias?: string;
  unique?: string | null;
  values?: unknown[];
  variesByCulture?: boolean;
  activeCulture?: string | null;
  variants?: unknown[];
}

function fakeWorkspace(options: FakeOptions = {}): DraftSourceWorkspace {
  return {
    structure: { getOwnerContentType: () => ({ alias: options.alias ?? 'landingPage' }) },
    getData: () => ({
      unique: options.unique === undefined ? 'node-1' : options.unique,
      values: options.values ?? [],
      variants: options.variants ?? [{ culture: null, state: 'Published' }],
    }),
    getVariesByCulture: () => options.variesByCulture ?? false,
    splitView: {
      getActiveVariants: () => [{ culture: options.activeCulture ?? null, segment: null }],
    },
  };
}

const multilingualValues: FakeValue[] = [
  { alias: 'title', value: 'Hello', culture: 'en-US', segment: null },
  { alias: 'title', value: 'Hej', culture: 'da-DK', segment: null },
  { alias: 'sku', value: 'ABC-1', culture: null, segment: null },
  { alias: 'title', value: 'Hej (segment)', culture: 'da-DK', segment: 'vip' },
  { alias: 'sku', value: 'segmented sku', culture: null, segment: 'vip' },
];

describe('captureDocumentDraft', () => {
  it('returns the node id and document type alias', () => {
    const draft = captureDocumentDraft(fakeWorkspace({ alias: 'blogPost', unique: 'abc' }));

    expect(draft.nodeId).toBe('abc');
    expect(draft.documentTypeAlias).toBe('blogPost');
  });

  it('returns an empty node id when the document has not been saved', () => {
    expect(captureDocumentDraft(fakeWorkspace({ unique: null })).nodeId).toBe('');
  });

  it('uses a null culture and every unsegmented value for an invariant document', () => {
    const draft = captureDocumentDraft(
      fakeWorkspace({
        values: [
          { alias: 'title', value: 'Hello', culture: null, segment: null },
          { alias: 'metaDescription', value: 'A page', culture: null, segment: null },
        ],
      }),
    );

    expect(draft.culture).toBeNull();
    expect(draft.cultureNotCreated).toBe(false);
    expect(draft.properties).toEqual({ title: 'Hello', metaDescription: 'A page' });
  });

  it('captures the first active split-view variant as the viewed culture when the document varies', () => {
    const draft = captureDocumentDraft(
      fakeWorkspace({
        variesByCulture: true,
        activeCulture: 'da-DK',
        values: multilingualValues,
        variants: [{ culture: 'en-US', state: 'Published' }, { culture: 'da-DK', state: 'Draft' }],
      }),
    );

    expect(draft.culture).toBe('da-DK');
  });

  it("sends only the viewed culture's values plus invariant values, skipping segmented values", () => {
    const draft = captureDocumentDraft(
      fakeWorkspace({
        variesByCulture: true,
        activeCulture: 'da-DK',
        values: multilingualValues,
        variants: [{ culture: 'da-DK', state: 'Draft' }],
      }),
    );

    expect(draft.properties).toEqual({ title: 'Hej', sku: 'ABC-1' });
  });

  it('ignores the active variant culture when the document type does not vary', () => {
    const draft = captureDocumentDraft(fakeWorkspace({ variesByCulture: false, activeCulture: 'da-DK' }));

    expect(draft.culture).toBeNull();
  });

  it('ignores malformed value entries', () => {
    const draft = captureDocumentDraft(
      fakeWorkspace({ values: [null, 42, { value: 'no alias' }, { alias: 'title', value: 'Hello' }] }),
    );

    expect(draft.properties).toEqual({ title: 'Hello' });
  });

  it.each([
    ['there is no variant entry for the culture', [{ culture: 'en-US', state: 'Published' }]],
    ['the variant state is not a string', [{ culture: 'da-DK', state: null }]],
    ['the variant state is NotCreated', [{ culture: 'da-DK', state: 'NotCreated' }]],
  ])('flags cultureNotCreated when %s', (_case, variants) => {
    const draft = captureDocumentDraft(
      fakeWorkspace({ variesByCulture: true, activeCulture: 'da-DK', variants }),
    );

    expect(draft.cultureNotCreated).toBe(true);
  });

  it('does not flag cultureNotCreated for a created variant', () => {
    const draft = captureDocumentDraft(
      fakeWorkspace({ variesByCulture: true, activeCulture: 'da-DK', variants: [{ culture: 'da-DK', state: 'Draft' }] }),
    );

    expect(draft.cultureNotCreated).toBe(false);
  });
});
