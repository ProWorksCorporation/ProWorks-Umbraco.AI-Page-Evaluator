import { customElement, property, state, html, nothing, type TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { CHECKLIST_CATEGORIES } from './checklist-categories.js';
import type { DocumentTypePropertySummary } from '../shared/types.js';
import { fetchDocTypeProperties } from '../shared/api-client.js';

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
  @property({ type: Boolean }) scoringEnabled = false;

  @state() _properties: DocumentTypePropertySummary[] = [];
  @state() _selectedCategories: Set<string> = new Set(CHECKLIST_CATEGORIES.map((c) => c.id));
  @state() _siteContext = '';
  @state() _draft = '';
  @state() private _loading = false;
  @state() private _error: string | null = null;

  private readonly _onCategoryToggle = (e: Event): void => {
    const { id, selected } = (e as CustomEvent<{ id: string; selected: boolean }>).detail;
    this._toggleCategory(id, selected);
  };

  private readonly _onUsePrompt = (): void => this.usePrompt();

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('category-toggle', this._onCategoryToggle);
    this.addEventListener('use-prompt', this._onUsePrompt);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('category-toggle', this._onCategoryToggle);
    this.removeEventListener('use-prompt', this._onUsePrompt);
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('documentTypeAlias') && this.documentTypeAlias) {
      void this._loadProperties();
    }
    if (changed.has('scoringEnabled') && this._draft) {
      this.generateDraft();
    }
  }

  private async _loadProperties(): Promise<void> {
    this._loading = true;
    this._error = null;
    try {
      this._properties = (await fetchDocTypeProperties(this.documentTypeAlias)).properties;
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

  /** Generates the full scoring section when scoringEnabled is true. */
  private _buildScoringSection(): string {
    const dims = CHECKLIST_CATEGORIES
      .filter((c) => this._selectedCategories.has(c.id) && c.scoringDimension !== undefined)
      .map((c) => c.scoringDimension!);

    if (dims.length === 0) {
      return '';
    }

    const dimensionLines = dims
      .map(
        (d, i) =>
          `### ${i + 1}. ${d.name}\n` +
          `Score 5: ${d.scoreHigh}\n` +
          `Score 3: ${d.scoreMid}\n` +
          `Score 1: ${d.scoreLow}`,
      )
      .join('\n\n');

    return (
      '\n\n## Evaluation Dimensions\n\n' +
      'Evaluate on these axes (1–5):\n\n' +
      dimensionLines +
      '\n\n## Verdict Thresholds\n\n' +
      'ACCEPT: ≥4.2 overallScore, no individual axis below 3\n' +
      'REVISE: 3.0–4.1 overallScore, OR any axis scored below 3\n' +
      'REJECT: <3.0 overallScore, OR two or more axes scored 1\n\n' +
      '## Scoring Instructions\n\n' +
      'Be surgical: identify the 3–5 highest-impact improvements. For each, point to the exact field and explain the specific fix needed.\n\n' +
      'Provide:\n' +
      '- overallScore: decimal average of your axis scores (1–5)\n' +
      '- axisScores: integer score (1–5) per dimension above, with one-sentence feedback'
    );
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

    const scoringSnippet = this.scoringEnabled ? this._buildScoringSection() : '';

    if (fragments.length === 0) {
      this._draft =
        (`Evaluate the following page.\n\nProperties: ${aliasLine}\n\nSite context: ${this._siteContext}` + scoringSnippet).trim();
      return;
    }

    this._draft = fragments.join('\n\n') + scoringSnippet;
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

  override render(): TemplateResult | typeof nothing {
    if (this._loading) return html`<uui-loader></uui-loader>`;

    return html`
      <div style="display: flex; flex-direction: column; gap: 1rem;">

        ${this._error ? html`<uui-tag color="danger">${this._error}</uui-tag>` : nothing}

        <!-- Category checkboxes -->
        <uui-box headline=${this.localize.term('promptBuilder_categoriesLabel')}>
          <p style="margin: 0 0 var(--uui-size-space-3) 0; font-size: var(--uui-type-small-size, 0.85rem); color: var(--uui-color-text-alt);">
            ${this.localize.term('promptBuilder_categoriesHelpText')}
          </p>
          <div style="display: flex; flex-direction: column; gap: var(--uui-size-space-3); padding: var(--uui-size-space-3) 0;">
            ${CHECKLIST_CATEGORIES.map(
              (cat) => html`
                <uui-checkbox
                  label=${this.localize.term(cat.labelKey)}
                  ?checked=${this._selectedCategories.has(cat.id)}
                  @change=${(e: Event) => {
                    this._toggleCategory(cat.id, (e.target as HTMLInputElement).checked);
                  }}>${this.localize.term(cat.labelKey)}</uui-checkbox>
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
            placeholder=${this.localize.term('promptBuilder_siteContextPlaceholder')}
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
                <uui-button
                  slot="header-actions"
                  look="primary"
                  label=${this.localize.term('promptBuilder_usePromptButton')}
                  @click=${() => this.usePrompt()}>
                  ${this.localize.term('promptBuilder_usePromptButton')}
                </uui-button>
                <pre data-draft style="white-space: pre-wrap;">${this._draft}</pre>
                <uui-button
                  look="primary"
                  label=${this.localize.term('promptBuilder_usePromptButton')}
                  @click=${() => this.usePrompt()}
                  style="margin-top: var(--uui-size-space-3);">
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
