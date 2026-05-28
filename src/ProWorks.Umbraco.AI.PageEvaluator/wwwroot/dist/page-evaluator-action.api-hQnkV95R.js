import { UmbWorkspaceActionBase as c } from "@umbraco-cms/backoffice/workspace";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as l } from "@umbraco-cms/backoffice/document";
import { UmbModalToken as u, umbOpenModal as p } from "@umbraco-cms/backoffice/modal";
const d = new u(
  "ProWorks.AI.PageEvaluator.Modal.Evaluation",
  { modal: { type: "sidebar", size: "medium" } }
);
class E extends c {
  async execute() {
    const t = await this.getContext(l);
    if (!t) return;
    const n = t.structure.getOwnerContentType()?.alias ?? "", e = t.getData?.(), i = e?.unique ?? "", o = {}, s = e?.values;
    if (Array.isArray(s)) {
      for (const a of s)
        if (typeof a == "object" && a !== null && "alias" in a) {
          const r = a;
          o[r.alias] = r.value;
        }
    }
    try {
      await p(this, d, {
        data: { nodeId: i, documentTypeAlias: n, properties: o }
      });
    } catch {
    }
  }
}
export {
  E as PageEvaluatorWorkspaceActionApi,
  E as api,
  E as default
};
//# sourceMappingURL=page-evaluator-action.api-hQnkV95R.js.map
