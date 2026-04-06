import { css as f, property as x, customElement as _, nothing as c, html as s, state as h } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { g as P, e as k } from "./entry-point-DqhWLY8H.js";
import { UmbLitElement as w } from "@umbraco-cms/backoffice/lit-element";
var C = Object.defineProperty, S = Object.getOwnPropertyDescriptor, $ = (e, r, i, a) => {
  for (var t = a > 1 ? void 0 : a ? S(r, i) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (a ? o(r, i, t) : o(t)) || t);
  return a && t && C(r, i, t), t;
};
let d = class extends w {
  render() {
    if (!this.report) return c;
    const { checks: e, suggestions: r } = this.report, i = e.filter((l) => l.status === "Pass").length, a = e.filter((l) => l.status === "Warn").length, t = e.filter((l) => l.status === "Fail").length, n = e.length, o = e.filter((l) => l.status === "Fail" || l.status === "Warn"), v = e.filter((l) => l.status === "Pass");
    return s`
      ${n > 0 ? s`
            <div class="score-row">
              <span class="score-total">${n} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${i} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${a > 0 ? s`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${a} ${a !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : c}
              ${t > 0 ? s`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${t} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : c}
            </div>
          ` : c}

      ${r ? s`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(r)}
            </uui-box>
          ` : c}

      ${o.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${o.length})</p>
            <ul class="check-list">
              ${o.map((l) => this._renderCheck(l))}
            </ul>
          ` : c}

      ${v.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${v.length})</p>
            <ul class="check-list">
              ${v.map((l) => this._renderCheck(l))}
            </ul>
          ` : c}
    `;
  }
  _renderSuggestions(e) {
    const r = M(e);
    return r.length === 1 ? s`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${b(r[0])}</p>` : s`
      <ul class="suggestions-list">
        ${r.map((i) => s`<li>${b(i)}</li>`)}
      </ul>
    `;
  }
  _renderCheck(e) {
    return s`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${e.status}"
          name="${E(e.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${e.label}</div>
          ${e.explanation ? s`<div class="check-explanation">${e.explanation}</div>` : c}
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
$([
  x({ attribute: !1 })
], d.prototype, "report", 2);
d = $([
  _("page-evaluator-report")
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
function M(e) {
  const i = e.split(`
`).map((a) => a.trim()).filter(Boolean).filter((a) => /^\d+\.\s+/.test(a));
  return i.length > 1 ? i.map((a) => a.replace(/^\d+\.\s+/, "").trim()) : [e.trim()];
}
function b(e) {
  const r = e.split(/\*\*([^*]+)\*\*/g);
  return s`${r.map((i, a) => a % 2 === 1 ? s`<strong>${i}</strong>` : i)}`;
}
var R = Object.defineProperty, O = Object.getOwnPropertyDescriptor, z = (e, r, i, a) => {
  for (var t = a > 1 ? void 0 : a ? O(r, i) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (a ? o(r, i, t) : o(t)) || t);
  return a && t && R(r, i, t), t;
};
let g = class extends w {
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
          to improve structured output.
        </p>
      </div>
      ${this.rawResponse ? s`<pre class="raw-response">${this.rawResponse}</pre>` : ""}
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
z([
  x({ type: String })
], g.prototype, "rawResponse", 2);
g = z([
  _("page-evaluator-warning")
], g);
var F = Object.defineProperty, A = Object.getOwnPropertyDescriptor, p = (e, r, i, a) => {
  for (var t = a > 1 ? void 0 : a ? A(r, i) : r, n = e.length - 1, o; n >= 0; n--)
    (o = e[n]) && (t = (a ? o(r, i, t) : o(t)) || t);
  return a && t && F(r, i, t), t;
};
const m = {
  sending: "Sending page data…",
  waiting: "Waiting for AI response…",
  rendering: "Rendering report…"
};
let u = class extends y {
  constructor() {
    super(...arguments), this._modalState = "idle", this._progressMessage = "", this._report = null, this._errorMessage = "";
  }
  connectedCallback() {
    super.connectedCallback(), this._checkCacheAndLoad();
  }
  async _checkCacheAndLoad() {
    const e = this.data;
    if (e) {
      try {
        const r = await P(e.nodeId);
        if (r) {
          this._report = r, this._modalState = r.parseFailed ? "parse-failed" : "success";
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
        this._modalState = "loading", this._progressMessage = m.sending ?? "", await this._tick(), this._progressMessage = m.waiting ?? "";
        const r = await k(e);
        this._progressMessage = m.rendering ?? "", await this._tick(), this._report = r, this._modalState = r.parseFailed ? "parse-failed" : "success";
      } catch {
        this._modalState = "error", this._errorMessage = "The evaluation could not be completed. The AI provider returned an error.";
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
    return s`
      <umb-body-layout headline="Page Evaluation">
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === "success" || this._modalState === "parse-failed" ? s`
                <uui-button
                  look="secondary"
                  label="Re-run Evaluation"
                  @click=${() => this._rerun()}>
                  Re-run Evaluation
                </uui-button>
              ` : c}
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
        return c;
      case "loading":
        return s`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this._progressMessage}</p>
          </div>
        `;
      case "success":
        return s`
          ${this._renderCacheBar()}
          <page-evaluator-report
            .report="${this._report}"></page-evaluator-report>
        `;
      case "parse-failed":
        return s`
          ${this._renderCacheBar()}
          <page-evaluator-warning
            .rawResponse="${((e = this._report) == null ? void 0 : e.rawResponse) ?? null}"></page-evaluator-warning>
        `;
      case "error":
        return s`
          <div class="error-container" role="alert">
            <p>${this._errorMessage}</p>
            <uui-button
              look="primary"
              color="warning"
              label="Retry"
              @click="${() => this._rerun()}">
              Retry
            </uui-button>
          </div>
        `;
    }
  }
  _renderCacheBar() {
    var r;
    const e = (r = this._report) == null ? void 0 : r.cachedAt;
    return e ? s`
      <div class="cache-bar">
        <span>Last evaluated: ${this._formatCachedAt(e)}</span>
      </div>
    ` : c;
  }
};
u.styles = f`
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
p([
  h()
], u.prototype, "_modalState", 2);
p([
  h()
], u.prototype, "_progressMessage", 2);
p([
  h()
], u.prototype, "_report", 2);
p([
  h()
], u.prototype, "_errorMessage", 2);
u = p([
  _("page-evaluator-modal")
], u);
export {
  u as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-OD7hLecS.js.map
