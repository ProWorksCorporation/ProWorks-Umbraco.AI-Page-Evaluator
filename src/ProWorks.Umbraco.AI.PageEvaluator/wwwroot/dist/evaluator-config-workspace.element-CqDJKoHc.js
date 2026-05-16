import { html as a, nothing as d, css as h, state as s, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as v } from "@umbraco-cms/backoffice/lit-element";
import { umbConfirmModal as p } from "@umbraco-cms/backoffice/modal";
import { a as g, b as f, d as _ } from "./entry-point-DyelNDtU.js";
import "./evaluator-form.element-DQ5ZLQ8r.js";
var b = Object.defineProperty, y = Object.getOwnPropertyDescriptor, u = (e, t, o, i) => {
  for (var r = i > 1 ? void 0 : i ? y(t, o) : t, n = e.length - 1, c; n >= 0; n--)
    (c = e[n]) && (r = (i ? c(t, o, r) : c(r)) || r);
  return i && r && b(t, o, r), r;
};
let l = class extends v {
  constructor() {
    super(...arguments), this._configs = [], this._groupedConfigs = /* @__PURE__ */ new Map(), this._loading = !1, this._error = null, this._view = "list", this._editId = null, this._saving = !1;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfigs();
  }
  async _loadConfigs() {
    this._loading = !0, this._error = null;
    try {
      const e = await g();
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
      o.sort((i, r) => i.isActive !== r.isActive ? i.isActive ? -1 : 1 : r.dateModified.localeCompare(i.dateModified)), e.set(t, o);
    return e;
  }
  async _handleActivate(e) {
    try {
      await f(e), await this._loadConfigs();
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
      await _(e), this._configs = this._configs.filter((t) => t.id !== e), this._groupedConfigs = this._groupByDocType();
    } catch {
      this._error = this.localize.term("evaluatorConfig_deleteError");
    }
  }
  _handleEdit(e) {
    this._editId = e, this._view = "form";
  }
  _handleCreate() {
    this._editId = null, this._view = "form";
  }
  _handleSaved() {
    this._view = "list", this._editId = null, this._loadConfigs();
  }
  _handleBack() {
    this._view = "list", this._editId = null;
  }
  _handleSave() {
    var t;
    const e = (t = this.shadowRoot) == null ? void 0 : t.querySelector("evaluator-form");
    e == null || e.submit();
  }
  get _breadcrumbName() {
    var e;
    return this._editId ? ((e = this._configs.find((t) => t.id === this._editId)) == null ? void 0 : e.name) ?? this.localize.term("evaluatorConfig_editHeadline") : this.localize.term("evaluatorConfig_createHeadline");
  }
  render() {
    return this._view === "form" ? a`
        <div id="content">
          <div class="form-header">
            <h3>${this._editId ? this.localize.term("evaluatorConfig_editHeadline") : this.localize.term("evaluatorConfig_createHeadline")}</h3>
            <uui-button
              look="secondary"
              label=${this.localize.term("evaluatorConfig_backLabel")}
              @click=${() => this._handleBack()}>
              &larr; ${this.localize.term("evaluatorConfig_backButton")}
            </uui-button>
          </div>
          <evaluator-form
            .configId=${this._editId}
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
      ` : this._loading ? a`<div id="content"><uui-loader></uui-loader></div>` : a`
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

        ${this._error ? a`<uui-tag color="danger">${this._error}</uui-tag>` : d}

        ${this._groupedConfigs.size === 0 ? a`<p>${this.localize.term("evaluatorConfig_emptyState")}</p>` : Array.from(this._groupedConfigs.entries()).map(
      ([e, t]) => {
        var o;
        return a`
                <uui-box headline=${((o = t[0]) == null ? void 0 : o.documentTypeName) ?? e}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderName")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderProfile")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderStatus")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderActions")}</uui-table-head-cell>
                    </uui-table-head>
                    ${t.map(
          (i) => a`
                        <uui-table-row>
                          <uui-table-cell>
                            <strong>${i.name}</strong>
                            ${i.description ? a`<br /><small>${i.description}</small>` : d}
                          </uui-table-cell>
                          <uui-table-cell>${i.profileName ?? i.profileId}</uui-table-cell>
                          <uui-table-cell>
                            ${i.isActive ? a`<uui-tag color="positive" look="primary">${this.localize.term("evaluatorConfig_activeLabel")}</uui-tag>` : a`<uui-tag look="secondary">${this.localize.term("evaluatorConfig_inactiveLabel")}</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            ${i.isActive ? d : a`<uui-button
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
l.styles = h`
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
], l.prototype, "_configs", 2);
u([
  s()
], l.prototype, "_groupedConfigs", 2);
u([
  s()
], l.prototype, "_loading", 2);
u([
  s()
], l.prototype, "_error", 2);
u([
  s()
], l.prototype, "_view", 2);
u([
  s()
], l.prototype, "_editId", 2);
u([
  s()
], l.prototype, "_saving", 2);
l = u([
  m("evaluator-config-workspace")
], l);
export {
  l as EvaluatorConfigWorkspaceElement
};
//# sourceMappingURL=evaluator-config-workspace.element-CqDJKoHc.js.map
