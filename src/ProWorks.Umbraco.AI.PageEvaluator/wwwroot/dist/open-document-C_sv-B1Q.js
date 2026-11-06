import { UmbContextToken as f, UmbContextConsumerController as p } from "@umbraco-cms/backoffice/context-api";
import { c as g } from "./capture-draft-B0O4yTps.js";
import { c as h } from "./recommendation-store-CqanfkLM.js";
import { A as m, N as y } from "./entry-point-DkHTLhgB.js";
const T = 1800 * 1e3, i = /* @__PURE__ */ new Map();
function c(e, t) {
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
  const l = t?.toLowerCase() ?? null;
  i.set(c(e, t), {
    nodeId: e,
    culture: l,
    report: n,
    snapshot: r,
    fresh: o,
    storedAt: Date.now()
  });
}
function F(e, t) {
  const n = c(e, t), r = i.get(n);
  if (r && Date.now() - r.storedAt > T) {
    i.delete(n);
    return;
  }
  return r;
}
function E(e) {
  for (const [t, n] of i)
    n.nodeId !== e && i.delete(t);
}
const v = new f("UaiEntityAdapterContext");
function d(e, t) {
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
}, C = "GatewayTimeout", b = "GatewayUnreachable";
function w(e) {
  const t = e.trim();
  return t.length === 0 || /^[{[]/.test(t) || /^HTTP \d+$/.test(t) ? null : t;
}
function A(e, t) {
  if (e.type === y || e.type === b) return "networkError";
  if (e.type === C) return "providerUnavailable";
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
    const r = w(e.detail);
    return { code: n, message: r === null ? a.guardrailBlocked : `${a.guardrailBlocked} ${r}` };
  }
  return { code: n, message: a[n] };
}
function j(e, t = {}) {
  const { code: n, message: r } = k(e, t);
  return d(n, r);
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
  return { ok: !1, failure: d(e, a[e]) };
}
async function N(e) {
  try {
    return await new p(e, v).asPromise();
  } catch {
    return;
  }
}
async function G(e) {
  const n = (await N(e))?.getSelectedEntity();
  if (!n || n.entityContext.entityType !== O) return s("noOpenPage");
  const r = n.workspaceContext;
  if (!x(r)) return s("noOpenPage");
  const o = g(r);
  return o.nodeId === "" || !n.entityContext.unique ? s("pageNotSaved") : o.cultureNotCreated ? s("cultureNotCreated") : { ok: !0, document: { ...o, name: r.getName() ?? null, workspaceContext: r } };
}
function I(e) {
  E(e), h(e);
}
export {
  a as T,
  d as a,
  S as b,
  k as c,
  I as f,
  F as g,
  G as r,
  B as s,
  j as t
};
//# sourceMappingURL=open-document-C_sv-B1Q.js.map
