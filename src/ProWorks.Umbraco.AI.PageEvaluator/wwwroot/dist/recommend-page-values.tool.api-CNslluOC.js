import { UmbControllerBase as O } from "@umbraco-cms/backoffice/class-api";
import { r as D, a as C } from "./entry-point-x4knHgGw.js";
import { c as N, a as S, b as F, i as I } from "./recommend-eligibility-CHWTCfzX.js";
import { t as _, a as A, r as P, f as M, c as B, b as L, g as U, T as k } from "./open-document-B6ujVz0h.js";
import { a as V } from "./recommendation-store-CqanfkLM.js";
const j = "Show each recommended value to the user exactly as written and ask which ones to apply. Do not call apply_page_recommendation in this turn: wait for the user’s reply, even if they asked you to fix the checks. The approval prompt does not show the value, so the user can only judge what you show them here.";
function G(h) {
  const r = h.propertyAliases;
  if (!Array.isArray(r) || r.length === 0) return null;
  const t = [];
  for (const e of r) {
    if (typeof e != "string" || e.trim() === "") return null;
    t.includes(e) || t.push(e);
  }
  return t;
}
function H(h, r) {
  const t = (e) => (e.propertyAliases ?? []).includes(h);
  return r.checks.find((e) => e.status === "Fail" && t(e)) ?? r.checks.find((e) => e.status === "Warn" && t(e));
}
class K extends O {
  async execute(r) {
    try {
      return await this.#e(r);
    } catch (t) {
      return _(t);
    }
  }
  async #e(r) {
    const t = G(r);
    if (t === null)
      return A(
        "invalidArguments",
        k.invalidArguments
      );
    const e = await P(this);
    if (!e.ok) return e.failure;
    const u = e.document;
    M(u.nodeId);
    const f = await this.#t(u);
    if (f === null)
      return A("noReport", k.noReport);
    const { report: o, upToDate: n } = f;
    if (!o.recommendationsEnabled)
      return A(
        "recommendationsDisabled",
        k.recommendationsDisabled
      );
    if (!n)
      return A(
        "reportOutOfDate",
        k.reportOutOfDate
      );
    const { nodeId: i, culture: p, properties: g } = u, l = [], E = /* @__PURE__ */ new Map();
    for (const s of t) {
      const c = H(s, o);
      if (c === void 0)
        l.push({ propertyAlias: s, reason: "notFailing" });
      else if (!N(s, o, g[s]))
        l.push({ propertyAlias: s, reason: "notRecommendable" });
      else {
        const m = E.get(c.checkNumber) ?? { check: c, aliases: [] };
        m.aliases.push(s), E.set(c.checkNumber, m);
      }
    }
    const R = o.culture ?? p?.toLowerCase() ?? null, T = S(
      g,
      o.propertyEditorAliases
    ), d = [];
    for (const { check: s, aliases: c } of E.values()) {
      let m;
      try {
        ({ recommendedValues: m } = await D({
          nodeId: i,
          culture: p,
          propertyAliases: c,
          checkLabel: s.label,
          checkExplanation: s.explanation ?? null,
          properties: T
        }));
      } catch (a) {
        return {
          success: !1,
          culture: R,
          recommendations: d,
          skipped: l,
          error: { ...B(a), checkId: s.checkNumber }
        };
      }
      for (const a of c) {
        const y = m[a];
        if (typeof y != "string") {
          l.push({ propertyAlias: a, reason: "noRecommendation" });
          continue;
        }
        const b = o.propertyEditorAliases[a], w = o.propertyNames[a] ?? a, x = V({
          nodeId: i,
          culture: p,
          propertyAlias: a,
          propertyName: w,
          editorAlias: b,
          value: y,
          additionalRecommendableEditorAliases: o.additionalRecommendableEditorAliases
        }), v = F(a, y, g[a], o);
        d.push({
          reference: x.reference,
          propertyAlias: a,
          propertyName: w,
          checkId: s.checkNumber,
          value: y,
          canApply: v,
          ...!v && I(b) ? { applyBlockedReason: "richTextBlocks" } : {}
        });
      }
    }
    return d.length > 0 ? {
      success: !0,
      culture: R,
      recommendations: d,
      skipped: l,
      nextStep: j
    } : { success: !0, culture: R, recommendations: d, skipped: l };
  }
  /**
   * The report for the open page and whether it still matches the page (spec FR-002a). A report this tool evaluated
   * fresh is up to date while the captured values equal the evaluated ones (unsaved values included). Any other
   * report must be neither saved over nor have unsaved changes, and the values must not have changed since it was
   * read (a later save would otherwise go unnoticed).
   */
  async #t(r) {
    const { nodeId: t, culture: e, properties: u, workspaceContext: f } = r, o = L(u), n = U(t, e);
    if (n?.fresh === !0)
      return { report: n.report, upToDate: n.snapshot === o };
    const i = n?.report ?? await C(t, e);
    if (i === null) return null;
    const p = i.savedSinceEvaluation !== !0 && !f.getHasUnpersistedChanges() && (n === void 0 || n.snapshot === o);
    return { report: i, upToDate: p };
  }
}
export {
  j as RECOMMEND_NEXT_STEP,
  K as RecommendPageValuesToolApi,
  K as api,
  K as default
};
//# sourceMappingURL=recommend-page-values.tool.api-CNslluOC.js.map
