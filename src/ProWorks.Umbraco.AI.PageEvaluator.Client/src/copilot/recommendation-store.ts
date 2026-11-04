/**
 * Recommendation references handed to the model by `recommend_page_values` and redeemed by
 * `apply_page_recommendation` (data-model §5). Browser-only module state, never sent to the server.
 *
 * Agent.UI gives tool APIs no conversation id, so "for this conversation" is implemented as "for this page, this
 * browser session, 30 minutes" (research R5): entries expire after {@link RECOMMENDATION_TTL_MS}, are cleared
 * when another page is selected, are deleted after a successful apply, and disappear on reload.
 */

export const RECOMMENDATION_TTL_MS = 30 * 60 * 1000;

const REFERENCE_PREFIX = 'rec_';
const REFERENCE_LENGTH = 12;
/** 64 URL-safe characters, so `byte & 63` picks one uniformly. */
const REFERENCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export interface RecommendationInput {
  readonly nodeId: string;
  /** The viewed culture at recommend time; null for invariant documents. */
  readonly culture: string | null;
  readonly propertyAlias: string;
  readonly editorAlias: string | undefined;
  /** Exactly as returned by POST /recommend. */
  readonly value: string;
  /**
   * The report's additional recommendable editors (site configuration), so apply can re-check eligibility for a
   * third-party editor without the report. Omitted when there are none.
   */
  readonly additionalRecommendableEditorAliases?: readonly string[];
}

export interface RecommendationEntry extends RecommendationInput {
  readonly reference: string;
  readonly createdAt: number;
}

const entries = new Map<string, RecommendationEntry>();

function createReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(REFERENCE_LENGTH));
  let id = '';
  for (const byte of bytes) id += REFERENCE_ALPHABET[byte & 63] ?? '';
  return `${REFERENCE_PREFIX}${id}`;
}

export function addRecommendation(input: RecommendationInput): RecommendationEntry {
  let reference = createReference();
  while (entries.has(reference)) reference = createReference();
  const entry: RecommendationEntry = { ...input, reference, createdAt: Date.now() };
  entries.set(reference, entry);
  return entry;
}

/** The entry for `reference`, or undefined when it is unknown or has expired (an expired entry is removed). */
export function getRecommendation(reference: string): RecommendationEntry | undefined {
  const entry = entries.get(reference);
  if (entry && Date.now() - entry.createdAt > RECOMMENDATION_TTL_MS) {
    entries.delete(reference);
    return undefined;
  }
  return entry;
}

export function deleteRecommendation(reference: string): void {
  entries.delete(reference);
}

/** Drops every entry that isn't for `nodeId` (the user selected another page). */
export function clearRecommendationsForOtherEntity(nodeId: string): void {
  for (const [reference, entry] of entries) {
    if (entry.nodeId !== nodeId) entries.delete(reference);
  }
}

/** Empties the store (tests). */
export function resetRecommendationStore(): void {
  entries.clear();
}
