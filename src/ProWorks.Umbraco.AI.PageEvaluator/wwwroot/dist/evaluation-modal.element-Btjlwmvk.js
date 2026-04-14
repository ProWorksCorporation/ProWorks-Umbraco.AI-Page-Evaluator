import { css as f, property as w, customElement as _, nothing as l, html as t, state as b } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as C } from "@umbraco-cms/backoffice/modal";
import { g as S, e as E } from "./entry-point-BaPza1wV.js";
import { UmbLitElement as y } from "@umbraco-cms/backoffice/lit-element";
var F = Object.defineProperty, B = Object.getOwnPropertyDescriptor, P = (e, a, s, o) => {
  for (var r = o > 1 ? void 0 : o ? B(a, s) : a, i = e.length - 1, n; i >= 0; i--)
    (n = e[i]) && (r = (o ? n(a, s, r) : n(r)) || r);
  return o && r && F(a, s, r), r;
};
let p = class extends y {
  render() {
    if (!this.report) return l;
    const { checks: e, suggestions: a, overallScore: s, axisScores: o } = this.report, r = s !== null || o !== null && o.length > 0, i = e.filter((u) => u.status === "Pass").length, n = e.filter((u) => u.status === "Warn").length, x = e.filter((u) => u.status === "Fail").length, z = e.length, m = e.filter((u) => u.status === "Fail" || u.status === "Warn"), v = e.filter((u) => u.status === "Pass");
    return t`
      ${r ? this._renderScoring(s, o) : l}

      ${z > 0 ? t`
            <div class="score-row">
              <span class="score-total">${z} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${i} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${n > 0 ? t`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${n} ${n !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : l}
              ${x > 0 ? t`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${x} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : l}
            </div>
          ` : l}

      ${a ? t`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(a)}
            </uui-box>
          ` : l}

      ${m.length > 0 ? t`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${m.length})</p>
            <ul class="check-list">
              ${m.map((u) => this._renderCheck(u))}
            </ul>
          ` : l}

      ${v.length > 0 ? t`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${v.length})</p>
            <ul class="check-list">
              ${v.map((u) => this._renderCheck(u))}
            </ul>
          ` : l}
    `;
  }
  _renderSuggestions(e) {
    const a = D(e);
    return a.length === 1 ? t`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${$(a[0] ?? "")}</p>` : t`
      <ol class="suggestions-list">
        ${a.map((s) => t`<li>${$(s)}</li>`)}
      </ol>
    `;
  }
  _renderScoring(e, a) {
    return t`
      ${e !== null ? t`
            <div class="overall-score-row">
              <span class="overall-score-label">${this.localize.term("evaluatePage_overallScore")}</span>
              <uui-tag color=${A(e)} look="primary">
                ${e.toFixed(1)} / 5
              </uui-tag>
            </div>
          ` : l}
      ${a && a.length > 0 ? t`
            <div class="axis-scores-section">
              <p class="section-title">${this.localize.term("evaluatePage_axisScores")}</p>
              <ul class="axis-list">
                ${a.map((s) => this._renderAxis(s))}
              </ul>
            </div>
          ` : l}
    `;
  }
  _renderAxis(e) {
    return t`
      <li class="axis-item">
        <uui-tag color=${R(e.score)} look="primary">${e.score} / 5</uui-tag>
        <div class="axis-body">
          <div class="axis-name">${O(e.name)}</div>
          ${e.feedback ? t`<div class="axis-feedback">${e.feedback}</div>` : l}
        </div>
      </li>
    `;
  }
  _renderCheck(e) {
    return t`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${j(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? t`<div class="check-explanation">${e.explanation}</div>` : l}
        </div>
      </li>
    `;
  }
};
p.styles = f`
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
P([
  w({ attribute: !1 })
], p.prototype, "report", 2);
p = P([
  _("page-evaluator-report")
], p);
function O(e) {
  return e.replace(/_/g, " ").replace(/\b\w/g, (a) => a.toUpperCase());
}
function A(e) {
  return e >= 4 ? "positive" : e >= 2.5 ? "warning" : "danger";
}
function R(e) {
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
function D(e) {
  const a = e.split(`
