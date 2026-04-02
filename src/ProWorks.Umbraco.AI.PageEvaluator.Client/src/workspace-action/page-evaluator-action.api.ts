import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { getActiveConfiguration } from '../shared/api-client.js';
import { EVALUATION_MODAL } from '../evaluation-modal/evaluation-modal.token.js';

/**
 * Api class for the "Evaluate Page" workspace action.
 *
 * On host connected, resolves the document type alias from the workspace
 * context's structure manager and checks whether an active evaluator config
 * exists. If none is found, the action remains disabled (greyed out in the
 * document toolbar). On execute, opens the evaluation modal with the current
 * draft property values.
 */
export class PageEvaluatorWorkspaceActionApi extends UmbWorkspaceActionBase {
  override hostConnected(): void {
    super.hostConnected();
    this.disable();
    void this.#checkActiveConfig();
  }

  async #resolveDocTypeAlias(): Promise<string | undefined> {
    const workspaceCtx = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
    if (!workspaceCtx) return undefined;

    // structure.getOwnerContentType() is populated once the workspace has loaded
    // the document type — this is always the case by the time workspace actions render.
    return workspaceCtx.structure.getOwnerContentType()?.alias;
  }

  async #checkActiveConfig(): Promise<void> {
    const alias = await this.#resolveDocTypeAlias();
    if (!alias) return;

    const config = await getActiveConfiguration(alias).catch(() => null);
    if (config !== null) this.enable();
  }

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
