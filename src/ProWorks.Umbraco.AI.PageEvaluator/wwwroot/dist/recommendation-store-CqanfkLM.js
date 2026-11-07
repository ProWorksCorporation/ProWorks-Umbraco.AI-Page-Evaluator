const r = "rec_";
const E = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", n = /* @__PURE__ */ new Map();
function c() {
  const t = crypto.getRandomValues(new Uint8Array(12));
  let e = "";
  for (const o of t) e += E[o & 63] ?? "";
  return `${r}${e}`;
}
function a(t) {
  let e = c();
  for (; n.has(e); ) e = c();
  const o = { ...t, reference: e, createdAt: Date.now() };
  return n.set(e, o), o;
}
function s(t) {
  const e = n.get(t);
  if (e && Date.now() - e.createdAt > 18e5) {
    n.delete(t);
    return;
  }
  return e;
}
function d(t) {
  n.delete(t);
}
function i(t) {
  for (const [e, o] of n)
    o.nodeId !== t && n.delete(e);
}
export {
  a,
  i as c,
  d,
  s as g
};
//# sourceMappingURL=recommendation-store-CqanfkLM.js.map
