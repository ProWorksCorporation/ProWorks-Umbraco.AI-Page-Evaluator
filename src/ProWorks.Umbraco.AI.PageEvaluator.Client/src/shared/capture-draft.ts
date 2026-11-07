/**
 * Captures the document open in a workspace the way the evaluator sees it (FR-018; 006 FR-001).
 *
 * Shared by the "Evaluate Page" workspace action and the Copilot `evaluate_current_page` tool, so both send
 * the same values for the same screen:
 * - the viewed culture is the first active split-view variant (the left pane — the rule core uses for the
 *   workspace name), and only when the document type varies by culture;
 * - only that culture's values and invariant values are captured; segmented values are skipped (the evaluator
 *   uses the default segment);
 * - a culture the editor hasn't created yet (no variant entry, or a state that is not a string / `NotCreated`)
 *   is flagged, because there is nothing to evaluate.
 */

/** Variant state value meaning "this language version doesn't exist yet". */
const NOT_CREATED_STATE = 'NotCreated';

/**
 * The part of the document workspace context the capture reads. Structural, so the real
 * `UMB_DOCUMENT_WORKSPACE_CONTEXT` instance (also reached through Copilot's entity adapter) and test fakes fit.
 */
export interface DraftSourceWorkspace {
  readonly structure: { getOwnerContentType(): { readonly alias?: string } | undefined };
  getData?(): { readonly unique?: string | null; readonly values?: unknown; readonly variants?: unknown } | undefined;
  getVariesByCulture(): boolean | undefined;
  readonly splitView: { getActiveVariants(): ReadonlyArray<{ readonly culture: string | null }> };
}

/** What the evaluator needs about the open document. */
export interface DocumentDraft {
  /** The document key; `''` when the document has never been saved. */
  readonly nodeId: string;
  readonly documentTypeAlias: string;
  /** The viewed culture as the workspace reports it (e.g. `da-DK`); `null` for invariant document types. */
  readonly culture: string | null;
  readonly cultureNotCreated: boolean;
  /** Draft values keyed by property alias (viewed culture + invariant, no segments). */
  readonly properties: Record<string, unknown>;
}

interface DraftValue {
  readonly alias: string;
  readonly value: unknown;
}

function isDraftValue(value: unknown): value is DraftValue {
  return typeof value === 'object' && value !== null && 'alias' in value && typeof value.alias === 'string';
}

function stringField(value: object, key: 'culture' | 'segment'): string | null {
  const raw: unknown = (value as Record<string, unknown>)[key];
  return typeof raw === 'string' ? raw : null;
}

interface VariantEntry {
  readonly culture: string;
  readonly state?: unknown;
}

function isVariantFor(culture: string): (x: unknown) => x is VariantEntry {
  return (x: unknown): x is VariantEntry =>
    typeof x === 'object' && x !== null && 'culture' in x && x.culture === culture;
}

export function captureDocumentDraft(workspaceCtx: DraftSourceWorkspace): DocumentDraft {
  const documentTypeAlias = workspaceCtx.structure.getOwnerContentType()?.alias ?? '';
  const data = workspaceCtx.getData?.();
  const nodeId = data?.unique ?? '';

  const culture: string | null =
    workspaceCtx.getVariesByCulture() === true
      ? (workspaceCtx.splitView.getActiveVariants()[0]?.culture ?? null)
      : null;

  const properties: Record<string, unknown> = {};
  const rawValues: unknown = data?.values;
  if (Array.isArray(rawValues)) {
    for (const v of rawValues as unknown[]) {
      if (!isDraftValue(v)) continue;
      if (stringField(v, 'segment') !== null) continue;
      const valueCulture = stringField(v, 'culture');
      if (valueCulture !== null && valueCulture !== culture) continue;
      properties[v.alias] = v.value;
    }
  }

  let cultureNotCreated = false;
  if (culture !== null) {
    const variants: unknown = data?.variants;
    const variant = Array.isArray(variants) ? (variants as unknown[]).find(isVariantFor(culture)) : undefined;
    const state = variant?.state;
    cultureNotCreated = variant === undefined || typeof state !== 'string' || state === NOT_CREATED_STATE;
  }

  return { nodeId, documentTypeAlias, culture, cultureNotCreated, properties };
}
