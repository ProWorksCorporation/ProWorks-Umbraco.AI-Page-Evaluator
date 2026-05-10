import { html as a, nothing as d, css as h, state as n, customElement as m } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as p } from "@umbraco-cms/backoffice/lit-element";
import { umbConfirmModal as g } from "@umbraco-cms/backoffice/modal";
import { a as f, b as v, d as _ } from "./entry-point-CTsA956V.js";
import "./evaluator-form.element-JMRyNoT7.js";
var b = Object.defineProperty, y = Object.getOwnPropertyDescriptor, u = (e, i, o, t) => {
  for (var l = t > 1 ? void 0 : t ? y(i, o) : i, s = e.length - 1, c; s >= 0; s--)
    (c = e[s]) && (l = (t ? c(i, o, l) : c(l)) || l);
  return t && l && b(i, o, l), l;
};
let r = class extends p {
  constructor() {
    super(...arguments), this._configs = [], this._groupedConfigs = /* @__PURE__ */ new Map(), this._loading = !1, this._error = null, this._view = "list", this._editId = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfigs();
  }
  async _loadConfigs() {
    this._loading = !0, this._error = null;
    try {
      const e = await f();
      this._configs = [...e.items], this._groupedConfigs = this._groupByDocType();
    } catch {
      this._error = this.localize.term("evaluatorConfig_loadError");
    } finally {
      this._loading = !1;
    }
  }
  _groupByDocType() {
    const e = /* @__PURE__ */ new Map();
    for (const i of this._configs) {
      const o = e.get(i.documentTypeAlias) ?? [];
      o.push(i), e.set(i.documentTypeAlias, o);
    }
    for (const [i, o] of e)
      o.sort((t, l) => t.isActive !== l.isActive ? t.isActive ? -1 : 1 : l.dateModified.localeCompare(t.dateModified)), e.set(i, o);
    return e;
  }
  async _handleActivate(e) {
    try {
      await v(e), await this._loadConfigs();
    } catch {
      this._error = this.localize.term("evaluatorConfig_activateError");
    }
  }
  async _handleDelete(e) {
    try {
      await g(this, {
        headline: this.localize.term("evaluatorConfig_deleteConfirmHeadline"),
        content: this.localize.term("evaluatorConfig_deleteConfirmContent"),
        color: "danger",
        confirmLabel: this.localize.term("evaluatorConfig_deleteButton")
      });
    } catch {
      return;
    }
    try {
      await _(e), this._configs = this._configs.filter((i) => i.id !== e), this._groupedConfigs = this._groupByDocType();
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
            @evaluator-saved=${() => this._handleSaved()}>
          </evaluator-form>
        </div>
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
      ([e, i]) => {
        var o;
        return a`
                <uui-box headline=${((o = i[0]) == null ? void 0 : o.documentTypeName) ?? e}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderName")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderProfile")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderStatus")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderActions")}</uui-table-head-cell>
                    </uui-table-head>
                    ${i.map(
          (t) => a`
                        <uui-table-row>
                          <uui-table-cell>
                            <strong>${t.name}</strong>
                            ${t.description ? a`<br /><small>${t.description}</small>` : d}
                          </uui-table-cell>
                          <uui-table-cell>${t.profileName ?? t.profileId}</uui-table-cell>
                          <uui-table-cell>
                            ${t.isActive ? a`<uui-tag color="positive" look="primary">${this.localize.term("evaluatorConfig_activeLabel")}</uui-tag>` : a`<uui-tag look="secondary">${this.localize.term("evaluatorConfig_inactiveLabel")}</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            ${t.isActive ? d : a`<uui-button
                                  look="secondary"
                                  label=${this.localize.term("evaluatorConfig_activateButton")}
                                  @click=${() => this._handleActivate(t.id)}>
                                  ${this.localize.term("evaluatorConfig_activateButton")}
                                </uui-button>`}
                            <uui-button
                              look="secondary"
                              label=${this.localize.term("evaluatorConfig_editButton")}
                              @click=${() => this._handleEdit(t.id)}>
                              ${this.localize.term("evaluatorConfig_editButton")}
                            </uui-button>
                            <uui-button
                              look="danger"
                              label=${this.localize.term("evaluatorConfig_deleteButton")}
                              @click=${() => this._handleDelete(t.id)}>
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
r.styles = h`
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
  `;
u([
  n()
], r.prototype, "_configs", 2);
u([
  n()
], r.prototype, "_groupedConfigs", 2);
u([
  n()
], r.prototype, "_loading", 2);
u([
  n()
], r.prototype, "_error", 2);
u([
  n()
], r.prototype, "_view", 2);
u([
  n()
], r.prototype, "_editId", 2);
r = u([
  m("evaluator-config-workspace")
], r);
export {
  r as EvaluatorConfigWorkspaceElement
};
//# sourceMappingURL=evaluator-config-workspace.element-BsTYrgj9.js.map
