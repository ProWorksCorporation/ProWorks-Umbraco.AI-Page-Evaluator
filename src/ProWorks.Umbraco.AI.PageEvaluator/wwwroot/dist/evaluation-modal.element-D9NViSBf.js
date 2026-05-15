import { css as z, property as f, state as g, customElement as $, nothing as n, html as r } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as C } from "@umbraco-cms/backoffice/modal";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT as S } from "@umbraco-cms/backoffice/document";
import { r as A, g as R, e as E } from "./entry-point-D9pIolU_.js";
import { resolveEntityAdapterByType as F } from "@umbraco-ai/core";
import { UmbLitElement as P } from "@umbraco-cms/backoffice/lit-element";
var B = Object.defineProperty, O = Object.getOwnPropertyDescriptor, h = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? O(t, a) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (s = (i ? c(t, a, s) : c(s)) || s);
  return i && s && B(t, a, s), s;
};
let p = class extends P {
  constructor() {
    super(...arguments), this.nodeId = "", this.properties = {}, this._recStates = /* @__PURE__ */ new Map();
  }
  render() {
    if (!this.report) return n;
    const { checks: e, suggestions: t, overallScore: a, axisScores: i } = this.report, s = a !== null || i !== null && i.length > 0, l = e.filter((u) => u.status === "Pass").length, c = e.filter((u) => u.status === "Warn").length, o = e.filter((u) => u.status === "Fail").length, w = e.length, _ = e.filter((u) => u.status === "Fail" || u.status === "Warn"), b = e.filter((u) => u.status === "Pass");
    return r`
      ${s ? this._renderScoring(a, i) : n}

      ${w > 0 ? r`
            <div class="score-row">
              <span class="score-total">${w} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${l} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${c > 0 ? r`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${c} ${c !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : n}
              ${o > 0 ? r`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${o} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : n}
            </div>
          ` : n}

      ${t ? r`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(t)}
            </uui-box>
          ` : n}

      ${_.length > 0 ? r`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${_.length})</p>
            <ul class="check-list">
              ${_.map((u) => this._renderCheck(u))}
            </ul>
          ` : n}

      ${b.length > 0 ? r`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${b.length})</p>
            <ul class="check-list">
              ${b.map((u) => this._renderCheck(u))}
            </ul>
          ` : n}
    `;
  }
  _renderSuggestions(e) {
    const t = M(e);
    if (t.length === 1)
      return r`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${x(t[0] ?? "")}</p>`;
    const a = t[0] ?? "", i = a.endsWith(":"), s = i ? t.slice(1) : t;
    return r`
      ${i ? r`<p style="margin:0 0 var(--uui-size-space-2, 8px); font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${x(a)}</p>` : n}
      <ol class="suggestions-list">
        ${s.map((l) => r`<li>${x(l)}</li>`)}
      </ol>
    `;
  }
  _renderScoring(e, t) {
    return r`
      ${e !== null ? r`
            <div class="overall-score-row">
              <span class="overall-score-label">${this.localize.term("evaluatePage_overallScore")}</span>
              <uui-tag color=${I(e)} look="primary">
                ${e.toFixed(1)} / 5
              </uui-tag>
            </div>
          ` : n}
      ${t && t.length > 0 ? r`
            <div class="axis-scores-section">
              <p class="section-title">${this.localize.term("evaluatePage_axisScores")}</p>
              <ul class="axis-list">
                ${t.map((a) => this._renderAxis(a))}
              </ul>
            </div>
          ` : n}
    `;
  }
  _renderAxis(e) {
    return r`
      <li class="axis-item">
        <uui-tag color=${j(e.score)} look="primary">${e.score} / 5</uui-tag>
        <div class="axis-body">
          <div class="axis-name">${D(e.name)}</div>
          ${e.feedback ? r`<div class="axis-feedback">${e.feedback}</div>` : n}
        </div>
      </li>
    `;
  }
  _renderCheck(e) {
    const t = this._recStates.get(e.checkNumber) ?? { kind: "idle" }, a = (e.status === "Fail" || e.status === "Warn") && e.propertyAlias !== null;
    return r`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${W(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? r`<div class="check-explanation">${e.explanation}</div>` : n}
          ${a ? this._renderRecState(e, t) : n}
        </div>
      </li>
    `;
  }
  _renderRecState(e, t) {
    switch (t.kind) {
      case "idle":
        return r`
          <uui-button
            style="margin-top: var(--uui-size-space-2, 8px);"
            look="secondary"
            compact
            label=${this.localize.term("evaluatePage_recGenerate")}
            @click=${() => {
          this._handleGenerate(e);
        }}>
            <uui-icon name="icon-wand" slot="icon"></uui-icon>
            ${this.localize.term("evaluatePage_recGenerate")}
          </uui-button>
        `;
      case "generating":
        return r`
          <div class="rec-generating">
            <uui-loader></uui-loader>
            <span>${this.localize.term("evaluatePage_recGenerating")}</span>
          </div>
        `;
      case "result":
        return this._renderRecBox(e, t.value, !1);
      case "applied":
        return this._renderRecBox(e, t.value, !0);
    }
  }
  _renderRecBox(e, t, a) {
    return r`
      <div class="rec-box ${a ? "applied" : ""}">
        <div class="rec-label ${a ? "applied" : ""}">
          <uui-icon name="${a ? "icon-check" : "icon-wand"}"></uui-icon>
          ${a ? this.localize.term("evaluatePage_recApplied") : this.localize.term("evaluatePage_recSuggested")}
        </div>
        <div class="rec-text">${t ?? ""}</div>
        <uui-action-bar>
          ${a ? n : r`
                <uui-button
                  look="primary"
                  color="positive"
                  compact
                  label=${this.localize.term("evaluatePage_recApply")}
                  @click=${() => this._handleApply(e, t)}>
                  ${this.localize.term("evaluatePage_recApply")}
                </uui-button>
              `}
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
          <uui-button
            look="secondary"
            compact
            label=${this.localize.term("evaluatePage_recCopy")}
            @click=${() => {
      this._handleCopy(t);
    }}>
            <uui-icon name="icon-clipboard-copy" slot="icon"></uui-icon>
            ${this.localize.term("evaluatePage_recCopy")}
          </uui-button>
        </uui-action-bar>
      </div>
    `;
  }
  _setRecState(e, t) {
    this._recStates = new Map(this._recStates).set(e, t);
  }
  async _handleGenerate(e) {
    if (!e.propertyAlias) return;
    this._setRecState(e.checkNumber, { kind: "generating" });
    const t = {
      nodeId: this.nodeId,
      propertyAlias: e.propertyAlias,
      checkLabel: e.label,
      checkExplanation: e.explanation ?? null,
      properties: Object.fromEntries(
        Object.entries(this.properties).map(([a, i]) => [a, String(i ?? "")])
      )
    };
    try {
      const a = await A(t);
      if (!this.isConnected) return;
      this._setRecState(e.checkNumber, { kind: "result", value: a.recommendedValue });
    } catch {
      if (!this.isConnected) return;
      this._setRecState(e.checkNumber, { kind: "idle" });
    }
  }
  _handleApply(e, t) {
    !e.propertyAlias || t === null || (this.dispatchEvent(
      new CustomEvent("page-evaluator-rec-apply", {
        bubbles: !0,
        composed: !0,
        detail: { propertyAlias: e.propertyAlias, value: t }
      })
    ), this._setRecState(e.checkNumber, { kind: "applied", value: t }));
  }
  async _handleCopy(e) {
    e !== null && await navigator.clipboard.writeText(e);
  }
};
p.styles = z`
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
h([
  f({ attribute: !1 })
], p.prototype, "report", 2);
h([
  f({ attribute: !1 })
], p.prototype, "nodeId", 2);
h([
  f({ attribute: !1 })
], p.prototype, "properties", 2);
h([
  g()
], p.prototype, "_recStates", 2);
p = h([
  $("page-evaluator-report")
], p);
function D(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function I(e) {
  return e >= 4 ? "positive" : e >= 2.5 ? "warning" : "danger";
}
function j(e) {
  return e >= 4 ? "positive" : e >= 3 ? "warning" : "danger";
}
function W(e) {
  switch (e) {
    case "Pass":
      return "icon-check";
    case "Fail":
      return "icon-wrong";
    case "Warn":
      return "icon-alert";
  }
}
function M(e) {
  const t = e.split(`
`).map((o) => o.trim()).filter(Boolean), a = t.filter((o) => /^\d+\.\s+/.test(o));
  if (a.length > 1)
    return a.map((o) => o.replace(/^\d+\.\s+/, "").trim());
  const i = t.filter((o) => /^\(\d+\)\s+/.test(o));
  if (i.length > 1)
    return i.map((o) => o.replace(/^\(\d+\)\s+/, "").trim());
  const s = t.filter((o) => /^\d+\)\s+/.test(o));
  if (s.length > 1)
    return s.map((o) => o.replace(/^\d+\)\s+/, "").trim());
  const l = e.split(/\(\d+\)\s*/).map((o) => o.trim()).filter(Boolean);
  if (l.length > 1)
    return l;
  const c = e.split(/\d+\)\s+/).map((o) => o.trim()).filter(Boolean);
  return c.length > 1 ? c : [e.trim()];
}
function x(e) {
  const t = e.split(/\*\*([^*]+)\*\*/g);
  return r`${t.map((a, i) => i % 2 === 1 ? r`<strong>${a}</strong>` : a)}`;
}
var T = Object.defineProperty, K = Object.getOwnPropertyDescriptor, k = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? K(t, a) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (s = (i ? c(t, a, s) : c(s)) || s);
  return i && s && T(t, a, s), s;
};
let v = class extends P {
  constructor() {
    super(...arguments), this.rawResponse = null;
  }
  render() {
    return r`
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
      ${this.rawResponse ? r`<pre class="raw-response">${this.rawResponse}</pre>` : ""}
    `;
  }
};
v.styles = z`
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
k([
  f({ type: String })
], v.prototype, "rawResponse", 2);
v = k([
  $("page-evaluator-warning")
], v);
var L = Object.defineProperty, G = Object.getOwnPropertyDescriptor, m = (e, t, a, i) => {
  for (var s = i > 1 ? void 0 : i ? G(t, a) : t, l = e.length - 1, c; l >= 0; l--)
    (c = e[l]) && (s = (i ? c(t, a, s) : c(s)) || s);
  return i && s && L(t, a, s), s;
};
const y = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let d = class extends C {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressKey = "", this._report = null, this._errorDetail = null, this._inFlight = !1, this._onRecApply = async (e) => {
      const t = e.detail;
      await this._applyRecommendation(t.propertyAlias, t.value);
    };
  }
  connectedCallback() {
    super.connectedCallback(), this.consumeContext(S, (e) => {
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
        const t = await R(e.nodeId);
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
      if (this._modalState = "loading", this._progressKey = y.sending, await this._tick(), !this.isConnected) return;
      this._progressKey = y.waiting;
      const t = await E(e);
      if (!this.isConnected || (this._progressKey = y.rendering, await this._tick(), !this.isConnected)) return;
      this._report = t, this._modalState = t.parseFailed ? "parse-failed" : "success";
    } catch (t) {
      if (!this.isConnected) return;
      const a = t !== null && typeof t == "object" && "status" in t ? t.status : null, i = t !== null && typeof t == "object" && "detail" in t ? String(t.detail) : null;
      a === 422 ? (this._modalState = "guardrail-blocked", this._errorDetail = i) : (this._modalState = "error", this._errorDetail = i);
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
    const a = await F("document");
    a != null && a.applyValueChange && await a.applyValueChange(this._workspaceContext, { path: e, value: t });
  }
  render() {
    return r`
      <umb-body-layout headline=${this.localize.term("evaluatePage_modalHeadline")}>
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === "success" || this._modalState === "parse-failed" ? r`
                <uui-button
                  look="secondary"
                  label=${this.localize.term("evaluatePage_rerunButton")}
                  @click=${() => this._rerun()}>
                  ${this.localize.term("evaluatePage_rerunButton")}
                </uui-button>
              ` : n}
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
    var e, t, a;
    switch (this._modalState) {
      case "idle":
        return n;
      case "loading":
        return r`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this.localize.term(this._progressKey)}</p>
          </div>
        `;
      case "success":
        return r`
          ${this._renderCacheBar()}
          <page-evaluator-report
            .report="${this._report}"
            .nodeId="${((e = this.data) == null ? void 0 : e.nodeId) ?? ""}"
            .properties="${((t = this.data) == null ? void 0 : t.properties) ?? {}}">
          </page-evaluator-report>
        `;
      case "parse-failed":
        return r`
          ${this._renderCacheBar()}
          <page-evaluator-warning
            .rawResponse="${((a = this._report) == null ? void 0 : a.rawResponse) ?? null}"></page-evaluator-warning>
        `;
      case "guardrail-blocked":
        return r`
          <div class="error-container" role="alert">
            <p>${this.localize.term("evaluatePage_guardrailBlockedMessage")}</p>
            ${this._errorDetail ? r`<p><em>${this._errorDetail}</em></p>` : n}
          </div>
        `;
      case "error":
        return r`
          <div class="error-container" role="alert">
            <p>${this._errorDetail ?? this.localize.term("evaluatePage_aiErrorMessage")}</p>
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
  _renderCacheBar() {
    var t;
    const e = (t = this._report) == null ? void 0 : t.cachedAt;
    return e ? r`
      <div class="cache-bar">
        <span>${this.localize.term("evaluatePage_lastEvaluated")} ${this._formatCachedAt(e)}</span>
      </div>
    ` : n;
  }
};
d.styles = z`
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
m([
  g()
], d.prototype, "_modalState", 2);
m([
  g()
], d.prototype, "_progressKey", 2);
m([
  g()
], d.prototype, "_report", 2);
m([
  g()
], d.prototype, "_errorDetail", 2);
d = m([
  $("page-evaluator-modal")
], d);
export {
  d as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-D9NViSBf.js.map
