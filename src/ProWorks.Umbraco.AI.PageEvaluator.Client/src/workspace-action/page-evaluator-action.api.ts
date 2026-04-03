import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { EVALUATION_MODAL } from '../evaluation-modal/evaluation-modal.token.js';

/**
 * Api class for the "Evaluate Page" workspace action.
 * Visibility is controlled by PageEvaluatorActiveConfigCondition — this class
 * only runs execute() when the condition has already confirmed a config exists.
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

    const modalManagerCtx = await this.getContext(UMB_MODAL_MANAGER_CONTEXT);
    if (!modalManagerCtx) return;

    modalManagerCtx.open(this, EVALUATION_MODAL, {
      data: { nodeId, documentTypeAlias: alias, properties },
    });
  }
}

// Named export consumed by the extension loader ('api' key is the convention)
export { PageEvaluatorWorkspaceActionApi as api };
export default PageEvaluatorWorkspaceActionApi;
