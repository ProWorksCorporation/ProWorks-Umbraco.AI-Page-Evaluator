import { property as m, state as a, customElement as f, html as o, nothing as n, css as x } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as v } from "@umbraco-cms/backoffice/lit-element";
import { f as b, c as $, h as g, B as y, u as T, i as C } from "./entry-point-DyelNDtU.js";
const _ = [
  {
    id: "required-fields",
    labelKey: "promptBuilder_categoryRequiredFields",
    promptFragment: "Verify that all required fields are populated. The document type has the following properties: {{propertyAliases}}. Check each one and report any that are empty or missing. Site context: {{siteContext}}"
  },
  {
    id: "metadata-seo",
    labelKey: "promptBuilder_categoryMetadataSeo",
    promptFragment: "Evaluate the SEO metadata for this page. Check the following property aliases for SEO-relevant content: {{propertyAliases}}. Verify meta description length (max 160 chars), browser title length (max 60 chars), and Open Graph tags if present. Site context: {{siteContext}}"
  },
  {
    id: "content-quality",
    labelKey: "promptBuilder_categoryContentQuality",
    promptFragment: "Assess the content quality of this page. The page properties are: {{propertyAliases}}. Check for spelling/grammar issues, appropriate reading level, sufficient content length, and clear headings structure. Site context: {{siteContext}}"
  },
  {
    id: "schema-structured-data",
    labelKey: "promptBuilder_categorySchemaStructuredData",
    promptFragment: "Evaluate schema markup and structured data opportunities for this page. Review properties: {{propertyAliases}}. Identify which fields map to schema.org types and whether structured data is present or recommended. Site context: {{siteContext}}"
  },
  {
    id: "accessibility-visibility",
    labelKey: "promptBuilder_categoryAccessibilityVisibility",
    promptFragment: "Review this page for accessibility and discoverability. Properties to evaluate: {{propertyAliases}}. Check for descriptive image alt text, meaningful link labels, logical heading hierarchy, and robots/sitemap inclusion. Site context: {{siteContext}}"
  },
  {
    id: "calls-to-action",
    labelKey: "promptBuilder_categoryCallsToAction",
    promptFragment: "Evaluate the calls to action on this page. Review the following properties: {{propertyAliases}}. Check for clear, actionable CTAs, appropriate placement, and alignment with the page goal. Site context: {{siteContext}}"
  }
];
var z = Object.defineProperty, A = Object.getOwnPropertyDescriptor, d = (e, t, i, l) => {
  for (var r = l > 1 ? void 0 : l ? A(t, i) : t, c = e.length - 1, h; c >= 0; c--)
    (h = e[c]) && (r = (l ? h(t, i, r) : h(r)) || r);
  return l && r && z(t, i, r), r;
};
let u = class extends v {
  constructor() {
    super(...arguments), this.documentTypeAlias = "", this.selectedPropertyAliases = [], this.scoringEnabled = !1, this._properties = [], this._selectedCategories = new Set(_.map((e) => e.id)), this._siteContext = "", this._draft = "", this._loading = !1, this._error = null, this._onCategoryToggle = (e) => {
      const { id: t, selected: i } = e.detail;
      this._toggleCategory(t, i);
    }, this._onUsePrompt = () => this.usePrompt();
  }
  connectedCallback() {
    super.connectedCallback(), this.addEventListener("category-toggle", this._onCategoryToggle), this.addEventListener("use-prompt", this._onUsePrompt);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.removeEventListener("category-toggle", this._onCategoryToggle), this.removeEventListener("use-prompt", this._onUsePrompt);
  }
  updated(e) {
    e.has("documentTypeAlias") && this.documentTypeAlias && this._loadProperties(), e.has("scoringEnabled") && this._draft && this.generateDraft();
  }
  async _loadProperties() {
    this._loading = !0, this._error = null;
    try {
      this._properties = (await b(this.documentTypeAlias)).properties;
    } catch {
      this._error = this.localize.term("promptBuilder_loadError");
    } finally {
      this._loading = !1;
    }
  }
  _toggleCategory(e, t) {
    const i = new Set(this._selectedCategories);
    t ? i.add(e) : i.delete(e), this._selectedCategories = i;
  }
  /** Assembles the prompt draft from selected categories, properties, and site context. */
  generateDraft() {
    const t = (this.selectedPropertyAliases.length > 0 ? this._properties.filter((r) => this.selectedPropertyAliases.includes(r.alias)) : this._properties).map((r) => r.alias).join(", "), i = _.filter((r) => this._selectedCategories.has(r.id)).map(
      (r) => r.promptFragment.replace("{{propertyAliases}}", t).replace("{{siteContext}}", this._siteContext)
    ), l = this.scoringEnabled ? `

Rate the page on a scale of 1-5 for each evaluation dimension listed above.
Provide an overallScore (1-5) and individual axisScores with brief feedback for each.` : "";
    if (i.length === 0) {
      this._draft = (`Evaluate the following page.

Properties: ${t}

Site context: ${this._siteContext}` + l).trim();
      return;
    }
    this._draft = i.join(`

`) + l;
  }
  /** Fires `prompt-selected` with the current draft. */
  usePrompt() {
    this.dispatchEvent(
      new CustomEvent("prompt-selected", {
        detail: { prompt: this._draft },
        bubbles: !0,
        composed: !0
      })
    );
  }
  render() {
    return this._loading ? o`<uui-loader></uui-loader>` : o`
      <div style="display: flex; flex-direction: column; gap: 1rem;">

        ${this._error ? o`<uui-tag color="danger">${this._error}</uui-tag>` : n}

        <!-- Category checkboxes -->
        <uui-box headline=${this.localize.term("promptBuilder_categoriesLabel")}>
          <p style="margin: 0 0 var(--uui-size-space-3) 0; font-size: var(--uui-type-small-size, 0.85rem); color: var(--uui-color-text-alt);">
            ${this.localize.term("promptBuilder_categoriesHelpText")}
          </p>
          <div style="display: flex; flex-direction: column; gap: var(--uui-size-space-3); padding: var(--uui-size-space-3) 0;">
            ${_.map(
      (e) => o`
                <uui-checkbox
                  label=${this.localize.term(e.labelKey)}
                  ?checked=${this._selectedCategories.has(e.id)}
                  @change=${(t) => {
        this._toggleCategory(e.id, t.target.checked);
      }}>${this.localize.term(e.labelKey)}</uui-checkbox>
              `
    )}
          </div>
        </uui-box>

        <!-- Site context -->
        <uui-form-layout-item>
          <uui-label for="site-context">${this.localize.term("promptBuilder_siteContextLabel")}</uui-label>
          <uui-textarea
            id="site-context"
            label=${this.localize.term("promptBuilder_siteContextLabel")}
            placeholder=${this.localize.term("promptBuilder_siteContextPlaceholder")}
            .value=${this._siteContext}
            @input=${(e) => {
      this._siteContext = e.target.value;
    }}>
          </uui-textarea>
        </uui-form-layout-item>

        <!-- Actions -->
        <div style="display: flex; gap: 0.5rem;">
          <uui-button
            look="secondary"
            label=${this.localize.term("promptBuilder_generateButton")}
            @click=${() => this.generateDraft()}>
            ${this.localize.term("promptBuilder_generateButton")}
          </uui-button>
        </div>

        <!-- Draft preview -->
        ${this._draft ? o`
              <uui-box headline=${this.localize.term("promptBuilder_generatedDraftLabel")}>
                <pre data-draft style="white-space: pre-wrap;">${this._draft}</pre>
                <uui-button
                  slot="header-actions"
                  look="primary"
                  label=${this.localize.term("promptBuilder_usePromptButton")}
                  @click=${() => this.usePrompt()}>
                  ${this.localize.term("promptBuilder_usePromptButton")}
                </uui-button>
              </uui-box>
            ` : n}
      </div>
    `;
  }
};
d([
  m({ attribute: "document-type-alias" })
], u.prototype, "documentTypeAlias", 2);
d([
  m({ type: Array, attribute: !1 })
], u.prototype, "selectedPropertyAliases", 2);
d([
  m({ type: Boolean })
], u.prototype, "scoringEnabled", 2);
d([
  a()
], u.prototype, "_properties", 2);
d([
  a()
], u.prototype, "_selectedCategories", 2);
d([
  a()
], u.prototype, "_siteContext", 2);
d([
  a()
], u.prototype, "_draft", 2);
d([
  a()
], u.prototype, "_loading", 2);
d([
  a()
], u.prototype, "_error", 2);
u = d([
  f("page-evaluator-prompt-builder")
], u);
var E = Object.defineProperty, S = Object.getOwnPropertyDescriptor, p = (e, t, i, l) => {
  for (var r = l > 1 ? void 0 : l ? S(t, i) : t, c = e.length - 1, h; c >= 0; c--)
    (h = e[c]) && (r = (l ? h(t, i, r) : h(r)) || r);
  return l && r && E(t, i, r), r;
};
let s = class extends v {
  constructor() {
    super(...arguments), this.configId = null, this._name = "", this._description = "", this._documentTypeAlias = "", this._profileId = "", this._contextId = "", this._promptText = "", this._scoringEnabled = !1, this._recommendationsEnabled = !0, this._version = 0, this._errors = {}, this._saving = !1, this._loadError = null, this._promptBuilderOpen = !1, this._propertyAliases = [], this._availableProperties = [], this._docTypeDisplayName = "", this._docTypeSuggestions = [], this._docTypeShowSuggestions = !1, this._docTypeSearchTimer = null;
  }
  updated(e) {
    super.updated(e), e.has("configId") && (this.configId ? this._loadConfig(this.configId) : this._resetFields());
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._docTypeSearchTimer !== null && (clearTimeout(this._docTypeSearchTimer), this._docTypeSearchTimer = null);
  }
  _resetFields() {
    this._loadError = null, this._name = "", this._description = "", this._documentTypeAlias = "", this._docTypeDisplayName = "", this._docTypeSuggestions = [], this._docTypeShowSuggestions = !1, this._profileId = "", this._contextId = "", this._promptText = "", this._scoringEnabled = !1, this._recommendationsEnabled = !0, this._version = 0, this._propertyAliases = [], this._availableProperties = [], this._errors = {}, this._promptBuilderOpen = !1;
  }
  async _loadConfig(e) {
    this._loadError = null;
    try {
      const t = await $(e);
      if (!this.isConnected || this.configId !== e) return;
      this._name = t.name, this._description = t.description ?? "", this._documentTypeAlias = t.documentTypeAlias, this._profileId = t.profileId, this._contextId = t.contextId ?? "", this._promptText = t.promptText, this._scoringEnabled = t.scoringEnabled, this._recommendationsEnabled = t.recommendationsEnabled, this._version = t.version, this._propertyAliases = t.propertyAliases ?? [], this._errors = {}, this._loadDocTypeInfo(t.documentTypeAlias);
    } catch {
      if (!this.isConnected || this.configId !== e) return;
      this._loadError = this.localize.term("evaluatorConfig_formLoadError");
    }
  }
  async _loadDocTypeInfo(e) {
    this._availableProperties = [];
    try {
      const t = await b(e);
      if (!this.isConnected) return;
      this._docTypeDisplayName = t.name, this._availableProperties = t.properties, this._propertyAliases.length === 0 && t.properties.length > 0 && (this._propertyAliases = t.properties.map((i) => i.alias));
    } catch {
      if (!this.isConnected) return;
      this._docTypeDisplayName || (this._docTypeDisplayName = e);
    }
  }
  _onDocTypeInput(e) {
    const t = e.target.value;
    if (this._docTypeDisplayName = t, this._documentTypeAlias = "", this._docTypeSearchTimer && clearTimeout(this._docTypeSearchTimer), t.trim().length === 0) {
      this._docTypeSuggestions = [], this._docTypeShowSuggestions = !1;
      return;
    }
    this._docTypeSearchTimer = setTimeout(() => void this._searchDocTypes(t), 250);
  }
  async _searchDocTypes(e) {
    try {
      const t = await g.get({
        security: y,
        url: "/umbraco/management/api/v1/item/document-type/search",
        query: { query: e, isElement: !1, skip: 0, take: 20 }
      });
      if (!this.isConnected || this._docTypeDisplayName !== e) return;
      if (t.response.ok && t.data) {
        const i = t.data;
        this._docTypeSuggestions = i.items, this._docTypeShowSuggestions = i.items.length > 0;
      }
    } catch {
    }
  }
  async _selectDocType(e, t) {
    this._docTypeShowSuggestions = !1, this._docTypeSuggestions = [], this._docTypeDisplayName = t;
    try {
      const i = await g.get({
        security: y,
        url: `/umbraco/management/api/v1/document-type/${encodeURIComponent(e)}`
      });
      if (!this.isConnected) return;
      if (i.response.ok && i.data) {
        const l = i.data;
        this._documentTypeAlias = l.alias, this._propertyAliases = [], this._loadDocTypeInfo(l.alias);
      }
    } catch {
      if (!this.isConnected) return;
      this._errors = { ...this._errors, documentTypeAlias: this.localize.term("evaluatorConfig_documentTypeAliasError") };
    }
  }
  _onPropertyAliasToggle(e, t) {
    t ? this._propertyAliases = [...this._propertyAliases, e] : this._propertyAliases = this._propertyAliases.filter((i) => i !== e);
  }
  /**
   * Validates and submits the form. Called by tests and by the submit button.
   */
  async submit() {
    if (this._errors = {}, this._name.trim() || (this._errors.name = this.localize.term("evaluatorConfig_nameRequired")), this._documentTypeAlias.trim() || (this._errors.documentTypeAlias = this.localize.term("evaluatorConfig_documentTypeRequired")), this._profileId.trim() || (this._errors.profileId = this.localize.term("evaluatorConfig_profileRequired")), this._promptText.trim() || (this._errors.promptText = this.localize.term("evaluatorConfig_promptRequired")), !(Object.keys(this._errors).length > 0)) {
      this._saving = !0, this.dispatchEvent(new CustomEvent("evaluator-save-start", { bubbles: !0, composed: !0 }));
      try {
        const e = this.configId ? await T(this.configId, {
          name: this._name,
          description: this._description || null,
          documentTypeAlias: this._documentTypeAlias,
          profileId: this._profileId,
          contextId: this._contextId || null,
          promptText: this._promptText,
          propertyAliases: this._propertyAliases.length > 0 ? this._propertyAliases : null,
          scoringEnabled: this._scoringEnabled,
          recommendationsEnabled: this._recommendationsEnabled,
          version: this._version
        }) : await C({
          name: this._name,
          description: this._description || null,
          documentTypeAlias: this._documentTypeAlias,
          profileId: this._profileId,
          contextId: this._contextId || null,
          promptText: this._promptText,
          propertyAliases: this._propertyAliases.length > 0 ? this._propertyAliases : null,
          scoringEnabled: this._scoringEnabled,
          recommendationsEnabled: this._recommendationsEnabled
        });
        if (!this.isConnected) return;
        this.dispatchEvent(
          new CustomEvent("evaluator-saved", {
            detail: e,
            bubbles: !0,
            composed: !0
          })
        );
      } catch (e) {
        if (!this.isConnected) return;
        e instanceof Error && (this._errors._form = e.message);
      } finally {
        this._saving = !1, this.dispatchEvent(new CustomEvent("evaluator-save-end", { bubbles: !0, composed: !0 }));
      }
    }
  }
  _renderPropertyReference() {
    if (this._availableProperties.length === 0) return n;
    const e = /* @__PURE__ */ new Map();
    for (const i of this._availableProperties) {
      const l = e.get(i.groupName) ?? [];
      l.push(i), e.set(i.groupName, l);
    }
    const t = new Set(this._propertyAliases);
    return o`
      <div class="property-reference">
        <div class="property-reference__heading">
          ${this.localize.term("evaluatorConfig_propertyReferenceHeading")}
        </div>
        <div class="property-reference__help">
          ${this.localize.term("evaluatorConfig_propertyReferenceHelp")}
        </div>
        ${Array.from(e.entries()).map(([i, l]) => o`
          <h4 class="property-reference__group">${i}</h4>
          <ul class="property-reference__list">
            ${l.map((r) => {
      const c = !t.has(r.alias);
      return o`
                <li class="property-reference__item ${c ? "property-reference__item--excluded" : ""}"
                    title=${c ? this.localize.term("evaluatorConfig_propertyExcludedTooltip") : ""}>
                  <code>${r.alias}</code> — ${r.label}
                </li>
              `;
    })}
          </ul>
        `)}
      </div>
    `;
  }
  render() {
    return o`
      ${this._loadError ? o`<uui-tag color="danger" style="margin-bottom: 1rem;">${this._loadError}</uui-tag>` : n}
      ${this._errors._form ? o`<uui-box><uui-tag color="danger">${this._errors._form}</uui-tag></uui-box>` : n}

      <uui-box headline=${this.localize.term("evaluatorConfig_generalSection")}>
        <umb-property-layout label=${this.localize.term("evaluatorConfig_nameLabel")} mandatory>
          <div slot="editor">
            <uui-input
              label=${this.localize.term("evaluatorConfig_nameLabel")}
              .value=${this._name}
              ?invalid=${!!this._errors.name}
              @input=${(e) => {
      this._name = e.target.value;
    }}>
            </uui-input>
            ${this._errors.name ? o`<uui-form-validation-message>${this._errors.name}</uui-form-validation-message>` : n}
          </div>
        </umb-property-layout>

        <umb-property-layout label=${this.localize.term("evaluatorConfig_descriptionLabel")} description=${this.localize.term("evaluatorConfig_descriptionHelp")}>
          <div slot="editor">
            <uui-textarea
              label=${this.localize.term("evaluatorConfig_descriptionLabel")}
              .value=${this._description}
              @input=${(e) => {
      this._description = e.target.value;
    }}>
            </uui-textarea>
          </div>
        </umb-property-layout>

        <umb-property-layout label=${this.localize.term("evaluatorConfig_documentTypeLabel")} mandatory
          description=${this.localize.term("evaluatorConfig_documentTypeHelp")}>
          <div slot="editor">
            <div class="doc-type-picker">
              <uui-input
                label=${this.localize.term("evaluatorConfig_documentTypeLabel")}
                placeholder=${this.localize.term("evaluatorConfig_documentTypePlaceholder")}
                .value=${this._docTypeDisplayName}
                ?invalid=${!!this._errors.documentTypeAlias}
                @input=${(e) => this._onDocTypeInput(e)}
                @focus=${() => {
      this._docTypeSuggestions.length > 0 && (this._docTypeShowSuggestions = !0);
    }}
                @blur=${() => {
      setTimeout(() => {
        this._docTypeShowSuggestions = !1;
      }, 150);
    }}>
              </uui-input>
              ${this._documentTypeAlias ? o`
                <div style="font-size:0.8em; color:var(--uui-color-text-alt); margin-top:4px;">
                  ${this.localize.term("evaluatorConfig_documentTypeAliasPrefix")} <code>${this._documentTypeAlias}</code>
                </div>
              ` : n}
              ${this._docTypeShowSuggestions ? o`
                <div class="doc-type-suggestions">
                  ${this._docTypeSuggestions.map((e) => o`
                    <div class="doc-type-suggestion"
                      @mousedown=${() => void this._selectDocType(e.id, e.name)}>
                      <span>${e.name}</span>
                      ${e.alias ? o`<span class="doc-type-suggestion-alias">${e.alias}</span>` : n}
                    </div>
                  `)}
                </div>
              ` : n}
            </div>
            ${this._errors.documentTypeAlias ? o`<uui-form-validation-message>${this._errors.documentTypeAlias}</uui-form-validation-message>` : n}
          </div>
        </umb-property-layout>
      </uui-box>

      <uui-box headline=${this.localize.term("evaluatorConfig_aiSettingsSection")}>
        <umb-property-layout label=${this.localize.term("evaluatorConfig_profileLabel")} mandatory
          description=${this.localize.term("evaluatorConfig_profileHelp")}>
          <div slot="editor">
            <uai-profile-picker
              capability="Chat"
              .value=${this._profileId}
              @change=${(e) => {
      this._profileId = e.target.value;
    }}>
            </uai-profile-picker>
            ${this._errors.profileId ? o`<uui-form-validation-message>${this._errors.profileId}</uui-form-validation-message>` : n}
          </div>
        </umb-property-layout>

        <umb-property-layout label=${this.localize.term("evaluatorConfig_contextLabel")}
          description=${this.localize.term("evaluatorConfig_contextHelp")}>
          <div slot="editor">
            <uai-context-picker
              .value=${this._contextId}
              @change=${(e) => {
      this._contextId = e.target.value ?? "";
    }}>
            </uai-context-picker>
          </div>
        </umb-property-layout>

      </uui-box>

      ${this._availableProperties.length > 0 ? o`
        <uui-box headline=${this.localize.term("evaluatorConfig_propertyFilterSection")}
          style="margin-top: var(--uui-size-layout-1);">
          <umb-property-layout label=${this.localize.term("evaluatorConfig_propertiesLabel")}
            description=${this.localize.term("evaluatorConfig_propertiesHelp")}>
            <div slot="editor">
              ${this._availableProperties.map((e) => o`
                <div style="display: flex; align-items: center; gap: var(--uui-size-space-2); padding: var(--uui-size-space-2) 0;">
                  <uui-checkbox
                    label=${e.label}
                    ?checked=${this._propertyAliases.includes(e.alias)}
                    @change=${(t) => this._onPropertyAliasToggle(e.alias, t.target.checked)}>
                    ${e.label}
                    <span style="font-size: 0.8em; color: var(--uui-color-text-alt); margin-left: var(--uui-size-space-2);">
                      (${e.alias})
                    </span>
                  </uui-checkbox>
                </div>
              `)}
            </div>
          </umb-property-layout>
        </uui-box>
      ` : n}

      <uui-box headline=${this.localize.term("evaluatorConfig_promptSection")}>
        <umb-property-layout
          label=${this.localize.term("evaluatorConfig_scoringLabel")}
          description=${this.localize.term("evaluatorConfig_scoringHelp")}>
          <div slot="editor">
            <uui-toggle
              label=${this.localize.term("evaluatorConfig_scoringLabel")}
              ?checked=${this._scoringEnabled}
              @change=${(e) => {
      this._scoringEnabled = e.target.checked;
    }}>
            </uui-toggle>
          </div>
        </umb-property-layout>

        <umb-property-layout
          label=${this.localize.term("evaluatorConfig_recommendationsLabel")}
          description=${this.localize.term("evaluatorConfig_recommendationsHelp")}>
          <div slot="editor">
            <uui-toggle
              label=${this.localize.term("evaluatorConfig_recommendationsLabel")}
              ?checked=${this._recommendationsEnabled}
              @change=${(e) => {
      this._recommendationsEnabled = e.target.checked;
    }}>
            </uui-toggle>
          </div>
        </umb-property-layout>

        <umb-property-layout label=${this.localize.term("evaluatorConfig_promptLabel")} mandatory
          description=${this.localize.term("evaluatorConfig_promptHelp")}>
          <div slot="editor">
            ${this._documentTypeAlias ? o`
              <uui-button
                look="secondary"
                label=${this._promptBuilderOpen ? this.localize.term("promptBuilder_closeButton") : this.localize.term("promptBuilder_openButton")}
                style="margin-bottom: var(--uui-size-space-3);"
                aria-expanded=${this._promptBuilderOpen ? "true" : "false"}
                @click=${() => {
      this._promptBuilderOpen = !this._promptBuilderOpen;
    }}>
                ${this._promptBuilderOpen ? this.localize.term("promptBuilder_closeButton") : this.localize.term("promptBuilder_openButton")}
              </uui-button>
            ` : n}
            ${this._promptBuilderOpen && this._documentTypeAlias ? o`
                  <page-evaluator-prompt-builder
                    document-type-alias=${this._documentTypeAlias}
                    .selectedPropertyAliases=${this._propertyAliases}
                    ?scoringEnabled=${this._scoringEnabled}
                    style="display: block; margin-bottom: var(--uui-size-space-3);"
                    @prompt-selected=${(e) => {
      this._promptText = e.detail.prompt, this._promptBuilderOpen = !1;
    }}>
                  </page-evaluator-prompt-builder>
                ` : n}
            <h4 class="prompt-final-heading">
              ${this.localize.term("evaluatorConfig_promptFinalHeading")}
            </h4>
            <p class="prompt-final-help">
              ${this.localize.term("evaluatorConfig_promptFinalHelp")}
            </p>
            <uui-textarea
              label=${this.localize.term("evaluatorConfig_promptLabel")}
              .value=${this._promptText}
              rows="8"
              ?invalid=${!!this._errors.promptText}
              @input=${(e) => {
      this._promptText = e.target.value;
    }}>
            </uui-textarea>
            ${this._errors.promptText ? o`<uui-form-validation-message>${this._errors.promptText}</uui-form-validation-message>` : n}
            ${this._renderPropertyReference()}
          </div>
        </umb-property-layout>
      </uui-box>

      ${Object.keys(this._errors).length > 0 ? o`
        <uui-box style="margin-top: var(--uui-size-layout-1); --uui-box-default-padding: var(--uui-size-space-4);">
          <uui-tag color="danger" style="display:block; margin-bottom: var(--uui-size-space-2);">
            ${this.localize.term("evaluatorConfig_validationBanner")}
          </uui-tag>
          <ul style="margin:0; padding-left: 1.25rem;">
            ${Object.entries(this._errors).map(([, e]) => o`<li>${e}</li>`)}
          </ul>
        </uui-box>
      ` : n}

    `;
  }
};
s.styles = x`
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

    .property-reference {
      margin-top: var(--uui-size-space-4);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      background: rgba(0, 0, 0, 0.025);
    }

    .property-reference__heading {
      font-weight: 600;
      margin-bottom: var(--uui-size-space-1);
    }

    .property-reference__help {
      font-size: var(--uui-type-small-size, 0.85rem);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-3);
    }

    .property-reference__group {
      font-size: 0.9rem;
      margin: var(--uui-size-space-3) 0 var(--uui-size-space-1);
    }

    .property-reference__list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .property-reference__item {
      padding: 2px 0;
      font-size: 0.9rem;
    }

    .property-reference__item code {
      background: var(--uui-color-surface);
      padding: 1px 4px;
      border-radius: 3px;
    }

    .property-reference__item--excluded {
      opacity: 0.4;
    }

    .property-reference__item--excluded code {
      text-decoration: line-through;
    }

    .prompt-final-heading {
      margin: 0 0 var(--uui-size-space-1) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .prompt-final-help {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: var(--uui-type-small-size, 0.85rem);
      color: var(--uui-color-text-alt);
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

  `;
