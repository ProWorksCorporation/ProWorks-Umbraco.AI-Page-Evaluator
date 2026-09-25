/**
 * Rich-text embedded-block safeguard (FR-016, research R9, contracts/backoffice-ui.md §5).
 */
import { describe, it, expect } from 'vitest';
import {
  canApplyRichText,
  createEmptyBlocks,
  extractBlockKeys,
  normaliseBlockMarkup,
} from '../../src/shared/rte-blocks.js';

const block = (key: string): string => `<umb-rte-block data-content-key="${key}"><!--Umbraco-Block--></umb-rte-block>`;
const inline = (key: string): string =>
  `<umb-rte-block-inline data-content-key="${key}"><!--Umbraco-Block--></umb-rte-block-inline>`;

describe('extractBlockKeys', () => {
  it('finds block and inline placeholders in document order', () => {
    const markup = `<p>Intro</p>${block('a')}<p>Text ${inline('b')} more</p>${block('c')}`;
    expect(extractBlockKeys(markup)).toEqual(['a', 'b', 'c']);
  });

  it('accepts an optional class attribute and a missing Umbraco-Block comment', () => {
    const markup = '<umb-rte-block class="umb-rte-block" data-content-key="x"></umb-rte-block>';
    expect(extractBlockKeys(markup)).toEqual(['x']);
  });

  it('reads the Delivery API data-content-id form', () => {
    expect(extractBlockKeys('<umb-rte-block data-content-id="d1"></umb-rte-block>')).toEqual(['d1']);
  });

  it('preserves duplicates', () => {
    expect(extractBlockKeys(`${block('a')}${block('a')}`)).toEqual(['a', 'a']);
  });

  it('returns an empty list for plain HTML', () => {
    expect(extractBlockKeys('<h2>Title</h2><p>No blocks</p>')).toEqual([]);
  });
});

describe('normaliseBlockMarkup', () => {
  it('rewrites data-content-id to data-content-key and restores the Umbraco-Block comment', () => {
    expect(normaliseBlockMarkup('<p>x</p><umb-rte-block data-content-id="k1"></umb-rte-block>')).toBe(
      '<p>x</p><umb-rte-block data-content-key="k1"><!--Umbraco-Block--></umb-rte-block>',
    );
  });

  it('leaves already-normal placeholders and plain HTML unchanged', () => {
    const markup = `<p>x</p>${block('k1')}${inline('k2')}`;
    expect(normaliseBlockMarkup(markup)).toBe(markup);
  });
});

describe('canApplyRichText', () => {
  const current = `<p>Old</p>${block('a')}<p>${inline('b')}</p>`;

  it('allows a recommendation that keeps every embedded item', () => {
    expect(canApplyRichText(current, `<h2>New</h2>${block('a')}<p>Better ${inline('b')}</p>`)).toBe(true);
  });

  it('allows reordered embedded items', () => {
    expect(canApplyRichText(current, `<p>${inline('b')}</p>${block('a')}`)).toBe(true);
  });

  it('withholds Apply when an embedded item is missing', () => {
    expect(canApplyRichText(current, `<p>New</p>${block('a')}`)).toBe(false);
  });

  it('withholds Apply when an unknown embedded item is introduced', () => {
    expect(canApplyRichText(current, `${block('a')}${inline('b')}${block('zzz')}`)).toBe(false);
  });

  it('withholds Apply when an embedded item is duplicated', () => {
    expect(canApplyRichText(current, `${block('a')}${block('a')}${inline('b')}`)).toBe(false);
  });

  it('allows plain rich text when neither side has blocks', () => {
    expect(canApplyRichText('<p>Old</p>', '<p>New</p>')).toBe(true);
  });

  it('accepts the Delivery API data-content-id form in the recommendation', () => {
    const recommended =
      '<umb-rte-block data-content-id="a"></umb-rte-block><umb-rte-block-inline data-content-id="b"></umb-rte-block-inline>';
    expect(canApplyRichText(current, recommended)).toBe(true);
  });
});

describe('createEmptyBlocks', () => {
  it('returns the empty RTE block envelope', () => {
    expect(createEmptyBlocks()).toEqual({ layout: {}, contentData: [], settingsData: [], expose: [] });
  });

  it('returns a fresh object on every call', () => {
    const first = createEmptyBlocks();
    const second = createEmptyBlocks();
    expect(first).not.toBe(second);
    expect(first.contentData).not.toBe(second.contentData);
  });
});
