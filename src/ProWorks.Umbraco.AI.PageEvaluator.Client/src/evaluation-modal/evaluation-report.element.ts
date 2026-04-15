import { html, css, nothing, type TemplateResult, customElement, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { EvaluationReportResponse, CheckResult, CheckStatus, AxisScore } from '../shared/types.js';

type TagColor = 'positive' | 'warning' | 'danger';

/**
 * Renders a structured AI evaluation report.
 *
 * Layout order: score → suggestions → attention items (Fail + Warn) → passing items.
 *
 * Suggestions are parsed from the AI's plain-text / numbered-list format into a
 * proper <ul> with inline bold support (**text** → <strong>). No unsafeHTML is used —
 * all rendering goes through Lit template parts.
 *
 * Icon sizing is pinned via CSS so Pass / Fail / Warn icons are always the same size
 * regardless of surrounding font context.
 */
@customElement('page-evaluator-report')
export class EvaluationReportElement extends UmbLitElement {
  static override styles = css`
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

  @property({ attribute: false })
  report: EvaluationReportResponse | undefined;

  override render(): TemplateResult | typeof nothing {
    if (!this.report) return nothing;

    const { checks, suggestions, overallScore, axisScores } = this.report;
    const hasScoring = overallScore !== null || (axisScores !== null && axisScores.length > 0);
    const passCount = checks.filter((c) => c.status === 'Pass').length;
    const warnCount = checks.filter((c) => c.status === 'Warn').length;
    const failCount = checks.filter((c) => c.status === 'Fail').length;
    const total = checks.length;
    const attentionChecks = checks.filter((c) => c.status === 'Fail' || c.status === 'Warn');
    const passingChecks = checks.filter((c) => c.status === 'Pass');

    return html`
      ${hasScoring ? this._renderScoring(overallScore, axisScores) : nothing}

      ${total > 0
        ? html`
            <div class="score-row">
              <span class="score-total">${total} ${this.localize.term('evaluatePage_reportChecks')}</span>
              <span class="score-pill score-pill--pass">
                <uui-icon name="icon-check"></uui-icon>${passCount} ${this.localize.term('evaluatePage_reportPassed')}
              </span>
              ${warnCount > 0 ? html`
                <span class="score-pill score-pill--warn">
                  <uui-icon name="icon-alert"></uui-icon>${warnCount} ${warnCount !== 1 ? this.localize.term('evaluatePage_reportWarnings') : this.localize.term('evaluatePage_reportWarning')}
                </span>` : nothing}
              ${failCount > 0 ? html`
                <span class="score-pill score-pill--fail">
                  <uui-icon name="icon-wrong"></uui-icon>${failCount} ${this.localize.term('evaluatePage_reportFailed')}
                </span>` : nothing}
            </div>
          `
        : nothing}

      ${suggestions
        ? html`
            <uui-box headline=${this.localize.term('evaluatePage_reportSuggestions')} class="suggestions-box">
              ${this._renderSuggestions(suggestions)}
            </uui-box>
          `
        : nothing}

      ${attentionChecks.length > 0
        ? html`
            <p class="section-title">${this.localize.term('evaluatePage_reportAttentionItems')} (${attentionChecks.length})</p>
            <ul class="check-list">
              ${attentionChecks.map((c) => this._renderCheck(c))}
            </ul>
          `
        : nothing}

      ${passingChecks.length > 0
        ? html`
            <p class="section-title">${this.localize.term('evaluatePage_reportPassingItems')} (${passingChecks.length})</p>
            <ul class="check-list">
              ${passingChecks.map((c) => this._renderCheck(c))}
            </ul>
          `
        : nothing}
    `;
  }

  private _renderSuggestions(text: string): TemplateResult {
    const items = parseSuggestionItems(text);
    if (items.length === 1) {
      return html`<p style="margin:0; font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${renderInlineMarkdown(items[0] ?? '')}</p>`;
    }
    return html`
      <ol class="suggestions-list">
        ${items.map((item) => html`<li>${renderInlineMarkdown(item)}</li>`)}
      </ol>
    `;
  }

  private _renderScoring(
    overallScore: number | null,
    axisScores: readonly AxisScore[] | null,
  ): TemplateResult {
    return html`
      ${overallScore !== null
        ? html`
            <div class="overall-score-row">
              <span class="overall-score-label">${this.localize.term('evaluatePage_overallScore')}</span>
              <uui-tag color=${badgeColorForOverall(overallScore)} look="primary">
                ${overallScore.toFixed(1)} / 5
              </uui-tag>
            </div>
          `
        : nothing}
      ${axisScores && axisScores.length > 0
        ? html`
            <div class="axis-scores-section">
              <p class="section-title">${this.localize.term('evaluatePage_axisScores')}</p>
              <ul class="axis-list">
                ${axisScores.map((a) => this._renderAxis(a))}
              </ul>
            </div>
          `
        : nothing}
    `;
  }

  private _renderAxis(axis: AxisScore): TemplateResult {
    return html`
      <li class="axis-item">
        <uui-tag color=${badgeColorForAxis(axis.score)} look="primary">${axis.score} / 5</uui-tag>
        <div class="axis-body">
          <div class="axis-name">${toTitleCase(axis.name)}</div>
          ${axis.feedback
            ? html`<div class="axis-feedback">${axis.feedback}</div>`
            : nothing}
        </div>
      </li>
    `;
  }

  private _renderCheck(check: CheckResult): TemplateResult {
    return html`
      <li class="check-item">
        <uui-icon
          class="check-icon"
          data-status="${check.status}"
          name="${iconForStatus(check.status)}"></uui-icon>
        <div class="check-body">
          <div class="check-label">${check.label}</div>
          ${check.explanation
            ? html`<div class="check-explanation">${check.explanation}</div>`
            : nothing}
        </div>
      </li>
    `;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTitleCase(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function badgeColorForOverall(score: number): TagColor {
  if (score >= 4.0) return 'positive';
  if (score >= 2.5) return 'warning';
  return 'danger';
}

function badgeColorForAxis(score: number): TagColor {
  if (score >= 4) return 'positive';
  if (score >= 3) return 'warning';
  return 'danger';
}

function iconForStatus(status: CheckStatus): string {
  switch (status) {
    case 'Pass': return 'icon-check';
    case 'Fail': return 'icon-wrong';
    case 'Warn': return 'icon-alert';
  }
}

/**
 * Splits the AI suggestions string into individual items.
 * Recognises numbered lists in multiple formats:
 *   - "1. text", "2. text"       (markdown numbered list)
 *   - "(1) text", "(2) text"     (parenthesised numbers)
 *   - inline "(1) … (2) …"      (single paragraph with numbered items)
 * Falls back to the full text as a single item if no numbered list is detected.
 */
function parseSuggestionItems(text: string): string[] {
  // Try line-based numbered lists: "1. text", "(1) text", or "1) text"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const numberedDot = lines.filter((l) => /^\d+\.\s+/.test(l));
  if (numberedDot.length > 1) {
    return numberedDot.map((l) => l.replace(/^\d+\.\s+/, '').trim());
  }
  const numberedParen = lines.filter((l) => /^\(\d+\)\s+/.test(l));
  if (numberedParen.length > 1) {
    return numberedParen.map((l) => l.replace(/^\(\d+\)\s+/, '').trim());
  }
  const numberedTrailingParen = lines.filter((l) => /^\d+\)\s+/.test(l));
  if (numberedTrailingParen.length > 1) {
    return numberedTrailingParen.map((l) => l.replace(/^\d+\)\s+/, '').trim());
  }

  // Try inline numbered items within a single paragraph: "(1) … (2) …" or "1) … 2) …"
  const inlineParenItems = text.split(/\(\d+\)\s*/).map((s) => s.trim()).filter(Boolean);
  if (inlineParenItems.length > 1) {
    return inlineParenItems;
  }
  const inlineTrailingParenItems = text.split(/\d+\)\s+/).map((s) => s.trim()).filter(Boolean);
  if (inlineTrailingParenItems.length > 1) {
    return inlineTrailingParenItems;
  }

  return [text.trim()];
}

/**
 * Converts **bold** markdown spans to <strong> Lit template parts.
 * No unsafeHTML — each segment is either a plain text node or a <strong> element.
 */
function renderInlineMarkdown(text: string): TemplateResult {
  // Split on **…** markers; odd-indexed segments are the bold content.
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return html`${parts.map((part, i) => (i % 2 === 1 ? html`<strong>${part}</strong>` : part))}`;
}

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-report': EvaluationReportElement;
  }
}
