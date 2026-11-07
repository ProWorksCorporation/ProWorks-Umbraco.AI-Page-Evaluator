import { UmbWorkspaceActionBase as t } from "@umbraco-cms/backoffice/workspace";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as o } from "@umbraco-cms/backoffice/document";
import { UmbModalToken as e, umbOpenModal as r } from "@umbraco-cms/backoffice/modal";
import { c as s } from "./capture-draft-B0O4yTps.js";
const i = new e(
  "ProWorks.AI.PageEvaluator.Modal.Evaluation",
  { modal: { type: "sidebar", size: "medium" } }
);
class d extends t {
  async execute() {
    const a = await this.getContext(o);
    if (a)
      try {
        await r(this, i, { data: s(a) });
      } catch {
      }
  }
}
export {
  d as PageEvaluatorWorkspaceActionApi,
  d as api,
  d as default
};
//# sourceMappingURL=page-evaluator-action.api-DGg3OyuV.js.map
