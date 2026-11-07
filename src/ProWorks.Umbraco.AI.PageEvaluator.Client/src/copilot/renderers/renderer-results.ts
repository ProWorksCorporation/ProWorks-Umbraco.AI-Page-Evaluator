/**
 * Reads the tool results the Copilot renderers display. Agent.UI hands renderers the JSON-parsed result as `unknown`
 * (and replays it from conversation history), so every field is checked instead of trusting a type assertion.
 */
import type { SkipReason } from '../recommend-page-values.tool.api.js';

export interface RenderedRecommendation {
  readonly propertyAlias: string;
  /** The display name, falling back to the alias. */
  readonly fieldName: string;
  readonly value: string;
  readonly canApply: boolean;
  readonly blockedByRichTextBlocks: boolean;
}

export interface RenderedSkip {
  readonly propertyAlias: string;
  readonly reason: SkipReason | null;
}

export interface RenderedRecommendResult {
  readonly recommendations: readonly RenderedRecommendation[];
  readonly skipped: readonly RenderedSkip[];
  /** A tool failure, or a request that failed part-way; null when everything succeeded. */
  readonly errorMessage: string | null;
}

export type RenderedApplyResult =
  | { readonly applied: true; readonly propertyAlias: string | null }
  | { readonly applied: false; readonly code: string | null; readonly message: string | null };

const SKIP_REASONS: readonly SkipReason[] = ['notFailing', 'notRecommendable', 'noRecommendation'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function isSkipReason(value: unknown): value is SkipReason {
  return SKIP_REASONS.some((reason) => reason === value);
}

/**
 * The message of a failed result: our tools' `{ success: false, error: { code, message } }`, Agent.UI's
 * `{ error: string }` (denied approval, thrown tool) or a bare string (`"Aborted"`). Null when there is none.
 */
export function errorMessageOf(result: unknown): string | null {
  if (typeof result === 'string') return nonEmptyString(result);
  if (!isRecord(result)) return null;
  const error = result['error'];
  if (typeof error === 'string') return nonEmptyString(error);
  return isRecord(error) ? nonEmptyString(error['message']) : null;
}

function errorCodeOf(result: unknown): string | null {
  if (!isRecord(result)) return null;
  const error = result['error'];
  return isRecord(error) ? nonEmptyString(error['code']) : null;
}

function readRecommendation(item: unknown): RenderedRecommendation | null {
  if (!isRecord(item)) return null;
  const propertyAlias = nonEmptyString(item['propertyAlias']);
  const value = item['value'];
  if (propertyAlias === null || typeof value !== 'string') return null;
  return {
    propertyAlias,
    fieldName: nonEmptyString(item['propertyName']) ?? propertyAlias,
    value,
    canApply: item['canApply'] !== false,
    blockedByRichTextBlocks: item['applyBlockedReason'] === 'richTextBlocks',
  };
}

function readSkip(item: unknown): RenderedSkip | null {
  if (!isRecord(item)) return null;
  const propertyAlias = nonEmptyString(item['propertyAlias']);
  if (propertyAlias === null) return null;
  const reason = item['reason'];
  return { propertyAlias, reason: isSkipReason(reason) ? reason : null };
}

function readList<T>(value: unknown, read: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const items: T[] = [];
  for (const item of value as unknown[]) {
    const read_ = read(item);
    if (read_ !== null) items.push(read_);
  }
  return items;
}

/** The `recommend_page_values` result (contracts/copilot-tools.md §2) as far as it is well-formed. */
export function readRecommendResult(result: unknown): RenderedRecommendResult {
  if (!isRecord(result)) return { recommendations: [], skipped: [], errorMessage: errorMessageOf(result) };
  return {
    recommendations: readList(result['recommendations'], readRecommendation),
    skipped: readList(result['skipped'], readSkip),
    errorMessage: result['success'] === false || result['error'] !== undefined ? errorMessageOf(result) : null,
  };
}

/** The `apply_page_recommendation` result (contracts/copilot-tools.md §3). */
export function readApplyResult(result: unknown): RenderedApplyResult {
  if (isRecord(result) && result['success'] === true) {
    return { applied: true, propertyAlias: nonEmptyString(result['propertyAlias']) };
  }
  return { applied: false, code: errorCodeOf(result), message: errorMessageOf(result) };
}
