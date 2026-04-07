import { css as v, property as z, customElement as f, nothing as u, html as i, state as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { g as P, e as k } from "./entry-point-B5MfU_kU.js";
import { UmbLitElement as $ } from "@umbraco-cms/backoffice/lit-element";
var C = Object.defineProperty, S = Object.getOwnPropertyDescriptor, x = (e, a, s, t) => {
  for (var r = t > 1 ? void 0 : t ? S(a, s) : a, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (r = (t ? o(a, s, r) : o(r)) || r);
  return t && r && C(a, s, r), r;
};
let p = class extends $ {
  render() {
    if (!this.report) return u;
    const { checks: e, suggestions: a } = this.report, s = e.filter((l) => l.status === "Pass").length, t = e.filter((l) => l.status === "Warn").length, r = e.filter((l) => l.status === "Fail").length, n = e.length, o = e.filter((l) => l.status === "Fail" || l.status === "Warn"), h = e.filter((l) => l.status === "Pass");
    return i`
      ${n > 0 ? i`
            <div class="score-row">
              <span class="score-total">${n} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${s} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${t > 0 ? i`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${t} ${t !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : u}
              ${r > 0 ? i`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${r} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : u}
            </div>
          ` : u}

      ${a ? i`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(a)}
            </uui-box>
          ` : u}

      ${o.length > 0 ? i`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${o.length})</p>
            <ul class="check-list">
              ${o.map((l) => this._renderCheck(l))}
            </ul>
          ` : u}

      ${h.length > 0 ? i`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${h.length})</p>
            <ul class="check-list">
              ${h.map((l) => this._renderCheck(l))}
            </ul>
          ` : u}
    `;
  }
  _renderSuggestions(e) {
    const a = B(e);
    return a.length === 1 ? i`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${b(a[0])}</p>` : i`
      <ul class="suggestions-list">
        ${a.map((s) => i`<li>${b(s)}</li>`)}
      </ul>
    `;
  }
  _renderCheck(e) {
    return i`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${E(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? i`<div class="check-explanation">${e.explanation}</div>` : u}
        </div>
      </li>
    `;
  }
};
p.styles = v`
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
  `;
x([
  z({ attribute: !1 })
], p.prototype, "report", 2);
p = x([
  f("page-evaluator-report")
], p);
function E(e) {
  switch (e) {
    case "Pass":
      return "icon-check";
    case "Fail":
      return "icon-wrong";
    case "Warn":
      return "icon-alert";
  }
}
function B(e) {
  const s = e.split(`
`).map((t) => t.trim()).filter(Boolean).filter((t) => /^\d+\.\s+/.test(t));
  return s.length > 1 ? s.map((t) => t.replace(/^\d+\.\s+/, "").trim()) : [e.trim()];
}
function b(e) {
  const a = e.split(/\*\*([^*]+)\*\*/g);
  return i`${a.map((s, t) => t % 2 === 1 ? i`<strong>${s}</strong>` : s)}`;
}
var F = Object.defineProperty, O = Object.getOwnPropertyDescriptor, w = (e, a, s, t) => {
  for (var r = t > 1 ? void 0 : t ? O(a, s) : a, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (r = (t ? o(a, s, r) : o(r)) || r);
  return t && r && F(a, s, r), r;
};
let d = class extends $ {
  constructor() {
    super(...arguments), this.rawResponse = null;
  }
  render() {
    return i`
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
      ${this.rawResponse ? i`<pre class="raw-response">${this.rawResponse}</pre>` : ""}
    `;
  }
};
d.styles = v`
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
w([
  z({ type: String })
], d.prototype, "rawResponse", 2);
d = w([
  f("page-evaluator-warning")
], d);
var R = Object.defineProperty, j = Object.getOwnPropertyDescriptor, g = (e, a, s, t) => {
  for (var r = t > 1 ? void 0 : t ? j(a, s) : a, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (r = (t ? o(a, s, r) : o(r)) || r);
  return t && r && R(a, s, r), r;
};
const m = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let c = class extends y {
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
        const a = await P(e.nodeId);
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
        this._modalState = "loading", this._progressKey = m.sending, await this._tick(), this._progressKey = m.waiting;
        const a = await k(e);
        this._progressKey = m.rendering, await this._tick(), this._report = a, this._modalState = a.parseFailed ? "parse-failed" : "success";
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
    return i`
      <umb-body-layout headline=${this.localize.term("evaluatePage_modalHeadline")}>
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === "success" || this._modalState === "parse-failed" ? i`
                <uui-button
                  look="secondary"
                  label=${this.localize.term("evaluatePage_rerunButton")}
                  @click=${() => this._rerun()}>
                  ${this.localize.term("evaluatePage_rerunButton")}
                </uui-button>
              ` : u}
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
        return u;
      case "loading":
        return i`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this.localize.term(this._progressKey)}</p>
          </div>
        `;
      case "success":
        return i`
          ${this._renderCacheBar()}
          <page-evaluator-report
            .report="${this._report}"></page-evaluator-report>
        `;
      case "parse-failed":
        return i`
          ${this._renderCacheBar()}
          <page-evaluator-warning
            .rawResponse="${((e = this._report) == null ? void 0 : e.rawResponse) ?? null}"></page-evaluator-warning>
        `;
      case "error":
        return i`
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
    return e ? i`
      <div class="cache-bar">
        <span>${this.localize.term("evaluatePage_lastEvaluated")} ${this._formatCachedAt(e)}</span>
      </div>
    ` : u;
  }
};
c.styles = v`
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
  _()
], c.prototype, "_modalState", 2);
g([
  _()
], c.prototype, "_progressKey", 2);
g([
  _()
], c.prototype, "_report", 2);
c = g([
  f("page-evaluator-modal")
], c);
export {
  c as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-Bmjbcu0N.js.map
