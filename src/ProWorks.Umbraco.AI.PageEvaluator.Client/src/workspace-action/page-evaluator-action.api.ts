import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { umbOpenModal } from '@umbraco-cms/backoffice/modal';
import { EVALUATION_MODAL } from '../evaluation-modal/evaluation-modal.token.js';

/** Variant state value meaning "this language version doesn't exist yet". */
const NOT_CREATED_STATE = 'NotCreated';

interface DraftValue {
  readonly alias: string;
  readonly value: unknown;
  readonly culture: string | null;
  readonly segment: string | null;
}

function isDraftValue(value: unknown): value is DraftValue {
  return typeof value === 'object' && value !== null && 'alias' in value && typeof value.alias === 'string';
}

function cultureOf(value: object, key: 'culture' | 'segment'): string | null {
  const raw: unknown = (value as Record<string, unknown>)[key];
  return typeof raw === 'string' ? raw : null;
}

/**
 * Api class for the "Evaluate Page" workspace action.
 * Visibility is controlled by PageEvaluatorActiveConfigCondition — this class
 * only runs execute() when the condition has already confirmed a config exists.
 *
 * Language awareness (FR-018, research R5/R12.1): the culture being viewed is the first active
 * split-view variant (the left pane — the same rule core uses for the workspace name). It's captured
 * once, when the modal opens. Only that culture's values and invariant values are sent; segmented
 * values are skipped (the evaluator uses the default segment).
 *
 * umbOpenModal is used (not modalManagerCtx.open) so the modal host chain is
 * threaded through, allowing evaluation-modal.element to consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT).
 */
export class PageEvaluatorWorkspaceActionApi extends UmbWorkspaceActionBase {
  override async execute(): Promise<void> {
    const workspaceCtx = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
    if (!workspaceCtx) return;

    const alias = workspaceCtx.structure.getOwnerContentType()?.alias ?? '';
    const data = workspaceCtx.getData?.();
    const nodeId: string = data?.unique ?? '';

    const culture: string | null =
      workspaceCtx.getVariesByCulture() === true
        ? (workspaceCtx.splitView.getActiveVariants()[0]?.culture ?? null)
        : null;

    const properties: Record<string, unknown> = {};
    const rawValues: unknown = data?.values;
    if (Array.isArray(rawValues)) {
      for (const v of rawValues as unknown[]) {
        if (!isDraftValue(v)) continue;
        const valueCulture = cultureOf(v, 'culture');
        if (cultureOf(v, 'segment') !== null) continue;
        if (valueCulture !== null && valueCulture !== culture) continue;
        properties[v.alias] = v.value;
      }
    }

    // A culture that the editor has not created yet (no variant entry, or state null / NotCreated) has
    // nothing to evaluate; the modal shows a message instead of calling the API.
    let cultureNotCreated = false;
    if (culture !== null) {
      const variants: unknown = data?.variants;
      const variant = Array.isArray(variants)
        ? (variants as unknown[]).find(
            (x): x is { culture: string | null; state?: unknown } =>
              typeof x === 'object' && x !== null && 'culture' in x && x.culture === culture,
          )
        : undefined;
      const state = variant?.state;
      cultureNotCreated = variant === undefined || typeof state !== 'string' || state === NOT_CREATED_STATE;
    }

    try {
      await umbOpenModal(this, EVALUATION_MODAL, {
        data: { nodeId, documentTypeAlias: alias, culture, cultureNotCreated, properties },
      });
    } catch {
      // Modal was rejected/closed — nothing to do.
    }
  }
}

export { PageEvaluatorWorkspaceActionApi as api };
export default PageEvaluatorWorkspaceActionApi;
