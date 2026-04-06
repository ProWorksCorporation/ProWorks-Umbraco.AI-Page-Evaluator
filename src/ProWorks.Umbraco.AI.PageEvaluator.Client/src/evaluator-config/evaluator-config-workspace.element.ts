import { customElement, state, html, css, nothing, type TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { umbConfirmModal } from '@umbraco-cms/backoffice/modal';
import { getConfigurations, activateConfiguration, deleteConfiguration } from '../shared/api-client.js';
import type { EvaluatorConfigItem, EvaluatorConfigListResponse } from '../shared/types.js';
import './evaluator-form.element.js';

/**
 * Workspace element for the Page Evaluator configuration list.
 *
 * Displayed in the Umbraco.AI Addons section. Fetches all EvaluatorConfigurations
 * on connect, groups them by document type, and renders each with name, description,
 * Active badge, and edit/delete actions.
 */
@customElement('evaluator-config-workspace')
export class EvaluatorConfigWorkspaceElement extends UmbLitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    #content {
      flex: 1;
      overflow-y: auto;
      padding: var(--uui-size-layout-1);
      background-color: var(--uui-color-background);
    }

    .list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--uui-size-layout-1);
    }

    .list-header h2 {
      margin: 0;
      font-size: var(--uui-type-h4-size, 1.15rem);
      font-weight: bold;
    }

    uui-box {
      margin-bottom: var(--uui-size-layout-1);
    }

    .form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--uui-size-layout-1);
    }

    .form-header h3 {
      margin: 0;
      font-size: var(--uui-type-h3-size, 1.25rem);
    }
  `;

  @state() _configs: EvaluatorConfigItem[] = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _view: 'list' | 'form' = 'list';
  @state() private _editId: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    void this._loadConfigs();
  }

  private async _loadConfigs(): Promise<void> {
    this._loading = true;
    this._error = null;
    try {
      const response: EvaluatorConfigListResponse = await getConfigurations();
      this._configs = [...response.items];
    } catch {
      this._error = 'Failed to load evaluator configurations.';
    } finally {
      this._loading = false;
    }
  }

  private _groupByDocType(): Map<string, EvaluatorConfigItem[]> {
    const groups = new Map<string, EvaluatorConfigItem[]>();
    for (const config of this._configs) {
      const group = groups.get(config.documentTypeAlias) ?? [];
      group.push(config);
      groups.set(config.documentTypeAlias, group);
    }
    for (const [key, group] of groups) {
      group.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return b.dateModified.localeCompare(a.dateModified);
      });
      groups.set(key, group);
    }
    return groups;
  }

  private async _handleActivate(id: string): Promise<void> {
    try {
      await activateConfiguration(id);
      await this._loadConfigs();
    } catch {
      this._error = 'Failed to activate the evaluator configuration.';
    }
  }

  private async _handleDelete(id: string): Promise<void> {
    try {
      await umbConfirmModal(this, {
        headline: 'Delete Configuration',
        content: 'Are you sure you want to delete this evaluator configuration?',
        color: 'danger',
        confirmLabel: 'Delete',
      });
    } catch {
      // User cancelled the modal
      return;
    }
    try {
      await deleteConfiguration(id);
      this._configs = this._configs.filter((c) => c.id !== id);
    } catch {
      this._error = 'Failed to delete the evaluator configuration.';
    }
  }

  private _handleEdit(id: string): void {
    this._editId = id;
    this._view = 'form';
  }

  private _handleCreate(): void {
    this._editId = null;
    this._view = 'form';
  }

  private _handleSaved(): void {
    this._view = 'list';
    this._editId = null;
    void this._loadConfigs();
  }

  private _handleBack(): void {
    this._view = 'list';
    this._editId = null;
  }

  override render(): TemplateResult {
    if (this._view === 'form') {
      return html`
        <div id="content">
          <div class="form-header">
            <h3>${this._editId ? 'Edit Configuration' : 'Create Configuration'}</h3>
            <uui-button
              look="secondary"
              label="Back to list"
              @click=${() => this._handleBack()}>
              &larr; Back
            </uui-button>
          </div>
          <evaluator-form
            .configId=${this._editId}
            @evaluator-saved=${() => this._handleSaved()}>
          </evaluator-form>
        </div>
      `;
    }

    if (this._loading) {
      return html`<div id="content"><uui-loader></uui-loader></div>`;
    }

    const groups = this._groupByDocType();

    return html`
      <div id="content">
        <div class="list-header">
          <h2>Page Evaluator Configurations</h2>
          <uui-button
            look="primary"
            label="Create New"
            @click=${() => this._handleCreate()}>
            Create New
          </uui-button>
        </div>

        ${this._error ? html`<uui-tag color="danger">${this._error}</uui-tag>` : nothing}

        ${groups.size === 0
          ? html`<p>No evaluator configurations found. Create one to get started.</p>`
          : Array.from(groups.entries()).map(
              ([alias, items]) => html`
                <uui-box headline=${items[0]?.documentTypeName ?? alias}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>Name</uui-table-head-cell>
                      <uui-table-head-cell>Profile</uui-table-head-cell>
                      <uui-table-head-cell>Status</uui-table-head-cell>
                      <uui-table-head-cell>Actions</uui-table-head-cell>
                    </uui-table-head>
                    ${items.map(
                      (config) => html`
                        <uui-table-row>
                          <uui-table-cell>
                            <strong>${config.name}</strong>
                            ${config.description
                              ? html`<br /><small>${config.description}</small>`
                              : nothing}
                          </uui-table-cell>
                          <uui-table-cell>${config.profileName ?? config.profileId}</uui-table-cell>
                          <uui-table-cell>
                            ${config.isActive
                              ? html`<uui-tag color="positive" look="primary">Active</uui-tag>`
                              : html`<uui-tag look="secondary">Inactive</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            ${!config.isActive
                              ? html`<uui-button
                                  look="secondary"
                                  label="Activate"
                                  @click=${() => this._handleActivate(config.id)}>
                                  Activate
                                </uui-button>`
                              : nothing}
                            <uui-button
                              look="secondary"
                              label="Edit"
                              @click=${() => this._handleEdit(config.id)}>
                              Edit
                            </uui-button>
                            <uui-button
                              look="danger"
                              label="Delete"
                              @click=${() => this._handleDelete(config.id)}>
                              Delete
                            </uui-button>
                          </uui-table-cell>
                        </uui-table-row>
                      `,
                    )}
                  </uui-table>
                </uui-box>
              `,
            )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'evaluator-config-workspace': EvaluatorConfigWorkspaceElement;
  }
}
