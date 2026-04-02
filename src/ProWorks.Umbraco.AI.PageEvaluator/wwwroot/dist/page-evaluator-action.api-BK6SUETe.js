var g = (e) => {
  throw TypeError(e);
};
var v = (e, o, t) => o.has(e) || g("Cannot " + t);
var m = (e, o, t) => o.has(e) ? g("Cannot add the same private member more than once") : o instanceof WeakSet ? o.add(e) : o.set(e, t);
var r = (e, o, t) => (v(e, o, "access private method"), t);
import { UmbWorkspaceActionBase as T } from "@umbraco-cms/backoffice/workspace";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as d } from "@umbraco-cms/backoffice/document";
import { UmbModalToken as w, UMB_MODAL_MANAGER_CONTEXT as E } from "@umbraco-cms/backoffice/modal";
import { g as M } from "./api-client-CgRHi73O.js";
const O = new w(
  "ProWorks.AI.PageEvaluator.Modal.Evaluation",
  { modal: { type: "sidebar", size: "medium" } }
);
var n, C, h;
class D extends T {
  constructor() {
    super(...arguments);
    m(this, n);
  }
  hostConnected() {
    super.hostConnected(), this.disable(), r(this, n, h).call(this);
  }
  async execute() {
    var f, p;
    const t = await this.getContext(d);
    if (!t) return;
    const s = ((f = t.structure.getOwnerContentType()) == null ? void 0 : f.alias) ?? "", a = (p = t.getData) == null ? void 0 : p.call(t), y = (a == null ? void 0 : a.unique) ?? "", c = {}, l = a == null ? void 0 : a.values;
    if (Array.isArray(l)) {
      for (const i of l)
        if (typeof i == "object" && i !== null && "alias" in i) {
          const A = i;
          c[A.alias] = A.value;
        }
    }
    const u = await this.getContext(E);
    u && u.open(this, O, {
      data: { nodeId: y, documentTypeAlias: s, properties: c }
    });
  }
}
n = new WeakSet(), C = async function() {
  var s;
  const t = await this.getContext(d);
  if (t)
    return (s = t.structure.getOwnerContentType()) == null ? void 0 : s.alias;
}, h = async function() {
  const t = await r(this, n, C).call(this);
  if (!t) return;
  await M(t).catch(() => null) !== null && this.enable();
};
export {
  D as PageEvaluatorWorkspaceActionApi,
  D as api,
  D as default
};
//# sourceMappingURL=page-evaluator-action.api-BK6SUETe.js.map
