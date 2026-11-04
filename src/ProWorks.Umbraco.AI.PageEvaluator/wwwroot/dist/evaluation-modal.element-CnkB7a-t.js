import { css as k, property as v, state as h, customElement as A, nothing as c, html as o } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as T } from "@umbraco-cms/backoffice/modal";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as F } from "@umbraco-cms/backoffice/document";
import { UmbDataPathPropertyValueQuery as N, UMB_VALIDATION_CONTEXT as M } from "@umbraco-cms/backoffice/validation";
import { r as D, A as w, g as B, e as O } from "./entry-point-BHYSU-3A.js";
import { l as P, s as I } from "./error-category-TUEjuh5i.js";
import { UmbVariantId as L } from "@umbraco-cms/backoffice/variant";
import { UmbLitElement as E } from "@umbraco-cms/backoffice/lit-element";
function U() {
  return { layout: {}, contentData: [], settingsData: [], expose: [] };
}
const S = /<umb-rte-block(?:-inline)?\b[^>]*>/gi, j = /\bdata-content-(?:key|id)\s*=\s*"([^"]*)"/i, W = /(<umb-rte-block(-inline)?\b[^>]*>)\s*(<\/umb-rte-block\2>)/gi;
function C(e) {
  const t = [];
  for (const i of e.matchAll(S)) {
    const r = j.exec(i[0])?.[1];
    r && t.push(r);
  }
  return t;
}
function V(e) {
  return e.replace(S, (t) => t.replace(/\bdata-content-id(\s*=)/i, "data-content-key$1")).replace(W, "$1<!--Umbraco-Block-->$3");
}
function K(e, t) {
  const i = C(t), r = new Set(i);
  if (r.size !== i.length) return !1;
  const a = new Set(C(e));
  if (a.size !== r.size) return !1;
  for (const s of a)
    if (!r.has(s)) return !1;
  return !0;
}
const G = /* @__PURE__ */ new Set(["Umbraco.RichText", "Umbraco.TinyMCE"]);
function y(e) {
  return e !== void 0 && G.has(e);
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
  const i = t.map((r) => String(r).trim()).filter((r) => r.length > 0);
  return [...new Set(i)];
}
function X(e) {
  return typeof e == "object" && e !== null && "layout" in e && "contentData" in e && Array.isArray(e.contentData);
}
function Y(e) {
  return typeof e != "object" || e === null || !("blocks" in e) ? null : X(e.blocks) ? e.blocks : null;
}
async function q(e, t, i, r, a, s) {
  try {
    const n = await e.structure.getPropertyStructureByAlias(t), l = a !== null && e.getVariesByCulture() === !0 && n?.variesByCulture === !0 ? a : null, m = L.Create({ culture: l, segment: null });
    let f = r;
    if (y(i)) {
      const b = e.getPropertyValue(t, m);
      f = {
        // Recommendations for rich text are always HTML strings; anything else is not applicable markup.
        markup: V(typeof r == "string" ? r : ""),
        blocks: Y(b) ?? U()
      };
    } else i === "Umbraco.Tags" && (f = H(r));
    return await e.setPropertyValue(t, f, m), s?.removeMessagesByPath(
      `$.values[${N({ alias: t, culture: m.culture, segment: m.segment })}].value`
    ), !0;
  } catch {
    return !1;
  }
}
var J = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, d = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? Q(t, i) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(t, i, a) : n(a)) || a);
  return r && a && J(t, i, a), a;
};
let u = class extends E {
  constructor() {
    super(...arguments), this.nodeId = "", this.culture = null, this.properties = {}, this.propertyEditorAliases = {}, this.propertyNames = {}, this.additionalRecommendableEditorAliases = [], this.recommendationsEnabled = !0, this._recStates = /* @__PURE__ */ new Map(), this._appliedAliases = /* @__PURE__ */ new Map(), this._copiedAliases = /* @__PURE__ */ new Map(), this._applyFailedAliases = /* @__PURE__ */ new Map(), this._onApplyFailed = (e) => {
      const t = e.detail, i = new Map(this._appliedAliases), r = new Set(i.get(t.checkNumber) ?? []);
      r.delete(t.propertyAlias), i.set(t.checkNumber, r), this._appliedAliases = i;
      const a = new Map(this._applyFailedAliases), s = new Set(a.get(t.checkNumber) ?? []);
      s.add(t.propertyAlias), a.set(t.checkNumber, s), this._applyFailedAliases = a;
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
    const { checks: e, suggestions: t, overallScore: i, axisScores: r } = this.report, a = i !== null || r !== null && r.length > 0, s = e.filter((p) => p.status === "Pass").length, n = e.filter((p) => p.status === "Warn").length, l = e.filter((p) => p.status === "Fail").length, m = e.length, f = e.filter((p) => p.status === "Fail" || p.status === "Warn"), b = e.filter((p) => p.status === "Pass");
    return o`
      ${a ? this._renderScoring(i, r) : c}

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

      ${f.length > 0 ? o`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${f.length})</p>
            <ul class="check-list">
              ${f.map((p) => this._renderCheck(p))}
            </ul>
          ` : c}

      ${b.length > 0 ? o`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${b.length})</p>
            <ul class="check-list">
              ${b.map((p) => this._renderCheck(p))}
            </ul>
          ` : c}
    `;
  }
  _renderSuggestions(e) {
    const t = ie(e);
    if (t.length === 1)
      return o`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${z(t[0] ?? "")}</p>`;
    const i = t[0] ?? "", r = i.endsWith(":"), a = r ? t.slice(1) : t;
    return o`
      ${r ? o`<p style="margin:0 0 var(--uui-size-space-2, 8px); font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${z(i)}</p>` : c}
      <ol class="suggestions-list">
        ${a.map((s) => o`<li>${z(s)}</li>`)}
      </ol>
    `;
  }
  _renderScoring(e, t) {
    return o`
      ${e !== null ? o`
            <div class="overall-score-row">
              <span class="overall-score-label">${this.localize.term("evaluatePage_overallScore")}</span>
              <uui-tag color=${ee(e)} look="primary">
                ${e.toFixed(1)} / 5
              </uui-tag>
            </div>
          ` : c}
      ${t && t.length > 0 ? o`
            <div class="axis-scores-section">
              <p class="section-title">${this.localize.term("evaluatePage_axisScores")}</p>
              <ul class="axis-list">
                ${t.map((i) => this._renderAxis(i))}
              </ul>
            </div>
          ` : c}
    `;
  }
  _renderAxis(e) {
    return o`
      <li class="axis-item">
        <uui-tag color=${te(e.score)} look="primary">${e.score} / 5</uui-tag>
        <div class="axis-body">
          <div class="axis-name">${Z(e.name)}</div>
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
    const i = this.properties[e];
    if (typeof i != "string") return !1;
    const r = i.trimStart();
    return r.length === 0 ? !0 : r[0] !== "{" && r[0] !== "[" && !r.startsWith("umb://");
  }
  /**
   * Returns true when the Apply button should be shown for the given property alias and recommendation.
   * Rich text is applicable only when the recommendation keeps every embedded block placeholder of the
   * current value exactly once (FR-016). Editors listed in additionalRecommendableEditorAliases are
   * treated as full recommend (apply supported).
   */
  _canApply(e, t) {
    const i = this.propertyEditorAliases[e];
    if (y(i))
      return t !== null && K(this._currentMarkup(e), t);
    if (i !== void 0)
      return u._FULL_RECOMMEND_EDITORS.has(i) || this._isAdditionalEditor(i);
    const r = this.properties[e];
    if (typeof r != "string") return !1;
    const a = r.trimStart();
    return a.length === 0 ? !0 : a[0] !== "{" && a[0] !== "[" && !a.startsWith("umb://");
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
    return y(this.propertyEditorAliases[e]) ? this._currentMarkup(e) : typeof t == "string" ? t : JSON.stringify(t ?? "");
  }
  _resolveCurrentValue(e) {
    const t = this.properties[e];
    return t == null ? "" : typeof t == "string" ? t : Array.isArray(t) ? t.join(", ") : y(this.propertyEditorAliases[e]) ? this._currentMarkup(e) : "";
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
    const t = this._recStates.get(e.checkNumber) ?? { kind: "idle" }, i = this.recommendationsEnabled && (e.status === "Fail" || e.status === "Warn") ? (e.propertyAliases ?? []).filter((a) => this._canRecommend(a)) : [], r = i.length > 0;
    return o`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${re(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? o`<div class="check-explanation">${e.explanation}</div>` : c}
          ${r ? this._renderRecState(e, t, i) : c}
        </div>
      </li>
    `;
  }
  _renderRecState(e, t, i) {
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
        return o`${i.map((r) => {
          const a = this._appliedAliases.get(e.checkNumber)?.has(r) ?? !1, s = t.values[r] ?? null;
          return this._renderRecBox(e, r, s, a, this._canApply(r, s));
        })}`;
      case "error": {
        const r = P(t, "evaluatePage_recError");
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
  _renderRecBox(e, t, i, r, a) {
    const s = this._copiedAliases.get(e.checkNumber)?.has(t) ?? !1, n = this._applyFailedAliases.get(e.checkNumber)?.has(t) ?? !1, l = !a && i !== null && y(this.propertyEditorAliases[t]), m = this._resolveCurrentValue(t);
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
        <div class="rec-text">${i ?? ""}</div>
        ${l ? o`<div class="rec-notice" role="status">
              <uui-icon name="icon-info"></uui-icon>
              <span>${this.localize.term("evaluatePage_rteApplyBlockedMessage")}</span>
            </div>` : c}
        ${n ? o`<div class="rec-notice rec-notice--error" role="alert">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this.localize.term("evaluatePage_applyFailedMessage")}</span>
            </div>` : c}
        <div class="rec-actions">
          ${a && !r ? o`
                <uui-button
                  look="primary"
                  color="positive"
                  compact
                  label=${this.localize.term("evaluatePage_recApply")}
                  @click=${() => this._handleApply(e, t, i)}>
                  ${this.localize.term("evaluatePage_recApply")}
                </uui-button>
              ` : c}
          <uui-button
            look="secondary"
            compact
            label=${s ? this.localize.term("evaluatePage_recCopied") : this.localize.term("evaluatePage_recCopy")}
            ?disabled=${s}
            @click=${() => {
      this._handleCopy(e.checkNumber, t, i);
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
        Object.entries(this.properties).map(([i, r]) => [i, this._recommendInputValue(i, r)])
      )
    };
    try {
      const i = await D(t);
      if (!this.isConnected) return;
      this._setRecState(e.checkNumber, { kind: "result", values: i.recommendedValues });
    } catch (i) {
      if (!this.isConnected) return;
      const r = i instanceof w ? i.category : null, a = i instanceof w ? i.type : null;
      this._setRecState(e.checkNumber, { kind: "error", category: r, type: a });
    }
  }
  _handleApply(e, t, i) {
    if (!t || i === null) return;
    const r = new Map(this._applyFailedAliases), a = new Set(r.get(e.checkNumber) ?? []);
    a.delete(t) && (r.set(e.checkNumber, a), this._applyFailedAliases = r);
    const s = new Map(this._appliedAliases), n = new Set(s.get(e.checkNumber) ?? []);
    n.add(t), s.set(e.checkNumber, n), this._appliedAliases = s;
    const l = { propertyAlias: t, checkNumber: e.checkNumber, value: i };
    this.dispatchEvent(
      new CustomEvent("page-evaluator-rec-apply", {
        bubbles: !0,
        composed: !0,
        detail: l
      })
    );
  }
  async _handleCopy(e, t, i) {
    if (i === null || (await navigator.clipboard.writeText(i), !this.isConnected)) return;
    const r = new Map(this._copiedAliases), a = new Set(r.get(e) ?? []);
    a.add(t), r.set(e, a), this._copiedAliases = r, setTimeout(() => {
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
  h()
], u.prototype, "_recStates", 2);
d([
  h()
], u.prototype, "_appliedAliases", 2);
d([
  h()
], u.prototype, "_copiedAliases", 2);
d([
  h()
], u.prototype, "_applyFailedAliases", 2);
u = d([
  A("page-evaluator-report")
], u);
function Z(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function ee(e) {
  return e >= 4 ? "positive" : e >= 2.5 ? "warning" : "danger";
}
function te(e) {
  return e >= 4 ? "positive" : e >= 3 ? "warning" : "danger";
}
function re(e) {
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
`).map((l) => l.trim()).filter(Boolean), i = t.filter((l) => /^\d+\.\s+/.test(l));
  if (i.length > 1)
    return i.map((l) => l.replace(/^\d+\.\s+/, "").trim());
  const r = t.filter((l) => /^\(\d+\)\s+/.test(l));
  if (r.length > 1)
    return r.map((l) => l.replace(/^\(\d+\)\s+/, "").trim());
  const a = t.filter((l) => /^\d+\)\s+/.test(l));
  if (a.length > 1)
    return a.map((l) => l.replace(/^\d+\)\s+/, "").trim());
  const s = e.split(/\(\d+\)\s*/).map((l) => l.trim()).filter(Boolean);
  if (s.length > 1)
    return s;
  const n = e.split(/\d+\)\s+/).map((l) => l.trim()).filter(Boolean);
  return n.length > 1 ? n : [e.trim()];
}
function z(e) {
  const t = e.split(/\*\*([^*]+)\*\*/g);
  return o`${t.map((i, r) => r % 2 === 1 ? o`<strong>${i}</strong>` : i)}`;
}
var ae = Object.defineProperty, se = Object.getOwnPropertyDescriptor, R = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? se(t, i) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(t, i, a) : n(a)) || a);
  return r && a && ae(t, i, a), a;
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
R([
  v({ type: String })
], x.prototype, "rawResponse", 2);
x = R([
  A("page-evaluator-warning")
], x);
var oe = Object.defineProperty, ne = Object.getOwnPropertyDescriptor, _ = (e, t, i, r) => {
  for (var a = r > 1 ? void 0 : r ? ne(t, i) : t, s = e.length - 1, n; s >= 0; s--)
    (n = e[s]) && (a = (r ? n(t, i, a) : n(a)) || a);
  return r && a && oe(t, i, a), a;
};
const $ = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let g = class extends T {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressKey = "", this._report = null, this._errorDetail = null, this._errorCategory = null, this._errorType = null, this._inFlight = !1, this._onRecApply = (e) => {
      const t = e.detail;
      this._applyRecommendation(e.composedPath()[0] ?? null, t);
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext(F, (e) => {
      this._workspaceContext = e;
    }), this.consumeContext(M, (e) => {
      this._validationContext = e;
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
        const t = await B(e.nodeId, e.culture);
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
      const t = await O({
        nodeId: e.nodeId,
        documentTypeAlias: e.documentTypeAlias,
        culture: e.culture,
        properties: e.properties
      });
      if (!this.isConnected || (this._progressKey = $.rendering, await this._tick(), !this.isConnected)) return;
      this._report = t, this._modalState = t.parseFailed ? "parse-failed" : "success";
    } catch (t) {
      if (!this.isConnected) return;
      const i = t instanceof w ? t : null, r = i?.type ?? null, a = i?.category ?? null, s = I({ type: r });
      !s && i?.status === 422 ? (this._modalState = "guardrail-blocked", this._errorDetail = i.detail) : (this._modalState = "error", this._errorDetail = s ? null : i?.detail ?? null, this._errorCategory = a, this._errorType = r);
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
    const i = this._workspaceContext;
    i && await q(
      i,
      t.propertyAlias,
      this._report?.propertyEditorAliases[t.propertyAlias],
      t.value,
      // FR-018c: the helper writes the viewed culture only for culture-varying properties.
      this.data?.culture ?? null,
      // Clears the field's stale validation messages after the write (QS-3 l).
      this._validationContext?.messages
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
  /**
   * 005 FR-019/FR-020: Umbraco.AI's standard AI disclosure notice, shown wherever this modal shows AI output.
   * The element is registered globally by Umbraco.AI's backoffice entry point (import map `@umbraco-ai/core`),
   * like `<uai-profile-picker>`, so no import is needed. It follows the site-wide Always/Dismissible/Off
   * setting itself and renders nothing when hidden. One `location` covers the report and its recommendation
   * panels, so a single dismissal hides it for both.
   */
  _renderDisclosureNotice() {
    return o`<uai-disclosure-notice class="disclosure-notice" location="page-evaluator"></uai-disclosure-notice>`;
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
          ${this._renderDisclosureNotice()}
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
          ${this._renderDisclosureNotice()}
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
        const e = P({ type: this._errorType, category: this._errorCategory }, "evaluatePage_aiErrorMessage");
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
g.styles = k`
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

    /* 005 FR-019: Umbraco.AI's disclosure notice; takes no space while hidden (:host not [visible]). */
    .disclosure-notice[visible] {
      margin: var(--uui-size-space-3, 12px) 0;
    }

    .error-container {
      padding: var(--uui-size-space-4, 16px);
      background: var(--uui-color-danger-standalone, #b91c1c);
      border-radius: var(--uui-border-radius, 4px);
      color: var(--uui-color-danger-contrast, #fff);
    }
  `;
_([
  h()
], g.prototype, "_modalState", 2);
_([
  h()
], g.prototype, "_progressKey", 2);
_([
  h()
], g.prototype, "_report", 2);
_([
  h()
], g.prototype, "_errorDetail", 2);
_([
  h()
], g.prototype, "_errorCategory", 2);
_([
  h()
], g.prototype, "_errorType", 2);
g = _([
  A("page-evaluator-modal")
], g);
export {
  g as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-CnkB7a-t.js.map
