import { UmbContextToken as g, UmbContextConsumerController as m } from "@umbraco-cms/backoffice/context-api";
import { c as h } from "./capture-draft-B0O4yTps.js";
import { A as y, N as T } from "./entry-point-BaHbZCD-.js";
const E = 1800 * 1e3, w = "rec_", C = 12, b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", r = /* @__PURE__ */ new Map();
function d() {
  const e = crypto.getRandomValues(new Uint8Array(C));
  let t = "";
  for (const n of e) t += b[n & 63] ?? "";
  return `${w}${t}`;
}
function L(e) {
  let t = d();
  for (; r.has(t); ) t = d();
  const n = { ...e, reference: t, createdAt: Date.now() };
  return r.set(t, n), n;
}
function G(e) {
  const t = r.get(e);
  if (t && Date.now() - t.createdAt > E) {
    r.delete(e);
    return;
  }
  return t;
}
function j(e) {
  r.delete(e);
}
function v(e) {
  for (const [t, n] of r)
    n.nodeId !== e && r.delete(t);
}
const A = 1800 * 1e3, s = /* @__PURE__ */ new Map();
function l(e, t) {
  return `${e}|${t?.toLowerCase() ?? ""}`;
}
function u(e) {
  return Array.isArray(e) ? e.map(u) : typeof e == "object" && e !== null ? Object.fromEntries(
    Object.keys(e).sort().map((t) => [t, u(e[t])])
  ) : e;
}
function Y(e) {
  return JSON.stringify(u(e));
}
function W(e, t, n, o, a) {
  const p = t?.toLowerCase() ?? null;
  s.set(l(e, t), {
    nodeId: e,
    culture: p,
    report: n,
    snapshot: o,
    fresh: a,
    storedAt: Date.now()
  });
}
function $(e, t) {
  const n = l(e, t), o = s.get(n);
  if (o && Date.now() - o.storedAt > A) {
    s.delete(n);
    return;
  }
  return o;
}
function R(e) {
  for (const [t, n] of s)
    n.nodeId !== e && s.delete(t);
}
const k = new g("UaiEntityAdapterContext");
function f(e, t) {
  return { success: !1, error: { code: e, message: t } };
}
const i = {
  noOpenPage: "No page is open in the editor. Ask the user to open the page they want to work on.",
  pageNotSaved: "The page has not been saved yet. Ask the user to save the page first.",
  cultureNotCreated: "The page doesn't have a version in this language yet.",
  invalidCulture: "The language isn't valid for this page.",
  notFound: "The page doesn't exist.",
  forbidden: "The user doesn't have permission to browse this page.",
  noActiveConfig: "There is no active Page Evaluator configuration for this page's document type.",
  rateLimited: "Too many evaluation requests. Wait a minute and try again.",
  guardrailBlocked: "A guardrail blocked the request.",
  providerUnavailable: "The AI provider is temporarily unavailable. Try again shortly.",
  providerConfiguration: "The AI provider couldn't be used because of an authentication or configuration problem. An administrator needs to check the AI connection.",
  networkError: "The browser couldn't reach the Umbraco server. Check the connection and try again.",
  unexpected: "Something went wrong. Try again later.",
  invalidArguments: "The tool arguments are not valid. Check the parameter descriptions and try again.",
  noReport: "Evaluate the page first.",
  recommendationsDisabled: "Recommendations are turned off in the Page Evaluator configuration for this document type.",
  reportOutOfDate: "Run a fresh evaluation first.",
  unknownRecommendation: "The recommendation reference is unknown or has expired. Get a new recommendation with recommend_page_values.",
  differentPage: "The recommendation was made for a different page than the one open in the editor.",
  languageChanged: "The recommendation was made for a different language than the one the editor is showing.",
  propertyMissing: "The field no longer exists on this page.",
  readOnly: "The field is read-only for the user, so the value can't be written.",
  notApplicable: "The recommendation can't be applied automatically to this field. The user can copy it instead.",
  richTextBlocks: "The recommendation would remove or duplicate an embedded block, so it can't be applied automatically. The user can copy it instead.",
  writeFailed: "The editor didn't accept the value. The field was left unchanged."
}, O = "GatewayTimeout", N = "GatewayUnreachable";
function _(e) {
  const t = e.trim();
  return t.length === 0 || /^[{[]/.test(t) || /^HTTP \d+$/.test(t) ? null : t;
}
function x(e, t) {
  if (e.type === T || e.type === N) return "networkError";
  if (e.type === O) return "providerUnavailable";
  switch (e.status) {
    case 429:
      return "rateLimited";
    case 422:
      return "guardrailBlocked";
    case 404:
      return t;
    case 403:
      return "forbidden";
    case 502:
    case 503:
      return "providerUnavailable";
    case 400:
      return e.category === "invalidCulture" ? "invalidCulture" : e.category === "cultureNotCreated" ? "cultureNotCreated" : "unexpected";
    case 500:
      return e.category === "authenticationConfiguration" || e.category === "unclassified" ? "providerConfiguration" : "unexpected";
    default:
      return "unexpected";
  }
}
function P(e, t = {}) {
  if (!(e instanceof y)) return { code: "unexpected", message: i.unexpected };
  const n = x(e, t.notFound ?? "noActiveConfig");
  if (n === "guardrailBlocked") {
    const o = _(e.detail);
    return { code: n, message: o === null ? i.guardrailBlocked : `${i.guardrailBlocked} ${o}` };
  }
  return { code: n, message: i[n] };
}
function H(e, t = {}) {
  const { code: n, message: o } = P(e, t);
  return f(n, o);
}
const D = "document", U = [
  "getData",
  "getName",
  "getVariesByCulture",
  "getHasUnpersistedChanges",
  "getPropertyValue",
  "setPropertyValue"
];
function F(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return U.every((n) => typeof t[n] == "function") && typeof t.structure == "object" && typeof t.splitView == "object" && typeof t.readOnlyGuard == "object" && typeof t.propertyWriteGuard == "object";
}
function c(e) {
  return { ok: !1, failure: f(e, i[e]) };
}
async function M(e) {
  try {
    return await new m(e, k).asPromise();
  } catch {
    return;
  }
}
async function V(e) {
  const n = (await M(e))?.getSelectedEntity();
  if (!n || n.entityContext.entityType !== D) return c("noOpenPage");
  const o = n.workspaceContext;
  if (!F(o)) return c("noOpenPage");
  const a = h(o);
  return a.nodeId === "" || !n.entityContext.unique ? c("pageNotSaved") : a.cultureNotCreated ? c("cultureNotCreated") : { ok: !0, document: { ...a, name: o.getName() ?? null, workspaceContext: o } };
}
function q(e) {
  R(e), v(e);
}
export {
  i as T,
  f as a,
  Y as b,
  P as c,
  L as d,
  G as e,
  q as f,
  $ as g,
  j as h,
  V as r,
  W as s,
  H as t
};
//# sourceMappingURL=open-document-B1hA0Wkh.js.map
