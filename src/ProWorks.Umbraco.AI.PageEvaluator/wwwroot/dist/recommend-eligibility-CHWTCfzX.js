import { UmbVariantId as b } from "@umbraco-cms/backoffice/variant";
import { UmbDataPathPropertyValueQuery as k } from "@umbraco-cms/backoffice/validation";
function h() {
  return { layout: {}, contentData: [], settingsData: [], expose: [] };
}
const m = /<umb-rte-block(?:-inline)?\b[^>]*>/gi, T = /\bdata-content-(?:key|id)\s*=\s*"([^"]*)"/i, g = /(<umb-rte-block(-inline)?\b[^>]*>)\s*(<\/umb-rte-block\2>)/gi;
function l(t) {
  const e = [];
  for (const n of t.matchAll(m)) {
    const r = T.exec(n[0])?.[1];
    r && e.push(r);
  }
  return e;
}
function E(t) {
  return t.replace(m, (e) => e.replace(/\bdata-content-id(\s*=)/i, "data-content-key$1")).replace(g, "$1<!--Umbraco-Block-->$3");
}
function A(t, e) {
  const n = l(e), r = new Set(n);
  if (r.size !== n.length) return !1;
  const c = new Set(l(t));
  if (c.size !== r.size) return !1;
  for (const s of c)
    if (!r.has(s)) return !1;
  return !0;
}
const S = /* @__PURE__ */ new Set(["Umbraco.RichText", "Umbraco.TinyMCE"]);
function u(t) {
  return t !== void 0 && S.has(t);
}
function R(t) {
  let e;
  if (Array.isArray(t))
    e = t;
  else if (typeof t == "string") {
    let r = null;
    if (t.trim().startsWith("["))
      try {
        r = JSON.parse(t);
      } catch {
        r = null;
      }
    e = Array.isArray(r) ? r : t.split(/[,\n]/);
  } else
    e = [];
  const n = e.map((r) => String(r).trim()).filter((r) => r.length > 0);
  return [...new Set(n)];
}
function U(t) {
  return typeof t == "object" && t !== null && "layout" in t && "contentData" in t && Array.isArray(t.contentData);
}
function w(t) {
  return typeof t != "object" || t === null || !("blocks" in t) ? null : U(t.blocks) ? t.blocks : null;
}
async function M(t, e, n, r, c, s) {
  try {
    const o = await t.structure.getPropertyStructureByAlias(e), y = c !== null && t.getVariesByCulture() === !0 && o?.variesByCulture === !0 ? c : null, i = b.Create({ culture: y, segment: null });
    let a = r;
    if (u(n)) {
      const d = t.getPropertyValue(e, i);
      a = {
        // Recommendations for rich text are always HTML strings; anything else is not applicable markup.
        markup: E(typeof r == "string" ? r : ""),
        blocks: w(d) ?? h()
      };
    } else n === "Umbraco.Tags" && (a = R(r));
    return await t.setPropertyValue(e, a, i), s?.removeMessagesByPath(
      `$.values[${k({ alias: e, culture: i.culture, segment: i.segment })}].value`
    ), !0;
  } catch {
    return !1;
  }
}
function p(t) {
  return typeof t == "string" ? t : typeof t == "object" && t !== null && "markup" in t && typeof t.markup == "string" ? t.markup : "";
}
function x(t, e) {
  return u(t) ? p(e) : typeof e == "string" ? e : JSON.stringify(e ?? "");
}
function N(t, e) {
  return Object.fromEntries(
    Object.entries(t).map(([n, r]) => [n, x(e[n], r)])
  );
}
const B = /* @__PURE__ */ new Set([
  "Umbraco.TextBox",
  "Umbraco.TextArea",
  "Umbraco.Markdown",
  "Umbraco.Tags",
  "Umbraco.RichText",
  "Umbraco.TinyMCE"
]);
function P(t, e) {
  const n = t.toLowerCase();
  return e.additionalRecommendableEditorAliases.some((r) => r.toLowerCase() === n);
}
function C(t) {
  if (typeof t != "string") return !1;
  const e = t.trimStart();
  return e.length === 0 ? !0 : e[0] !== "{" && e[0] !== "[" && !e.startsWith("umb://");
}
function f(t, e, n) {
  const r = e.propertyEditorAliases[t];
  return r !== void 0 ? B.has(r) || P(r, e) : C(n);
}
function O(t, e, n) {
  return f(t, e, n);
}
function _(t, e, n, r) {
  return u(r.propertyEditorAliases[t]) ? e !== null && A(p(n), e) : f(t, r, n);
}
function V(t, e = {}) {
  if (!t.recommendationsEnabled) return [];
  const n = [], r = /* @__PURE__ */ new Set();
  for (const c of ["Fail", "Warn"])
    for (const s of t.checks)
      if (s.status === c)
        for (const o of s.propertyAliases ?? [])
          r.has(o) || !O(o, t, e[o]) || (r.add(o), n.push({
            propertyAlias: o,
            propertyName: t.propertyNames[o] ?? o,
            checkId: s.checkNumber,
            checkStatus: c,
            canApply: f(o, t, e[o])
          }));
  return n;
}
export {
  N as a,
  _ as b,
  O as c,
  A as d,
  p as e,
  M as f,
  u as i,
  V as r
};
//# sourceMappingURL=recommend-eligibility-CHWTCfzX.js.map
