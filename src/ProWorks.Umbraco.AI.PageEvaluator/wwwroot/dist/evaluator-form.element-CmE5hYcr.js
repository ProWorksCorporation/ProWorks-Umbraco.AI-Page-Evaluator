import { property as g, state as a, customElement as f, html as r, nothing as n, css as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as v } from "@umbraco-cms/backoffice/lit-element";
import { c as m, B as _, f as x, u as $, h as T } from "./entry-point-INCDL3NC.js";
const y = [
  {
    id: "required-fields",
    label: "Required Fields",
    promptFragment: "Verify that all required fields are populated. The document type has the following properties: {{propertyAliases}}. Check each one and report any that are empty or missing. Site context: {{siteContext}}"
  },
  {
    id: "metadata-seo",
    label: "Metadata & SEO",
    promptFragment: "Evaluate the SEO metadata for this page. Check the following property aliases for SEO-relevant content: {{propertyAliases}}. Verify meta description length (max 160 chars), browser title length (max 60 chars), and Open Graph tags if present. Site context: {{siteContext}}"
  },
  {
    id: "content-quality",
    label: "Content Quality",
    promptFragment: "Assess the content quality of this page. The page properties are: {{propertyAliases}}. Check for spelling/grammar issues, appropriate reading level, sufficient content length, and clear headings structure. Site context: {{siteContext}}"
  },
  {
    id: "schema-structured-data",
    label: "Schema & Structured Data",
    promptFragment: "Evaluate schema markup and structured data opportunities for this page. Review properties: {{propertyAliases}}. Identify which fields map to schema.org types and whether structured data is present or recommended. Site context: {{siteContext}}"
  },
  {
    id: "accessibility-visibility",
    label: "Accessibility & Visibility",
    promptFragment: "Review this page for accessibility and discoverability. Properties to evaluate: {{propertyAliases}}. Check for descriptive image alt text, meaningful link labels, logical heading hierarchy, and robots/sitemap inclusion. Site context: {{siteContext}}"
  },
  {
    id: "calls-to-action",
    label: "Calls to Action",
    promptFragment: "Evaluate the calls to action on this page. Review the following properties: {{propertyAliases}}. Check for clear, actionable CTAs, appropriate placement, and alignment with the page goal. Site context: {{siteContext}}"
  }
];
var C = Object.defineProperty, A = Object.getOwnPropertyDescriptor, c = (e, t, i, o) => {
  for (var p = o > 1 ? void 0 : o ? A(t, i) : t, d = e.length - 1, h; d >= 0; d--)
    (h = e[d]) && (p = (o ? h(t, i, p) : h(p)) || p);
  return o && p && C(t, i, p), p;
};
async function z(e) {
  const t = await m.get({
    security: _,
    url: `/umbraco/management/api/v1/page-evaluator/document-type/${encodeURIComponent(e)}/properties`
  });
  if (!t.response.ok) {
    const o = await t.response.text().catch(() => "");
    throw new Error(`API ${t.response.status}: ${o}`);
  }
  return t.data.properties.map((o) => ({
    alias: o.alias,
    label: o.label,
    groupName: o.groupName,
    editorAlias: o.editorAlias
  }));
}
let u = class extends v {
  constructor() {
    super(...arguments), this.documentTypeAlias = "", this._properties = [], this._selectedCategories = /* @__PURE__ */ new Set(), this._siteContext = "", this._draft = "", this._loading = !1, this._error = null;
  }
  connectedCallback() {
    super.connectedCallback(), this.addEventListener("category-toggle", (e) => {
      const { id: t, selected: i } = e.detail;
      this._toggleCategory(t, i);
    }), this.addEventListener("use-prompt", () => this.usePrompt());
  }
  updated(e) {
    e.has("documentTypeAlias") && this.documentTypeAlias && this._loadProperties();
  }
  async _loadProperties() {
    this._loading = !0, this._error = null;
    try {
      this._properties = await z(this.documentTypeAlias);
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
    const e = this._properties.map((i) => i.alias).join(", "), t = y.filter((i) => this._selectedCategories.has(i.id)).map(
      (i) => i.promptFragment.replace("{{propertyAliases}}", e).replace("{{siteContext}}", this._siteContext)
    );
    if (t.length === 0) {
      this._draft = `Evaluate the following page.

Properties: ${e}

Site context: ${this._siteContext}`.trim();
      return;
    }
    this._draft = t.join(`

`);
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
  _groupProperties() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this._properties) {
      const i = e.get(t.groupName) ?? [];
      i.push(t), e.set(t.groupName, i);
    }
    return e;
  }
  render() {
    if (this._loading) return r`<uui-loader></uui-loader>`;
    const e = this._groupProperties();
    return r`
      <div style="display: flex; flex-direction: column; gap: 1rem;">

        ${this._error ? r`<uui-tag color="danger">${this._error}</uui-tag>` : n}

        <!-- Property aliases grouped by tab/group -->
        ${e.size > 0 ? r`
              <uui-box headline=${this.localize.term("promptBuilder_propertiesLabel")}>
                ${Array.from(e.entries()).map(
      ([t, i]) => r`
                    <h3 style="margin: 0.5rem 0 0.25rem;">${t}</h3>
                    <ul>
                      ${i.map(
        (o) => r`
                          <li data-property-alias=${o.alias}>
                            <code>${o.alias}</code> — ${o.label}
                          </li>
                        `
      )}
                    </ul>
                  `
    )}
              </uui-box>
            ` : n}

        <!-- Category checkboxes -->
        <uui-box headline=${this.localize.term("promptBuilder_categoriesLabel")}>
          <div style="display: flex; flex-direction: column; gap: var(--uui-size-space-3); padding: var(--uui-size-space-3) 0;">
            ${y.map(
      (t) => r`
                <uui-checkbox
                  label=${t.label}
                  ?checked=${this._selectedCategories.has(t.id)}
                  @change=${(i) => {
        this._toggleCategory(t.id, i.target.checked);
      }}>${t.label}</uui-checkbox>
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
            placeholder="Describe the site purpose, audience, or brand guidelines…"
            .value=${this._siteContext}
            @input=${(t) => {
      this._siteContext = t.target.value;
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
        ${this._draft ? r`
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
c([
  g({ attribute: "document-type-alias" })
], u.prototype, "documentTypeAlias", 2);
c([
  a()
], u.prototype, "_properties", 2);
c([
  a()
], u.prototype, "_selectedCategories", 2);
c([
  a()
], u.prototype, "_siteContext", 2);
c([
  a()
], u.prototype, "_draft", 2);
c([
  a()
], u.prototype, "_loading", 2);
c([
  a()
], u.prototype, "_error", 2);
u = c([
  f("page-evaluator-prompt-builder")
], u);
var S = Object.defineProperty, w = Object.getOwnPropertyDescriptor, l = (e, t, i, o) => {
  for (var p = o > 1 ? void 0 : o ? w(t, i) : t, d = e.length - 1, h; d >= 0; d--)
    (h = e[d]) && (p = (o ? h(t, i, p) : h(p)) || p);
  return o && p && S(t, i, p), p;
};
let s = class extends v {
  constructor() {
    super(...arguments), this.configId = null, this._name = "", this._description = "", this._documentTypeAlias = "", this._profileId = "", this._contextId = "", this._promptText = "", this._version = 0, this._errors = {}, this._saving = !1, this._promptBuilderOpen = !1, this._propertyAliases = [], this._availableProperties = [], this._docTypeDisplayName = "", this._docTypeSuggestions = [], this._docTypeShowSuggestions = !1, this._docTypeSearchTimer = null;
  }
  updated(e) {
    super.updated(e), e.has("configId") && (this.configId ? this._loadConfig(this.configId) : this._resetFields());
  }
  _resetFields() {
    this._name = "", this._description = "", this._documentTypeAlias = "", this._docTypeDisplayName = "", this._docTypeSuggestions = [], this._docTypeShowSuggestions = !1, this._profileId = "", this._contextId = "", this._promptText = "", this._version = 0, this._propertyAliases = [], this._availableProperties = [], this._errors = {}, this._promptBuilderOpen = !1;
  }
  async _loadConfig(e) {
    const t = await x(e);
    this._name = t.name, this._description = t.description ?? "", this._documentTypeAlias = t.documentTypeAlias, this._profileId = t.profileId, this._contextId = t.contextId ?? "", this._promptText = t.promptText, this._version = t.version, this._propertyAliases = t.propertyAliases ?? [], this._errors = {}, this._resolveDocTypeName(t.documentTypeAlias), this._loadAvailableProperties(t.documentTypeAlias);
  }
  async _resolveDocTypeName(e) {
    try {
      const t = await m.get({
        security: _,
        url: `/umbraco/management/api/v1/page-evaluator/document-type/${encodeURIComponent(e)}/properties`
      });
      if (t.response.ok && t.data) {
        const i = t.data;
        this._docTypeDisplayName = i.name;
      } else
        this._docTypeDisplayName = e;
    } catch {
      this._docTypeDisplayName = e;
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
      const t = await m.get({
        security: _,
        url: "/umbraco/management/api/v1/item/document-type/search",
        query: { query: e, isElement: !1, skip: 0, take: 20 }
      });
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
      const i = await m.get({
        security: _,
        url: `/umbraco/management/api/v1/document-type/${encodeURIComponent(e)}`
      });
      if (i.response.ok && i.data) {
        const o = i.data;
        this._documentTypeAlias = o.alias, this._docTypeDisplayName = o.name, this._loadAvailableProperties(o.alias);
      }
    } catch {
      this._errors = { ...this._errors, documentTypeAlias: this.localize.term("evaluatorConfig_documentTypeAliasError") };
    }
  }
  async _loadAvailableProperties(e) {
    this._availableProperties = [];
    try {
      const t = await m.get({
        security: _,
        url: `/umbraco/management/api/v1/page-evaluator/document-type/${encodeURIComponent(e)}/properties`
      });
      if (t.response.ok && t.data) {
        const i = t.data;
        this._availableProperties = i.properties ?? [];
      }
    } catch {
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
      this._saving = !0;
      try {
        const e = this.configId ? await $(this.configId, {
          name: this._name,
          description: this._description || null,
          documentTypeAlias: this._documentTypeAlias,
          profileId: this._profileId,
          contextId: this._contextId || null,
          promptText: this._promptText,
          propertyAliases: this._propertyAliases.length > 0 ? this._propertyAliases : null,
          version: this._version
        }) : await T({
          name: this._name,
          description: this._description || null,
          documentTypeAlias: this._documentTypeAlias,
          profileId: this._profileId,
          contextId: this._contextId || null,
          promptText: this._promptText,
          propertyAliases: this._propertyAliases.length > 0 ? this._propertyAliases : null
        });
        this.dispatchEvent(
          new CustomEvent("evaluator-saved", {
            detail: e,
            bubbles: !0,
            composed: !0
          })
        );
      } catch (e) {
        e instanceof Error && (this._errors._form = e.message);
      } finally {
        this._saving = !1;
      }
    }
  }
  render() {
    return r`
      ${this._errors._form ? r`<uui-box><uui-tag color="danger">${this._errors._form}</uui-tag></uui-box>` : n}

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
            ${this._errors.name ? r`<uui-form-validation-message>${this._errors.name}</uui-form-validation-message>` : n}
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
              ${this._documentTypeAlias ? r`
                <div style="font-size:0.8em; color:var(--uui-color-text-alt); margin-top:4px;">
                  ${this.localize.term("evaluatorConfig_documentTypeAliasPrefix")} <code>${this._documentTypeAlias}</code>
                </div>
              ` : n}
              ${this._docTypeShowSuggestions ? r`
                <div class="doc-type-suggestions">
                  ${this._docTypeSuggestions.map((e) => r`
                    <div class="doc-type-suggestion"
                      @mousedown=${() => void this._selectDocType(e.id, e.name)}>
                      <span>${e.name}</span>
                    </div>
                  `)}
                </div>
              ` : n}
            </div>
            ${this._errors.documentTypeAlias ? r`<uui-form-validation-message>${this._errors.documentTypeAlias}</uui-form-validation-message>` : n}
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
            ${this._errors.profileId ? r`<uui-form-validation-message>${this._errors.profileId}</uui-form-validation-message>` : n}
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

      ${this._availableProperties.length > 0 ? r`
        <uui-box headline=${this.localize.term("evaluatorConfig_propertyFilterSection")}
          style="margin-top: var(--uui-size-layout-1);">
          <umb-property-layout label=${this.localize.term("evaluatorConfig_propertiesLabel")}
            description=${this.localize.term("evaluatorConfig_propertiesHelp")}>
            <div slot="editor">
              ${this._availableProperties.map((e) => r`
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
        <umb-property-layout label=${this.localize.term("evaluatorConfig_promptLabel")} mandatory
          description=${this.localize.term("evaluatorConfig_promptHelp")}>
          <div slot="editor">
            ${this._documentTypeAlias ? r`
              <uui-button
                look="secondary"
                label=${this.localize.term("promptBuilder_openButton")}
                style="margin-bottom: var(--uui-size-space-3);"
                aria-expanded=${this._promptBuilderOpen ? "true" : "false"}
                @click=${() => {
      this._promptBuilderOpen = !this._promptBuilderOpen;
    }}>
                ${this.localize.term("promptBuilder_openButton")}
              </uui-button>
            ` : n}
            ${this._promptBuilderOpen && this._documentTypeAlias ? r`
                  <page-evaluator-prompt-builder
                    document-type-alias=${this._documentTypeAlias}
                    style="display: block; margin-bottom: var(--uui-size-space-3);"
                    @prompt-selected=${(e) => {
      this._promptText = e.detail.prompt, this._promptBuilderOpen = !1;
    }}>
                  </page-evaluator-prompt-builder>
                ` : n}
            <uui-textarea
              label=${this.localize.term("evaluatorConfig_promptLabel")}
              .value=${this._promptText}
              rows="8"
              ?invalid=${!!this._errors.promptText}
              @input=${(e) => {
      this._promptText = e.target.value;
    }}>
            </uui-textarea>
            ${this._errors.promptText ? r`<uui-form-validation-message>${this._errors.promptText}</uui-form-validation-message>` : n}
          </div>
        </umb-property-layout>
      </uui-box>

      ${Object.keys(this._errors).length > 0 ? r`
        <uui-box style="margin-top: var(--uui-size-layout-1); --uui-box-default-padding: var(--uui-size-space-4);">
          <uui-tag color="danger" style="display:block; margin-bottom: var(--uui-size-space-2);">
            ${this.localize.term("evaluatorConfig_validationBanner")}
          </uui-tag>
          <ul style="margin:0; padding-left: 1.25rem;">
            ${Object.entries(this._errors).map(([, e]) => r`<li>${e}</li>`)}
          </ul>
        </uui-box>
      ` : n}

      <div class="form-actions">
        <uui-button
          look="primary"
          color="positive"
          label=${this.localize.term("evaluatorConfig_saveButton")}
          ?disabled=${this._saving}
          @click=${() => void this.submit()}>
          ${this._saving ? this.localize.term("evaluatorConfig_savingButton") : this.localize.term("evaluatorConfig_saveButton")}
        </uui-button>
      </div>
    `;
  }
};
s.styles = b`
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
l([
  g({ type: String, attribute: "config-id" })
], s.prototype, "configId", 2);
l([
  a()
], s.prototype, "_name", 2);
l([
  a()
], s.prototype, "_description", 2);
l([
  a()
], s.prototype, "_documentTypeAlias", 2);
l([
  a()
], s.prototype, "_profileId", 2);
l([
  a()
], s.prototype, "_contextId", 2);
l([
  a()
], s.prototype, "_promptText", 2);
l([
  a()
], s.prototype, "_version", 2);
l([
  a()
], s.prototype, "_errors", 2);
l([
  a()
], s.prototype, "_saving", 2);
l([
  a()
], s.prototype, "_promptBuilderOpen", 2);
l([
  a()
], s.prototype, "_propertyAliases", 2);
l([
  a()
], s.prototype, "_availableProperties", 2);
l([
  a()
], s.prototype, "_docTypeDisplayName", 2);
l([
  a()
], s.prototype, "_docTypeSuggestions", 2);
l([
  a()
], s.prototype, "_docTypeShowSuggestions", 2);
s = l([
  f("evaluator-form")
], s);
export {
  s as EvaluatorFormElement
};
//# sourceMappingURL=evaluator-form.element-CmE5hYcr.js.map
