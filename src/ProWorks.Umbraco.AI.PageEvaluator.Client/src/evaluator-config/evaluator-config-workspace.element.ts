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
      this._error = this.localize.term('evaluatorConfig_loadError');
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
      this._error = this.localize.term('evaluatorConfig_activateError');
    }
  }

  private async _handleDelete(id: string): Promise<void> {
    try {
      await umbConfirmModal(this, {
        headline: this.localize.term('evaluatorConfig_deleteConfirmHeadline'),
        content: this.localize.term('evaluatorConfig_deleteConfirmContent'),
        color: 'danger',
        confirmLabel: this.localize.term('evaluatorConfig_deleteButton'),
      });
    } catch {
      // User cancelled the modal
      return;
    }
    try {
      await deleteConfiguration(id);
      this._configs = this._configs.filter((c) => c.id !== id);
    } catch {
      this._error = this.localize.term('evaluatorConfig_deleteError');
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
            <h3>${this._editId ? this.localize.term('evaluatorConfig_editHeadline') : this.localize.term('evaluatorConfig_createHeadline')}</h3>
            <uui-button
              look="secondary"
              label=${this.localize.term('evaluatorConfig_backLabel')}
              @click=${() => this._handleBack()}>
              &larr; ${this.localize.term('evaluatorConfig_backButton')}
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
          <h2>${this.localize.term('evaluatorConfig_listHeadline')}</h2>
          <uui-button
            look="primary"
            label=${this.localize.term('evaluatorConfig_createButton')}
            @click=${() => this._handleCreate()}>
            ${this.localize.term('evaluatorConfig_createButton')}
          </uui-button>
        </div>

        ${this._error ? html`<uui-tag color="danger">${this._error}</uui-tag>` : nothing}

        ${groups.size === 0
          ? html`<p>${this.localize.term('evaluatorConfig_emptyState')}</p>`
          : Array.from(groups.entries()).map(
              ([alias, items]) => html`
                <uui-box headline=${items[0]?.documentTypeName ?? alias}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>${this.localize.term('evaluatorConfig_tableHeaderName')}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term('evaluatorConfig_tableHeaderProfile')}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term('evaluatorConfig_tableHeaderStatus')}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term('evaluatorConfig_tableHeaderActions')}</uui-table-head-cell>
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
                              ? html`<uui-tag color="positive" look="primary">${this.localize.term('evaluatorConfig_activeLabel')}</uui-tag>`
                              : html`<uui-tag look="secondary">${this.localize.term('evaluatorConfig_inactiveLabel')}</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            ${!config.isActive
                              ? html`<uui-button
                                  look="secondary"
                                  label=${this.localize.term('evaluatorConfig_activateButton')}
                                  @click=${() => this._handleActivate(config.id)}>
                                  ${this.localize.term('evaluatorConfig_activateButton')}
                                </uui-button>`
                              : nothing}
                            <uui-button
                              look="secondary"
                              label=${this.localize.term('evaluatorConfig_editButton')}
                              @click=${() => this._handleEdit(config.id)}>
                              ${this.localize.term('evaluatorConfig_editButton')}
                            </uui-button>
                            <uui-button
                              look="danger"
                              label=${this.localize.term('evaluatorConfig_deleteButton')}
                              @click=${() => this._handleDelete(config.id)}>
                              ${this.localize.term('evaluatorConfig_deleteButton')}
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
