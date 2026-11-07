import type { EvaluationReportResponse } from '../shared/types.js';

/**
 * The last report each Copilot evaluation produced, per (node, culture) (contracts/copilot-tools.md §1), so
 * `recommend_page_values` can find the checks without another request. Module state: it lasts for the browser
 * session, entries expire after {@link REPORT_TTL_MS} and are cleared when another page is selected.
 */

export const REPORT_TTL_MS = 30 * 60 * 1000;

export interface StoredReport {
  readonly nodeId: string;
  /** Lower-cased culture, or null for invariant documents. */
  readonly culture: string | null;
  readonly report: EvaluationReportResponse;
  /**
   * JSON snapshot ({@link snapshotOf}) of the values captured when the report was stored. For a fresh evaluation run
   * by the tool these are exactly the evaluated values; for a report read from the cache they are what was on screen
   * at the time (a later edit-and-save would otherwise go unnoticed, because `savedSinceEvaluation` is as of then).
   */
  readonly snapshot: string;
  /** True when the tool produced the report from {@link snapshot} (a fresh evaluation); false for a cached report. */
  readonly fresh: boolean;
  readonly storedAt: number;
}

const reports = new Map<string, StoredReport>();

function keyOf(nodeId: string, culture: string | null): string {
  return `${nodeId}|${culture?.toLowerCase() ?? ''}`;
}

/** Recursively sorts object keys so equal values always serialize the same way. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

/** A stable JSON snapshot of captured property values (independent of key order). */
export function snapshotOf(properties: Readonly<Record<string, unknown>>): string {
  return JSON.stringify(sortKeys(properties));
}

export function storeReport(
  nodeId: string,
  culture: string | null,
  report: EvaluationReportResponse,
  snapshot: string,
  fresh: boolean,
): void {
  const normalisedCulture = culture?.toLowerCase() ?? null;
  reports.set(keyOf(nodeId, culture), {
    nodeId,
    culture: normalisedCulture,
    report,
    snapshot,
    fresh,
    storedAt: Date.now(),
  });
}

export function getStoredReport(nodeId: string, culture: string | null): StoredReport | undefined {
  const key = keyOf(nodeId, culture);
  const entry = reports.get(key);
  if (entry && Date.now() - entry.storedAt > REPORT_TTL_MS) {
    reports.delete(key);
    return undefined;
  }
  return entry;
}

/** Drops every report that isn't for `nodeId` (the user selected another page). */
export function clearReportsForOtherEntity(nodeId: string): void {
  for (const [key, entry] of reports) {
    if (entry.nodeId !== nodeId) reports.delete(key);
  }
}

/** Empties the store (tests). */
export function resetReportStore(): void {
  reports.clear();
}
