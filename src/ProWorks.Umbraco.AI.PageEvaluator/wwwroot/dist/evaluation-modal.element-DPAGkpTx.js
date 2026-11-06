import { css as w, property as g, state as h, customElement as A, nothing as c, html as s } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as S } from "@umbraco-cms/backoffice/modal";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as R } from "@umbraco-cms/backoffice/document";
import { UMB_VALIDATION_CONTEXT as F } from "@umbraco-cms/backoffice/validation";
import { r as N, A as $, a as D, e as M } from "./entry-point-CGNjGQ_u.js";
import { l as P, s as B } from "./error-category-TUEjuh5i.js";
import { c as I, b as O, i as k, e as T, a as L, f as W } from "./recommend-eligibility-CHWTCfzX.js";
import { UmbLitElement as C } from "@umbraco-cms/backoffice/lit-element";
var K = Object.defineProperty, j = Object.getOwnPropertyDescriptor, d = (e, t, r, i) => {
  for (var a = i > 1 ? void 0 : i ? j(t, r) : t, o = e.length - 1, l; o >= 0; o--)
    (l = e[o]) && (a = (i ? l(t, r, a) : l(a)) || a);
  return i && a && K(t, r, a), a;
};
let u = class extends C {
  constructor() {
    super(...arguments), this.nodeId = "", this.culture = null, this.properties = {}, this.propertyEditorAliases = {}, this.propertyNames = {}, this.additionalRecommendableEditorAliases = [], this.recommendationsEnabled = !0, this._recStates = /* @__PURE__ */ new Map(), this._appliedAliases = /* @__PURE__ */ new Map(), this._copiedAliases = /* @__PURE__ */ new Map(), this._applyFailedAliases = /* @__PURE__ */ new Map(), this._onApplyFailed = (e) => {
      const t = e.detail, r = new Map(this._appliedAliases), i = new Set(r.get(t.checkNumber) ?? []);
      i.delete(t.propertyAlias), r.set(t.checkNumber, i), this._appliedAliases = r;
      const a = new Map(this._applyFailedAliases), o = new Set(a.get(t.checkNumber) ?? []);
      o.add(t.propertyAlias), a.set(t.checkNumber, o), this._applyFailedAliases = a;
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
    const { checks: e, suggestions: t, overallScore: r, axisScores: i } = this.report, a = r !== null || i !== null && i.length > 0, o = e.filter((p) => p.status === "Pass").length, l = e.filter((p) => p.status === "Warn").length, n = e.filter((p) => p.status === "Fail").length, f = e.length, b = e.filter((p) => p.status === "Fail" || p.status === "Warn"), y = e.filter((p) => p.status === "Pass");
    return s`
      ${a ? this._renderScoring(r, i) : c}

      ${f > 0 ? s`
            <div class="score-row">
              <span class="score-total">${f} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${o} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${l > 0 ? s`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${l} ${l !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : c}
              ${n > 0 ? s`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${n} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : c}
            </div>
          ` : c}

      ${t ? s`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(t)}
            </uui-box>
          ` : c}

      ${b.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${b.length})</p>
            <ul class="check-list">
              ${b.map((p) => this._renderCheck(p))}
            </ul>
          ` : c}

      ${y.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${y.length})</p>
            <ul class="check-list">
              ${y.map((p) => this._renderCheck(p))}
            </ul>
          ` : c}
    `;
  }
  _renderSuggestions(e) {
    const t = H(e);
    if (t.length === 1)
      return s`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${x(t[0] ?? "")}</p>`;
    const r = t[0] ?? "", i = r.endsWith(":"), a = i ? t.slice(1) : t;
    return s`
      ${i ? s`<p style="margin:0 0 var(--uui-size-space-2, 8px); font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${x(r)}</p>` : c}
      <ol class="suggestions-list">
        ${a.map((o) => s`<li>${x(o)}</li>`)}
      </ol>
    `;
  }
  _renderScoring(e, t) {
    return s`
      ${e !== null ? s`
            <div class="overall-score-row">
              <span class="overall-score-label">${this.localize.term("evaluatePage_overallScore")}</span>
              <uui-tag color=${U(e)} look="primary">
                ${e.toFixed(1)} / 5
              </uui-tag>
            </div>
          ` : c}
      ${t && t.length > 0 ? s`
            <div class="axis-scores-section">
              <p class="section-title">${this.localize.term("evaluatePage_axisScores")}</p>
              <ul class="axis-list">
                ${t.map((r) => this._renderAxis(r))}
              </ul>
            </div>
          ` : c}
    `;
  }
  _renderAxis(e) {
    return s`
      <li class="axis-item">
        <uui-tag color=${V(e.score)} look="primary">${e.score} / 5</uui-tag>
        <div class="axis-body">
          <div class="axis-name">${G(e.name)}</div>
          ${e.feedback ? s`<div class="axis-feedback">${e.feedback}</div>` : c}
        </div>
      </li>
    `;
  }
  /** The parts of the report the shared eligibility rules read (FR-016; 006 FR-005). */
  get _eligibility() {
    return {
      propertyEditorAliases: this.propertyEditorAliases,
      additionalRecommendableEditorAliases: this.additionalRecommendableEditorAliases
    };
  }
  /** True when a recommendation can be shown for `alias` (shared with the Copilot tools). */
  _canRecommend(e) {
    return I(e, this._eligibility, this.properties[e]);
  }
  /** True when Apply is shown for `alias` and `recommended` (rich text also needs the embedded-block check). */
  _canApply(e, t) {
    return O(e, t, this.properties[e], this._eligibility);
  }
  _resolveCurrentValue(e) {
    const t = this.properties[e];
    return t == null ? "" : typeof t == "string" ? t : Array.isArray(t) ? t.join(", ") : k(this.propertyEditorAliases[e]) ? T(t) : "";
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
    const t = this._recStates.get(e.checkNumber) ?? { kind: "idle" }, r = this.recommendationsEnabled && (e.status === "Fail" || e.status === "Warn") ? (e.propertyAliases ?? []).filter((a) => this._canRecommend(a)) : [], i = r.length > 0;
    return s`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${q(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? s`<div class="check-explanation">${e.explanation}</div>` : c}
          ${i ? this._renderRecState(e, t, r) : c}
        </div>
      </li>
    `;
  }
  _renderRecState(e, t, r) {
    switch (t.kind) {
      case "idle":
        return s`
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
        return s`
          <div class="rec-generating">
            <uui-loader></uui-loader>
            <span>${this.localize.term("evaluatePage_recGenerating")}</span>
          </div>
        `;
      case "result":
        return s`${r.map((i) => {
          const a = this._appliedAliases.get(e.checkNumber)?.has(i) ?? !1, o = t.values[i] ?? null;
          return this._renderRecBox(e, i, o, a, this._canApply(i, o));
        })}`;
      case "error": {
        const i = P(t, "evaluatePage_recError");
        return s`
          <div style="display:flex;align-items:center;gap:var(--uui-size-space-2,8px);margin-top:var(--uui-size-space-2,8px);">
            <uui-icon name="icon-alert" style="color:var(--uui-color-danger-standalone,#b91c1c);"></uui-icon>
            <span style="color:var(--uui-color-danger-standalone,#b91c1c);font-size:0.85rem;">
              ${this.localize.term(i)}
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
  _renderRecBox(e, t, r, i, a) {
    const o = this._copiedAliases.get(e.checkNumber)?.has(t) ?? !1, l = this._applyFailedAliases.get(e.checkNumber)?.has(t) ?? !1, n = !a && r !== null && k(this.propertyEditorAliases[t]), f = this._resolveCurrentValue(t);
    return s`
      <div class="rec-box ${i ? "applied" : ""}">
        ${f ? s`
              <div class="rec-current-label">
                <uui-icon name="icon-edit"></uui-icon>
                ${this._recCurrentLabel(t)}
              </div>
              <div class="rec-current-text">${f}</div>
              <hr class="rec-section-divider" />
            ` : c}
        <div class="rec-label ${i ? "applied" : ""}">
          <uui-icon name="${i ? "icon-check" : "icon-wand"}"></uui-icon>
          ${i ? this.localize.term("evaluatePage_recApplied") : this._recSuggestedLabel(t)}
        </div>
        <div class="rec-text">${r ?? ""}</div>
        ${n ? s`<div class="rec-notice" role="status">
              <uui-icon name="icon-info"></uui-icon>
              <span>${this.localize.term("evaluatePage_rteApplyBlockedMessage")}</span>
            </div>` : c}
        ${l ? s`<div class="rec-notice rec-notice--error" role="alert">
              <uui-icon name="icon-alert"></uui-icon>
              <span>${this.localize.term("evaluatePage_applyFailedMessage")}</span>
            </div>` : c}
        <div class="rec-actions">
          ${a && !i ? s`
                <uui-button
                  look="primary"
                  color="positive"
                  compact
                  label=${this.localize.term("evaluatePage_recApply")}
                  @click=${() => this._handleApply(e, t, r)}>
                  ${this.localize.term("evaluatePage_recApply")}
                </uui-button>
              ` : c}
          <uui-button
            look="secondary"
            compact
            label=${o ? this.localize.term("evaluatePage_recCopied") : this.localize.term("evaluatePage_recCopy")}
            ?disabled=${o}
            @click=${() => {
      this._handleCopy(e.checkNumber, t, r);
    }}>
            <uui-icon
              name="${o ? "icon-check" : "icon-clipboard-copy"}"
              slot="icon"></uui-icon>
            ${o ? this.localize.term("evaluatePage_recCopied") : this.localize.term("evaluatePage_recCopy")}
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
      properties: L(this.properties, this.propertyEditorAliases)
    };
    try {
      const r = await N(t);
      if (!this.isConnected) return;
      this._setRecState(e.checkNumber, { kind: "result", values: r.recommendedValues });
    } catch (r) {
      if (!this.isConnected) return;
      const i = r instanceof $ ? r.category : null, a = r instanceof $ ? r.type : null;
      this._setRecState(e.checkNumber, { kind: "error", category: i, type: a });
    }
  }
  _handleApply(e, t, r) {
    if (!t || r === null) return;
    const i = new Map(this._applyFailedAliases), a = new Set(i.get(e.checkNumber) ?? []);
    a.delete(t) && (i.set(e.checkNumber, a), this._applyFailedAliases = i);
    const o = new Map(this._appliedAliases), l = new Set(o.get(e.checkNumber) ?? []);
    l.add(t), o.set(e.checkNumber, l), this._appliedAliases = o;
    const n = { propertyAlias: t, checkNumber: e.checkNumber, value: r };
    this.dispatchEvent(
      new CustomEvent("page-evaluator-rec-apply", {
        bubbles: !0,
        composed: !0,
        detail: n
      })
    );
  }
  async _handleCopy(e, t, r) {
    if (r === null || (await navigator.clipboard.writeText(r), !this.isConnected)) return;
    const i = new Map(this._copiedAliases), a = new Set(i.get(e) ?? []);
    a.add(t), i.set(e, a), this._copiedAliases = i, setTimeout(() => {
      if (!this.isConnected) return;
      const o = new Map(this._copiedAliases), l = new Set(o.get(e) ?? []);
      l.delete(t), o.set(e, l), this._copiedAliases = o;
    }, 2e3);
  }
};
u.styles = w`
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
d([
  g({ attribute: !1 })
], u.prototype, "report", 2);
d([
  g({ attribute: !1 })
], u.prototype, "nodeId", 2);
d([
  g({ attribute: !1 })
], u.prototype, "culture", 2);
d([
  g({ attribute: !1 })
], u.prototype, "properties", 2);
d([
  g({ attribute: !1 })
], u.prototype, "propertyEditorAliases", 2);
d([
  g({ attribute: !1 })
], u.prototype, "propertyNames", 2);
d([
  g({ attribute: !1 })
], u.prototype, "additionalRecommendableEditorAliases", 2);
d([
  g({ attribute: !1 })
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
function G(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function U(e) {
  return e >= 4 ? "positive" : e >= 2.5 ? "warning" : "danger";
}
function V(e) {
  return e >= 4 ? "positive" : e >= 3 ? "warning" : "danger";
}
function q(e) {
  switch (e) {
    case "Pass":
      return "icon-check";
    case "Fail":
      return "icon-wrong";
    case "Warn":
      return "icon-alert";
  }
}
function H(e) {
  const t = e.split(`
