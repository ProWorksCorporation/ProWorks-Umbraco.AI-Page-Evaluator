import { UmbWorkspaceActionBase as A } from "@umbraco-cms/backoffice/workspace";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as y } from "@umbraco-cms/backoffice/document";
import { UmbModalToken as m, umbOpenModal as g } from "@umbraco-cms/backoffice/modal";
const C = new m(
  "ProWorks.AI.PageEvaluator.Modal.Evaluation",
  { modal: { type: "sidebar", size: "medium" } }
), T = "NotCreated";
function v(e) {
  return typeof e == "object" && e !== null && "alias" in e && typeof e.alias == "string";
}
function p(e, a) {
  const o = e[a];
  return typeof o == "string" ? o : null;
}
class b extends A {
  async execute() {
    const a = await this.getContext(y);
    if (!a) return;
    const o = a.structure.getOwnerContentType()?.alias ?? "", i = a.getData?.(), d = i?.unique ?? "", r = a.getVariesByCulture() === !0 ? a.splitView.getActiveVariants()[0]?.culture ?? null : null, u = {}, l = i?.values;
    if (Array.isArray(l))
      for (const t of l) {
        if (!v(t)) continue;
        const n = p(t, "culture");
        p(t, "segment") === null && (n !== null && n !== r || (u[t.alias] = t.value));
      }
    let c = !1;
    if (r !== null) {
      const t = i?.variants, n = Array.isArray(t) ? t.find(
        (s) => typeof s == "object" && s !== null && "culture" in s && s.culture === r
      ) : void 0, f = n?.state;
      c = n === void 0 || typeof f != "string" || f === T;
    }
    try {
      await g(this, C, {
        data: { nodeId: d, documentTypeAlias: o, culture: r, cultureNotCreated: c, properties: u }
      });
    } catch {
    }
  }
}
export {
  b as PageEvaluatorWorkspaceActionApi,
  b as api,
  b as default
};
//# sourceMappingURL=page-evaluator-action.api-CT9qY17-.js.map
