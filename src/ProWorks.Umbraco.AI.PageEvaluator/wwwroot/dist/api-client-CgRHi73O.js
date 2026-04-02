import { umbHttpClient as u } from "@umbraco-cms/backoffice/http-client";
const e = u, o = "/umbraco/management/api/v1/page-evaluator", a = [{ scheme: "bearer", type: "http" }];
async function s(t) {
  if (!t.response.ok) {
    const n = await t.response.text().catch(() => "");
    throw new Error(`API ${t.response.status}: ${n}`);
  }
  return t.data;
}
async function c() {
  const t = await e.get({
    security: a,
    url: `${o}/configurations`
  });
  return s(t);
}
async function f(t) {
  const n = await e.get({
    security: a,
    url: `${o}/configurations/${encodeURIComponent(t)}`
  });
  return s(n);
}
async function p(t) {
  const n = await e.get({
    security: a,
    url: `${o}/configurations/active/${encodeURIComponent(t)}`
  });
  return n.response.status === 404 ? null : s(n);
}
async function g(t) {
  const n = await e.post({
    security: a,
    url: `${o}/configurations`,
    body: t
  });
  return s(n);
}
async function l(t, n) {
  const r = await e.put({
    security: a,
    url: `${o}/configurations/${encodeURIComponent(t)}`,
    body: n
  });
  return s(r);
}
async function y(t) {
  const n = await e.delete({
    security: a,
    url: `${o}/configurations/${encodeURIComponent(t)}`
  });
  if (!n.response.ok) {
    const r = await n.response.text().catch(() => "");
    throw new Error(`API ${n.response.status}: ${r}`);
  }
}
async function $(t) {
  const n = await e.post({
    security: a,
    url: `${o}/evaluate`,
    body: t
  });
  return s(n);
}
export {
  c as a,
  e as b,
  f as c,
  y as d,
  $ as e,
  g as f,
  p as g,
  l as u
};
//# sourceMappingURL=api-client-CgRHi73O.js.map
