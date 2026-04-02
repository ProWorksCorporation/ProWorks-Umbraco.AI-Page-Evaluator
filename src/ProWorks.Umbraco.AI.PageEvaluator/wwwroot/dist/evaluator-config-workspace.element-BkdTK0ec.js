import { html as l, nothing as c, css as h, state as s, customElement as f } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as p } from "@umbraco-cms/backoffice/lit-element";
import { a as g, d as v } from "./api-client-CgRHi73O.js";
import "./evaluator-form.element-BbKnzl6p.js";
var _ = Object.defineProperty, b = Object.getOwnPropertyDescriptor, u = (e, i, o, t) => {
  for (var a = t > 1 ? void 0 : t ? b(i, o) : i, n = e.length - 1, d; n >= 0; n--)
    (d = e[n]) && (a = (t ? d(i, o, a) : d(a)) || a);
  return t && a && _(i, o, a), a;
};
let r = class extends p {
  constructor() {
    super(...arguments), this._configs = [], this._loading = !1, this._error = null, this._view = "list", this._editId = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._loadConfigs();
  }
  async _loadConfigs() {
    this._loading = !0, this._error = null;
    try {
      const e = await g();
      this._configs = [...e.items];
    } catch {
      this._error = "Failed to load evaluator configurations.";
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
      o.sort((t, a) => t.isActive !== a.isActive ? t.isActive ? -1 : 1 : a.dateModified.localeCompare(t.dateModified)), e.set(i, o);
    return e;
  }
  async _handleDelete(e) {
    if (confirm("Are you sure you want to delete this evaluator configuration?"))
      try {
        await v(e), this._configs = this._configs.filter((i) => i.id !== e);
      } catch {
        this._error = "Failed to delete the evaluator configuration.";
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
    const e = this._groupByDocType();
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

        ${e.size === 0 ? l`<p>No evaluator configurations found. Create one to get started.</p>` : Array.from(e.entries()).map(
      ([i, o]) => l`
                <uui-box headline=${i}>
                  <uui-table>
                    <uui-table-head>
                      <uui-table-head-cell>Name</uui-table-head-cell>
                      <uui-table-head-cell>Profile</uui-table-head-cell>
                      <uui-table-head-cell>Status</uui-table-head-cell>
                      <uui-table-head-cell>Actions</uui-table-head-cell>
                    </uui-table-head>
                    ${o.map(
        (t) => l`
                        <uui-table-row>
                          <uui-table-cell>
                            <strong>${t.name}</strong>
                            ${t.description ? l`<br /><small>${t.description}</small>` : c}
                          </uui-table-cell>
                          <uui-table-cell>${t.profileName ?? t.profileId}</uui-table-cell>
                          <uui-table-cell>
                            ${t.isActive ? l`<uui-tag color="positive" look="primary">Active</uui-tag>` : l`<uui-tag look="secondary">Inactive</uui-tag>`}
                          </uui-table-cell>
                          <uui-table-cell>
                            <uui-button
                              look="secondary"
                              label="Edit"
                              @click=${() => this._handleEdit(t.id)}>
                              Edit
                            </uui-button>
                            <uui-button
                              look="danger"
                              label="Delete"
                              @click=${() => this._handleDelete(t.id)}>
                              Delete
                            </uui-button>
                          </uui-table-cell>
                        </uui-table-row>
                      `
      )}
                  </uui-table>
                </uui-box>
              `
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
//# sourceMappingURL=evaluator-config-workspace.element-BkdTK0ec.js.map
