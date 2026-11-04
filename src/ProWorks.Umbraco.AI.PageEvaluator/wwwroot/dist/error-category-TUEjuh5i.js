const t = {
  GatewayTimeout: "evaluatePage_gatewayTimeoutMessage",
  GatewayUnreachable: "evaluatePage_gatewayUnreachableMessage",
  NetworkError: "evaluatePage_connectivityMessage"
}, n = {
  temporaryRetryable: "evaluatePage_temporaryRetryableMessage",
  connectivity: "evaluatePage_connectivityMessage",
  authenticationConfiguration: "evaluatePage_authenticationConfigurationMessage",
  cultureNotCreated: "evaluatePage_cultureNotCreatedMessage",
  invalidCulture: "evaluatePage_invalidCultureMessage"
}, r = new Set(Object.keys(t));
function u(e, o) {
  const a = e.type ? t[e.type] : void 0;
  return a || ((e.category ? n[e.category] : void 0) ?? o);
}
function s(e) {
  return !!e.type && r.has(e.type);
}
export {
  u as l,
  s
};
//# sourceMappingURL=error-category-TUEjuh5i.js.map
