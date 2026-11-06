import { UmbContextToken as f, UmbContextConsumerController as p } from "@umbraco-cms/backoffice/context-api";
import { c as g } from "./capture-draft-B0O4yTps.js";
import { c as h } from "./recommendation-store-CqanfkLM.js";
import { A as m, N as y } from "./entry-point-x4knHgGw.js";
const T = 1800 * 1e3, i = /* @__PURE__ */ new Map();
function d(e, t) {
  return `${e}|${t?.toLowerCase() ?? ""}`;
}
function u(e) {
  return Array.isArray(e) ? e.map(u) : typeof e == "object" && e !== null ? Object.fromEntries(
    Object.keys(e).sort().map((t) => [t, u(e[t])])
  ) : e;
}
function S(e) {
  return JSON.stringify(u(e));
}
function B(e, t, n, r, o) {
  const c = t?.toLowerCase() ?? null;
  i.set(d(e, t), {
    nodeId: e,
    culture: c,
    report: n,
    snapshot: r,
    fresh: o,
    storedAt: Date.now()
  });
}
function F(e, t) {
  const n = d(e, t), r = i.get(n);
  if (r && Date.now() - r.storedAt > T) {
    i.delete(n);
    return;
  }
  return r;
}
function w(e) {
  for (const [t, n] of i)
    n.nodeId !== e && i.delete(t);
}
const E = new f("UaiEntityAdapterContext");
function l(e, t) {
  return { success: !1, error: { code: e, message: t } };
}
const a = {
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
}, v = "GatewayTimeout", C = "GatewayUnreachable";
function b(e) {
  const t = e.trim();
  return t.length === 0 || /^[{[]/.test(t) || /^HTTP \d+$/.test(t) ? null : t;
}
function A(e, t) {
  if (e.type === y || e.type === C) return "networkError";
  if (e.type === v) return "providerUnavailable";
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
function k(e, t = {}) {
  if (!(e instanceof m)) return { code: "unexpected", message: a.unexpected };
  const n = A(e, t.notFound ?? "noActiveConfig");
  if (n === "guardrailBlocked") {
    const r = b(e.detail);
    return { code: n, message: r === null ? a.guardrailBlocked : `${a.guardrailBlocked} ${r}` };
  }
  return { code: n, message: a[n] };
}
function I(e, t = {}) {
  const { code: n, message: r } = k(e, t);
  return l(n, r);
}
const O = "document", R = [
  "getData",
  "getName",
  "getVariesByCulture",
  "getHasUnpersistedChanges",
  "getPropertyValue",
  "setPropertyValue"
];
function x(e) {
  if (typeof e != "object" || e === null) return !1;
  const t = e;
  return R.every((n) => typeof t[n] == "function") && typeof t.structure == "object" && typeof t.splitView == "object" && typeof t.readOnlyGuard == "object" && typeof t.propertyWriteGuard == "object";
}
function s(e) {
  return { ok: !1, failure: l(e, a[e]) };
}
async function N(e) {
  try {
    return await new p(e, E).asPromise();
  } catch {
    return;
  }
}
async function j(e) {
  const n = (await N(e))?.getSelectedEntity();
  if (!n || n.entityContext.entityType !== O) return s("noOpenPage");
  const r = n.workspaceContext;
  if (!x(r)) return s("noOpenPage");
  const o = g(r);
  return r.getIsNew?.() === !0 || o.nodeId === "" || !n.entityContext.unique ? s("pageNotSaved") : o.cultureNotCreated ? s("cultureNotCreated") : { ok: !0, document: { ...o, name: r.getName() ?? null, workspaceContext: r } };
}
function G(e) {
  w(e), h(e);
}
export {
  a as T,
  l as a,
  S as b,
  k as c,
  G as f,
  F as g,
  j as r,
  B as s,
  I as t
};
//# sourceMappingURL=open-document-B6ujVz0h.js.map
