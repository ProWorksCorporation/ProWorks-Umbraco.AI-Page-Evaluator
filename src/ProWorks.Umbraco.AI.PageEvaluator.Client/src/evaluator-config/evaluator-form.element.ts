import { customElement, state, property, html, css, nothing, type PropertyValues, type TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import {
  apiClient,
  createConfiguration,
  getConfiguration,
  updateConfiguration,
} from '../shared/api-client.js';

const BEARER = [{ scheme: 'bearer', type: 'http' }] as const;
import type { EvaluatorConfigItem } from '../shared/types.js';
import '../prompt-builder/prompt-builder.element.js';

/**
 * Form element for creating or editing an EvaluatorConfiguration.
 *
 * Used in the Page Evaluator config workspace. When `configId` is set the
 * form is in edit mode and calls `PUT /configurations/{id}` on submit; otherwise
 * it calls `POST /configurations`.
 *
 * Fires `evaluator-saved` custom event with the saved config on success.
 */
@customElement('evaluator-form')
export class EvaluatorFormElement extends UmbLitElement {
  /** Set to edit an existing config; leave null/undefined to create. */
  @property({ type: String, attribute: 'config-id' })
  configId: string | null = null;

  // Form field state
  @state() _name = '';
  @state() _description = '';
  @state() _documentTypeAlias = '';
  @state() _profileId = '';
  @state() _contextId = '';
  @state() _promptText = '';

  // Validation errors keyed by field name
  @state() _errors: Record<string, string> = {};

  @state() private _saving = false;
  @state() private _promptBuilderOpen = false;

  // Document type picker state
  @state() private _docTypeDisplayName = '';
  @state() private _docTypeSuggestions: Array<{ id: string; name: string }> = [];
  @state() private _docTypeShowSuggestions = false;
  private _docTypeSearchTimer: ReturnType<typeof setTimeout> | null = null;

  static override styles = css`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: 0 var(--uui-size-space-5);
      margin-top: var(--uui-size-layout-1);
    }

    uui-input,
    uui-textarea,
    uai-profile-picker,
    uai-context-picker {
      width: 100%;
    }

    .doc-type-picker {
      position: relative;
      width: 100%;
    }

    .doc-type-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 100;
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-shadow: var(--uui-shadow-depth-3, 0 4px 12px rgba(0,0,0,0.15));
      max-height: 240px;
      overflow-y: auto;
    }

    .doc-type-suggestion {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .doc-type-suggestion:hover,
    .doc-type-suggestion:focus {
      background: var(--uui-color-surface-emphasis);
    }

    .doc-type-suggestion-alias {
      font-size: 0.8em;
      color: var(--uui-color-text-alt);
      font-family: monospace;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      padding: var(--uui-size-space-4) 0 var(--uui-size-space-2);
    }
  `;

  override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (changed.has('configId')) {
      if (this.configId) {
        void this._loadConfig(this.configId);
      } else {
        this._resetFields();
      }
    }
  }

  private _resetFields(): void {
    this._name = '';
    this._description = '';
    this._documentTypeAlias = '';
    this._docTypeDisplayName = '';
    this._docTypeSuggestions = [];
    this._docTypeShowSuggestions = false;
    this._profileId = '';
    this._contextId = '';
    this._promptText = '';
    this._errors = {};
    this._promptBuilderOpen = false;
  }

  private async _loadConfig(id: string): Promise<void> {
    const config: EvaluatorConfigItem = await getConfiguration(id);
    this._name = config.name;
    this._description = config.description ?? '';
    this._documentTypeAlias = config.documentTypeAlias;
    this._profileId = config.profileId;
    this._contextId = config.contextId ?? '';
    this._promptText = config.promptText;
    this._errors = {};
    // Resolve display name for the alias
    void this._resolveDocTypeName(config.documentTypeAlias);
  }

  private async _resolveDocTypeName(alias: string): Promise<void> {
    try {
      const result = await apiClient.get({
        security: BEARER,
        url: `/umbraco/management/api/v1/page-evaluator/document-type/${encodeURIComponent(alias)}/properties`,
      });
      if (result.response.ok && result.data) {
        const detail = result.data as { name: string };
        this._docTypeDisplayName = detail.name;
      } else {
        this._docTypeDisplayName = alias;
      }
    } catch {
      this._docTypeDisplayName = alias;
    }
  }

  private _onDocTypeInput(e: InputEvent): void {
    const query = (e.target as HTMLInputElement).value;
    this._docTypeDisplayName = query;
    this._documentTypeAlias = '';
    if (this._docTypeSearchTimer) clearTimeout(this._docTypeSearchTimer);
    if (query.trim().length === 0) {
      this._docTypeSuggestions = [];
      this._docTypeShowSuggestions = false;
      return;
    }
    this._docTypeSearchTimer = setTimeout(() => void this._searchDocTypes(query), 250);
  }

  private async _searchDocTypes(query: string): Promise<void> {
    try {
      const result = await apiClient.get({
        security: BEARER,
        url: '/umbraco/management/api/v1/item/document-type/search',
        query: { query, isElement: false, skip: 0, take: 20 },
      });
      if (result.response.ok && result.data) {
        const data = result.data as { items: Array<{ id: string; name: string }> };
        this._docTypeSuggestions = data.items;
        this._docTypeShowSuggestions = data.items.length > 0;
      }
    } catch {
      // Silently ignore — suggestions are a convenience, not critical
    }
  }

  private async _selectDocType(id: string, name: string): Promise<void> {
    this._docTypeShowSuggestions = false;
    this._docTypeSuggestions = [];
    this._docTypeDisplayName = name;
    try {
      const result = await apiClient.get({
        security: BEARER,
        url: `/umbraco/management/api/v1/document-type/${encodeURIComponent(id)}`,
      });
      if (result.response.ok && result.data) {
        const detail = result.data as { alias: string; name: string };
        this._documentTypeAlias = detail.alias;
        this._docTypeDisplayName = detail.name;
      }
    } catch {
      this._errors = { ...this._errors, documentTypeAlias: 'Could not retrieve alias for the selected document type.' };
    }
  }

  /**
   * Validates and submits the form. Called by tests and by the submit button.
   */
  async submit(): Promise<void> {
    this._errors = {};

    // Client-side validation
    if (!this._name.trim()) this._errors['name'] = 'Name is required.';
    if (!this._documentTypeAlias.trim()) this._errors['documentTypeAlias'] = 'Document type is required.';
    if (!this._profileId.trim()) this._errors['profileId'] = 'AI Profile is required.';
    if (!this._promptText.trim()) this._errors['promptText'] = 'Prompt text is required.';

    if (Object.keys(this._errors).length > 0) return;

    this._saving = true;
    try {
      const payload = {
        name: this._name,
        description: this._description || null,
        documentTypeAlias: this._documentTypeAlias,
        profileId: this._profileId,
        contextId: this._contextId || null,
        promptText: this._promptText,
      };

      const saved: EvaluatorConfigItem = this.configId
        ? await updateConfiguration(this.configId, payload)
        : await createConfiguration(payload);

      this.dispatchEvent(
        new CustomEvent('evaluator-saved', {
          detail: saved,
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        this._errors['_form'] = err.message;
      }
    } finally {
      this._saving = false;
    }
  }

  override render(): TemplateResult {
    return html`
      ${this._errors['_form']
        ? html`<uui-box><uui-tag color="danger">${this._errors['_form']}</uui-tag></uui-box>`
        : nothing}

      <uui-box headline="General">
        <umb-property-layout label="Name" mandatory>
          <div slot="editor">
            <uui-input
              label="Name"
              .value=${this._name}
              ?invalid=${!!this._errors['name']}
              @input=${(e: InputEvent) => { this._name = (e.target as HTMLInputElement).value; }}>
            </uui-input>
            ${this._errors['name'] ? html`<uui-form-validation-message>${this._errors['name']}</uui-form-validation-message>` : nothing}
          </div>
        </umb-property-layout>

        <umb-property-layout label="Description" description="Optional summary shown in the configuration list.">
          <div slot="editor">
            <uui-textarea
              label="Description"
              .value=${this._description}
              @input=${(e: InputEvent) => { this._description = (e.target as HTMLTextAreaElement).value; }}>
            </uui-textarea>
          </div>
        </umb-property-layout>

        <umb-property-layout label="Document Type" mandatory
          description="The document type this evaluator configuration applies to.">
          <div slot="editor">
            <div class="doc-type-picker">
              <uui-input
                label="Document type"
                placeholder="Search by name…"
                .value=${this._docTypeDisplayName}
                ?invalid=${!!this._errors['documentTypeAlias']}
                @input=${(e: InputEvent) => this._onDocTypeInput(e)}
                @focus=${() => { if (this._docTypeSuggestions.length > 0) this._docTypeShowSuggestions = true; }}
                @blur=${() => { setTimeout(() => { this._docTypeShowSuggestions = false; }, 150); }}>
              </uui-input>
              ${this._documentTypeAlias ? html`
                <div style="font-size:0.8em; color:var(--uui-color-text-alt); margin-top:4px;">
                  Alias: <code>${this._documentTypeAlias}</code>
                </div>
              ` : nothing}
              ${this._docTypeShowSuggestions ? html`
                <div class="doc-type-suggestions">
                  ${this._docTypeSuggestions.map(s => html`
                    <div class="doc-type-suggestion"
                      @mousedown=${() => void this._selectDocType(s.id, s.name)}>
                      <span>${s.name}</span>
                    </div>
                  `)}
                </div>
              ` : nothing}
            </div>
            ${this._errors['documentTypeAlias'] ? html`<uui-form-validation-message>${this._errors['documentTypeAlias']}</uui-form-validation-message>` : nothing}
          </div>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="AI Settings">
        <umb-property-layout label="AI Profile" mandatory
          description="The Umbraco.AI chat profile used when evaluating pages.">
          <div slot="editor">
            <uai-profile-picker
              capability="Chat"
              .value=${this._profileId}
              @change=${(e: Event) => { this._profileId = (e.target as HTMLInputElement).value as string; }}>
            </uai-profile-picker>
            ${this._errors['profileId'] ? html`<uui-form-validation-message>${this._errors['profileId']}</uui-form-validation-message>` : nothing}
          </div>
        </umb-property-layout>

        <umb-property-layout label="AI Context"
          description="Optional Umbraco.AI context to inject alongside the prompt.">
          <div slot="editor">
            <uai-context-picker
              .value=${this._contextId}
              @change=${(e: Event) => { this._contextId = (e.target as HTMLInputElement).value as string ?? ''; }}>
            </uai-context-picker>
          </div>
        </umb-property-layout>
      </uui-box>

      <uui-box headline="Prompt">
        <umb-property-layout label="Evaluation Prompt" mandatory
          description="The prompt sent to the AI to evaluate page content.">
          <div slot="editor">
            ${this._documentTypeAlias ? html`
              <uui-button
                look="secondary"
                label="Open Prompt Builder"
                style="margin-bottom: var(--uui-size-space-3);"
                aria-expanded=${this._promptBuilderOpen ? 'true' : 'false'}
                @click=${() => { this._promptBuilderOpen = !this._promptBuilderOpen; }}>
                Open Prompt Builder
              </uui-button>
            ` : nothing}
            ${this._promptBuilderOpen && this._documentTypeAlias
              ? html`
                  <page-evaluator-prompt-builder
                    document-type-alias=${this._documentTypeAlias}
                    style="display: block; margin-bottom: var(--uui-size-space-3);"
                    @prompt-selected=${(e: CustomEvent<{ prompt: string }>) => {
                      this._promptText = e.detail.prompt;
                      this._promptBuilderOpen = false;
                    }}>
                  </page-evaluator-prompt-builder>
                `
              : nothing}
            <uui-textarea
              label="Evaluation prompt"
              .value=${this._promptText}
              rows="8"
              ?invalid=${!!this._errors['promptText']}
              @input=${(e: InputEvent) => { this._promptText = (e.target as HTMLTextAreaElement).value; }}>
            </uui-textarea>
            ${this._errors['promptText'] ? html`<uui-form-validation-message>${this._errors['promptText']}</uui-form-validation-message>` : nothing}
          </div>
        </umb-property-layout>
      </uui-box>

      ${Object.keys(this._errors).length > 0 ? html`
        <uui-box style="margin-top: var(--uui-size-layout-1); --uui-box-default-padding: var(--uui-size-space-4);">
          <uui-tag color="danger" style="display:block; margin-bottom: var(--uui-size-space-2);">
            Please fix the following before saving:
          </uui-tag>
          <ul style="margin:0; padding-left: 1.25rem;">
            ${Object.entries(this._errors).map(([, msg]) => html`<li>${msg}</li>`)}
          </ul>
        </uui-box>
      ` : nothing}

      <div class="form-actions">
        <uui-button
          look="primary"
          color="positive"
          label="Save"
          ?disabled=${this._saving}
          @click=${() => void this.submit()}>
          ${this._saving ? 'Saving…' : 'Save'}
        </uui-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'evaluator-form': EvaluatorFormElement;
  }
}
