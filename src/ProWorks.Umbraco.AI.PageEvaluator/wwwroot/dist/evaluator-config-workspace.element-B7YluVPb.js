import { html as l, nothing as d, css as h, state as n, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as m } from "@umbraco-cms/backoffice/lit-element";
import { umbConfirmModal as _ } from "@umbraco-cms/backoffice/modal";
import { a as v, b as g, d as b } from "./entry-point-INCDL3NC.js";
import "./evaluator-form.element-CmE5hYcr.js";
var p = Object.defineProperty, C = Object.getOwnPropertyDescriptor, u = (t, i, a, o) => {
  for (var e = o > 1 ? void 0 : o ? C(i, a) : i, s = t.length - 1, c; s >= 0; s--)
    (c = t[s]) && (e = (o ? c(i, a, e) : c(e)) || e);
  return o && e && p(i, a, e), e;
};
let r = class extends m {
  constructor() {
    super(...arguments), this._configs = [], this._loading = !1, this._error = null, this._view = "list", this._editId = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfigs();
  }
  async _loadConfigs() {
    this._loading = !0, this._error = null;
    try {
      const t = await v();
      this._configs = [...t.items];
    } catch {
      this._error = this.localize.term("evaluatorConfig_loadError");
    } finally {
      this._loading = !1;
    }
  }
  _groupByDocType() {
    const t = /* @__PURE__ */ new Map();
    for (const i of this._configs) {
      const a = t.get(i.documentTypeAlias) ?? [];
      a.push(i), t.set(i.documentTypeAlias, a);
    }
    for (const [i, a] of t)
      a.sort((o, e) => o.isActive !== e.isActive ? o.isActive ? -1 : 1 : e.dateModified.localeCompare(o.dateModified)), t.set(i, a);
    return t;
  }
  async _handleActivate(t) {
    try {
      await g(t), await this._loadConfigs();
    } catch {
      this._error = this.localize.term("evaluatorConfig_activateError");
    }
  }
  async _handleDelete(t) {
    try {
      await _(this, {
        headline: this.localize.term("evaluatorConfig_deleteConfirmHeadline"),
        content: this.localize.term("evaluatorConfig_deleteConfirmContent"),
        color: "danger",
        confirmLabel: this.localize.term("evaluatorConfig_deleteButton")
      });
    } catch {
      return;
    }
    try {
      await b(t), this._configs = this._configs.filter((i) => i.id !== t);
    } catch {
      this._error = this.localize.term("evaluatorConfig_deleteError");
    }
  }
  _handleEdit(t) {
    this._editId = t, this._view = "form";
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
    if (this._view === "form")
      return l`
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
      `;
    if (this._loading)
      return l`<div id="content"><uui-loader></uui-loader></div>`;
    const t = this._groupByDocType();
    return l`
      <div id="content">
        <div class="list-header">
          <h2>${this.localize.term("evaluatorConfig_listHeadline")}</h2>
          <uui-button
            look="primary"
            label=${this.localize.term("evaluatorConfig_createButton")}
            @click=${() => this._handleCreate()}>
            ${this.localize.term("evaluatorConfig_createButton")}
          </uui-button>
        </div>

        ${this._error ? l`<uui-tag color="danger">${this._error}</uui-tag>` : d}

        ${t.size === 0 ? l`<p>${this.localize.term("evaluatorConfig_emptyState")}</p>` : Array.from(t.entries()).map(
      ([i, a]) => {
        var o;
        return l`
                <uui-box headline=${((o = a[0]) == null ? void 0 : o.documentTypeName) ?? i}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderName")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderProfile")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderStatus")}</uui-table-head-cell>
                      <uui-table-head-cell>${this.localize.term("evaluatorConfig_tableHeaderActions")}</uui-table-head-cell>
                    </uui-table-head>
                    ${a.map(
          (e) => l`
                        <uui-table-row>
                          <uui-table-cell>
                            <strong>${e.name}</strong>
                            ${e.description ? l`<br /><small>${e.description}</small>` : d}
                          </uui-table-cell>
                          <uui-table-cell>${e.profileName ?? e.profileId}</uui-table-cell>
                          <uui-table-cell>
                            ${e.isActive ? l`<uui-tag color="positive" look="primary">${this.localize.term("evaluatorConfig_activeLabel")}</uui-tag>` : l`<uui-tag look="secondary">${this.localize.term("evaluatorConfig_inactiveLabel")}</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            ${e.isActive ? d : l`<uui-button
                                  look="secondary"
                                  label=${this.localize.term("evaluatorConfig_activateButton")}
                                  @click=${() => this._handleActivate(e.id)}>
                                  ${this.localize.term("evaluatorConfig_activateButton")}
                                </uui-button>`}
                            <uui-button
                              look="secondary"
                              label=${this.localize.term("evaluatorConfig_editButton")}
                              @click=${() => this._handleEdit(e.id)}>
                              ${this.localize.term("evaluatorConfig_editButton")}
                            </uui-button>
                            <uui-button
                              look="danger"
                              label=${this.localize.term("evaluatorConfig_deleteButton")}
                              @click=${() => this._handleDelete(e.id)}>
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
  `;
u([
  n()
], r.prototype, "_configs", 2);
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
  f("evaluator-config-workspace")
], r);
export {
  r as EvaluatorConfigWorkspaceElement
};
//# sourceMappingURL=evaluator-config-workspace.element-B7YluVPb.js.map
