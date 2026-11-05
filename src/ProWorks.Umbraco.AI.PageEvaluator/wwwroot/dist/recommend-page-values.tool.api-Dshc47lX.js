import { UmbControllerBase as T } from "@umbraco-cms/backoffice/class-api";
import { r as x, a as D } from "./entry-point-BaHbZCD-.js";
import { c as C, a as F, b as I, i as N } from "./recommend-eligibility-CHWTCfzX.js";
import { t as S, a as y, r as P, f as B, c as L, d as M, b as U, g as V, T as A } from "./open-document-B1hA0Wkh.js";
function _(m) {
  const t = m.propertyAliases;
  if (!Array.isArray(t) || t.length === 0) return null;
  const r = [];
  for (const e of t) {
    if (typeof e != "string" || e.trim() === "") return null;
    r.includes(e) || r.push(e);
  }
  return r;
}
function G(m, t) {
  const r = (e) => (e.propertyAliases ?? []).includes(m);
  return t.checks.find((e) => e.status === "Fail" && r(e)) ?? t.checks.find((e) => e.status === "Warn" && r(e));
}
class z extends T {
  async execute(t) {
    try {
      return await this.#e(t);
    } catch (r) {
      return S(r);
    }
  }
  async #e(t) {
    const r = _(t);
    if (r === null) return y("invalidArguments", A.invalidArguments);
    const e = await P(this);
    if (!e.ok) return e.failure;
    const l = e.document;
    B(l.nodeId);
    const f = await this.#r(l);
    if (f === null) return y("noReport", A.noReport);
    const { report: s, upToDate: n } = f;
    if (!s.recommendationsEnabled)
      return y("recommendationsDisabled", A.recommendationsDisabled);
    if (!n) return y("reportOutOfDate", A.reportOutOfDate);
    const { nodeId: i, culture: p, properties: k } = l, u = [], g = /* @__PURE__ */ new Map();
    for (const o of r) {
      const c = G(o, s);
      if (c === void 0)
        u.push({ propertyAlias: o, reason: "notFailing" });
      else if (!C(o, s, k[o]))
        u.push({ propertyAlias: o, reason: "notRecommendable" });
      else {
        const d = g.get(c.checkNumber) ?? { check: c, aliases: [] };
        d.aliases.push(o), g.set(c.checkNumber, d);
      }
    }
    const R = s.culture ?? p?.toLowerCase() ?? null, O = F(k, s.propertyEditorAliases), b = [];
    for (const { check: o, aliases: c } of g.values()) {
      let d;
      try {
        ({ recommendedValues: d } = await x({
          nodeId: i,
          culture: p,
          propertyAliases: c,
          checkLabel: o.label,
          checkExplanation: o.explanation ?? null,
          properties: O
        }));
      } catch (a) {
        return { success: !1, culture: R, recommendations: b, skipped: u, error: { ...L(a), checkId: o.checkNumber } };
      }
      for (const a of c) {
        const h = d[a];
        if (typeof h != "string") {
          u.push({ propertyAlias: a, reason: "noRecommendation" });
          continue;
        }
        const E = s.propertyEditorAliases[a], w = M({
          nodeId: i,
          culture: p,
          propertyAlias: a,
          editorAlias: E,
          value: h,
          additionalRecommendableEditorAliases: s.additionalRecommendableEditorAliases
        }), v = I(a, h, k[a], s);
        b.push({
          reference: w.reference,
          propertyAlias: a,
          propertyName: s.propertyNames[a] ?? a,
          checkId: o.checkNumber,
          value: h,
          canApply: v,
          ...!v && N(E) ? { applyBlockedReason: "richTextBlocks" } : {}
        });
      }
    }
    return { success: !0, culture: R, recommendations: b, skipped: u };
  }
  /**
   * The report for the open page and whether it still matches the page (spec FR-002a). A report this tool evaluated
   * fresh is up to date while the captured values equal the evaluated ones (unsaved values included). Any other
   * report must be neither saved over nor have unsaved changes, and the values must not have changed since it was
   * read (a later save would otherwise go unnoticed).
   */
  async #r(t) {
    const { nodeId: r, culture: e, properties: l, workspaceContext: f } = t, s = U(l), n = V(r, e);
    if (n?.fresh === !0) return { report: n.report, upToDate: n.snapshot === s };
    const i = n?.report ?? await D(r, e);
    if (i === null) return null;
    const p = i.savedSinceEvaluation !== !0 && !f.getHasUnpersistedChanges() && (n === void 0 || n.snapshot === s);
    return { report: i, upToDate: p };
  }
}
export {
  z as RecommendPageValuesToolApi,
  z as api,
  z as default
};
//# sourceMappingURL=recommend-page-values.tool.api-Dshc47lX.js.map
