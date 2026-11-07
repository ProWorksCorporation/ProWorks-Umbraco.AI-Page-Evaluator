import { UmbWorkspaceActionBase } from '@umbraco-cms/backoffice/workspace';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { umbOpenModal } from '@umbraco-cms/backoffice/modal';
import { EVALUATION_MODAL } from '../evaluation-modal/evaluation-modal.token.js';
import { captureDocumentDraft } from '../shared/capture-draft.js';

/**
 * Api class for the "Evaluate Page" workspace action.
 * Visibility is controlled by PageEvaluatorActiveConfigCondition — this class
 * only runs execute() when the condition has already confirmed a config exists.
 *
 * Language awareness (FR-018, research R5/R12.1): the open document is captured once, when the modal
 * opens, by `captureDocumentDraft` (shared with the Copilot evaluate tool, 006 FR-001): the viewed culture
 * is the first active split-view variant, and only that culture's values and invariant values are sent.
 *
 * umbOpenModal is used (not modalManagerCtx.open) so the modal host chain is
 * threaded through, allowing evaluation-modal.element to consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT).
 */
export class PageEvaluatorWorkspaceActionApi extends UmbWorkspaceActionBase {
  override async execute(): Promise<void> {
    const workspaceCtx = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
    if (!workspaceCtx) return;

    try {
      await umbOpenModal(this, EVALUATION_MODAL, { data: captureDocumentDraft(workspaceCtx) });
    } catch {
      // Modal was rejected/closed — nothing to do.
    }
  }
}

export { PageEvaluatorWorkspaceActionApi as api };
export default PageEvaluatorWorkspaceActionApi;
