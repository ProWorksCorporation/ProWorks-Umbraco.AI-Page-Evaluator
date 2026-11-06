import { UmbControllerBase as A } from "@umbraco-cms/backoffice/class-api";
import { UmbContextConsumer as h } from "@umbraco-cms/backoffice/context-api";
import { UMB_VALIDATION_CONTEXT as E } from "@umbraco-cms/backoffice/validation";
import { UmbVariantId as m } from "@umbraco-cms/backoffice/variant";
import { i as R, d as T, e as V, b as w, f as O } from "./recommend-eligibility-CHWTCfzX.js";
import { t as S, r as b, a as p, T as I } from "./open-document-B6ujVz0h.js";
import { g as P, d as v } from "./recommendation-store-CqanfkLM.js";
const C = "Staged in the editor. The user must click Save to keep it.";
function n(i) {
  return p(i, I[i]);
}
function M(i, e) {
  return (i?.toLowerCase() ?? null) === (e?.toLowerCase() ?? null);
}
async function B(i) {
  let e;
  try {
    const t = i.getHostElement();
    if (!t.isConnected) return;
    e = new h(t, E);
    const r = e.asPromise();
    return e.hostConnected(), (await r)?.messages;
  } catch {
    return;
  } finally {
    e?.destroy();
  }
}
class N extends A {
  async execute(e) {
    try {
      return await this.#e(e);
    } catch (t) {
      return S(t);
    }
  }
  async #e(e) {
    const t = e.reference;
    if (typeof t != "string" || t === "") return n("invalidArguments");
    const r = P(t);
    if (r === void 0) return n("unknownRecommendation");
    const a = await b(this);
    if (!a.ok) return a.failure;
    const { workspaceContext: o, nodeId: u, culture: s } = a.document;
    if (u !== r.nodeId) return n("differentPage");
    if (!M(s, r.culture)) {
      const l = r.culture ?? "the default language";
      return p(
        "languageChanged",
        `This recommendation was made for ${l}. Ask the user to switch the editor back to ${l} to apply it.`
      );
    }
    return await this.#t(o, s, r);
  }
  async #t(e, t, r) {
    const { propertyAlias: a, editorAlias: o, value: u } = r, s = await e.structure.getPropertyStructureByAlias(a);
    if (!s) return n("propertyMissing");
    const l = m.Create({ culture: t, segment: null }), f = t !== null && e.getVariesByCulture() === !0 && s.variesByCulture === !0, c = m.Create({ culture: f ? t : null, segment: null });
    if (e.readOnlyGuard.getIsPermittedForVariant(l) === !0 || e.propertyWriteGuard.getIsPermittedForVariantAndProperty(
      c,
      { unique: s.unique },
      l
    ) === !1) return n("readOnly");
    const d = e.getPropertyValue(a, c);
    if (R(o) && !T(V(d), u))
      return n("richTextBlocks");
    const y = {
      propertyEditorAliases: o === void 0 ? {} : { [a]: o },
      additionalRecommendableEditorAliases: r.additionalRecommendableEditorAliases ?? []
    };
    if (!w(a, u, d, y)) return n("notApplicable");
    const g = await B(e);
    return await O(e, a, o, u, t, g) ? (v(r.reference), {
      success: !0,
      propertyAlias: a,
      culture: t?.toLowerCase() ?? null,
      saved: !1,
      message: C
    }) : n("writeFailed");
  }
}
export {
  N as ApplyPageRecommendationToolApi,
  N as api,
  N as default
};
//# sourceMappingURL=apply-page-recommendation.tool.api-C1lYCbC8.js.map
