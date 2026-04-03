import { UmbWorkspaceActionBase as p } from "@umbraco-cms/backoffice/workspace";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as A } from "@umbraco-cms/backoffice/document";
import { UmbModalToken as m, UMB_MODAL_MANAGER_CONTEXT as f } from "@umbraco-cms/backoffice/modal";
const d = new m(
  "ProWorks.AI.PageEvaluator.Modal.Evaluation",
  { modal: { type: "sidebar", size: "medium" } }
);
class O extends p {
  async execute() {
    var r, i;
    const e = await this.getContext(A);
    if (!e) return;
    const l = ((r = e.structure.getOwnerContentType()) == null ? void 0 : r.alias) ?? "", t = (i = e.getData) == null ? void 0 : i.call(e), u = (t == null ? void 0 : t.unique) ?? "", a = {}, s = t == null ? void 0 : t.values;
    if (Array.isArray(s)) {
      for (const o of s)
        if (typeof o == "object" && o !== null && "alias" in o) {
          const c = o;
          a[c.alias] = c.value;
        }
    }
    const n = await this.getContext(f);
    n && n.open(this, d, {
      data: { nodeId: u, documentTypeAlias: l, properties: a }
    });
  }
}
export {
  O as PageEvaluatorWorkspaceActionApi,
  O as api,
  O as default
};
//# sourceMappingURL=page-evaluator-action.api-_P8W7Noa.js.map
