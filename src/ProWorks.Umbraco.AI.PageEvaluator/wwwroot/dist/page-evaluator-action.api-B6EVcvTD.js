import { UmbWorkspaceActionBase as u } from "@umbraco-cms/backoffice/workspace";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as p } from "@umbraco-cms/backoffice/document";
import { UmbModalToken as m, umbOpenModal as A } from "@umbraco-cms/backoffice/modal";
const f = new m(
  "ProWorks.AI.PageEvaluator.Modal.Evaluation",
  { modal: { type: "sidebar", size: "medium" } }
);
class T extends u {
  async execute() {
    var n, r;
    const a = await this.getContext(p);
    if (!a) return;
    const c = ((n = a.structure.getOwnerContentType()) == null ? void 0 : n.alias) ?? "", t = (r = a.getData) == null ? void 0 : r.call(a), l = (t == null ? void 0 : t.unique) ?? "", o = {}, s = t == null ? void 0 : t.values;
    if (Array.isArray(s)) {
      for (const e of s)
        if (typeof e == "object" && e !== null && "alias" in e) {
          const i = e;
          o[i.alias] = i.value;
        }
    }
    try {
      await A(this, f, {
        data: { nodeId: l, documentTypeAlias: c, properties: o }
      });
    } catch {
    }
  }
}
export {
  T as PageEvaluatorWorkspaceActionApi,
  T as api,
  T as default
};
//# sourceMappingURL=page-evaluator-action.api-B6EVcvTD.js.map
