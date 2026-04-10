import { customElement, property, state, html, nothing, type TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { CHECKLIST_CATEGORIES } from './checklist-categories.js';
import type { DocumentTypePropertySummary } from '../shared/types.js';
import { apiClient, BEARER } from '../shared/api-client.js';

// ---------------------------------------------------------------------------
// Umbraco Management API helper (exported for MSW integration tests — T054)
// ---------------------------------------------------------------------------

interface UmbracoDocTypeProperty {
  readonly alias: string;
  readonly label: string;
  readonly groupName: string;
  readonly editorAlias: string;
}

interface UmbracoDocTypeResponse {
  readonly alias: string;
  readonly name: string;
  readonly properties: readonly UmbracoDocTypeProperty[];
}

/**
 * Fetches document type properties from the Umbraco Management API.
 * Exported so integration tests (T054) can exercise the fetch logic directly.
 */
export async function fetchDocTypeProperties(
  documentTypeAlias: string,
): Promise<DocumentTypePropertySummary[]> {
  const result = await apiClient.get({
    security: BEARER,
    url: `/umbraco/management/api/v1/page-evaluator/document-type/${encodeURIComponent(documentTypeAlias)}/properties`,
  });

  if (!result.response.ok) {
    const text = await result.response.text().catch(() => '');
    throw new Error(`API ${result.response.status}: ${text}`);
  }

  const data = result.data as UmbracoDocTypeResponse;

  return data.properties.map((p) => ({
    alias: p.alias,
    label: p.label,
    groupName: p.groupName,
    editorAlias: p.editorAlias,
  }));
}

// ---------------------------------------------------------------------------
// Prompt Builder Lit element
// ---------------------------------------------------------------------------

/**
 * Prompt Builder panel for the evaluator form.
 *
 * Usage:
 *   <page-evaluator-prompt-builder
 *     document-type-alias="blogPost">
 *   </page-evaluator-prompt-builder>
 *
 * Fires `prompt-selected` CustomEvent<{ prompt: string }> when
 * the admin clicks "Use This Prompt".
 */
@customElement('page-evaluator-prompt-builder')
export class PromptBuilderElement extends UmbLitElement {
  @property({ attribute: 'document-type-alias' }) documentTypeAlias = '';
  @property({ type: Array, attribute: false }) selectedPropertyAliases: string[] = [];

  @state() _properties: DocumentTypePropertySummary[] = [];
  @state() _selectedCategories: Set<string> = new Set(CHECKLIST_CATEGORIES.map((c) => c.id));
  @state() _siteContext = '';
  @state() _draft = '';
  @state() private _loading = false;
  @state() private _error: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // Allow tests to trigger category toggles and use-prompt via custom events
    this.addEventListener('category-toggle', (e: Event) => {
      const { id, selected } = (e as CustomEvent<{ id: string; selected: boolean }>).detail;
      this._toggleCategory(id, selected);
    });
    this.addEventListener('use-prompt', () => this.usePrompt());
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('documentTypeAlias') && this.documentTypeAlias) {
      void this._loadProperties();
    }
  }

  private async _loadProperties(): Promise<void> {
    this._loading = true;
    this._error = null;
    try {
      this._properties = await fetchDocTypeProperties(this.documentTypeAlias);
    } catch {
      this._error = this.localize.term('promptBuilder_loadError');
    } finally {
      this._loading = false;
    }
  }

  private _toggleCategory(id: string, selected: boolean): void {
    const next = new Set(this._selectedCategories);
    if (selected) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this._selectedCategories = next;
  }

  /** Assembles the prompt draft from selected categories, properties, and site context. */
  generateDraft(): void {
    const effectiveProps = this.selectedPropertyAliases.length > 0
      ? this._properties.filter((p) => this.selectedPropertyAliases.includes(p.alias))
      : this._properties;
    const aliasLine = effectiveProps.map((p) => p.alias).join(', ');

    const fragments = CHECKLIST_CATEGORIES
      .filter((c) => this._selectedCategories.has(c.id))
      .map((c) =>
        c.promptFragment
          .replace('{{propertyAliases}}', aliasLine)
          .replace('{{siteContext}}', this._siteContext),
      );

    if (fragments.length === 0) {
      this._draft =
        `Evaluate the following page.\n\nProperties: ${aliasLine}\n\nSite context: ${this._siteContext}`.trim();
      return;
    }

    this._draft = fragments.join('\n\n');
  }

  /** Fires `prompt-selected` with the current draft. */
  usePrompt(): void {
    this.dispatchEvent(
      new CustomEvent('prompt-selected', {
        detail: { prompt: this._draft },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _groupProperties(): Map<string, DocumentTypePropertySummary[]> {
    const groups = new Map<string, DocumentTypePropertySummary[]>();
    for (const prop of this._properties) {
      const list = groups.get(prop.groupName) ?? [];
      list.push(prop);
      groups.set(prop.groupName, list);
    }
    return groups;
  }

  override render(): TemplateResult | typeof nothing {
    if (this._loading) return html`<uui-loader></uui-loader>`;

    const groups = this._groupProperties();

    return html`
      <div style="display: flex; flex-direction: column; gap: 1rem;">

        ${this._error ? html`<uui-tag color="danger">${this._error}</uui-tag>` : nothing}

        <!-- Property aliases grouped by tab/group -->
        ${groups.size > 0
          ? html`
              <uui-box headline=${this.localize.term('promptBuilder_propertiesLabel')}>
                ${Array.from(groups.entries()).map(
                  ([groupName, props]) => html`
                    <h3 style="margin: 0.5rem 0 0.25rem;">${groupName}</h3>
                    <ul>
                      ${props.map(
                        (p) => html`
                          <li data-property-alias=${p.alias}>
                            <code>${p.alias}</code> — ${p.label}
                          </li>
                        `,
                      )}
                    </ul>
                  `,
                )}
              </uui-box>
            `
          : nothing}

        <!-- Category checkboxes -->
        <uui-box headline=${this.localize.term('promptBuilder_categoriesLabel')}>
          <p style="margin: 0 0 var(--uui-size-space-3) 0; font-size: var(--uui-type-small-size, 0.85rem); color: var(--uui-color-text-alt);">
            ${this.localize.term('promptBuilder_categoriesHelpText')}
          </p>
          <div style="display: flex; flex-direction: column; gap: var(--uui-size-space-3); padding: var(--uui-size-space-3) 0;">
            ${CHECKLIST_CATEGORIES.map(
              (cat) => html`
                <uui-checkbox
                  label=${cat.label}
                  ?checked=${this._selectedCategories.has(cat.id)}
                  @change=${(e: Event) => {
                    this._toggleCategory(cat.id, (e.target as HTMLInputElement).checked);
                  }}>${cat.label}</uui-checkbox>
              `,
            )}
          </div>
        </uui-box>

        <!-- Site context -->
        <uui-form-layout-item>
          <uui-label for="site-context">${this.localize.term('promptBuilder_siteContextLabel')}</uui-label>
          <uui-textarea
            id="site-context"
            label=${this.localize.term('promptBuilder_siteContextLabel')}
            placeholder="Describe the site purpose, audience, or brand guidelines…"
            .value=${this._siteContext}
            @input=${(e: InputEvent) => {
              this._siteContext = (e.target as HTMLTextAreaElement).value;
            }}>
          </uui-textarea>
        </uui-form-layout-item>

        <!-- Actions -->
        <div style="display: flex; gap: 0.5rem;">
          <uui-button
            look="secondary"
            label=${this.localize.term('promptBuilder_generateButton')}
            @click=${() => this.generateDraft()}>
            ${this.localize.term('promptBuilder_generateButton')}
          </uui-button>
        </div>

        <!-- Draft preview -->
        ${this._draft
          ? html`
              <uui-box headline=${this.localize.term('promptBuilder_generatedDraftLabel')}>
                <pre data-draft style="white-space: pre-wrap;">${this._draft}</pre>
                <uui-button
                  slot="header-actions"
                  look="primary"
                  label=${this.localize.term('promptBuilder_usePromptButton')}
                  @click=${() => this.usePrompt()}>
                  ${this.localize.term('promptBuilder_usePromptButton')}
                </uui-button>
              </uui-box>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-prompt-builder': PromptBuilderElement;
  }
}
