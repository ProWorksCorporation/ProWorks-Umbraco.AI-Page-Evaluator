import { css as f, property as w, customElement as b, LitElement as x, nothing as u, html as a, state as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as z } from "@umbraco-cms/backoffice/modal";
import { e as k } from "./api-client-CgRHi73O.js";
var P = Object.defineProperty, S = Object.getOwnPropertyDescriptor, y = (e, r, i, s) => {
  for (var t = s > 1 ? void 0 : s ? S(r, i) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (s ? o(r, i, t) : o(t)) || t);
  return s && t && P(r, i, t), t;
};
let d = class extends x {
  render() {
    if (!this.report) return u;
    const { checks: e, suggestions: r } = this.report, i = e.filter((l) => l.status === "Pass").length, s = e.filter((l) => l.status === "Warn").length, t = e.filter((l) => l.status === "Fail").length, n = e.length, o = e.filter((l) => l.status === "Fail" || l.status === "Warn"), v = e.filter((l) => l.status === "Pass");
    return a`
      ${n > 0 ? a`
            <div class="score-row">
              <span class="score-total">${n} checks</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${i} passed
              </span>
              ${s > 0 ? a`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${s} warning${s !== 1 ? "s" : ""}
                </span>` : u}
              ${t > 0 ? a`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${t} failed
                </span>` : u}
            </div>
          ` : u}

      ${r ? a`
            <uui-box headline="Suggestions" class="suggestions-box">
              ${this._renderSuggestions(r)}
            </uui-box>
          ` : u}

      ${o.length > 0 ? a`
            <p class="section-title">Items Needing Attention (${o.length})</p>
            <ul class="check-list">
              ${o.map((l) => this._renderCheck(l))}
            </ul>
          ` : u}

      ${v.length > 0 ? a`
            <p class="section-title">Passing Items (${v.length})</p>
            <ul class="check-list">
              ${v.map((l) => this._renderCheck(l))}
            </ul>
          ` : u}
    `;
  }
  _renderSuggestions(e) {
    const r = C(e);
    return r.length === 1 ? a`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${_(r[0])}</p>` : a`
      <ul class="suggestions-list">
        ${r.map((i) => a`<li>${_(i)}</li>`)}
      </ul>
    `;
  }
  _renderCheck(e) {
    return a`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${E(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? a`<div class="check-explanation">${e.explanation}</div>` : u}
        </div>
      </li>
    `;
  }
};
d.styles = f`
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
y([
  w({ attribute: !1 })
], d.prototype, "report", 2);
d = y([
  b("page-evaluator-report")
], d);
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
function C(e) {
  const i = e.split(`
`).map((s) => s.trim()).filter(Boolean).filter((s) => /^\d+\.\s+/.test(s));
  return i.length > 1 ? i.map((s) => s.replace(/^\d+\.\s+/, "").trim()) : [e.trim()];
}
function _(e) {
  const r = e.split(/\*\*([^*]+)\*\*/g);
  return a`${r.map((i, s) => s % 2 === 1 ? a`<strong>${i}</strong>` : i)}`;
}
var M = Object.defineProperty, R = Object.getOwnPropertyDescriptor, $ = (e, r, i, s) => {
  for (var t = s > 1 ? void 0 : s ? R(r, i) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (s ? o(r, i, t) : o(t)) || t);
  return s && t && M(r, i, t), t;
};
let g = class extends x {
  constructor() {
    super(...arguments), this.rawResponse = null;
  }
  render() {
    return a`
      <div class="warning-banner">
        <p>
          <uui-icon name="icon-alert"></uui-icon>
          The AI response could not be formatted as a structured report. Raw output is shown below.
        </p>
        <p>
          <a href="/umbraco/section/ai/page-evaluator">Refine the evaluator prompt</a>
          to improve structured output.
        </p>
      </div>
      ${this.rawResponse ? a`<pre class="raw-response">${this.rawResponse}</pre>` : ""}
    `;
  }
};
g.styles = f`
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
$([
  w({ type: String })
], g.prototype, "rawResponse", 2);
g = $([
  b("page-evaluator-warning")
], g);
var O = Object.defineProperty, j = Object.getOwnPropertyDescriptor, p = (e, r, i, s) => {
  for (var t = s > 1 ? void 0 : s ? j(r, i) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (s ? o(r, i, t) : o(t)) || t);
  return s && t && O(r, i, t), t;
};
const m = {
  sending: "Sending page data…",
  waiting: "Waiting for AI response…",
  rendering: "Rendering report…"
};
let c = class extends z {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressMessage = "", this._report = null, this._errorMessage = "";
  }
  connectedCallback() {
    super.connectedCallback(), this._runEvaluation();
  }
  async _runEvaluation() {
    const e = this.data;
    if (e)
      try {
        this._modalState = "loading", this._progressMessage = m.sending ?? "", await this._tick(), this._progressMessage = m.waiting ?? "";
        const r = await k(e);
        this._progressMessage = m.rendering ?? "", await this._tick(), this._report = r, this._modalState = r.parseFailed ? "parse-failed" : "success";
      } catch {
        this._modalState = "error", this._errorMessage = "The evaluation could not be completed. The AI provider returned an error.";
      }
  }
  _retry() {
    this._runEvaluation();
  }
  _close() {
    this._rejectModal();
  }
  /** Yields to the browser's render queue so the progress message is painted. */
  _tick() {
    return new Promise((e) => requestAnimationFrame(() => e()));
  }
  render() {
    return a`
      <umb-body-layout headline="Page Evaluation">
        ${this._renderBody()}
        <div slot="actions">
          <uui-button
            label="Close"
            @click=${() => this._close()}>
            Close
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
        return a`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this._progressMessage}</p>
          </div>
        `;
      case "success":
        return a`
          <page-evaluator-report
            .report="${this._report}"></page-evaluator-report>
        `;
      case "parse-failed":
        return a`
          <page-evaluator-warning
            .rawResponse="${((e = this._report) == null ? void 0 : e.rawResponse) ?? null}"></page-evaluator-warning>
        `;
      case "error":
        return a`
          <div class="error-container" role="alert">
            <p>${this._errorMessage}</p>
            <uui-button
              look="primary"
              color="warning"
              label="Retry"
              @click="${() => this._retry()}">
              Retry
            </uui-button>
          </div>
        `;
    }
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

    .error-container {
      padding: var(--uui-size-space-4, 16px);
      background: var(--uui-color-danger-standalone, #f8d7da);
      border-radius: var(--uui-border-radius, 4px);
    }
  `;
p([
  h()
], c.prototype, "_modalState", 2);
p([
  h()
], c.prototype, "_progressMessage", 2);
p([
  h()
], c.prototype, "_report", 2);
p([
  h()
], c.prototype, "_errorMessage", 2);
c = p([
  b("page-evaluator-modal")
], c);
export {
  c as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-BsV1ExVk.js.map
