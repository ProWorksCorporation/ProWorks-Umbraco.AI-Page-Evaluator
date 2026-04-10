import { css as v, property as z, customElement as f, nothing as c, html as s, state as _ } from "@umbraco-cms/backoffice/external/lit";
import { UmbModalBaseElement as y } from "@umbraco-cms/backoffice/modal";
import { g as P, e as k } from "./entry-point-BOZKX-6v.js";
import { UmbLitElement as $ } from "@umbraco-cms/backoffice/lit-element";
var C = Object.defineProperty, S = Object.getOwnPropertyDescriptor, x = (e, a, o, i) => {
  for (var t = i > 1 ? void 0 : i ? S(a, o) : a, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (t = (i ? n(a, o, t) : n(t)) || t);
  return i && t && C(a, o, t), t;
};
let p = class extends $ {
  render() {
    if (!this.report) return c;
    const { checks: e, suggestions: a } = this.report, o = e.filter((l) => l.status === "Pass").length, i = e.filter((l) => l.status === "Warn").length, t = e.filter((l) => l.status === "Fail").length, r = e.length, n = e.filter((l) => l.status === "Fail" || l.status === "Warn"), h = e.filter((l) => l.status === "Pass");
    return s`
      ${r > 0 ? s`
            <div class="score-row">
              <span class="score-total">${r} ${this.localize.term("evaluatePage_reportChecks")}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${o} ${this.localize.term("evaluatePage_reportPassed")}
              </span>
              ${i > 0 ? s`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${i} ${i !== 1 ? this.localize.term("evaluatePage_reportWarnings") : this.localize.term("evaluatePage_reportWarning")}
                </span>` : c}
              ${t > 0 ? s`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${t} ${this.localize.term("evaluatePage_reportFailed")}
                </span>` : c}
            </div>
          ` : c}

      ${a ? s`
            <uui-box headline=${this.localize.term("evaluatePage_reportSuggestions")} class="suggestions-box">
              ${this._renderSuggestions(a)}
            </uui-box>
          ` : c}

      ${n.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportAttentionItems")} (${n.length})</p>
            <ul class="check-list">
              ${n.map((l) => this._renderCheck(l))}
            </ul>
          ` : c}

      ${h.length > 0 ? s`
            <p class="section-title">${this.localize.term("evaluatePage_reportPassingItems")} (${h.length})</p>
            <ul class="check-list">
              ${h.map((l) => this._renderCheck(l))}
            </ul>
          ` : c}
    `;
  }
  _renderSuggestions(e) {
    const a = B(e);
    return a.length === 1 ? s`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${b(a[0])}</p>` : s`
      <ol class="suggestions-list">
        ${a.map((o) => s`<li>${b(o)}</li>`)}
      </ol>
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
  const a = e.split(`
`).map((r) => r.trim()).filter(Boolean), o = a.filter((r) => /^\d+\.\s+/.test(r));
  if (o.length > 1)
    return o.map((r) => r.replace(/^\d+\.\s+/, "").trim());
  const i = a.filter((r) => /^\(\d+\)\s+/.test(r));
  if (i.length > 1)
    return i.map((r) => r.replace(/^\(\d+\)\s+/, "").trim());
  const t = e.split(/\(\d+\)\s*/).map((r) => r.trim()).filter(Boolean);
  return t.length > 1 ? t : [e.trim()];
}
function b(e) {
  const a = e.split(/\*\*([^*]+)\*\*/g);
  return s`${a.map((o, i) => i % 2 === 1 ? s`<strong>${o}</strong>` : o)}`;
}
var F = Object.defineProperty, O = Object.getOwnPropertyDescriptor, w = (e, a, o, i) => {
  for (var t = i > 1 ? void 0 : i ? O(a, o) : a, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (t = (i ? n(a, o, t) : n(t)) || t);
  return i && t && F(a, o, t), t;
};
let d = class extends $ {
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
var R = Object.defineProperty, j = Object.getOwnPropertyDescriptor, g = (e, a, o, i) => {
  for (var t = i > 1 ? void 0 : i ? j(a, o) : a, r = e.length - 1, n; r >= 0; r--)
    (n = e[r]) && (t = (i ? n(a, o, t) : n(t)) || t);
  return i && t && R(a, o, t), t;
};
const m = {
  sending: "evaluatePage_progressSendingData",
  waiting: "evaluatePage_progressWaitingForAI",
  rendering: "evaluatePage_progressRendering"
};
let u = class extends y {
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
  _renderBody() {
    var e;
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
    return e ? s`
      <div class="cache-bar">
        <span>${this.localize.term("evaluatePage_lastEvaluated")} ${this._formatCachedAt(e)}</span>
      </div>
    ` : c;
  }
};
u.styles = v`
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
], u.prototype, "_modalState", 2);
g([
  _()
], u.prototype, "_progressKey", 2);
g([
  _()
], u.prototype, "_report", 2);
u = g([
  f("page-evaluator-modal")
], u);
export {
  u as EvaluationModalElement
};
//# sourceMappingURL=evaluation-modal.element-B7kdxbFF.js.map
