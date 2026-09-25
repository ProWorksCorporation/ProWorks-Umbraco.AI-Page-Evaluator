/**
 * applyRecommendedValue (FR-016, FR-018c, research R5/R9/R12.2, contracts/backoffice-ui.md §2).
 * Writes go straight to the document workspace context — never through Umbraco.AI's
 * applyValueChange, which looks up values culture-blind and JSON.parse()s plain strings.
 */
import { vi, describe, it, expect } from 'vitest';
import type { UmbVariantId } from '@umbraco-cms/backoffice/variant';
import { applyRecommendedValue } from '../../src/shared/apply-value.js';

interface FakeProperty {
  alias: string;
  variesByCulture: boolean;
}

interface FakeOptions {
  documentVariesByCulture?: boolean;
  properties?: FakeProperty[];
  currentValue?: unknown;
  setThrows?: boolean;
}

function fakeContext(options: FakeOptions = {}) {
  const setPropertyValue = vi.fn((_alias: string, _value: unknown, _variantId?: UmbVariantId): Promise<void> =>
    options.setThrows ? Promise.reject(new Error('requires a culture variantId')) : Promise.resolve(),
  );
  const getPropertyValue = vi.fn((_alias: string, _variantId?: UmbVariantId): unknown => options.currentValue);
  const ctx = {
    getVariesByCulture: (): boolean => options.documentVariesByCulture ?? false,
    structure: {
      getPropertyStructureByAlias: (alias: string): Promise<FakeProperty | undefined> =>
        Promise.resolve((options.properties ?? []).find((p) => p.alias === alias)),
    },
    setPropertyValue,
    getPropertyValue,
  };
  return { ctx, setPropertyValue, getPropertyValue };
}

type Ctx = Parameters<typeof applyRecommendedValue>[0];
const asCtx = (ctx: unknown): Ctx => ctx as Ctx;

describe('applyRecommendedValue', () => {
  it.each(['42', 'true', '"quoted"', 'null'])(
    'writes plain text value %s unchanged (no JSON coercion)',
    async (value) => {
      const { ctx, setPropertyValue } = fakeContext({ properties: [{ alias: 'title', variesByCulture: false }] });

      const ok = await applyRecommendedValue(asCtx(ctx), 'title', 'Umbraco.TextBox', value, null);

      expect(ok).toBe(true);
      expect(setPropertyValue.mock.calls[0]?.[1]).toBe(value);
    },
  );

  // The Tags editor stores string[]. Before 003, Umbraco.AI's applyValueChange JSON.parse()d the
  // recommendation into that array; writing directly needs the conversion here (found live 2026-09-25,
  // when the model also returned a comma-separated string).
  it.each([
    ['a JSON array string', '["headless CMS", "cms strategy"]', ['headless CMS', 'cms strategy']],
    ['a comma-separated string', 'headless CMS, cms strategy ,decoupled', ['headless CMS', 'cms strategy', 'decoupled']],
    ['a newline-separated string', 'headless CMS\ncms strategy', ['headless CMS', 'cms strategy']],
    ['duplicates and blanks', 'cms, CMS, , cms', ['cms', 'CMS']],
    ['an already-parsed array', ['a', ' b '], ['a', 'b']],
  ])('writes Tags from %s as a string array', async (_label, value, expected) => {
    const { ctx, setPropertyValue } = fakeContext({ properties: [{ alias: 'tags', variesByCulture: false }] });

    const ok = await applyRecommendedValue(asCtx(ctx), 'tags', 'Umbraco.Tags', value, null);

    expect(ok).toBe(true);
    expect(setPropertyValue.mock.calls[0]?.[1]).toEqual(expected);
  });

  it('wraps rich-text recommendations as { markup, blocks } keeping the current blocks', async () => {
    const blocks = {
      layout: { 'Umbraco.RichText': [{ contentKey: 'a' }] },
      contentData: [{ key: 'a' }],
      settingsData: [],
      expose: [],
    };
    const { ctx, setPropertyValue } = fakeContext({
      properties: [{ alias: 'body', variesByCulture: false }],
      currentValue: { markup: '<p>old</p>', blocks },
    });

    await applyRecommendedValue(
      asCtx(ctx),
      'body',
      'Umbraco.RichText',
      '<p>new</p><umb-rte-block data-content-id="a"></umb-rte-block>',
      null,
    );

    expect(setPropertyValue.mock.calls[0]?.[1]).toEqual({
      markup: '<p>new</p><umb-rte-block data-content-key="a"><!--Umbraco-Block--></umb-rte-block>',
      blocks,
    });
  });

  it('uses a fresh empty block envelope when the rich-text field is empty', async () => {
    const { ctx, setPropertyValue } = fakeContext({ properties: [{ alias: 'body', variesByCulture: false }] });

    await applyRecommendedValue(asCtx(ctx), 'body', 'Umbraco.RichText', '<p>new</p>', null);
    await applyRecommendedValue(asCtx(ctx), 'body', 'Umbraco.RichText', '<p>again</p>', null);

    const first = setPropertyValue.mock.calls[0]?.[1] as { blocks: { contentData: unknown[] } };
    const second = setPropertyValue.mock.calls[1]?.[1] as { blocks: { contentData: unknown[] } };
    expect(first.blocks).toEqual({ layout: {}, contentData: [], settingsData: [], expose: [] });
    expect(first.blocks.contentData).not.toBe(second.blocks.contentData);
  });

  it('returns false without rethrowing when the write fails', async () => {
    const { ctx } = fakeContext({ properties: [{ alias: 'title', variesByCulture: false }], setThrows: true });

    await expect(applyRecommendedValue(asCtx(ctx), 'title', 'Umbraco.TextBox', 'x', null)).resolves.toBe(false);
  });

  it('writes the invariant slot when no culture is being viewed', async () => {
    const { ctx, setPropertyValue } = fakeContext({
      properties: [{ alias: 'title', variesByCulture: true }],
      documentVariesByCulture: true,
    });

    await applyRecommendedValue(asCtx(ctx), 'title', 'Umbraco.TextBox', 'x', null);

    const variantId = setPropertyValue.mock.calls[0]?.[2];
    expect(variantId?.culture).toBeNull();
    expect(variantId?.segment).toBeNull();
  });
});

