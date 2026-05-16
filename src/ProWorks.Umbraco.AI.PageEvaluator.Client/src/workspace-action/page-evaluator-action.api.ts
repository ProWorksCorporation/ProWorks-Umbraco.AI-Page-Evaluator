import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { umbOpenModal } from '@umbraco-cms/backoffice/modal';
import { EVALUATION_MODAL } from '../evaluation-modal/evaluation-modal.token.js';

/**
 * Api class for the "Evaluate Page" workspace action.
 * Visibility is controlled by PageEvaluatorActiveConfigCondition — this class
 * only runs execute() when the condition has already confirmed a config exists.
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

    const properties: Record<string, unknown> = {};
    const rawValues = data?.values;
    if (Array.isArray(rawValues)) {
      for (const v of rawValues) {
        if (typeof v === 'object' && v !== null && 'alias' in v) {
          const entry = v as { alias: string; value: unknown };
          properties[entry.alias] = entry.value;
        }
      }
    }

    try {
      await umbOpenModal(this, EVALUATION_MODAL, {
        data: { nodeId, documentTypeAlias: alias, properties },
      });
    } catch {
      // Modal was rejected/closed — nothing to do.
    }
  }
}

export { PageEvaluatorWorkspaceActionApi as api };
export default PageEvaluatorWorkspaceActionApi;
