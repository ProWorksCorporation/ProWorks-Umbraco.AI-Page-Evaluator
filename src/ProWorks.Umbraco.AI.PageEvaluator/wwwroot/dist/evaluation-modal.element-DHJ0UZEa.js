import { css as z, property as m, state as h, customElement as $, nothing as l, html as s } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as E } from "@umbraco-cms/backoffice/modal";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as k } from "@umbraco-cms/backoffice/document";
import { r as S, A as R, g as O, e as F } from "./entry-point-Dgd6d9p3.js";
import { resolveEntityAdapterByType as M } from "@umbraco-ai/core";
import { UmbLitElement as C } from "@umbraco-cms/backoffice/lit-element";
const D = {
  temporaryRetryable: "evaluatePage_temporaryRetryableMessage",
  connectivity: "evaluatePage_connectivityMessage",
  authenticationConfiguration: "evaluatePage_authenticationConfigurationMessage"
};
function P(e, t) {
  return (e && D[e]) ?? t;
}
var L = Object.defineProperty, B = Object.getOwnPropertyDescriptor, d = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? B(t, a) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (i = (r ? n(t, a, i) : n(i)) || i);
  return r && i && L(t, a, i), i;
};
let u = class extends C {
  constructor() {
    super(...arguments), this.nodeId = "", this.properties = {}, this.propertyEditorAliases = {}, this.propertyNames = {}, this.additionalRecommendableEditorAliases = [], this.recommendationsEnabled = !0, this._recStates = /* @__PURE__ */ new Map(), this._appliedAliases = /* @__PURE__ */ new Map(), this._copiedAliases = /* @__PURE__ */ new Map();
  }
  render() {
    if (!this.report) return l;
    const { checks: e, suggestions: t, overallScore: a, axisScores: r } = this.report, i = a !== null || r !== null && r.length > 0, o = e.filter((p) => p.status === "Pass").length, n = e.filter((p) => p.status === "Warn").length, c = e.filter((p) => p.status === "Fail").length, w = e.length, _ = e.filter((p) => p.status === "Fail" || p.status === "Warn"), b = e.filter((p) => p.status === "Pass");
    return s`
      ${i ? this._renderScoring(a, r) : l}

      ${w > 0 ? s`
            <div class="score-row">
              <span class="score-total">${w} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${o} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${n > 0 ? s`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${n} ${n !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : l}
              ${c > 0 ? s`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${c} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : l}
            </div>
          ` : l}

      ${t ? s`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(t)}
            </uui-box>
          ` : l}

      ${_.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${_.length})</p>
            <ul class="check-list">
              ${_.map((p) => this._renderCheck(p))}
            </ul>
          ` : l}

      ${b.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${b.length})</p>
            <ul class="check-list">
              ${b.map((p) => this._renderCheck(p))}
            </ul>
          ` : l}
    `;
  }
  _renderSuggestions(e) {
    const t = U(e);
    if (t.length === 1)
      return s`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${y(t[0] ?? "")}</p>`;
    const a = t[0] ?? "", r = a.endsWith(":"), i = r ? t.slice(1) : t;
    return s`
      ${r ? s`<p style="margin:0 0 var(--uui-size-space-2, 8px); font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${y(a)}</p>` : l}
      <ol class="suggestions-list">
        ${i.map((o) => s`<li>${y(o)}</li>`)}
      </ol>
    `;
  }
  _renderScoring(e, t) {
    return s`
      ${e !== null ? s`
            <div class="overall-score-row">
              <span class="overall-score-label">${this.localize.term("evaluatePage_overallScore")}</span>
              <uui-tag color=${I(e)} look="primary">
                ${e.toFixed(1)} / 5
              </uui-tag>
            </div>
          ` : l}
      ${t && t.length > 0 ? s`
            <div class="axis-scores-section">
              <p class="section-title">${this.localize.term("evaluatePage_axisScores")}</p>
              <ul class="axis-list">
                ${t.map((a) => this._renderAxis(a))}
              </ul>
            </div>
          ` : l}
    `;
  }
  _renderAxis(e) {
    return s`
      <li class="axis-item">
        <uui-tag color=${N(e.score)} look="primary">${e.score} / 5</uui-tag>
        <div class="axis-body">
          <div class="axis-name">${T(e.name)}</div>
          ${e.feedback ? s`<div class="axis-feedback">${e.feedback}</div>` : l}
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
      return u._FULL_RECOMMEND_EDITORS.has(t) || u._COPY_ONLY_EDITORS.has(t) || this._isAdditionalEditor(t);
    const a = this.properties[e];
    if (typeof a != "string") return !1;
    const r = a.trimStart();
    return r.length === 0 ? !0 : r[0] !== "{" && r[0] !== "[" && !r.startsWith("umb://");
  }
  /**
   * Returns true when the Apply button should be shown for the given property alias.
   * Only plain-text editors support direct apply; RTE / TinyMCE are copy-only.
   * Editors listed in additionalRecommendableEditorAliases are treated as full recommend (apply supported).
   */
  _canApply(e) {
    const t = this.propertyEditorAliases[e];
    if (t !== void 0)
      return u._FULL_RECOMMEND_EDITORS.has(t) || this._isAdditionalEditor(t);
    const a = this.properties[e];
    if (typeof a != "string") return !1;
    const r = a.trimStart();
    return r.length === 0 ? !0 : r[0] !== "{" && r[0] !== "[" && !r.startsWith("umb://");
  }
  _isAdditionalEditor(e) {
    return this.additionalRecommendableEditorAliases.some(
      (t) => t.toLowerCase() === e.toLowerCase()
    );
  }
  _resolveCurrentValue(e) {
    const t = this.properties[e];
    return t == null ? "" : typeof t == "string" ? t : Array.isArray(t) ? t.join(", ") : "";
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
    return s`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${j(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? s`<div class="check-explanation">${e.explanation}</div>` : l}
          ${r ? this._renderRecState(e, t, a) : l}
        </div>
      </li>
    `;
  }
  _renderRecState(e, t, a) {
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
        return s`${a.map((r) => {
          const i = this._appliedAliases.get(e.checkNumber)?.has(r) ?? !1, o = t.values[r] ?? null;
          return this._renderRecBox(e, r, o, i, this._canApply(r));
        })}`;
      case "error": {
        const r = P(t.category, "evaluatePage_recError");
        return s`
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
    const o = this._copiedAliases.get(e.checkNumber)?.has(t) ?? !1, n = this._resolveCurrentValue(t);
    return s`
      <div class="rec-box ${r ? "applied" : ""}">
        ${n ? s`
              <div class="rec-current-label">
                <uui-icon name="icon-edit"></uui-icon>
                ${this._recCurrentLabel(t)}
              </div>
              <div class="rec-current-text">${n}</div>
              <hr class="rec-section-divider" />
            ` : l}
        <div class="rec-label ${r ? "applied" : ""}">
          <uui-icon name="${r ? "icon-check" : "icon-wand"}"></uui-icon>
          ${r ? this.localize.term("evaluatePage_recApplied") : this._recSuggestedLabel(t)}
        </div>
        <div class="rec-text">${a ?? ""}</div>
        <div class="rec-actions">
          ${i && !r ? s`
                <uui-button
                  look="primary"
                  color="positive"
                  compact
                  label=${this.localize.term("evaluatePage_recApply")}
                  @click=${() => this._handleApply(e, t, a)}>
                  ${this.localize.term("evaluatePage_recApply")}
                </uui-button>
              ` : l}
          <uui-button
            look="secondary"
            compact
            label=${o ? this.localize.term("evaluatePage_recCopied") : this.localize.term("evaluatePage_recCopy")}
            ?disabled=${o}
            @click=${() => {
      this._handleCopy(e.checkNumber, t, a);
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
      propertyAliases: e.propertyAliases,
      checkLabel: e.label,
      checkExplanation: e.explanation ?? null,
      properties: Object.fromEntries(
        Object.entries(this.properties).map(([a, r]) => [a, String(r ?? "")])
      )
    };
    try {
      const a = await S(t);
      if (!this.isConnected) return;
      this._setRecState(e.checkNumber, { kind: "result", values: a.recommendedValues });
    } catch (a) {
      if (!this.isConnected) return;
      const r = a instanceof R ? a.category : null;
      this._setRecState(e.checkNumber, { kind: "error", category: r });
    }
  }
  _handleApply(e, t, a) {
    if (!t || a === null) return;
    this.dispatchEvent(
      new CustomEvent("page-evaluator-rec-apply", {
        bubbles: !0,
        composed: !0,
        detail: { propertyAlias: t, value: a }
      })
    );
    const r = new Map(this._appliedAliases), i = new Set(r.get(e.checkNumber) ?? []);
    i.add(t), r.set(e.checkNumber, i), this._appliedAliases = r;
  }
  async _handleCopy(e, t, a) {
    if (a === null || (await navigator.clipboard.writeText(a), !this.isConnected)) return;
    const r = new Map(this._copiedAliases), i = new Set(r.get(e) ?? []);
    i.add(t), r.set(e, i), this._copiedAliases = r, setTimeout(() => {
      if (!this.isConnected) return;
      const o = new Map(this._copiedAliases), n = new Set(o.get(e) ?? []);
      n.delete(t), o.set(e, n), this._copiedAliases = o;
    }, 2e3);
  }
};
u.styles = z`
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
  "Umbraco.Tags"
]);
u._COPY_ONLY_EDITORS = /* @__PURE__ */ new Set([
  "Umbraco.RichText",
  "Umbraco.TinyMCE"
]);
d([
  m({ attribute: !1 })
], u.prototype, "report", 2);
d([
  m({ attribute: !1 })
], u.prototype, "nodeId", 2);
d([
  m({ attribute: !1 })
], u.prototype, "properties", 2);
d([
  m({ attribute: !1 })
], u.prototype, "propertyEditorAliases", 2);
d([
  m({ attribute: !1 })
], u.prototype, "propertyNames", 2);
d([
  m({ attribute: !1 })
], u.prototype, "additionalRecommendableEditorAliases", 2);
d([
  m({ attribute: !1 })
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
u = d([
  $("page-evaluator-report")
], u);
function T(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function I(e) {
  return e >= 4 ? "positive" : e >= 2.5 ? "warning" : "danger";
}
function N(e) {
  return e >= 4 ? "positive" : e >= 3 ? "warning" : "danger";
}
function j(e) {
  switch (e) {
    case "Pass":
      return "icon-check";
    case "Fail":
      return "icon-wrong";
    case "Warn":
      return "icon-alert";
  }
}
function U(e) {
  const t = e.split(`
`).map((c) => c.trim()).filter(Boolean), a = t.filter((c) => /^\d+\.\s+/.test(c));
  if (a.length > 1)
    return a.map((c) => c.replace(/^\d+\.\s+/, "").trim());
  const r = t.filter((c) => /^\(\d+\)\s+/.test(c));
  if (r.length > 1)
    return r.map((c) => c.replace(/^\(\d+\)\s+/, "").trim());
  const i = t.filter((c) => /^\d+\)\s+/.test(c));
  if (i.length > 1)
    return i.map((c) => c.replace(/^\d+\)\s+/, "").trim());
  const o = e.split(/\(\d+\)\s*/).map((c) => c.trim()).filter(Boolean);
  if (o.length > 1)
    return o;
  const n = e.split(/\d+\)\s+/).map((c) => c.trim()).filter(Boolean);
  return n.length > 1 ? n : [e.trim()];
}
function y(e) {
  const t = e.split(/\*\*([^*]+)\*\*/g);
  return s`${t.map((a, r) => r % 2 === 1 ? s`<strong>${a}</strong>` : a)}`;
}
var W = Object.defineProperty, K = Object.getOwnPropertyDescriptor, A = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? K(t, a) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (i = (r ? n(t, a, i) : n(i)) || i);
  return r && i && W(t, a, i), i;
};
let f = class extends C {
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
f.styles = z`
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
A([
  m({ type: String })
], f.prototype, "rawResponse", 2);
f = A([
  $("page-evaluator-warning")
], f);
var G = Object.defineProperty, Y = Object.getOwnPropertyDescriptor, v = (e, t, a, r) => {
  for (var i = r > 1 ? void 0 : r ? Y(t, a) : t, o = e.length - 1, n; o >= 0; o--)
    (n = e[o]) && (i = (r ? n(t, a, i) : n(i)) || i);
  return r && i && G(t, a, i), i;
};
const x = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let g = class extends E {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressKey = "", this._report = null, this._errorDetail = null, this._errorCategory = null, this._inFlight = !1, this._onRecApply = async (e) => {
      const t = e.detail;
      await this._applyRecommendation(t.propertyAlias, t.value);
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext(k, (e) => {
      this._workspaceContext = e;
    }), this.addEventListener("page-evaluator-rec-apply", this._onRecApply), this._checkCacheAndLoad();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this.removeEventListener("page-evaluator-rec-apply", this._onRecApply);
  }
  async _checkCacheAndLoad() {
    const e = this.data;
    if (e) {
      try {
        const t = await O(e.nodeId);
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
      if (this._modalState = "loading", this._progressKey = x.sending, await this._tick(), !this.isConnected) return;
      this._progressKey = x.waiting;
      const t = await F(e);
      if (!this.isConnected || (this._progressKey = x.rendering, await this._tick(), !this.isConnected)) return;
      this._report = t, this._modalState = t.parseFailed ? "parse-failed" : "success";
    } catch (t) {
      if (!this.isConnected) return;
      const a = t !== null && typeof t == "object" && "status" in t ? t.status : null, r = t !== null && typeof t == "object" && "detail" in t ? String(t.detail) : null, i = t !== null && typeof t == "object" && "category" in t ? String(t.category) : null;
      a === 422 ? (this._modalState = "guardrail-blocked", this._errorDetail = r) : (this._modalState = "error", this._errorDetail = r, this._errorCategory = i);
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
  async _applyRecommendation(e, t) {
    if (!this._workspaceContext) return;
    const a = await M("document");
    this.isConnected && a?.applyValueChange && await a.applyValueChange(this._workspaceContext, { path: e, value: t });
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
              ` : l}
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
        return l;
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
          <page-evaluator-report
            .report="${this._report}"
            .nodeId="${this.data?.nodeId ?? ""}"
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
          <page-evaluator-warning
            .rawResponse="${this._report?.rawResponse ?? null}"></page-evaluator-warning>
        `;
      case "guardrail-blocked":
        return s`
          <div class="error-container" role="alert">
            <p>${this.localize.term("evaluatePage_guardrailBlockedMessage")}</p>
            ${this._errorDetail ? s`<p><em>${this._errorDetail}</em></p>` : l}
          </div>
        `;
      case "error": {
        const e = P(this._errorCategory, "evaluatePage_aiErrorMessage");
        return s`
          <div class="error-container" role="alert">
            <p>${this.localize.term(e)}</p>
            ${this._errorDetail ? s`<p><em>${this._errorDetail}</em></p>` : l}
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
    ` : l;
  }
};
g.styles = z`
    .progress-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--uui-size-space-4, 16px);
      padding: var(--uui-size-space-8, 32px);
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
v([
  h()
], g.prototype, "_modalState", 2);
v([
  h()
], g.prototype, "_progressKey", 2);
v([
  h()
], g.prototype, "_report", 2);
v([
  h()
], g.prototype, "_errorDetail", 2);
v([
  h()
], g.prototype, "_errorCategory", 2);
g = v([
  $("page-evaluator-modal")
], g);
export {
  g as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-DHJ0UZEa.js.map