describe('applyRecommendedValue — culture targeting (FR-018c)', () => {
  it('writes the viewed culture for a culture-varying property on a culture-varying document', async () => {
    const { ctx, setPropertyValue } = fakeContext({
      documentVariesByCulture: true,
      properties: [{ alias: 'title', variesByCulture: true }],
    });

    await applyRecommendedValue(asCtx(ctx), 'title', 'Umbraco.TextBox', 'Hej', 'da-DK');

    expect(setPropertyValue.mock.calls[0]?.[2]?.culture).toBe('da-DK');
  });

  it('writes the invariant slot for a shared property on a culture-varying document', async () => {
    const { ctx, setPropertyValue } = fakeContext({
      documentVariesByCulture: true,
      properties: [{ alias: 'sku', variesByCulture: false }],
    });

    await applyRecommendedValue(asCtx(ctx), 'sku', 'Umbraco.TextBox', 'ABC', 'da-DK');

    expect(setPropertyValue.mock.calls[0]?.[2]?.culture).toBeNull();
  });

  it('writes the invariant slot on an invariant document even when a culture is supplied', async () => {
    const { ctx, setPropertyValue } = fakeContext({
      documentVariesByCulture: false,
      properties: [{ alias: 'title', variesByCulture: true }],
    });

    await applyRecommendedValue(asCtx(ctx), 'title', 'Umbraco.TextBox', 'Hi', 'da-DK');

    expect(setPropertyValue.mock.calls[0]?.[2]?.culture).toBeNull();
  });

  it('reads the current rich-text blocks from the viewed culture', async () => {
    const { ctx, getPropertyValue } = fakeContext({
      documentVariesByCulture: true,
      properties: [{ alias: 'body', variesByCulture: true }],
      currentValue: { markup: '<p>x</p>', blocks: { layout: {}, contentData: [], settingsData: [], expose: [] } },
    });

    await applyRecommendedValue(asCtx(ctx), 'body', 'Umbraco.RichText', '<p>y</p>', 'da-DK');

    expect(getPropertyValue.mock.calls[0]?.[1]?.culture).toBe('da-DK');
  });
});
