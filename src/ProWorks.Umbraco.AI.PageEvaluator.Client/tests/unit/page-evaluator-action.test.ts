/**
 * Unit tests for the "Evaluate Page" workspace action API
 * (`src/workspace-action/page-evaluator-action.api.ts`).
 *
 * Rewritten for 003-upgrade-umbraco-17-6: the original tests targeted a
 * `page-evaluator-action.element.ts` that no longer exists. Button visibility is now
 * owned by `page-evaluator-active-config.condition.ts`; this API only builds the modal
 * data (node, document type, draft property values) and opens the evaluation modal.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const openModal = vi.fn<(host: unknown, token: unknown, args: { data: unknown }) => Promise<unknown>>();

vi.mock('@umbraco-cms/backoffice/workspace', () => ({
  UmbWorkspaceActionBase: class {
    // Overridden per test via `stubContext`.
    getContext(_token: unknown): Promise<unknown> {
      return Promise.resolve(undefined);
    }
  },
}));

vi.mock('@umbraco-cms/backoffice/document', () => ({
  UMB_DOCUMENT_WORKSPACE_CONTEXT: Symbol('UMB_DOCUMENT_WORKSPACE_CONTEXT'),
}));

vi.mock('@umbraco-cms/backoffice/modal', () => ({
  umbOpenModal: (host: unknown, token: unknown, args: { data: unknown }) => openModal(host, token, args),
  UmbModalToken: class {
    constructor(
      public readonly alias: string,
      public readonly options: unknown,
    ) {}
  },
}));

import { PageEvaluatorWorkspaceActionApi } from '../../src/workspace-action/page-evaluator-action.api.js';

interface FakeValue {
  alias: string;
  value: unknown;
  culture?: string | null;
  segment?: string | null;
}

interface FakeVariant {
  culture: string | null;
  state?: string | null;
}

interface FakeContextOptions {
  alias?: string;
  unique?: string;
  values?: FakeValue[];
  variesByCulture?: boolean;
  activeCulture?: string | null;
  variants?: FakeVariant[];
}

function createApi(ctx: unknown): PageEvaluatorWorkspaceActionApi {
  // The mocked base class has a no-arg constructor; cast through unknown to satisfy the real type.
  const Ctor = PageEvaluatorWorkspaceActionApi as unknown as new () => PageEvaluatorWorkspaceActionApi;
  const api = new Ctor();
  (api as unknown as { getContext: () => Promise<unknown> }).getContext = () => Promise.resolve(ctx);
  return api;
}

function fakeContext(options: FakeContextOptions = {}): unknown {
  return {
    structure: { getOwnerContentType: () => ({ alias: options.alias ?? 'blogPost' }) },
    getData: () => ({
      unique: options.unique ?? 'node-1',
      values: options.values ?? [],
      variants: options.variants ?? [{ culture: null, state: 'Published' }],
    }),
    getVariesByCulture: () => options.variesByCulture ?? false,
    splitView: {
      getActiveVariants: () => [{ index: 0, culture: options.activeCulture ?? null, segment: null }],
    },
  };
}

function lastModalData(): Record<string, unknown> {
  const call = openModal.mock.calls.at(-1);
  if (!call) throw new Error('umbOpenModal was not called');
  return call[2].data as Record<string, unknown>;
}

describe('PageEvaluatorWorkspaceActionApi.execute()', () => {
  beforeEach(() => {
    openModal.mockReset();
    openModal.mockResolvedValue(undefined);
  });

  it('opens the evaluation modal with the node id and document type alias', async () => {
    await createApi(fakeContext({ alias: 'blogPost', unique: 'abc' })).execute();

    expect(openModal).toHaveBeenCalledTimes(1);
    const data = lastModalData();
    expect(data['nodeId']).toBe('abc');
    expect(data['documentTypeAlias']).toBe('blogPost');
  });

  it('passes the draft property values keyed by alias', async () => {
    await createApi(
      fakeContext({
        values: [
          { alias: 'title', value: 'Hello' },
          { alias: 'metaDescription', value: 'A page' },
        ],
      }),
    ).execute();

    expect(lastModalData()['properties']).toEqual({ title: 'Hello', metaDescription: 'A page' });
  });

  it('does nothing when no document workspace context is available', async () => {
    await createApi(undefined).execute();

    expect(openModal).not.toHaveBeenCalled();
  });

  it('swallows the rejection raised when the modal is closed', async () => {
    openModal.mockRejectedValueOnce(new Error('closed'));

    await expect(createApi(fakeContext()).execute()).resolves.toBeUndefined();
  });
});

describe('PageEvaluatorWorkspaceActionApi.execute() — language awareness (FR-018)', () => {
  beforeEach(() => {
    openModal.mockReset();
    openModal.mockResolvedValue(undefined);
  });

  const multilingualValues: FakeValue[] = [
    { alias: 'title', value: 'Hello', culture: 'en-US', segment: null },
    { alias: 'title', value: 'Hej', culture: 'da-DK', segment: null },
    { alias: 'sku', value: 'ABC-1', culture: null, segment: null },
    { alias: 'title', value: 'Hej (segment)', culture: 'da-DK', segment: 'vip' },
  ];

  it('captures the culture of the first active variant for a culture-varying document', async () => {
    await createApi(
      fakeContext({
        variesByCulture: true,
        activeCulture: 'da-DK',
        values: multilingualValues,
        variants: [{ culture: 'en-US', state: 'Published' }, { culture: 'da-DK', state: 'Draft' }],
      }),
    ).execute();

    expect(lastModalData()['culture']).toBe('da-DK');
  });

  it('sends only the viewed culture values plus invariant ones, never other cultures or segments', async () => {
    await createApi(
      fakeContext({
        variesByCulture: true,
        activeCulture: 'da-DK',
        values: multilingualValues,
        variants: [{ culture: 'en-US', state: 'Published' }, { culture: 'da-DK', state: 'Draft' }],
      }),
    ).execute();

    expect(lastModalData()['properties']).toEqual({ title: 'Hej', sku: 'ABC-1' });
  });

  it('uses culture null for an invariant document', async () => {
    await createApi(fakeContext({ variesByCulture: false, activeCulture: 'en-US', values: [{ alias: 'title', value: 'Hi' }] })).execute();

    expect(lastModalData()['culture']).toBeNull();
    expect(lastModalData()['cultureNotCreated']).toBe(false);
  });

  it.each([
    ['has no variant entry', [{ culture: 'en-US', state: 'Published' }]],
    ['is NotCreated', [{ culture: 'en-US', state: 'Published' }, { culture: 'da-DK', state: 'NotCreated' }]],
    ['has no state yet', [{ culture: 'en-US', state: 'Published' }, { culture: 'da-DK', state: null }]],
  ])('flags cultureNotCreated when the viewed culture %s', async (_label, variants) => {
    await createApi(fakeContext({ variesByCulture: true, activeCulture: 'da-DK', variants })).execute();

    expect(lastModalData()['cultureNotCreated']).toBe(true);
  });

  it('does not flag an existing culture', async () => {
    await createApi(
      fakeContext({ variesByCulture: true, activeCulture: 'da-DK', variants: [{ culture: 'da-DK', state: 'Draft' }] }),
    ).execute();

    expect(lastModalData()['cultureNotCreated']).toBe(false);
  });
});
