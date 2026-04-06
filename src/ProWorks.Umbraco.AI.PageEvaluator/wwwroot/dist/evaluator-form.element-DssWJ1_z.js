import { property as _, state as r, customElement as f, LitElement as v, html as s, nothing as n, css as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as x } from "@umbraco-cms/backoffice/lit-element";
import { c as m, f as T, u as $, h as A } from "./entry-point-lCnS3C-U.js";
const g = [
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
var C = Object.defineProperty, w = Object.getOwnPropertyDescriptor, d = (e, t, i, o) => {
  for (var l = o > 1 ? void 0 : o ? w(t, i) : t, c = e.length - 1, h; c >= 0; c--)
    (h = e[c]) && (l = (o ? h(t, i, l) : h(l)) || l);
  return o && l && C(t, i, l), l;
};
const S = [{ scheme: "bearer", type: "http" }];
async function P(e) {
  const t = await m.get({
    security: S,
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
    }), this.addEventListener("use-prompt", () => this.usePrompt()), this.documentTypeAlias && this._loadProperties();
  }
  updated(e) {
    e.has("documentTypeAlias") && this.documentTypeAlias && this._loadProperties();
  }
  async _loadProperties() {
    this._loading = !0, this._error = null;
    try {
      this._properties = await P(this.documentTypeAlias);
    } catch {
      this._error = "Could not load document type properties.";
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
    const e = this._properties.map((i) => i.alias).join(", "), t = g.filter((i) => this._selectedCategories.has(i.id)).map(
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
    if (this._loading) return s`<uui-loader></uui-loader>`;
    const e = this._groupProperties();
    return s`
      <div style="display: flex; flex-direction: column; gap: 1rem;">

        ${this._error ? s`<uui-tag color="danger">${this._error}</uui-tag>` : n}

        <!-- Property aliases grouped by tab/group -->
        ${e.size > 0 ? s`
              <uui-box headline="Document Type Properties">
                ${Array.from(e.entries()).map(
      ([t, i]) => s`
                    <h3 style="margin: 0.5rem 0 0.25rem;">${t}</h3>
                    <ul>
                      ${i.map(
        (o) => s`
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
        <uui-box headline="Checklist Categories">
          <div style="display: flex; flex-direction: column; gap: var(--uui-size-space-3); padding: var(--uui-size-space-3) 0;">
            ${g.map(
      (t) => s`
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
          <uui-label for="site-context">Site Context (optional)</uui-label>
          <uui-textarea
            id="site-context"
            label="Site context"
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
            label="Generate Prompt Draft"
            @click=${() => this.generateDraft()}>
            Generate Prompt Draft
          </uui-button>
        </div>

        <!-- Draft preview -->
        ${this._draft ? s`
              <uui-box headline="Generated Draft">
                <pre data-draft style="white-space: pre-wrap;">${this._draft}</pre>
                <uui-button
                  slot="header-actions"
                  look="primary"
                  label="Use This Prompt"
                  @click=${() => this.usePrompt()}>
                  Use This Prompt
                </uui-button>
              </uui-box>
            ` : n}
      </div>
    `;
  }
};
d([
  _({ attribute: "document-type-alias" })
], u.prototype, "documentTypeAlias", 2);
d([
  r()
], u.prototype, "_properties", 2);
d([
  r()
], u.prototype, "_selectedCategories", 2);
d([
  r()
], u.prototype, "_siteContext", 2);
d([
  r()
], u.prototype, "_draft", 2);
d([
  r()
], u.prototype, "_loading", 2);
d([
  r()
], u.prototype, "_error", 2);
u = d([
  f("page-evaluator-prompt-builder")
], u);
var I = Object.defineProperty, k = Object.getOwnPropertyDescriptor, p = (e, t, i, o) => {
  for (var l = o > 1 ? void 0 : o ? k(t, i) : t, c = e.length - 1, h; c >= 0; c--)
    (h = e[c]) && (l = (o ? h(t, i, l) : h(l)) || l);
  return o && l && I(t, i, l), l;
};
const y = [{ scheme: "bearer", type: "http" }];
let a = class extends x {
  constructor() {
    super(...arguments), this.configId = null, this._name = "", this._description = "", this._documentTypeAlias = "", this._profileId = "", this._contextId = "", this._promptText = "", this._errors = {}, this._saving = !1, this._promptBuilderOpen = !1, this._propertyAliases = [], this._availableProperties = [], this._docTypeDisplayName = "", this._docTypeSuggestions = [], this._docTypeShowSuggestions = !1, this._docTypeSearchTimer = null;
  }
  updated(e) {
    super.updated(e), e.has("configId") && (this.configId ? this._loadConfig(this.configId) : this._resetFields());
  }
  _resetFields() {
    this._name = "", this._description = "", this._documentTypeAlias = "", this._docTypeDisplayName = "", this._docTypeSuggestions = [], this._docTypeShowSuggestions = !1, this._profileId = "", this._contextId = "", this._promptText = "", this._propertyAliases = [], this._availableProperties = [], this._errors = {}, this._promptBuilderOpen = !1;
  }
  async _loadConfig(e) {
    const t = await T(e);
    this._name = t.name, this._description = t.description ?? "", this._documentTypeAlias = t.documentTypeAlias, this._profileId = t.profileId, this._contextId = t.contextId ?? "", this._promptText = t.promptText, this._propertyAliases = t.propertyAliases ?? [], this._errors = {}, this._resolveDocTypeName(t.documentTypeAlias), this._loadAvailableProperties(t.documentTypeAlias);
  }
  async _resolveDocTypeName(e) {
    try {
      const t = await m.get({
        security: y,
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
        security: y,
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
        security: y,
        url: `/umbraco/management/api/v1/document-type/${encodeURIComponent(e)}`
      });
      if (i.response.ok && i.data) {
        const o = i.data;
        this._documentTypeAlias = o.alias, this._docTypeDisplayName = o.name, this._loadAvailableProperties(o.alias);
      }
    } catch {
      this._errors = { ...this._errors, documentTypeAlias: "Could not retrieve alias for the selected document type." };
    }
  }
  async _loadAvailableProperties(e) {
    this._availableProperties = [];
    try {
      const t = await m.get({
        security: y,
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
    if (this._errors = {}, this._name.trim() || (this._errors.name = "Name is required."), this._documentTypeAlias.trim() || (this._errors.documentTypeAlias = "Document type is required."), this._profileId.trim() || (this._errors.profileId = "AI Profile is required."), this._promptText.trim() || (this._errors.promptText = "Prompt text is required."), !(Object.keys(this._errors).length > 0)) {
      this._saving = !0;
      try {
        const e = {
          name: this._name,
          description: this._description || null,
          documentTypeAlias: this._documentTypeAlias,
          profileId: this._profileId,
          contextId: this._contextId || null,
          promptText: this._promptText,
          propertyAliases: this._propertyAliases.length > 0 ? this._propertyAliases : null
        }, t = this.configId ? await $(this.configId, e) : await A(e);
        this.dispatchEvent(
          new CustomEvent("evaluator-saved", {
            detail: t,
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
    return s`
      ${this._errors._form ? s`<uui-box><uui-tag color="danger">${this._errors._form}</uui-tag></uui-box>` : n}

      <uui-box headline="General">
        <umb-property-layout label="Name" mandatory>
          <div slot="editor">
            <uui-input
              label="Name"
              .value=${this._name}
              ?invalid=${!!this._errors.name}
              @input=${(e) => {
      this._name = e.target.value;
    }}>
            </uui-input>
            ${this._errors.name ? s`<uui-form-validation-message>${this._errors.name}</uui-form-validation-message>` : n}
          </div>
        </umb-property-layout>

        <umb-property-layout label="Description" description="Optional summary shown in the configuration list.">
          <div slot="editor">
            <uui-textarea
              label="Description"
              .value=${this._description}
              @input=${(e) => {
      this._description = e.target.value;
    }}>
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
              ${this._documentTypeAlias ? s`
                <div style="font-size:0.8em; color:var(--uui-color-text-alt); margin-top:4px;">
                  Alias: <code>${this._documentTypeAlias}</code>
                </div>
              ` : n}
              ${this._docTypeShowSuggestions ? s`
                <div class="doc-type-suggestions">
                  ${this._docTypeSuggestions.map((e) => s`
                    <div class="doc-type-suggestion"
                      @mousedown=${() => void this._selectDocType(e.id, e.name)}>
                      <span>${e.name}</span>
                    </div>
                  `)}
                </div>
              ` : n}
            </div>
            ${this._errors.documentTypeAlias ? s`<uui-form-validation-message>${this._errors.documentTypeAlias}</uui-form-validation-message>` : n}
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
              @change=${(e) => {
      this._profileId = e.target.value;
    }}>
            </uai-profile-picker>
            ${this._errors.profileId ? s`<uui-form-validation-message>${this._errors.profileId}</uui-form-validation-message>` : n}
          </div>
        </umb-property-layout>

        <umb-property-layout label="AI Context"
          description="Optional Umbraco.AI context to inject alongside the prompt.">
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

      ${this._availableProperties.length > 0 ? s`
        <uui-box headline="Property Filter"
          style="margin-top: var(--uui-size-layout-1);">
          <umb-property-layout label="Properties to Evaluate"
            description="Select which properties to include in the evaluation. If none are selected, all properties will be sent.">
            <div slot="editor">
              ${this._availableProperties.map((e) => s`
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

      <uui-box headline="Prompt">
        <umb-property-layout label="Evaluation Prompt" mandatory
          description="The prompt sent to the AI to evaluate page content.">
          <div slot="editor">
            ${this._documentTypeAlias ? s`
              <uui-button
                look="secondary"
                label="Open Prompt Builder"
                style="margin-bottom: var(--uui-size-space-3);"
                aria-expanded=${this._promptBuilderOpen ? "true" : "false"}
                @click=${() => {
      this._promptBuilderOpen = !this._promptBuilderOpen;
    }}>
                Open Prompt Builder
              </uui-button>
            ` : n}
            ${this._promptBuilderOpen && this._documentTypeAlias ? s`
                  <page-evaluator-prompt-builder
                    document-type-alias=${this._documentTypeAlias}
                    style="display: block; margin-bottom: var(--uui-size-space-3);"
                    @prompt-selected=${(e) => {
      this._promptText = e.detail.prompt, this._promptBuilderOpen = !1;
    }}>
                  </page-evaluator-prompt-builder>
                ` : n}
            <uui-textarea
              label="Evaluation prompt"
              .value=${this._promptText}
              rows="8"
              ?invalid=${!!this._errors.promptText}
              @input=${(e) => {
      this._promptText = e.target.value;
    }}>
            </uui-textarea>
            ${this._errors.promptText ? s`<uui-form-validation-message>${this._errors.promptText}</uui-form-validation-message>` : n}
          </div>
        </umb-property-layout>
      </uui-box>

      ${Object.keys(this._errors).length > 0 ? s`
        <uui-box style="margin-top: var(--uui-size-layout-1); --uui-box-default-padding: var(--uui-size-space-4);">
          <uui-tag color="danger" style="display:block; margin-bottom: var(--uui-size-space-2);">
            Please fix the following before saving:
          </uui-tag>
          <ul style="margin:0; padding-left: 1.25rem;">
            ${Object.entries(this._errors).map(([, e]) => s`<li>${e}</li>`)}
          </ul>
        </uui-box>
      ` : n}

      <div class="form-actions">
        <uui-button
          look="primary"
          color="positive"
          label="Save"
          ?disabled=${this._saving}
          @click=${() => void this.submit()}>
          ${this._saving ? "Saving…" : "Save"}
        </uui-button>
      </div>
    `;
  }
};
a.styles = b`
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
p([
  _({ type: String, attribute: "config-id" })
], a.prototype, "configId", 2);
p([
  r()
], a.prototype, "_name", 2);
p([
  r()
], a.prototype, "_description", 2);
p([
  r()
], a.prototype, "_documentTypeAlias", 2);
p([
  r()
], a.prototype, "_profileId", 2);
p([
  r()
], a.prototype, "_contextId", 2);
p([
  r()
], a.prototype, "_promptText", 2);
p([
  r()
], a.prototype, "_errors", 2);
p([
  r()
], a.prototype, "_saving", 2);
p([
  r()
], a.prototype, "_promptBuilderOpen", 2);
p([
  r()
], a.prototype, "_propertyAliases", 2);
p([
  r()
], a.prototype, "_availableProperties", 2);
p([
  r()
], a.prototype, "_docTypeDisplayName", 2);
p([
  r()
], a.prototype, "_docTypeSuggestions", 2);
p([
  r()
], a.prototype, "_docTypeShowSuggestions", 2);
a = p([
  f("evaluator-form")
], a);
export {
  a as EvaluatorFormElement
};
//# sourceMappingURL=evaluator-form.element-DssWJ1_z.js.map
