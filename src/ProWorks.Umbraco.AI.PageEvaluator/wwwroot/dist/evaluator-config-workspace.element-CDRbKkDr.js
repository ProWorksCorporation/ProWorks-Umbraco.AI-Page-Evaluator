import { html as r, nothing as d, css as h, state as s, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as f } from "@umbraco-cms/backoffice/lit-element";
import { umbConfirmModal as p } from "@umbraco-cms/backoffice/modal";
import { a as v, b as _, d as g } from "./entry-point-BzyHgWLl.js";
import "./evaluator-form.element-CLA9sedB.js";
var b = Object.defineProperty, y = Object.getOwnPropertyDescriptor, u = (e, t, o, i) => {
  for (var l = i > 1 ? void 0 : i ? y(t, o) : t, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (l = (i ? c(t, o, l) : c(l)) || l);
  return i && l && b(t, o, l), l;
};
let a = class extends f {
  constructor() {
    super(...arguments), this._configs = [], this._groupedConfigs = /* @__PURE__ */ new Map(), this._loading = !1, this._error = null, this._view = "list", this._editId = null, this._saving = !1, this._formName = "", this._formNameError = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfigs();
  }
  async _loadConfigs() {
    this._loading = !0, this._error = null;
    try {
      const e = await v();
      this._configs = [...e.items], this._groupedConfigs = this._groupByDocType();
    } catch {
      this._error = this.localize.term("evaluatorConfig_loadError");
    } finally {
      this._loading = !1;
    }
  }
  _groupByDocType() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this._configs) {
      const o = e.get(t.documentTypeAlias) ?? [];
      o.push(t), e.set(t.documentTypeAlias, o);
    }
    for (const [t, o] of e)
      o.sort((i, l) => i.isActive !== l.isActive ? i.isActive ? -1 : 1 : l.dateModified.localeCompare(i.dateModified)), e.set(t, o);
    return e;
  }
  async _handleActivate(e) {
    try {
      await _(e), await this._loadConfigs();
    } catch {
      this._error = this.localize.term("evaluatorConfig_activateError");
    }
  }
  async _handleDelete(e) {
    try {
      await p(this, {
        headline: this.localize.term("evaluatorConfig_deleteConfirmHeadline"),
        content: this.localize.term("evaluatorConfig_deleteConfirmContent"),
        color: "danger",
        confirmLabel: this.localize.term("evaluatorConfig_deleteButton")
      });
    } catch {
      return;
    }
    try {
      await g(e), this._configs = this._configs.filter((t) => t.id !== e), this._groupedConfigs = this._groupByDocType();
    } catch {
      this._error = this.localize.term("evaluatorConfig_deleteError");
    }
  }
  _handleEdit(e) {
    var t;
    this._editId = e, this._formName = ((t = this._configs.find((o) => o.id === e)) == null ? void 0 : t.name) ?? "", this._formNameError = !1, this._view = "form";
  }
  _handleCreate() {
    this._editId = null, this._formName = "", this._formNameError = !1, this._view = "form";
  }
  _handleSaved() {
    this._view = "list", this._editId = null, this._loadConfigs();
  }
  _handleBack() {
    this._view = "list", this._editId = null, this._formName = "", this._formNameError = !1;
  }
  _handleSave() {
    var t;
    if (!this._formName.trim()) {
      this._formNameError = !0;
      return;
    }
    const e = (t = this.shadowRoot) == null ? void 0 : t.querySelector("evaluator-form");
    e == null || e.submit();
  }
  get _breadcrumbName() {
    return this._formName ? this._formName : this.localize.term(this._editId ? "evaluatorConfig_editHeadline" : "evaluatorConfig_createHeadline");
  }
  render() {
    return this._view === "form" ? r`
        <div id="form-header">
          <uui-button
            compact
            label=${this.localize.term("evaluatorConfig_backLabel")}
            @click=${() => this._handleBack()}>
            <uui-icon name="icon-arrow-left"></uui-icon>
          </uui-button>
          <uui-input
            id="header-name"
            .value=${this._formName}
            ?invalid=${this._formNameError}
            label=${this.localize.term("evaluatorConfig_nameLabel")}
            placeholder=${this.localize.term("evaluatorConfig_namePlaceholder")}
            @input=${(e) => {
      this._formName = e.target.value, this._formName && (this._formNameError = !1);
    }}>
          </uui-input>
        </div>
        <div id="content">
          <evaluator-form
            .configId=${this._editId}
            .name=${this._formName}
            @evaluator-name-loaded=${(e) => {
      this._formName = e.detail.name;
    }}
            @evaluator-saved=${() => this._handleSaved()}
            @evaluator-save-start=${() => {
      this._saving = !0;
    }}
            @evaluator-save-end=${() => {
      this._saving = !1;
    }}>
          </evaluator-form>
        </div>
        <umb-footer-layout>
          <div class="footer-breadcrumb">
            <span class="footer-breadcrumb-link" @click=${() => this._handleBack()}>
              ${this.localize.term("evaluatorConfig_sectionLabel")}
            </span>
            <span>/</span>
            <span>${this._breadcrumbName}</span>
          </div>
          <uui-button
            slot="actions"
            look="primary"
            color="positive"
            label=${this.localize.term("evaluatorConfig_saveButton")}
            ?disabled=${this._saving}
            @click=${() => this._handleSave()}>
            ${this._saving ? this.localize.term("evaluatorConfig_savingButton") : this.localize.term("evaluatorConfig_saveButton")}
          </uui-button>
        </umb-footer-layout>
      ` : this._loading ? r`<div id="content"><uui-loader></uui-loader></div>` : r`
      <div id="content">
        <div class="promo-notice">
          <img class="promo-logo" src="/App_Plugins/ProWorks.AI.PageEvaluator/proworks-logo.png" alt="ProWorks" />
          <div class="promo-notice-content">
            <h4>${this.localize.term("promoNotice_headline")}</h4>
            <p>${this.localize.term("promoNotice_body")}</p>
            <p>${this.localize.term("promoNotice_body2")}</p>
            <uui-button
              look="primary"
              label=${this.localize.term("promoNotice_linkText")}
              href="https://www.proworks.com/ai"
              target="_blank"
              rel="noopener">
              ${this.localize.term("promoNotice_linkText")} &rarr;
            </uui-button>
          </div>
        </div>
        <div class="list-header">
          <h2>${this.localize.term("evaluatorConfig_listHeadline")}</h2>
          <uui-button
            look="primary"
            label=${this.localize.term("evaluatorConfig_createButton")}
            @click=${() => this._handleCreate()}>
            ${this.localize.term("evaluatorConfig_createButton")}
          </uui-button>
        </div>

        ${this._error ? r`<uui-tag color="danger">${this._error}</uui-tag>` : d}

        ${this._groupedConfigs.size === 0 ? r`<p>${this.localize.term("evaluatorConfig_emptyState")}</p>` : Array.from(this._groupedConfigs.entries()).map(
      ([e, t]) => {
        var o;
        return r`
                <uui-box headline=${((o = t[0]) == null ? void 0 : o.documentTypeName) ?? e}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderName")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderProfile")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderStatus")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderActions")}</uui-table-head-cell>
                    </uui-table-head>
                    ${t.map(
          (i) => r`
                        <uui-table-row>
                          <uui-table-cell>
                            <strong>${i.name}</strong>
                            ${i.description ? r`<br /><small>${i.description}</small>` : d}
                          </uui-table-cell>
                          <uui-table-cell>${i.profileName ?? i.profileId}</uui-table-cell>
                          <uui-table-cell>
                            ${i.isActive ? r`<uui-tag color="positive" look="primary">${this.localize.term("evaluatorConfig_activeLabel")}</uui-tag>` : r`<uui-tag look="secondary">${this.localize.term("evaluatorConfig_inactiveLabel")}</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            ${i.isActive ? d : r`<uui-button
                                  look="secondary"
                                  label=${this.localize.term("evaluatorConfig_activateButton")}
                                  @click=${() => this._handleActivate(i.id)}>
                                  ${this.localize.term("evaluatorConfig_activateButton")}
                                </uui-button>`}
                            <uui-button
                              look="secondary"
                              label=${this.localize.term("evaluatorConfig_editButton")}
                              @click=${() => this._handleEdit(i.id)}>
                              ${this.localize.term("evaluatorConfig_editButton")}
                            </uui-button>
                            <uui-button
                              look="danger"
                              label=${this.localize.term("evaluatorConfig_deleteButton")}
                              @click=${() => this._handleDelete(i.id)}>
                              ${this.localize.term("evaluatorConfig_deleteButton")}
                            </uui-button>
                          </uui-table-cell>
                        </uui-table-row>
                      `
        )}
                  </uui-table>
                </uui-box>
              `;
      }
    )}

      </div>
    `;
  }
};
a.styles = h`
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

    #form-header {
      display: flex;
      align-items: center;
      width: 100%;
      height: var(--umb-header-layout-height);
      background-color: var(--uui-color-surface);
      border-bottom: 1px solid var(--uui-color-border);
      box-sizing: border-box;
      flex-shrink: 0;
      padding: 0 var(--uui-size-layout-1);
      gap: var(--uui-size-space-3);
    }

    #header-name {
      flex: 1 1 auto;
    }

    .promo-notice {
      margin-bottom: var(--uui-size-layout-1);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-layout-1);
      background: var(--uui-color-surface);
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-4);
    }

    .promo-notice img.promo-logo {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      object-fit: contain;
      margin-top: 2px;
    }

    .promo-notice-content h4 {
      margin: 0 0 var(--uui-size-space-2) 0;
      font-size: var(--uui-type-default-size, 0.95rem);
      font-weight: 600;
    }

    .promo-notice-content p {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: var(--uui-type-small-size, 0.85rem);
      color: var(--uui-color-text-alt);
      line-height: 1.5;
    }

    .promo-notice-content uui-button {
      margin-top: var(--uui-size-space-2);
    }

    .footer-breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: 0 var(--uui-size-layout-1);
    }

    .footer-breadcrumb-link {
      color: var(--uui-color-interactive);
      cursor: pointer;
    }

    .footer-breadcrumb-link:hover {
      color: var(--uui-color-interactive-emphasis);
      text-decoration: underline;
    }
  `;
u([
  s()
], a.prototype, "_configs", 2);
u([
  s()
], a.prototype, "_groupedConfigs", 2);
u([
  s()
], a.prototype, "_loading", 2);
u([
  s()
], a.prototype, "_error", 2);
u([
  s()
], a.prototype, "_view", 2);
u([
  s()
], a.prototype, "_editId", 2);
u([
  s()
], a.prototype, "_saving", 2);
u([
  s()
], a.prototype, "_formName", 2);
u([
  s()
], a.prototype, "_formNameError", 2);
a = u([
  m("evaluator-config-workspace")
], a);
export {
  a as EvaluatorConfigWorkspaceElement
};
//# sourceMappingURL=evaluator-config-workspace.element-CDRbKkDr.js.map
