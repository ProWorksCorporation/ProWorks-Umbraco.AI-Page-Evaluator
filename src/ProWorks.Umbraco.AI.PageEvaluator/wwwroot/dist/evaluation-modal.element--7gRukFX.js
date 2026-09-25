import { css as k, property as v, state as g, customElement as A, nothing as c, html as o } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as M } from "@umbraco-cms/backoffice/modal";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as F } from "@umbraco-cms/backoffice/document";
import { r as N, A as w, g as O, e as D } from "./entry-point-3e4lGqw9.js";
import { UmbVariantId as B } from "@umbraco-cms/backoffice/variant";
import { UmbLitElement as E } from "@umbraco-cms/backoffice/lit-element";
const C = {
  GatewayTimeout: "evaluatePage_gatewayTimeoutMessage",
  GatewayUnreachable: "evaluatePage_gatewayUnreachableMessage",
  NetworkError: "evaluatePage_connectivityMessage"
}, I = {
  temporaryRetryable: "evaluatePage_temporaryRetryableMessage",
  connectivity: "evaluatePage_connectivityMessage",
  authenticationConfiguration: "evaluatePage_authenticationConfigurationMessage",
  cultureNotCreated: "evaluatePage_cultureNotCreatedMessage",
  invalidCulture: "evaluatePage_invalidCultureMessage"
}, L = new Set(Object.keys(C));
function S(e, t) {
  const a = e.type ? C[e.type] : void 0;
  return a || ((e.category ? I[e.category] : void 0) ?? t);
}
function U(e) {
  return !!e.type && L.has(e.type);
}
function j() {
  return { layout: {}, contentData: [], settingsData: [], expose: [] };
}
const R = /<umb-rte-block(?:-inline)?\b[^>]*>/gi, W = /\bdata-content-(?:key|id)\s*=\s*"([^"]*)"/i, G = /(<umb-rte-block(-inline)?\b[^>]*>)\s*(<\/umb-rte-block\2>)/gi;
function P(e) {
  const t = [];
  for (const a of e.matchAll(R)) {
    const r = W.exec(a[0])?.[1];
    r && t.push(r);
  }
  return t;
}
function K(e) {
  return e.replace(R, (t) => t.replace(/\bdata-content-id(\s*=)/i, "data-content-key$1")).replace(G, "$1<!--Umbraco-Block-->$3");
}
function V(e, t) {
  const a = P(t), r = new Set(a);
  if (r.size !== a.length) return !1;
  const i = new Set(P(e));
  if (i.size !== r.size) return !1;
  for (const s of i)
    if (!r.has(s)) return !1;
  return !0;
}
const Y = /* @__PURE__ */ new Set(["Umbraco.RichText", "Umbraco.TinyMCE"]);
function b(e) {
  return e !== void 0 && Y.has(e);
}
function H(e) {
  let t;
  if (Array.isArray(e))
    t = e;
  else if (typeof e == "string") {
    let r = null;
    if (e.trim().startsWith("["))
      try {
        r = JSON.parse(e);
      } catch {
        r = null;
      }
    t = Array.isArray(r) ? r : e.split(/[,\n]/);
  } else
    t = [];
  const a = t.map((r) => String(r).trim()).filter((r) => r.length > 0);
  return [...new Set(a)];
}
function q(e) {
  return typeof e == "object" && e !== null && "layout" in e && "contentData" in e && Array.isArray(e.contentData);
}
function J(e) {
  return typeof e != "object" || e === null || !("blocks" in e) ? null : q(e.blocks) ? e.blocks : null;
}
async function X(e, t, a, r, i) {
  try {
    const s = await e.structure.getPropertyStructureByAlias(t), n = i !== null && e.getVariesByCulture() === !0 && s?.variesByCulture === !0 ? i : null, l = B.Create({ culture: n, segment: null });
    let m = r;
    if (b(a)) {
      const y = e.getPropertyValue(t, l);
      m = {
        // Recommendations for rich text are always HTML strings; anything else is not applicable markup.
        markup: K(typeof r == "string" ? r : ""),
        blocks: J(y) ?? j()
      };
    } else a === "Umbraco.Tags" && (m = H(r));
    return await e.setPropertyValue(t, m, l), !0;
  } catch {
    return !1;
  }
}
var Q = Object.defineProperty, Z = Object.getOwnPropertyDescriptor, d = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? Z(t, a) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (i = (r ? n(t, a, i) : n(i)) || i);
  return r && i && Q(t, a, i), i;
};
let u = class extends E {
  constructor() {
    super(...arguments), this.nodeId = "", this.culture = null, this.properties = {}, this.propertyEditorAliases = {}, this.propertyNames = {}, this.additionalRecommendableEditorAliases = [], this.recommendationsEnabled = !0, this._recStates = /* @__PURE__ */ new Map(), this._appliedAliases = /* @__PURE__ */ new Map(), this._copiedAliases = /* @__PURE__ */ new Map(), this._applyFailedAliases = /* @__PURE__ */ new Map(), this._onApplyFailed = (e) => {
      const t = e.detail, a = new Map(this._appliedAliases), r = new Set(a.get(t.checkNumber) ?? []);
      r.delete(t.propertyAlias), a.set(t.checkNumber, r), this._appliedAliases = a;
      const i = new Map(this._applyFailedAliases), s = new Set(i.get(t.checkNumber) ?? []);
      s.add(t.propertyAlias), i.set(t.checkNumber, s), this._applyFailedAliases = i;
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.addEventListener("page-evaluator-rec-apply-failed", this._onApplyFailed);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.removeEventListener("page-evaluator-rec-apply-failed", this._onApplyFailed);
  }
  render() {
    if (!this.report) return c;
    const { checks: e, suggestions: t, overallScore: a, axisScores: r } = this.report, i = a !== null || r !== null && r.length > 0, s = e.filter((p) => p.status === "Pass").length, n = e.filter((p) => p.status === "Warn").length, l = e.filter((p) => p.status === "Fail").length, m = e.length, y = e.filter((p) => p.status === "Fail" || p.status === "Warn"), _ = e.filter((p) => p.status === "Pass");
    return o`
      ${this.report.samplingSettingsIgnored === !0 ? o`<div class="sampling-notice" role="status">
            <uui-icon name="icon-info"></uui-icon>
            <span>${this.localize.term("evaluatePage_samplingVariesNotice")}</span>
          </div>` : c}
      ${i ? this._renderScoring(a, r) : c}

      ${m > 0 ? o`
            <div class="score-row">
              <span class="score-total">${m} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${s} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${n > 0 ? o`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${n} ${n !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : c}
              ${l > 0 ? o`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${l} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : c}
            </div>
          ` : c}

      ${t ? o`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(t)}
            </uui-box>
          ` : c}

      ${y.length > 0 ? o`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${y.length})</p>
            <ul class="check-list">
              ${y.map((p) => this._renderCheck(p))}
            </ul>
          ` : c}

      ${_.length > 0 ? o`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${_.length})</p>
            <ul class="check-list">
              ${_.map((p) => this._renderCheck(p))}
            </ul>
          ` : c}
    `;
  }
  _renderSuggestions(e) {
    const t = ie(e);
    if (t.length === 1)
      return o`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${z(t[0] ?? "")}</p>`;
    const a = t[0] ?? "", r = a.endsWith(":"), i = r ? t.slice(1) : t;
    return o`
      ${r ? o`<p style="margin:0 0 var(--uui-size-space-2, 8px); font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${z(a)}</p>` : c}
      <ol class="suggestions-list">
        ${i.map((s) => o`<li>${z(s)}</li>`)}
      </ol>
    `;
  }
  _renderScoring(e, t) {
    return o`
      ${e !== null ? o`
            <div class="overall-score-row">
              <span class="overall-score-label">${this.localize.term("evaluatePage_overallScore")}</span>
              <uui-tag color=${te(e)} look="primary">
                ${e.toFixed(1)} / 5
              </uui-tag>
            </div>
          ` : c}
      ${t && t.length > 0 ? o`
            <div class="axis-scores-section">
              <p class="section-title">${this.localize.term("evaluatePage_axisScores")}</p>
              <ul class="axis-list">
                ${t.map((a) => this._renderAxis(a))}
              </ul>
            </div>
          ` : c}
    `;
  }
  _renderAxis(e) {
    return o`
      <li class="axis-item">
        <uui-tag color=${re(e.score)} look="primary">${e.score} / 5</uui-tag>
        <div class="axis-body">
          <div class="axis-name">${ee(e.name)}</div>
          ${e.feedback ? o`<div class="axis-feedback">${e.feedback}</div>` : c}
        </div>
      </li>
    `;
  }
  /**
   * Returns true when a recommendation can be shown for the given property alias.
   * Checks the known editor alias first; falls back to a value heuristic when no
   * editor info is available (e.g. the backoffice did not supply propertyEditorAliases).
   */
  _canRecommend(e) {
    const t = this.propertyEditorAliases[e];
    if (t !== void 0)
      return u._FULL_RECOMMEND_EDITORS.has(t) || this._isAdditionalEditor(t);
    const a = this.properties[e];
    if (typeof a != "string") return !1;
    const r = a.trimStart();
    return r.length === 0 ? !0 : r[0] !== "{" && r[0] !== "[" && !r.startsWith("umb://");
  }
  /**
   * Returns true when the Apply button should be shown for the given property alias and recommendation.
   * Rich text is applicable only when the recommendation keeps every embedded block placeholder of the
   * current value exactly once (FR-016). Editors listed in additionalRecommendableEditorAliases are
   * treated as full recommend (apply supported).
   */
  _canApply(e, t) {
    const a = this.propertyEditorAliases[e];
    if (b(a))
      return t !== null && V(this._currentMarkup(e), t);
    if (a !== void 0)
      return u._FULL_RECOMMEND_EDITORS.has(a) || this._isAdditionalEditor(a);
    const r = this.properties[e];
    if (typeof r != "string") return !1;
    const i = r.trimStart();
    return i.length === 0 ? !0 : i[0] !== "{" && i[0] !== "[" && !i.startsWith("umb://");
  }
  _isAdditionalEditor(e) {
    return this.additionalRecommendableEditorAliases.some(
      (t) => t.toLowerCase() === e.toLowerCase()
    );
  }
  /** The current rich-text markup of `alias` (the `.markup` of a `{ markup, blocks }` value), or ''. */
  _currentMarkup(e) {
    const t = this.properties[e];
    return typeof t == "string" ? t : typeof t == "object" && t !== null && "markup" in t && typeof t.markup == "string" ? t.markup : "";
  }
  /** The string sent to /recommend as a property's current value (rich text → its markup). */
  _recommendInputValue(e, t) {
    return b(this.propertyEditorAliases[e]) ? this._currentMarkup(e) : typeof t == "string" ? t : JSON.stringify(t ?? "");
  }
  _resolveCurrentValue(e) {
    const t = this.properties[e];
    return t == null ? "" : typeof t == "string" ? t : Array.isArray(t) ? t.join(", ") : b(this.propertyEditorAliases[e]) ? this._currentMarkup(e) : "";
  }
  _recCurrentLabel(e) {
    const t = this.propertyNames[e];
    return t !== void 0 ? `${this.localize.term("evaluatePage_recCurrentFor")} ${t}` : this.localize.term("evaluatePage_recCurrent");
  }
  _recSuggestedLabel(e) {
    const t = this.propertyNames[e];
    return t !== void 0 ? `${this.localize.term("evaluatePage_recSuggestedFor")} ${t}` : this.localize.term("evaluatePage_recSuggested");
  }
  _renderCheck(e) {
    const t = this._recStates.get(e.checkNumber) ?? { kind: "idle" }, a = this.recommendationsEnabled && (e.status === "Fail" || e.status === "Warn") ? (e.propertyAliases ?? []).filter((i) => this._canRecommend(i)) : [], r = a.length > 0;
    return o`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${ae(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? o`<div class="check-explanation">${e.explanation}</div>` : c}
          ${r ? this._renderRecState(e, t, a) : c}
        </div>
      </li>
    `;
  }
  _renderRecState(e, t, a) {
    switch (t.kind) {
      case "idle":
        return o`
          <uui-button
            class="rec-generate-link"
            look="default"
            label=${this.localize.term("evaluatePage_recGenerate")}
            @click=${() => {
          this._handleGenerate(e);
        }}>
            <uui-icon name="icon-wand" slot="icon"></uui-icon>
            ${this.localize.term("evaluatePage_recGenerate")}
          </uui-button>
        `;
      case "generating":
        return o`
          <div class="rec-generating">
            <uui-loader></uui-loader>
            <span>${this.localize.term("evaluatePage_recGenerating")}</span>
          </div>
        `;
      case "result":
        return o`${a.map((r) => {
          const i = this._appliedAliases.get(e.checkNumber)?.has(r) ?? !1, s = t.values[r] ?? null;
          return this._renderRecBox(e, r, s, i, this._canApply(r, s));
        })}`;
      case "error": {
        const r = S(t, "evaluatePage_recError");
        return o`
          <div style="display:flex;align-items:center;gap:var(--uui-size-space-2,8px);margin-top:var(--uui-size-space-2,8px);">
            <uui-icon name="icon-alert" style="color:var(--uui-color-danger-standalone,#b91c1c);"></uui-icon>
            <span style="color:var(--uui-color-danger-standalone,#b91c1c);font-size:0.85rem;">
              ${this.localize.term(r)}
            </span>
            <uui-button
              look="secondary"
              compact
              label=${this.localize.term("evaluatePage_recGenerate")}
              @click=${() => {
          this._handleGenerate(e);
        }}>
              ${this.localize.term("evaluatePage_recRegenerate")}
            </uui-button>
          </div>
        `;
      }
    }
  }
  _renderRecBox(e, t, a, r, i) {
    const s = this._copiedAliases.get(e.checkNumber)?.has(t) ?? !1, n = this._applyFailedAliases.get(e.checkNumber)?.has(t) ?? !1, l = !i && a !== null && b(this.propertyEditorAliases[t]), m = this._resolveCurrentValue(t);
    return o`
      <div class="rec-box ${r ? "applied" : ""}">
        ${m ? o`
              <div class="rec-current-label">
                <uui-icon name="icon-edit"></uui-icon>
                ${this._recCurrentLabel(t)}
              </div>
              <div class="rec-current-text">${m}</div>
              <hr class="rec-section-divider" />
            ` : c}
        <div class="rec-label ${r ? "applied" : ""}">
          <uui-icon name="${r ? "icon-check" : "icon-wand"}"></uui-icon>
          ${r ? this.localize.term("evaluatePage_recApplied") : this._recSuggestedLabel(t)}
        </div>
        <div class="rec-text">${a ?? ""}</div>
        ${l ? o`<div class="rec-notice" role="status">
              <uui-icon name="icon-info"></uui-icon>
              <span>${this.localize.term("evaluatePage_rteApplyBlockedMessage")}</span>
            </div>` : c}
        ${n ? o`<div class="rec-notice rec-notice--error" role="alert">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this.localize.term("evaluatePage_applyFailedMessage")}</span>
            </div>` : c}
        <div class="rec-actions">
          ${i && !r ? o`
                <uui-button
                  look="primary"
                  color="positive"
                  compact
                  label=${this.localize.term("evaluatePage_recApply")}
                  @click=${() => this._handleApply(e, t, a)}>
                  ${this.localize.term("evaluatePage_recApply")}
                </uui-button>
              ` : c}
          <uui-button
            look="secondary"
            compact
            label=${s ? this.localize.term("evaluatePage_recCopied") : this.localize.term("evaluatePage_recCopy")}
            ?disabled=${s}
            @click=${() => {
      this._handleCopy(e.checkNumber, t, a);
    }}>
            <uui-icon
              name="${s ? "icon-check" : "icon-clipboard-copy"}"
              slot="icon"></uui-icon>
            ${s ? this.localize.term("evaluatePage_recCopied") : this.localize.term("evaluatePage_recCopy")}
          </uui-button>
          <uui-button
            look="secondary"
            compact
            label=${this.localize.term("evaluatePage_recRegenerate")}
            @click=${() => {
      this._handleGenerate(e);
    }}>
            <uui-icon name="icon-sync" slot="icon"></uui-icon>
            ${this.localize.term("evaluatePage_recRegenerate")}
          </uui-button>
        </div>
      </div>
    `;
  }
  _setRecState(e, t) {
    this._recStates = new Map(this._recStates).set(e, t);
  }
  async _handleGenerate(e) {
    if (!e.propertyAliases?.length) return;
    this._setRecState(e.checkNumber, { kind: "generating" });
    const t = {
      nodeId: this.nodeId,
      culture: this.culture,
      propertyAliases: e.propertyAliases,
      checkLabel: e.label,
      checkExplanation: e.explanation ?? null,
      properties: Object.fromEntries(
        Object.entries(this.properties).map(([a, r]) => [a, this._recommendInputValue(a, r)])
      )
    };
    try {
      const a = await N(t);
      if (!this.isConnected) return;
      this._setRecState(e.checkNumber, { kind: "result", values: a.recommendedValues });
    } catch (a) {
      if (!this.isConnected) return;
      const r = a instanceof w ? a.category : null, i = a instanceof w ? a.type : null;
      this._setRecState(e.checkNumber, { kind: "error", category: r, type: i });
    }
  }
  _handleApply(e, t, a) {
    if (!t || a === null) return;
    const r = new Map(this._applyFailedAliases), i = new Set(r.get(e.checkNumber) ?? []);
    i.delete(t) && (r.set(e.checkNumber, i), this._applyFailedAliases = r);
    const s = new Map(this._appliedAliases), n = new Set(s.get(e.checkNumber) ?? []);
    n.add(t), s.set(e.checkNumber, n), this._appliedAliases = s;
    const l = { propertyAlias: t, checkNumber: e.checkNumber, value: a };
    this.dispatchEvent(
      new CustomEvent("page-evaluator-rec-apply", {
        bubbles: !0,
        composed: !0,
        detail: l
      })
    );
  }
  async _handleCopy(e, t, a) {
    if (a === null || (await navigator.clipboard.writeText(a), !this.isConnected)) return;
    const r = new Map(this._copiedAliases), i = new Set(r.get(e) ?? []);
    i.add(t), r.set(e, i), this._copiedAliases = r, setTimeout(() => {
      if (!this.isConnected) return;
      const s = new Map(this._copiedAliases), n = new Set(s.get(e) ?? []);
      n.delete(t), s.set(e, n), this._copiedAliases = s;
    }, 2e3);
  }
};
u.styles = k`
    .rec-notice {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      margin-top: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
      border: 1px solid var(--uui-color-warning-standalone);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
    }

    .rec-notice--error {
      background: var(--uui-color-danger);
      color: var(--uui-color-danger-contrast);
      border-color: var(--uui-color-danger-standalone);
    }

    /* FR-015b notice: core's own inline-notice pattern (no alert element exists in 17.6; research R12.4). */
    .sampling-notice {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-4);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      background: var(--uui-color-warning);
      color: var(--uui-color-warning-contrast);
      border: 1px solid var(--uui-color-warning-standalone);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
    }

    .sampling-notice uui-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    :host {
      display: block;
      padding: var(--uui-size-space-4, 16px);
    }

    .score-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-4, 16px);
      margin-bottom: var(--uui-size-space-5, 20px);
      flex-wrap: wrap;
    }

    .score-total {
      font-size: var(--uui-type-h4-size, 1.25rem);
      font-weight: bold;
      margin-right: var(--uui-size-space-2, 8px);
    }

    .score-pill {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1, 4px);
      font-size: var(--uui-type-small-size, 0.875rem);
      font-weight: 600;
    }

    .score-pill uui-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }

    .score-pill--pass { color: var(--uui-color-positive, #4caf50); }
    .score-pill--warn { color: var(--uui-color-warning, #f57c00); }
    .score-pill--fail { color: var(--uui-color-danger, #d32f2f); }

    .suggestions-box {
      margin-bottom: var(--uui-size-space-5, 20px);
    }

    .suggestions-list {
      margin: 0;
      padding-left: var(--uui-size-space-5, 20px);
    }

    .suggestions-list li {
      margin-bottom: var(--uui-size-space-2, 8px);
      line-height: 1.5;
      font-size: var(--uui-type-small-size, 0.875rem);
    }

    .suggestions-list li:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: var(--uui-type-h5-size, 1rem);
      font-weight: 600;
      margin: var(--uui-size-space-5, 20px) 0 var(--uui-size-space-2, 8px);
      color: var(--uui-color-text, #333);
    }

    .check-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .check-item {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-2, 8px);
      padding: var(--uui-size-space-3, 12px) 0;
      border-bottom: 1px solid var(--uui-color-divider, #e0e0e0);
    }

    .check-item:last-child {
      border-bottom: none;
    }

    /* Fixed icon size — prevents uui-icon from inheriting varying font sizes */
    .check-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .check-icon[data-status='Pass'] {
      color: var(--uui-color-positive, #4caf50);
    }

    .check-icon[data-status='Fail'] {
      color: var(--uui-color-danger, #d32f2f);
    }

    .check-icon[data-status='Warn'] {
      color: var(--uui-color-warning, #f57c00);
    }

    .check-body {
      flex: 1;
      min-width: 0;
    }

    .check-label {
      font-weight: 500;
    }

    .check-explanation {
      color: var(--uui-color-text-alt, #666);
      font-size: var(--uui-type-small-size, 0.875rem);
      margin-top: var(--uui-size-space-1, 4px);
      line-height: 1.4;
    }

    .rec-generating {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2, 8px);
      font-size: var(--uui-type-small-size, 0.875rem);
      color: var(--uui-color-text-alt, #666);
      margin-top: var(--uui-size-space-2, 8px);
    }

    .rec-box {
      margin-top: var(--uui-size-space-2, 8px);
      padding: var(--uui-size-space-3, 12px) var(--uui-size-space-4, 16px);
      background: var(--uui-color-surface, #fff);
      border: 1px solid var(--uui-color-border, #d8d7d9);
      border-left: 3px solid var(--uui-color-default, #283a97);
      border-radius: var(--uui-border-radius, 3px);
    }

    .rec-box.applied {
      border-color: var(--uui-color-border, #d8d7d9);
      border-left-color: var(--uui-color-positive, #0b8152);
    }

    .rec-label {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1, 3px);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--uui-color-default-standalone, #25358b);
      margin-bottom: var(--uui-size-space-2, 8px);
    }

    .rec-label.applied {
      color: var(--uui-color-positive-standalone, #0a7349);
    }

    .rec-text {
      font-size: var(--uui-type-small-size, 0.875rem);
      line-height: 1.5;
      color: var(--uui-color-text, #060606);
      margin-bottom: var(--uui-size-space-3, 9px);
      word-break: break-word;
    }

    .rec-current-label {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1, 3px);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--uui-color-text-alt, #666);
      margin-bottom: var(--uui-size-space-2, 8px);
    }

    .rec-current-text {
      font-size: var(--uui-type-small-size, 0.875rem);
      line-height: 1.5;
      color: var(--uui-color-text-alt, #666);
      margin-bottom: 0;
      word-break: break-word;
    }

    .rec-section-divider {
      border: none;
      border-top: 1px solid var(--uui-color-divider, #e0e0e0);
      margin: var(--uui-size-space-3, 12px) 0;
    }

    .rec-generate-link {
      --uui-button-background-color: transparent;
      --uui-button-background-color-hover: transparent;
      --uui-button-border-color: transparent;
      --uui-button-border-color-hover: transparent;
      --uui-button-contrast: var(--uui-color-interactive, #1b264f);
      --uui-button-contrast-hover: var(--uui-color-interactive-emphasis, #283a97);
      padding: 0;
      height: auto;
      min-height: auto;
      text-decoration: underline;
      text-underline-offset: 2px;
      font-size: var(--uui-type-small-size, 0.875rem);
      margin-top: var(--uui-size-space-2, 8px);
      display: inline-flex;
    }

    .rec-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--uui-size-space-2, 8px);
      align-items: center;
    }

    .overall-score-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3, 12px);
      margin-bottom: var(--uui-size-space-4, 16px);
      flex-wrap: wrap;
    }

    .overall-score-label {
      font-size: var(--uui-type-h5-size, 1rem);
      font-weight: 600;
      color: var(--uui-color-text, #333);
    }

    .axis-scores-section {
      margin-bottom: var(--uui-size-space-5, 20px);
    }

    .axis-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .axis-item {
      display: flex;
      align-items: flex-start;
      gap: var(--uui-size-space-3, 12px);
      padding: var(--uui-size-space-2, 8px) 0;
      border-bottom: 1px solid var(--uui-color-divider, #e0e0e0);
    }

    .axis-item:last-child {
      border-bottom: none;
    }

    .axis-body {
      flex: 1;
      min-width: 0;
    }

    .axis-name {
      font-weight: 500;
    }

    .axis-feedback {
      color: var(--uui-color-text-alt, #666);
      font-size: var(--uui-type-small-size, 0.875rem);
      margin-top: var(--uui-size-space-1, 4px);
      line-height: 1.4;
    }
  `;
u._FULL_RECOMMEND_EDITORS = /* @__PURE__ */ new Set([
  "Umbraco.TextBox",
  "Umbraco.TextArea",
  "Umbraco.Markdown",
  "Umbraco.Tags",
  // Rich text: Apply builds a { markup, blocks } value (FR-016); _canApply adds the embedded-block check.
  "Umbraco.RichText",
  "Umbraco.TinyMCE"
]);
d([
  v({ attribute: !1 })
], u.prototype, "report", 2);
d([
  v({ attribute: !1 })
], u.prototype, "nodeId", 2);
d([
  v({ attribute: !1 })
], u.prototype, "culture", 2);
d([
  v({ attribute: !1 })
], u.prototype, "properties", 2);
d([
  v({ attribute: !1 })
], u.prototype, "propertyEditorAliases", 2);
d([
  v({ attribute: !1 })
], u.prototype, "propertyNames", 2);
d([
  v({ attribute: !1 })
], u.prototype, "additionalRecommendableEditorAliases", 2);
d([
  v({ attribute: !1 })
], u.prototype, "recommendationsEnabled", 2);
d([
  g()
], u.prototype, "_recStates", 2);
d([
  g()
], u.prototype, "_appliedAliases", 2);
d([
  g()
], u.prototype, "_copiedAliases", 2);
d([
  g()
], u.prototype, "_applyFailedAliases", 2);
u = d([
  A("page-evaluator-report")
], u);
function ee(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function te(e) {
  return e >= 4 ? "positive" : e >= 2.5 ? "warning" : "danger";
}
function re(e) {
  return e >= 4 ? "positive" : e >= 3 ? "warning" : "danger";
}
function ae(e) {
  switch (e) {
    case "Pass":
      return "icon-check";
    case "Fail":
      return "icon-wrong";
    case "Warn":
      return "icon-alert";
  }
}
function ie(e) {
  const t = e.split(`
`).map((l) => l.trim()).filter(Boolean), a = t.filter((l) => /^\d+\.\s+/.test(l));
  if (a.length > 1)
    return a.map((l) => l.replace(/^\d+\.\s+/, "").trim());
  const r = t.filter((l) => /^\(\d+\)\s+/.test(l));
  if (r.length > 1)
    return r.map((l) => l.replace(/^\(\d+\)\s+/, "").trim());
  const i = t.filter((l) => /^\d+\)\s+/.test(l));
  if (i.length > 1)
    return i.map((l) => l.replace(/^\d+\)\s+/, "").trim());
  const s = e.split(/\(\d+\)\s*/).map((l) => l.trim()).filter(Boolean);
  if (s.length > 1)
    return s;
  const n = e.split(/\d+\)\s+/).map((l) => l.trim()).filter(Boolean);
  return n.length > 1 ? n : [e.trim()];
}
function z(e) {
  const t = e.split(/\*\*([^*]+)\*\*/g);
  return o`${t.map((a, r) => r % 2 === 1 ? o`<strong>${a}</strong>` : a)}`;
}
var se = Object.defineProperty, oe = Object.getOwnPropertyDescriptor, T = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? oe(t, a) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (i = (r ? n(t, a, i) : n(i)) || i);
  return r && i && se(t, a, i), i;
};
let x = class extends E {
  constructor() {
    super(...arguments), this.rawResponse = null;
  }
  render() {
    return o`
      <div class="warning-banner">
        <p>
          <uui-icon name="icon-alert"></uui-icon>
          ${this.localize.term("evaluatePage_parseFailedWarning")}
        </p>
        <p>
          <a href="/umbraco/section/ai/page-evaluator">${this.localize.term("evaluatePage_parseFailedLinkText")}</a>
          ${this.localize.term("evaluatePage_parseFailedSuffix")}
        </p>
      </div>
      ${this.rawResponse ? o`<pre class="raw-response">${this.rawResponse}</pre>` : ""}
    `;
  }
};
x.styles = k`
    :host {
      display: block;
    }

    .warning-banner {
      padding: var(--uui-size-space-4, 16px);
      background: var(--uui-color-warning-standalone, #fff3cd);
      border: 1px solid var(--uui-color-warning, #ffc107);
      border-radius: var(--uui-border-radius, 4px);
      margin-bottom: var(--uui-size-space-4, 16px);
    }

    .warning-banner p {
      margin: 0 0 var(--uui-size-space-2, 8px);
    }

    .raw-response {
      margin-top: var(--uui-size-space-4, 16px);
      padding: var(--uui-size-space-4, 16px);
      background: var(--uui-color-surface, #fafafa);
      border: 1px solid var(--uui-color-divider, #e0e0e0);
      border-radius: var(--uui-border-radius, 4px);
      white-space: pre-wrap;
      font-family: monospace;
      font-size: var(--uui-type-small-size, 0.875rem);
    }
  `;
T([
  v({ type: String })
], x.prototype, "rawResponse", 2);
x = T([
  A("page-evaluator-warning")
], x);
var ne = Object.defineProperty, le = Object.getOwnPropertyDescriptor, f = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? le(t, a) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (i = (r ? n(t, a, i) : n(i)) || i);
  return r && i && ne(t, a, i), i;
};
const $ = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let h = class extends M {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressKey = "", this._report = null, this._errorDetail = null, this._errorCategory = null, this._errorType = null, this._inFlight = !1, this._onRecApply = (e) => {
      const t = e.detail;
      this._applyRecommendation(e.composedPath()[0] ?? null, t);
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext(F, (e) => {
      this._workspaceContext = e;
    }), this.addEventListener("page-evaluator-rec-apply", this._onRecApply), this._checkCacheAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.removeEventListener("page-evaluator-rec-apply", this._onRecApply);
  }
  async _checkCacheAndLoad() {
    const e = this.data;
    if (e) {
      if (e.cultureNotCreated) {
        this._modalState = "culture-not-created";
        return;
      }
      try {
        const t = await O(e.nodeId, e.culture);
        if (t) {
          if (!this.isConnected) return;
          this._report = t, this._modalState = t.parseFailed ? "parse-failed" : "success";
          return;
        }
      } catch {
      }
      this.isConnected && this._runEvaluation();
    }
  }
  async _runEvaluation() {
    if (this._inFlight) return;
    this._inFlight = !0;
    const e = this.data;
    if (!e) {
      this._inFlight = !1;
      return;
    }
    try {
      if (this._modalState = "loading", this._progressKey = $.sending, await this._tick(), !this.isConnected) return;
      this._progressKey = $.waiting;
      const t = await D({
        nodeId: e.nodeId,
        documentTypeAlias: e.documentTypeAlias,
        culture: e.culture,
        properties: e.properties
      });
      if (!this.isConnected || (this._progressKey = $.rendering, await this._tick(), !this.isConnected)) return;
      this._report = t, this._modalState = t.parseFailed ? "parse-failed" : "success";
    } catch (t) {
      if (!this.isConnected) return;
      const a = t instanceof w ? t : null, r = a?.type ?? null, i = a?.category ?? null, s = U({ type: r });
      !s && a?.status === 422 ? (this._modalState = "guardrail-blocked", this._errorDetail = a.detail) : (this._modalState = "error", this._errorDetail = s ? null : a?.detail ?? null, this._errorCategory = i, this._errorType = r);
    } finally {
      this._inFlight = !1;
    }
  }
  _rerun() {
    this._runEvaluation();
  }
  _close() {
    this._rejectModal();
  }
  /** Yields to the browser's render queue so the progress message is painted. */
  _tick() {
    return new Promise((e) => requestAnimationFrame(() => e()));
  }
  _formatCachedAt(e) {
    if (!e) return "";
    try {
      return new Date(e).toLocaleString(void 0, {
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      return e;
    }
  }
  /**
   * Writes a recommendation into the document (FR-016). On failure, tells the report element so it
   * can show the apply-failed message instead of "Applied"; existing content is left untouched.
   */
  async _applyRecommendation(e, t) {
    const a = this._workspaceContext;
    a && await X(
      a,
      t.propertyAlias,
      this._report?.propertyEditorAliases[t.propertyAlias],
      t.value,
      // FR-018c: the helper writes the viewed culture only for culture-varying properties.
      this.data?.culture ?? null
    ) || !this.isConnected || e?.dispatchEvent(
      new CustomEvent("page-evaluator-rec-apply-failed", {
        detail: { propertyAlias: t.propertyAlias, checkNumber: t.checkNumber }
      })
    );
  }
  render() {
    return o`
      <umb-body-layout headline=${this.localize.term("evaluatePage_modalHeadline")}>
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === "success" || this._modalState === "parse-failed" ? o`
                <uui-button
                  look="secondary"
                  label=${this.localize.term("evaluatePage_rerunButton")}
                  @click=${() => this._rerun()}>
                  ${this.localize.term("evaluatePage_rerunButton")}
                </uui-button>
              ` : c}
          <uui-button
            label=${this.localize.term("evaluatePage_closeButton")}
            @click=${() => this._close()}>
            ${this.localize.term("evaluatePage_closeButton")}
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }
  _renderBody() {
    switch (this._modalState) {
      case "idle":
        return c;
      case "loading":
        return o`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this.localize.term(this._progressKey)}</p>
          </div>
        `;
      case "success":
        return o`
          ${this._renderCacheBar()}
          <page-evaluator-report
            .report="${this._report}"
            .nodeId="${this.data?.nodeId ?? ""}"
            .culture="${this.data?.culture ?? null}"
            .properties="${this.data?.properties ?? {}}"
            .propertyEditorAliases="${this._report?.propertyEditorAliases ?? {}}"
            .propertyNames="${this._report?.propertyNames ?? {}}"
            .recommendationsEnabled="${this._report?.recommendationsEnabled ?? !0}"
            .additionalRecommendableEditorAliases="${this._report?.additionalRecommendableEditorAliases ?? []}">
          </page-evaluator-report>
        `;
      case "parse-failed":
        return o`
          ${this._renderCacheBar()}
          <page-evaluator-warning
            .rawResponse="${this._report?.rawResponse ?? null}"></page-evaluator-warning>
        `;
      case "culture-not-created":
        return o`
          <div class="error-container" role="status">
            <p>${this.localize.term("evaluatePage_cultureNotCreatedMessage")}</p>
          </div>
        `;
      case "guardrail-blocked":
        return o`
          <div class="error-container" role="alert">
            <p>${this.localize.term("evaluatePage_guardrailBlockedMessage")}</p>
            ${this._errorDetail ? o`<p><em>${this._errorDetail}</em></p>` : c}
          </div>
        `;
      case "error": {
        const e = S({ type: this._errorType, category: this._errorCategory }, "evaluatePage_aiErrorMessage");
        return o`
          <div class="error-container" role="alert">
            <p>${this.localize.term(e)}</p>
            ${this._errorDetail ? o`<p><em>${this._errorDetail}</em></p>` : c}
            <uui-button
              look="primary"
              color="warning"
              label=${this.localize.term("evaluatePage_retryButton")}
              @click="${() => this._rerun()}">
              ${this.localize.term("evaluatePage_retryButton")}
            </uui-button>
          </div>
        `;
      }
    }
  }
  _renderCacheBar() {
    const e = this._report?.cachedAt;
    return e ? o`
      <div class="cache-bar">
        <span>${this.localize.term("evaluatePage_lastEvaluated")} ${this._formatCachedAt(e)}</span>
      </div>
    ` : c;
  }
};
h.styles = k`
    .progress-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--uui-size-space-4, 16px);
      padding: var(--uui-size-layout-2, 30px);
    }

    .cache-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--uui-size-space-3, 12px);
      padding: var(--uui-size-space-3, 12px) var(--uui-size-space-4, 16px);
      background: var(--uui-color-surface-emphasis, #f3f3f3);
      border-bottom: 1px solid var(--uui-color-border, #e0e0e0);
      font-size: 0.85rem;
      color: var(--uui-color-text-alt, #666);
    }

    .error-container {
      padding: var(--uui-size-space-4, 16px);
      background: var(--uui-color-danger-standalone, #b91c1c);
      border-radius: var(--uui-border-radius, 4px);
      color: var(--uui-color-danger-contrast, #fff);
    }
  `;
f([
  g()
], h.prototype, "_modalState", 2);
f([
  g()
], h.prototype, "_progressKey", 2);
f([
  g()
], h.prototype, "_report", 2);
f([
  g()
], h.prototype, "_errorDetail", 2);
f([
  g()
], h.prototype, "_errorCategory", 2);
f([
  g()
], h.prototype, "_errorType", 2);
h = f([
  A("page-evaluator-modal")
], h);
export {
  h as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element--7gRukFX.js.map
