import { html as i, nothing as l, css as E, property as v, customElement as y } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement as b } from "@umbraco-cms/backoffice/lit-element";
import { e as R, r as C, a as x } from "./renderer-styles-DaC1R0Zr.js";
var z = Object.defineProperty, w = Object.getOwnPropertyDescriptor, h = (e) => {
  throw TypeError(e);
}, d = (e, a, t, o) => {
  for (var n = o > 1 ? void 0 : o ? w(a, t) : a, p = e.length - 1, u; p >= 0; p--)
    (u = e[p]) && (n = (o ? u(a, t, n) : u(n)) || n);
  return o && n && z(a, t, n), n;
}, N = (e, a, t) => a.has(e) || h("Cannot " + t), S = (e, a, t) => a.has(e) ? h("Cannot add the same private member more than once") : a instanceof WeakSet ? a.add(e) : a.set(e, t), c = (e, a, t) => (N(e, a, "access private method"), t), s, g, f, _, m, $;
const k = {
  notFailing: "pageEvaluatorCopilot_skippedNotFailing",
  notRecommendable: "pageEvaluatorCopilot_skippedNotRecommendable",
  noRecommendation: "pageEvaluatorCopilot_skippedNoRecommendation"
}, A = ["pending", "streaming", "awaiting_approval", "executing"];
let r = class extends b {
  constructor() {
    super(...arguments), S(this, s), this.args = {}, this.status = "pending";
  }
  render() {
    if (A.includes(this.status)) return c(this, s, g).call(this);
    if (this.status === "error")
      return i`<div class="card">${c(this, s, m).call(this, R(this.result))}</div>`;
    const { recommendations: e, skipped: a, errorMessage: t } = C(this.result), o = this.localize.term("pageEvaluatorCopilot_recommendationsHeading");
    return i`
      <div class="card">
        <div class="header">
          <uui-icon name="icon-lightbulb"></uui-icon>
          <span class="title">${o}</span>
        </div>
        ${e.length > 0 ? i`<ul class="recommendations" aria-label=${o}>
              ${e.map((n, p) => c(this, s, f).call(this, n, p))}
            </ul>` : t === null ? i`<div class="note">${this.localize.term("pageEvaluatorCopilot_recommendationsNone")}</div>` : l}
        ${t === null ? l : c(this, s, m).call(this, t)} ${c(this, s, $).call(this, a)}
        ${e.length > 0 ? i`<div class="note hint">${this.localize.term("pageEvaluatorCopilot_recommendationsHint")}</div>` : l}
      </div>
    `;
  }
};
s = /* @__PURE__ */ new WeakSet();
g = function() {
  return i`
      <div class="status" role="status">
        <uui-icon name="icon-lightbulb"></uui-icon>
        <span>${this.localize.term("pageEvaluatorCopilot_recommendationsLoading")}</span>
        <uui-loader-circle></uui-loader-circle>
      </div>
    `;
};
f = function(e, a) {
  const t = `recommendation-field-${a}`;
  return i`
      <li class="recommendation">
        <span class="field" id=${t}>${e.fieldName}</span>
        <pre class="value" tabindex="0" role="region" aria-labelledby=${t}>${e.value}</pre>
        ${e.canApply ? l : c(this, s, _).call(this, e)}
      </li>
    `;
};
_ = function(e) {
  const a = e.blockedByRichTextBlocks ? "pageEvaluatorCopilot_notApplicableRichTextBlocks" : "pageEvaluatorCopilot_notApplicableGeneric";
  return i`<div class="note warning"><uui-icon name="icon-alert"></uui-icon><span>${this.localize.term(a)}</span></div>`;
};
m = function(e) {
  return i`
      <div class="error" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>
          <span class="label">${this.localize.term("pageEvaluatorCopilot_recommendationsFailed")}</span>
          ${e ?? l}
        </span>
      </div>
    `;
};
$ = function(e) {
  return e.length === 0 ? l : i`
      <div class="skipped note">
        <span>${this.localize.term("pageEvaluatorCopilot_skippedHeading")}</span>
        <ul>
          ${e.map(
    (a) => i`<li>
                <span class="alias">${a.propertyAlias}</span>${a.reason === null ? l : i`: <span class="reason">${this.localize.term(k[a.reason])}</span>`}
              </li>`
  )}
        </ul>
      </div>
    `;
};
r.styles = [
  x,
  E`
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .recommendations {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .recommendation {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
        min-width: 0;
      }

      .skipped ul {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        margin-top: var(--uui-size-space-1);
      }

      .alias {
        font-weight: 600;
        overflow-wrap: anywhere;
      }
    `
];
d([
  v({ attribute: !1 })
], r.prototype, "args", 2);
d([
  v({ type: String })
], r.prototype, "status", 2);
d([
  v({ attribute: !1 })
], r.prototype, "result", 2);
r = d([
  y("page-evaluator-copilot-recommendations")
], r);
const F = r;
export {
  r as RecommendationsRendererElement,
  F as default,
  r as element
};
//# sourceMappingURL=recommendations-renderer.element-B8RDcfKL.js.map