`).map((n) => n.trim()).filter(Boolean), r = t.filter((n) => /^\d+\.\s+/.test(n));
  if (r.length > 1)
    return r.map((n) => n.replace(/^\d+\.\s+/, "").trim());
  const i = t.filter((n) => /^\(\d+\)\s+/.test(n));
  if (i.length > 1)
    return i.map((n) => n.replace(/^\(\d+\)\s+/, "").trim());
  const a = t.filter((n) => /^\d+\)\s+/.test(n));
  if (a.length > 1)
    return a.map((n) => n.replace(/^\d+\)\s+/, "").trim());
  const o = e.split(/\(\d+\)\s*/).map((n) => n.trim()).filter(Boolean);
  if (o.length > 1)
    return o;
  const l = e.split(/\d+\)\s+/).map((n) => n.trim()).filter(Boolean);
  return l.length > 1 ? l : [e.trim()];
}
function x(e) {
  const t = e.split(/\*\*([^*]+)\*\*/g);
  return s`${t.map((r, i) => i % 2 === 1 ? s`<strong>${r}</strong>` : r)}`;
}
var X = Object.defineProperty, Y = Object.getOwnPropertyDescriptor, E = (e, t, r, i) => {
  for (var a = i > 1 ? void 0 : i ? Y(t, r) : t, o = e.length - 1, l; o >= 0; o--)
    (l = e[o]) && (a = (i ? l(t, r, a) : l(a)) || a);
  return i && a && X(t, r, a), a;
};
let _ = class extends C {
  constructor() {
    super(...arguments), this.rawResponse = null;
  }
  render() {
    return s`
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
      ${this.rawResponse ? s`<pre class="raw-response">${this.rawResponse}</pre>` : ""}
    `;
  }
};
_.styles = w`
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
E([
  g({ type: String })
], _.prototype, "rawResponse", 2);
_ = E([
  A("page-evaluator-warning")
], _);
var J = Object.defineProperty, Q = Object.getOwnPropertyDescriptor, v = (e, t, r, i) => {
  for (var a = i > 1 ? void 0 : i ? Q(t, r) : t, o = e.length - 1, l; o >= 0; o--)
    (l = e[o]) && (a = (i ? l(t, r, a) : l(a)) || a);
  return i && a && J(t, r, a), a;
};
const z = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let m = class extends S {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressKey = "", this._report = null, this._errorDetail = null, this._errorCategory = null, this._errorType = null, this._inFlight = !1, this._onRecApply = (e) => {
      const t = e.detail;
      this._applyRecommendation(e.composedPath()[0] ?? null, t);
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext(R, (e) => {
      this._workspaceContext = e;
    }), this.consumeContext(F, (e) => {
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
        const t = await D(e.nodeId, e.culture);
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
      if (this._modalState = "loading", this._progressKey = z.sending, await this._tick(), !this.isConnected) return;
      this._progressKey = z.waiting;
      const t = await M({
        nodeId: e.nodeId,
        documentTypeAlias: e.documentTypeAlias,
        culture: e.culture,
        properties: e.properties
      });
      if (!this.isConnected || (this._progressKey = z.rendering, await this._tick(), !this.isConnected)) return;
      this._report = t, this._modalState = t.parseFailed ? "parse-failed" : "success";
    } catch (t) {
      if (!this.isConnected) return;
      const r = t instanceof $ ? t : null, i = r?.type ?? null, a = r?.category ?? null, o = B({ type: i });
      !o && r?.status === 422 ? (this._modalState = "guardrail-blocked", this._errorDetail = r.detail) : (this._modalState = "error", this._errorDetail = o ? null : r?.detail ?? null, this._errorCategory = a, this._errorType = i);
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
    const r = this._workspaceContext;
    r && await W(
      r,
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
    return s`
      <umb-body-layout headline=${this.localize.term("evaluatePage_modalHeadline")}>
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === "success" || this._modalState === "parse-failed" ? s`
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
    return s`<uai-disclosure-notice class="disclosure-notice" location="page-evaluator"></uai-disclosure-notice>`;
  }
  _renderBody() {
    switch (this._modalState) {
      case "idle":
        return c;
      case "loading":
        return s`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this.localize.term(this._progressKey)}</p>
          </div>
        `;
      case "success":
        return s`
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
        return s`
          ${this._renderCacheBar()}
          ${this._renderDisclosureNotice()}
          <page-evaluator-warning
            .rawResponse="${this._report?.rawResponse ?? null}"></page-evaluator-warning>
        `;
      case "culture-not-created":
        return s`
          <div class="error-container" role="status">
            <p>${this.localize.term("evaluatePage_cultureNotCreatedMessage")}</p>
          </div>
        `;
      case "guardrail-blocked":
        return s`
          <div class="error-container" role="alert">
            <p>${this.localize.term("evaluatePage_guardrailBlockedMessage")}</p>
            ${this._errorDetail ? s`<p><em>${this._errorDetail}</em></p>` : c}
          </div>
        `;
      case "error": {
        const e = P({ type: this._errorType, category: this._errorCategory }, "evaluatePage_aiErrorMessage");
        return s`
          <div class="error-container" role="alert">
            <p>${this.localize.term(e)}</p>
            ${this._errorDetail ? s`<p><em>${this._errorDetail}</em></p>` : c}
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
    return e ? s`
      <div class="cache-bar">
        <span>${this.localize.term("evaluatePage_lastEvaluated")} ${this._formatCachedAt(e)}</span>
      </div>
    ` : c;
  }
};
m.styles = w`
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
v([
  h()
], m.prototype, "_modalState", 2);
v([
  h()
], m.prototype, "_progressKey", 2);
v([
  h()
], m.prototype, "_report", 2);
v([
  h()
], m.prototype, "_errorDetail", 2);
v([
  h()
], m.prototype, "_errorCategory", 2);
v([
  h()
], m.prototype, "_errorType", 2);
m = v([
  A("page-evaluator-modal")
], m);
export {
  m as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-DPAGkpTx.js.map