p([
  m({ type: String, attribute: "config-id" })
], s.prototype, "configId", 2);
p([
  a()
], s.prototype, "_name", 2);
p([
  a()
], s.prototype, "_description", 2);
p([
  a()
], s.prototype, "_documentTypeAlias", 2);
p([
  a()
], s.prototype, "_profileId", 2);
p([
  a()
], s.prototype, "_contextId", 2);
p([
  a()
], s.prototype, "_promptText", 2);
p([
  a()
], s.prototype, "_scoringEnabled", 2);
p([
  a()
], s.prototype, "_recommendationsEnabled", 2);
p([
  a()
], s.prototype, "_version", 2);
p([
  a()
], s.prototype, "_errors", 2);
p([
  a()
], s.prototype, "_saving", 2);
p([
  a()
], s.prototype, "_loadError", 2);
p([
  a()
], s.prototype, "_promptBuilderOpen", 2);
p([
  a()
], s.prototype, "_propertyAliases", 2);
p([
  a()
], s.prototype, "_availableProperties", 2);
p([
  a()
], s.prototype, "_docTypeDisplayName", 2);
p([
  a()
], s.prototype, "_docTypeSuggestions", 2);
p([
  a()
], s.prototype, "_docTypeShowSuggestions", 2);
s = p([
  f("evaluator-form")
], s);
export {
  s as EvaluatorFormElement
};
//# sourceMappingURL=evaluator-form.element-DQ5ZLQ8r.js.map
