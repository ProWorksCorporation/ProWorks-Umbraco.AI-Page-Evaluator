const y = "NotCreated";
function d(t) {
  return typeof t == "object" && t !== null && "alias" in t && typeof t.alias == "string";
}
function c(t, n) {
  const r = t[n];
  return typeof r == "string" ? r : null;
}
function g(t) {
  return (n) => typeof n == "object" && n !== null && "culture" in n && n.culture === t;
}
function p(t) {
  const n = t.structure.getOwnerContentType()?.alias ?? "", r = t.getData?.(), f = r?.unique ?? "", i = t.getVariesByCulture() === !0 ? t.splitView.getActiveVariants()[0]?.culture ?? null : null, a = {}, o = r?.values;
  if (Array.isArray(o))
    for (const e of o) {
      if (!d(e) || c(e, "segment") !== null) continue;
      const u = c(e, "culture");
      u !== null && u !== i || (a[e.alias] = e.value);
    }
  let s = !1;
  if (i !== null) {
    const e = r?.variants, u = Array.isArray(e) ? e.find(g(i)) : void 0, l = u?.state;
    s = u === void 0 || typeof l != "string" || l === y;
  }
  return { nodeId: f, documentTypeAlias: n, culture: i, cultureNotCreated: s, properties: a };
}
export {
  p as c
};
//# sourceMappingURL=capture-draft-B0O4yTps.js.map
