/**
 * T045 — the Copilot tools' module-scoped stores (data-model §5, contracts/copilot-tools.md §1–3):
 * - `report-store.ts`: the last report per (node, culture), with a JSON snapshot of the captured values for a
 *   fresh run;
 * - `recommendation-store.ts`: recommendation references (`rec_` + 12 random URL-safe characters), 30-minute expiry,
 *   cleared when the page changes, deleted after use.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  REPORT_TTL_MS,
  clearReportsForOtherEntity,
  getStoredReport,
  resetReportStore,
  snapshotOf,
  storeReport,
} from '../../src/copilot/report-store.js';
import {
  RECOMMENDATION_TTL_MS,
  addRecommendation,
  clearRecommendationsForOtherEntity,
  deleteRecommendation,
  getRecommendation,
  resetRecommendationStore,
} from '../../src/copilot/recommendation-store.js';
import type { EvaluationReportResponse } from '../../src/shared/types.js';

const report = { parseFailed: false, checks: [] } as unknown as EvaluationReportResponse;
const otherReport = { parseFailed: true, checks: [] } as unknown as EvaluationReportResponse;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
  resetReportStore();
  resetRecommendationStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('report store', () => {
  it('stores a report per node and culture', () => {
    storeReport('node-1', 'da-DK', report, '{}', false);
    storeReport('node-1', 'en-US', otherReport, '{}', false);

    expect(getStoredReport('node-1', 'da-DK')?.report).toBe(report);
    expect(getStoredReport('node-1', 'en-US')?.report).toBe(otherReport);
    expect(getStoredReport('node-1', null)).toBeUndefined();
    expect(getStoredReport('node-2', 'da-DK')).toBeUndefined();
  });

  it('matches cultures case-insensitively', () => {
    storeReport('node-1', 'da-DK', report, '{}', false);

    expect(getStoredReport('node-1', 'da-dk')?.report).toBe(report);
  });

  it('replaces the earlier report for the same node and culture', () => {
    storeReport('node-1', null, report, '{}', false);
    storeReport('node-1', null, otherReport, '{}', false);

    expect(getStoredReport('node-1', null)?.report).toBe(otherReport);
  });

  it('keeps the JSON snapshot of the captured values and whether the report was a fresh evaluation', () => {
    storeReport('node-1', null, report, snapshotOf({ title: 'Hello', tags: ['a'] }), true);

    expect(getStoredReport('node-1', null)).toMatchObject({
      snapshot: snapshotOf({ title: 'Hello', tags: ['a'] }),
      fresh: true,
      culture: null,
    });
  });

  it('snapshots are independent of property order and change with any value', () => {
    expect(snapshotOf({ a: 1, b: { y: 2, x: 1 } })).toBe(snapshotOf({ b: { x: 1, y: 2 }, a: 1 }));
    expect(snapshotOf({ a: 'x' })).not.toBe(snapshotOf({ a: 'y' }));
    expect(snapshotOf({ a: undefined })).toBe(snapshotOf({ a: undefined }));
  });

  it('expires reports', () => {
    storeReport('node-1', null, report, '{}', false);
    vi.advanceTimersByTime(REPORT_TTL_MS + 1);

    expect(getStoredReport('node-1', null)).toBeUndefined();
  });

  it('clears the reports of other pages', () => {
    storeReport('node-1', null, report, '{}', false);
    storeReport('node-2', null, otherReport, '{}', false);

    clearReportsForOtherEntity('node-2');

    expect(getStoredReport('node-1', null)).toBeUndefined();
    expect(getStoredReport('node-2', null)?.report).toBe(otherReport);
  });
});

describe('recommendation store', () => {
  const input = {
    nodeId: 'node-1',
    culture: 'da-DK',
    propertyAlias: 'metaDescription',
    editorAlias: 'Umbraco.TextArea',
    value: 'A better description',
  };

  it('creates rec_ references of 12 URL-safe random characters from crypto.getRandomValues', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues');

    const entry = addRecommendation(input);

    expect(entry.reference).toMatch(/^rec_[A-Za-z0-9_-]{12}$/);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('creates a different reference each time', () => {
    const references = new Set(Array.from({ length: 50 }, () => addRecommendation(input).reference));

    expect(references.size).toBe(50);
  });

  it('returns the stored entry with its creation time', () => {
    const entry = addRecommendation(input);

    expect(getRecommendation(entry.reference)).toEqual({ ...input, reference: entry.reference, createdAt: Date.now() });
  });

  it('returns undefined for an unknown reference', () => {
    expect(getRecommendation('rec_unknown00000')).toBeUndefined();
  });

  it('keeps an entry for 30 minutes and expires it after', () => {
    const entry = addRecommendation(input);

    vi.advanceTimersByTime(RECOMMENDATION_TTL_MS - 1);
    expect(getRecommendation(entry.reference)).toBeDefined();

    vi.advanceTimersByTime(2);
    expect(getRecommendation(entry.reference)).toBeUndefined();
    expect(RECOMMENDATION_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('deletes an entry after use', () => {
    const entry = addRecommendation(input);

    deleteRecommendation(entry.reference);

    expect(getRecommendation(entry.reference)).toBeUndefined();
  });

  it('clears the entries of other pages and keeps those of the open page', () => {
    const mine = addRecommendation(input);
    const other = addRecommendation({ ...input, nodeId: 'node-2' });

    clearRecommendationsForOtherEntity('node-1');

    expect(getRecommendation(mine.reference)).toBeDefined();
    expect(getRecommendation(other.reference)).toBeUndefined();
  });
});
