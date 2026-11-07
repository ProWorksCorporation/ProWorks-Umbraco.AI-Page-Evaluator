import { nothing as u, html as l, property as g, customElement as R } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as z } from "@umbraco-cms/backoffice/lit-element";
import { g as S } from "./recommendation-store-CqanfkLM.js";
import { e as W, b as O, a as P } from "./renderer-styles-DaC1R0Zr.js";
var x = Object.defineProperty, D = Object.getOwnPropertyDescriptor, A = (t) => {
  throw TypeError(t);
}, v = (t, e, i, d) => {
  for (var n = d > 1 ? void 0 : d ? D(e, i) : e, h = t.length - 1, f; h >= 0; h--)
    (f = t[h]) && (n = (d ? f(e, i, n) : f(n)) || n);
  return d && n && x(e, i, n), n;
}, y = (t, e, i) => e.has(t) || A("Cannot " + i), r = (t, e, i) => (y(t, e, "read from private field"), e.get(t)), m = (t, e, i) => e.has(t) ? A("Cannot add the same private member more than once") : e instanceof WeakSet ? e.add(t) : e.set(t, i), w = (t, e, i, d) => (y(t, e, "write to private field"), e.set(t, i), i), o = (t, e, i) => (y(t, e, "access private method"), i), c, a, s, C, $, E, _;
const M = ["pending", "streaming", "awaiting_approval", "executing"], N = "apply-field";
let p = class extends z {
  constructor() {
    super(...arguments), m(this, s), this.args = {}, this.status = "pending", m(this, c, null), m(this, a);
  }
  willUpdate(t) {
    if (super.willUpdate(t), !t.has("args")) return;
    const e = this.args.reference;
    if (typeof e != "string" || e === "" || e === r(this, c)) return;
    w(this, c, e);
    const i = S(e);
    w(this, a, i === void 0 ? void 0 : { fieldName: i.propertyName?.trim() || i.propertyAlias, value: i.value });
  }
  render() {
    if (M.includes(this.status)) return o(this, s, C).call(this);
    if (this.status === "error") return o(this, s, _).call(this, W(this.result), r(this, a)?.fieldName ?? null);
    const t = O(this.result);
    if (!t.applied)
      return t.code === "unknownRecommendation" ? o(this, s, E).call(this) : o(this, s, _).call(this, t.message, r(this, a)?.fieldName ?? null);
    const e = r(this, a)?.fieldName ?? t.propertyAlias;
    return l`
      <div class="card">
        <div class="header positive">
          <uui-icon name="icon-check"></uui-icon>
          ${e === null ? u : l`<span class="field" id=${N}>${e}</span>`}
        </div>
        <div role="status">${this.localize.term("pageEvaluatorCopilot_applyApplied")}</div>
        ${r(this, a) === void 0 ? u : o(this, s, $).call(this, r(this, a).value)}
      </div>
    `;
  }
};
c = /* @__PURE__ */ new WeakMap();
a = /* @__PURE__ */ new WeakMap();
s = /* @__PURE__ */ new WeakSet();
C = function() {
  return r(this, c) === null ? l`
        <div class="status" role="status">
          <uui-icon name="icon-edit"></uui-icon>
          <span>${this.localize.term("pageEvaluatorCopilot_applyLoading")}</span>
          <uui-loader-circle></uui-loader-circle>
        </div>
      ` : r(this, a) === void 0 ? o(this, s, E).call(this) : l`
      <div class="card">
        <div class="header">
          <uui-icon name="icon-edit"></uui-icon>
          <span class="field" id=${N}>${r(this, a).fieldName}</span>
        </div>
        <div>${this.localize.term("pageEvaluatorCopilot_applyWillWrite")}</div>
        ${o(this, s, $).call(this, r(this, a).value)}
        <div class="note">${this.localize.term("pageEvaluatorCopilot_applyStagedNote")}</div>
      </div>
    `;
};
$ = function(t) {
  return l`<pre class="value" tabindex="0" role="region" aria-labelledby=${N}>${t}</pre>`;
};
E = function() {
  return l`
      <div class="card">
        <div class="error" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this.localize.term("pageEvaluatorCopilot_applyNotFound")}</span>
        </div>
      </div>
    `;
};
_ = function(t, e) {
  return l`
      <div class="card">
        ${e === null ? u : l`<div class="header">
              <uui-icon name="icon-edit"></uui-icon>
              <span class="field">${e}</span>
            </div>`}
        <div class="error" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>
            <span class="label">${this.localize.term("pageEvaluatorCopilot_applyNotApplied")}</span>
            ${t ?? u}
          </span>
        </div>
      </div>
    `;
};
p.styles = P;
v([
  g({ attribute: !1 })
], p.prototype, "args", 2);
v([
  g({ type: String })
], p.prototype, "status", 2);
v([
  g({ attribute: !1 })
], p.prototype, "result", 2);
p = v([
  R("page-evaluator-copilot-apply")
], p);
const b = p;
export {
  p as ApplyRendererElement,
  b as default,
  p as element
};
//# sourceMappingURL=apply-renderer.element-BmUdJG2G.js.map
