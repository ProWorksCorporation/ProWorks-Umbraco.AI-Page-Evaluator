import { html as l, nothing as c, css as h, state as s, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as v } from "@umbraco-cms/backoffice/lit-element";
import { a as p, b as _, d as g } from "./entry-point-lCnS3C-U.js";
import "./evaluator-form.element-DssWJ1_z.js";
var b = Object.defineProperty, m = Object.getOwnPropertyDescriptor, u = (t, i, a, o) => {
  for (var e = o > 1 ? void 0 : o ? m(i, a) : i, n = t.length - 1, d; n >= 0; n--)
    (d = t[n]) && (e = (o ? d(i, a, e) : d(e)) || e);
  return o && e && b(i, a, e), e;
};
let r = class extends v {
  constructor() {
    super(...arguments), this._configs = [], this._loading = !1, this._error = null, this._view = "list", this._editId = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfigs();
  }
  async _loadConfigs() {
    this._loading = !0, this._error = null;
    try {
      const t = await p();
      this._configs = [...t.items];
    } catch {
      this._error = "Failed to load evaluator configurations.";
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
      await _(t), await this._loadConfigs();
    } catch {
      this._error = "Failed to activate the evaluator configuration.";
    }
  }
  async _handleDelete(t) {
    if (confirm("Are you sure you want to delete this evaluator configuration?"))
      try {
        await g(t), this._configs = this._configs.filter((i) => i.id !== t);
      } catch {
        this._error = "Failed to delete the evaluator configuration.";
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
            <h3>${this._editId ? "Edit Configuration" : "Create Configuration"}</h3>
            <uui-button
              look="secondary"
              label="Back to list"
              @click=${() => this._handleBack()}>
              &larr; Back
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
          <h2>Page Evaluator Configurations</h2>
          <uui-button
            look="primary"
            label="Create New"
            @click=${() => this._handleCreate()}>
            Create New
          </uui-button>
        </div>

        ${this._error ? l`<uui-tag color="danger">${this._error}</uui-tag>` : c}

        ${t.size === 0 ? l`<p>No evaluator configurations found. Create one to get started.</p>` : Array.from(t.entries()).map(
      ([i, a]) => {
        var o;
        return l`
                <uui-box headline=${((o = a[0]) == null ? void 0 : o.documentTypeName) ?? i}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>Name</uui-table-head-cell>
                      <uui-table-head-cell>Profile</uui-table-head-cell>
                      <uui-table-head-cell>Status</uui-table-head-cell>
                      <uui-table-head-cell>Actions</uui-table-head-cell>
                    </uui-table-head>
                    ${a.map(
          (e) => l`
                        <uui-table-row>
                          <uui-table-cell>
                            <strong>${e.name}</strong>
                            ${e.description ? l`<br /><small>${e.description}</small>` : c}
                          </uui-table-cell>
                          <uui-table-cell>${e.profileName ?? e.profileId}</uui-table-cell>
                          <uui-table-cell>
                            ${e.isActive ? l`<uui-tag color="positive" look="primary">Active</uui-tag>` : l`<uui-tag look="secondary">Inactive</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            ${e.isActive ? c : l`<uui-button
                                  look="secondary"
                                  label="Activate"
                                  @click=${() => this._handleActivate(e.id)}>
                                  Activate
                                </uui-button>`}
                            <uui-button
                              look="secondary"
                              label="Edit"
                              @click=${() => this._handleEdit(e.id)}>
                              Edit
                            </uui-button>
                            <uui-button
                              look="danger"
                              label="Delete"
                              @click=${() => this._handleDelete(e.id)}>
                              Delete
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
  s()
], r.prototype, "_configs", 2);
u([
  s()
], r.prototype, "_loading", 2);
u([
  s()
], r.prototype, "_error", 2);
u([
  s()
], r.prototype, "_view", 2);
u([
  s()
], r.prototype, "_editId", 2);
r = u([
  f("evaluator-config-workspace")
], r);
export {
  r as EvaluatorConfigWorkspaceElement
};
//# sourceMappingURL=evaluator-config-workspace.element-BoAzuy8R.js.map
