import { html, css, nothing, state, type TemplateResult, customElement, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { EvaluationReportResponse, CheckResult, CheckStatus, AxisScore } from '../shared/types.js';
import { recommend } from '../shared/api-client.js';
import type { RecommendRequest } from '../shared/types.js';
import type { RecommendationState } from './recommendation-state.js';

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

  @property({ attribute: false })
  report: EvaluationReportResponse | undefined;

  @property({ attribute: false })
  nodeId: string = '';

  @property({ attribute: false })
  properties: Record<string, unknown> = {};

  @property({ attribute: false })
  propertyEditorAliases: Record<string, string> = {};

  @property({ attribute: false })
  propertyNames: Record<string, string> = {};

  @property({ attribute: false })
  recommendationsEnabled = true;

  @state()
  private _recStates = new Map<number, RecommendationState>();

  @state()
  private _copiedChecks = new Set<number>();

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
    // If the first item ends with ":" it's a label/intro, not an action item.
    const first = items[0] ?? '';
    const hasPreamble = first.endsWith(':');
    const listItems = hasPreamble ? items.slice(1) : items;
    return html`
      ${hasPreamble ? html`<p style="margin:0 0 var(--uui-size-space-2, 8px); font-size: var(--uui-type-small-size, 0.875rem); line-height: 1.5;">${renderInlineMarkdown(first)}</p>` : nothing}
      <ol class="suggestions-list">
        ${listItems.map((item) => html`<li>${renderInlineMarkdown(item)}</li>`)}
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

  private static readonly _FULL_RECOMMEND_EDITORS = new Set([
    'Umbraco.TextBox',
    'Umbraco.TextArea',
    'Umbraco.Markdown',
    'Umbraco.Tags',
  ]);

  private static readonly _COPY_ONLY_EDITORS = new Set([
    'Umbraco.RichText',
    'Umbraco.TinyMCE',
  ]);

  /**
   * Returns true when a recommendation can be shown for the given property alias.
   * Checks the known editor alias first; falls back to a value heuristic when no
   * editor info is available (e.g. the backoffice did not supply propertyEditorAliases).
   */
  private _canRecommend(alias: string): boolean {
    const editorAlias = this.propertyEditorAliases[alias];
    if (editorAlias !== undefined) {
      return (
        EvaluationReportElement._FULL_RECOMMEND_EDITORS.has(editorAlias) ||
        EvaluationReportElement._COPY_ONLY_EDITORS.has(editorAlias)
      );
    }
    // Fallback: raw value heuristic when no editor info is available.
    const value = this.properties[alias];
    if (typeof value !== 'string') return false;
    const trimmed = value.trimStart();
    if (trimmed.length === 0) return true;
    return trimmed[0] !== '{' && trimmed[0] !== '[' && !trimmed.startsWith('umb://');
  }

  /**
   * Returns true when the Apply button should be shown for the given property alias.
   * Only plain-text editors support direct apply; RTE / TinyMCE are copy-only.
   */
  private _canApply(alias: string): boolean {
    const editorAlias = this.propertyEditorAliases[alias];
    if (editorAlias !== undefined) {
      return EvaluationReportElement._FULL_RECOMMEND_EDITORS.has(editorAlias);
    }
    // Fallback: only allow apply when the value looks like plain text.
    const value = this.properties[alias];
    if (typeof value !== 'string') return false;
    const trimmed = value.trimStart();
    if (trimmed.length === 0) return true;
    return trimmed[0] !== '{' && trimmed[0] !== '[' && !trimmed.startsWith('umb://');
  }

  private _recSuggestedLabel(propertyAlias: string | null): string {
    if (propertyAlias === null) return this.localize.term('evaluatePage_recSuggested');
    const name = this.propertyNames[propertyAlias];
    return name !== undefined
      ? `${this.localize.term('evaluatePage_recSuggestedFor')} ${name}`
      : this.localize.term('evaluatePage_recSuggested');
  }

  private _renderCheck(check: CheckResult): TemplateResult {
    const state: RecommendationState = this._recStates.get(check.checkNumber) ?? { kind: 'idle' };
    const showRec =
      this.recommendationsEnabled &&
      (check.status === 'Fail' || check.status === 'Warn') &&
      check.propertyAlias !== null &&
      this._canRecommend(check.propertyAlias);

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
          ${showRec ? this._renderRecState(check, state) : nothing}
        </div>
      </li>
    `;
  }

  private _renderRecState(check: CheckResult, state: RecommendationState): TemplateResult {
    switch (state.kind) {
      case 'idle':
        return html`
          <uui-button
            class="rec-generate-link"
            look="default"
            label=${this.localize.term('evaluatePage_recGenerate')}
            @click=${() => { void this._handleGenerate(check); }}>
            <uui-icon name="icon-wand" slot="icon"></uui-icon>
            ${this.localize.term('evaluatePage_recGenerate')}
          </uui-button>
        `;
      case 'generating':
        return html`
          <div class="rec-generating">
            <uui-loader></uui-loader>
            <span>${this.localize.term('evaluatePage_recGenerating')}</span>
          </div>
        `;
      case 'result':
        return this._renderRecBox(
          check,
          state.value,
          false,
          check.propertyAlias !== null && this._canApply(check.propertyAlias),
        );
      case 'applied':
        return this._renderRecBox(check, state.value, true, false);
      case 'error':
        return html`
          <div style="display:flex;align-items:center;gap:var(--uui-size-space-2,8px);margin-top:var(--uui-size-space-2,8px);">
            <uui-icon name="icon-alert" style="color:var(--uui-color-danger-standalone,#b91c1c);"></uui-icon>
            <span style="color:var(--uui-color-danger-standalone,#b91c1c);font-size:0.85rem;">
              ${this.localize.term('evaluatePage_recError')}
            </span>
            <uui-button
              look="secondary"
              compact
              label=${this.localize.term('evaluatePage_recGenerate')}
              @click=${() => { void this._handleGenerate(check); }}>
              ${this.localize.term('evaluatePage_recRegenerate')}
            </uui-button>
          </div>
        `;
    }
  }

  private _renderRecBox(
    check: CheckResult,
    value: string | null,
    applied: boolean,
    canApply: boolean,
  ): TemplateResult {
    const copied = this._copiedChecks.has(check.checkNumber);
    return html`
      <div class="rec-box ${applied ? 'applied' : ''}">
        <div class="rec-label ${applied ? 'applied' : ''}">
          <uui-icon name="${applied ? 'icon-check' : 'icon-wand'}"></uui-icon>
          ${applied
            ? this.localize.term('evaluatePage_recApplied')
            : this._recSuggestedLabel(check.propertyAlias)}
        </div>
        <div class="rec-text">${value ?? ''}</div>
        <div class="rec-actions">
          ${canApply && !applied
            ? html`
                <uui-button
                  look="primary"
                  color="positive"
                  compact
                  label=${this.localize.term('evaluatePage_recApply')}
                  @click=${() => this._handleApply(check, value)}>
                  ${this.localize.term('evaluatePage_recApply')}
                </uui-button>
              `
            : nothing}
          <uui-button
            look="secondary"
            compact
            label=${copied ? this.localize.term('evaluatePage_recCopied') : this.localize.term('evaluatePage_recCopy')}
            ?disabled=${copied}
            @click=${() => { void this._handleCopy(check.checkNumber, value); }}>
            <uui-icon name="${copied ? 'icon-check' : 'icon-clipboard-copy'}" slot="icon"></uui-icon>
            ${copied ? this.localize.term('evaluatePage_recCopied') : this.localize.term('evaluatePage_recCopy')}
          </uui-button>
          <uui-button
            look="secondary"
            compact
            label=${this.localize.term('evaluatePage_recRegenerate')}
            @click=${() => { void this._handleGenerate(check); }}>
            <uui-icon name="icon-sync" slot="icon"></uui-icon>
            ${this.localize.term('evaluatePage_recRegenerate')}
          </uui-button>
        </div>
      </div>
    `;
  }

  private _setRecState(checkNumber: number, state: RecommendationState): void {
    this._recStates = new Map(this._recStates).set(checkNumber, state);
  }

  private async _handleGenerate(check: CheckResult): Promise<void> {
    if (!check.propertyAlias) return;
    this._setRecState(check.checkNumber, { kind: 'generating' });

    const request: RecommendRequest = {
      nodeId: this.nodeId,
      propertyAlias: check.propertyAlias,
      checkLabel: check.label,
      checkExplanation: check.explanation ?? null,
      properties: Object.fromEntries(
        Object.entries(this.properties).map(([k, v]) => [k, String(v ?? '')]),
      ),
    };

    try {
      const response = await recommend(request);
      if (!this.isConnected) return;
      this._setRecState(check.checkNumber, { kind: 'result', value: response.recommendedValue });
    } catch {
      if (!this.isConnected) return;
      this._setRecState(check.checkNumber, { kind: 'error' });
    }
  }

  private _handleApply(check: CheckResult, value: string | null): void {
    if (!check.propertyAlias || value === null) return;
    this.dispatchEvent(
      new CustomEvent('page-evaluator-rec-apply', {
        bubbles: true,
        composed: true,
        detail: { propertyAlias: check.propertyAlias, value },
      }),
    );
    this._setRecState(check.checkNumber, { kind: 'applied', value });
  }

  private async _handleCopy(checkNumber: number, value: string | null): Promise<void> {
    if (value === null) return;
    await navigator.clipboard.writeText(value);
    if (!this.isConnected) return;
    this._copiedChecks = new Set(this._copiedChecks).add(checkNumber);
    setTimeout(() => {
      if (!this.isConnected) return;
      const next = new Set(this._copiedChecks);
      next.delete(checkNumber);
      this._copiedChecks = next;
    }, 2000);
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
