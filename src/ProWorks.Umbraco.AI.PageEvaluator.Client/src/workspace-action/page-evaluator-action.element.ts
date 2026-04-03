import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { UMB_MODAL_MANAGER_CONTEXT } from '@umbraco-cms/backoffice/modal';
import { customElement, state, html, nothing, type TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { getActiveConfiguration } from '../shared/api-client.js';
import { EVALUATION_MODAL } from '../evaluation-modal/evaluation-modal.token.js';

/**
 * Workspace action element: "Evaluate Page" button shown in the Document workspace.
 *
 * Two concerns are kept strictly separate:
 *
 * (a) VISIBILITY — In `connectedCallback`, consumes UMB_DOCUMENT_WORKSPACE_CONTEXT to
 *     get the document type unique id, then calls GET /configurations/active/{alias}.
 *     Sets `_hasConfig = false` (hides button) on 404. Never opens the modal here.
 *
 * (b) CLICK HANDLER — `handleAction()` consumes UMB_DOCUMENT_WORKSPACE_CONTEXT to
 *     call getData() for the current draft values, then opens the evaluation modal via
 *     UMB_MODAL_MANAGER_CONTEXT passing nodeId, documentTypeAlias, and properties.
 */
@customElement('page-evaluator-action')
export class PageEvaluatorActionElement extends UmbLitElement {
  @state() _hasConfig = false;
  @state() private _documentTypeAlias = '';

  override connectedCallback(): void {
    super.connectedCallback();
    void this._checkActiveConfig();
  }

  private async _checkActiveConfig(): Promise<void> {
    const workspaceCtx = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
    if (!workspaceCtx) return;

    const documentTypeAlias: string = workspaceCtx.structure.getOwnerContentType()?.alias ?? '';
    this._documentTypeAlias = documentTypeAlias;

    if (!documentTypeAlias) {
      this._hasConfig = false;
      return;
    }

    const config = await getActiveConfiguration(documentTypeAlias).catch(() => null);
    this._hasConfig = config !== null;
  }

  async handleAction(): Promise<void> {
    if (!this._hasConfig) return;

    const workspaceCtx = await this.getContext(UMB_DOCUMENT_WORKSPACE_CONTEXT);
    if (!workspaceCtx) return;

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
      data: {
        nodeId,
        documentTypeAlias: this._documentTypeAlias,
        properties,
      },
    });
  }

  override render(): TemplateResult | typeof nothing {
    if (!this._hasConfig) return nothing;

    return html`
      <uui-button
        look="secondary"
        label="Evaluate Page"
        @click="${() => this.handleAction()}">
        Evaluate Page
      </uui-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-action': PageEvaluatorActionElement;
  }
}