`).map((i) => i.trim()).filter(Boolean), s = a.filter((i) => /^\d+\.\s+/.test(i));
  if (s.length > 1)
    return s.map((i) => i.replace(/^\d+\.\s+/, "").trim());
  const o = a.filter((i) => /^\(\d+\)\s+/.test(i));
  if (o.length > 1)
    return o.map((i) => i.replace(/^\(\d+\)\s+/, "").trim());
  const r = e.split(/\(\d+\)\s*/).map((i) => i.trim()).filter(Boolean);
  return r.length > 1 ? r : [e.trim()];
}
function $(e) {
  const a = e.split(/\*\*([^*]+)\*\*/g);
  return t`${a.map((s, o) => o % 2 === 1 ? t`<strong>${s}</strong>` : s)}`;
}
var W = Object.defineProperty, I = Object.getOwnPropertyDescriptor, k = (e, a, s, o) => {
  for (var r = o > 1 ? void 0 : o ? I(a, s) : a, i = e.length - 1, n; i >= 0; i--)
    (n = e[i]) && (r = (o ? n(a, s, r) : n(r)) || r);
  return o && r && W(a, s, r), r;
};
let d = class extends y {
  constructor() {
    super(...arguments), this.rawResponse = null;
  }
  render() {
    return t`
      <div class="warning-banner">
        <p>
          <uui-icon name="icon-alert"></uui-icon>
          ${this.localize.term("evaluatePage_parseFailedWarning")}
        </p>
        <p>
          <a href="/umbraco/section/ai/page-evaluator">${this.localize.term("evaluatePage_parseFailedLinkText")}</a>
          to improve structured output.
        </p>
      </div>
      ${this.rawResponse ? t`<pre class="raw-response">${this.rawResponse}</pre>` : ""}
    `;
  }
};
d.styles = f`
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
  w({ type: String })
], d.prototype, "rawResponse", 2);
d = k([
  _("page-evaluator-warning")
], d);
var K = Object.defineProperty, L = Object.getOwnPropertyDescriptor, g = (e, a, s, o) => {
  for (var r = o > 1 ? void 0 : o ? L(a, s) : a, i = e.length - 1, n; i >= 0; i--)
    (n = e[i]) && (r = (o ? n(a, s, r) : n(r)) || r);
  return o && r && K(a, s, r), r;
};
const h = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let c = class extends C {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressKey = "", this._report = null;
  }
  connectedCallback() {
    super.connectedCallback(), this._checkCacheAndLoad();
  }
  async _checkCacheAndLoad() {
    const e = this.data;
    if (e) {
      try {
        const a = await S(e.nodeId);
        if (a) {
          this._report = a, this._modalState = a.parseFailed ? "parse-failed" : "success";
          return;
        }
      } catch {
      }
      this._runEvaluation();
    }
  }
  async _runEvaluation() {
    const e = this.data;
    if (e)
      try {
        this._modalState = "loading", this._progressKey = h.sending, await this._tick(), this._progressKey = h.waiting;
        const a = await E(e);
        this._progressKey = h.rendering, await this._tick(), this._report = a, this._modalState = a.parseFailed ? "parse-failed" : "success";
      } catch {
        this._modalState = "error";
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
  render() {
    return t`
      <umb-body-layout headline=${this.localize.term("evaluatePage_modalHeadline")}>
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === "success" || this._modalState === "parse-failed" ? t`
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
    var e;
    switch (this._modalState) {
      case "idle":
        return l;
      case "loading":
        return t`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this.localize.term(this._progressKey)}</p>
          </div>
        `;
      case "success":
        return t`
          ${this._renderCacheBar()}
          <page-evaluator-report
            .report="${this._report}"></page-evaluator-report>
        `;
      case "parse-failed":
        return t`
          ${this._renderCacheBar()}
          <page-evaluator-warning
            .rawResponse="${((e = this._report) == null ? void 0 : e.rawResponse) ?? null}"></page-evaluator-warning>
        `;
      case "error":
        return t`
          <div class="error-container" role="alert">
            <p>${this.localize.term("evaluatePage_aiErrorMessage")}</p>
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
    var a;
    const e = (a = this._report) == null ? void 0 : a.cachedAt;
    return e ? t`
      <div class="cache-bar">
        <span>${this.localize.term("evaluatePage_lastEvaluated")} ${this._formatCachedAt(e)}</span>
      </div>
    ` : l;
  }
};
c.styles = f`
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
      background: var(--uui-color-danger-standalone, #f8d7da);
      border-radius: var(--uui-border-radius, 4px);
    }
  `;
g([
  b()
], c.prototype, "_modalState", 2);
g([
  b()
], c.prototype, "_progressKey", 2);
g([
  b()
], c.prototype, "_report", 2);
c = g([
  _("page-evaluator-modal")
], c);
export {
  c as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-Btjlwmvk.js.map
