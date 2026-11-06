import { UmbControllerBase as h } from "@umbraco-cms/backoffice/class-api";
import { g as v, a as E, e as A } from "./entry-point-x4knHgGw.js";
import { r as b } from "./recommend-eligibility-CHWTCfzX.js";
import { t as C, r as O, f as S, a as T, s as d, b as g, T as y } from "./open-document-B6ujVz0h.js";
const N = "This report may not reflect the latest changes. Offer to run a fresh evaluation before recommending.", F = "The AI response couldn't be read as a report. A fresh evaluation may help.";
function w(a) {
  if (a === null) return null;
  const e = Date.parse(a);
  return Number.isNaN(e) ? null : new Date(e).toISOString();
}
function D(a, e) {
  const r = [];
  a.savedSinceEvaluation === !0 && r.push("savedSinceEvaluation"), e.unsavedChanges && r.push("unsavedChanges");
  const l = a.parseFailed, o = e.scoringEnabled && !l ? {
    // Both the overall and axis scores use the report's 1–5 scale (live Copilot test: "3.7 / 4" without it).
    scale: { min: 1, max: 5 },
    overallScore: a.overallScore,
    axisScores: (a.axisScores ?? []).map((t) => ({
      name: t.name,
      score: t.score,
      feedback: t.feedback
    }))
  } : null, n = [];
  l && n.push(F), r.length > 0 && n.push(N);
  const s = {
    success: !0,
    page: {
      nodeId: e.page.nodeId,
      name: e.page.name,
      documentTypeAlias: e.page.documentTypeAlias,
      culture: a.culture ?? e.page.culture?.toLowerCase() ?? null
    },
    configName: e.configName,
    evaluatedAt: w(a.cachedAt),
    fromCache: e.fromCache,
    outOfDate: r.length > 0,
    outOfDateReasons: r,
    parseFailed: l,
    scoring: o,
    checks: l ? [] : a.checks.map((t) => ({
      id: t.checkNumber,
      title: t.label,
      status: t.status,
      explanation: t.explanation,
      propertyAliases: t.propertyAliases ?? []
    })),
    suggestions: a.suggestions,
    recommendationsEnabled: a.recommendationsEnabled,
    recommendable: l ? [] : b(a, e.properties)
  };
  return n.length > 0 ? { ...s, note: n.join(" ") } : s;
}
class U extends h {
  async execute(e) {
    try {
      return await this.#e(e.fresh === !0);
    } catch (r) {
      return C(r);
    }
  }
  async #e(e) {
    const r = await O(this);
    if (!r.ok) return r.failure;
    const { workspaceContext: l, nodeId: o, documentTypeAlias: n, culture: s, properties: t, name: p } = r.document;
    S(o);
    const [u, f] = await Promise.all([
      v(n),
      e ? Promise.resolve(null) : E(o, s)
    ]);
    if (u === null) return T("noActiveConfig", y.noActiveConfig);
    let i, c, m;
    return f !== null ? (i = f, c = !0, m = l.getHasUnpersistedChanges(), d(o, s, i, g(t), !1)) : (i = await A({ nodeId: o, documentTypeAlias: n, culture: s, properties: t }), c = !1, m = !1, d(o, s, i, g(t), !0)), D(i, {
      page: { nodeId: o, name: p, documentTypeAlias: n, culture: s },
      configName: u.name,
      scoringEnabled: u.scoringEnabled,
      fromCache: c,
      unsavedChanges: m,
      properties: t
    });
  }
}
export {
  U as EvaluateCurrentPageToolApi,
  U as api,
  U as default
};
//# sourceMappingURL=evaluate-current-page.tool.api-XUvoLFDE.js.map
