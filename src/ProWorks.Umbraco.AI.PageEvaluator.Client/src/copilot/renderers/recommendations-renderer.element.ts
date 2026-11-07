import { css, customElement, html, nothing, property, type TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import type { SkipReason } from '../recommend-page-values.tool.api.js';
import type { PageEvaluatorToolElementProps, PageEvaluatorToolStatus } from '../types.js';
import {
  errorMessageOf,
  readRecommendResult,
  type RenderedRecommendation,
  type RenderedSkip,
} from './renderer-results.js';
import { rendererStyles } from './renderer-styles.js';

/**
 * Chat renderer for `recommend_page_values` (contracts/copilot-tools.md "Tool renderers"). Shows every recommended
 * value verbatim, whatever the model writes afterwards: live testing (2026-11-05) showed models calling
 * `apply_page_recommendation` straight away, and Agent.UI's approval prompt can't show the value.
 *
 * Values are text bindings, so rich-text HTML is shown escaped (never parsed) with its line breaks kept.
 */

const SKIP_REASON_KEYS: Readonly<Record<SkipReason, string>> = {
  notFailing: 'pageEvaluatorCopilot_skippedNotFailing',
  notRecommendable: 'pageEvaluatorCopilot_skippedNotRecommendable',
  noRecommendation: 'pageEvaluatorCopilot_skippedNoRecommendation',
};

const RUNNING: readonly PageEvaluatorToolStatus[] = ['pending', 'streaming', 'awaiting_approval', 'executing'];

@customElement('page-evaluator-copilot-recommendations')
export class RecommendationsRendererElement extends UmbLitElement implements PageEvaluatorToolElementProps {
  static override styles = [
    rendererStyles,
    css`
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .recommendations {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-4);
      }

      .recommendation {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-2);
        min-width: 0;
      }

      .skipped ul {
        display: flex;
        flex-direction: column;
        gap: var(--uui-size-space-1);
        margin-top: var(--uui-size-space-1);
      }

      .alias {
        font-weight: 600;
        overflow-wrap: anywhere;
      }
    `,
  ];

  @property({ attribute: false })
  args: Record<string, unknown> = {};

  @property({ type: String })
  status: PageEvaluatorToolStatus = 'pending';

  @property({ attribute: false })
  result?: unknown;

  override render(): TemplateResult {
    if (RUNNING.includes(this.status)) return this.#renderLoading();
    if (this.status === 'error') {
      return html`<div class="card">${this.#renderError(errorMessageOf(this.result))}</div>`;
    }

    const { recommendations, skipped, errorMessage } = readRecommendResult(this.result);
    const heading = this.localize.term('pageEvaluatorCopilot_recommendationsHeading');
    return html`
      <div class="card">
        <div class="header">
          <uui-icon name="icon-lightbulb"></uui-icon>
          <span class="title">${heading}</span>
        </div>
        ${recommendations.length > 0
          ? html`<ul class="recommendations" aria-label=${heading}>
              ${recommendations.map((r, index) => this.#renderRecommendation(r, index))}
            </ul>`
          : errorMessage === null
            ? html`<div class="note">${this.localize.term('pageEvaluatorCopilot_recommendationsNone')}</div>`
            : nothing}
        ${errorMessage === null ? nothing : this.#renderError(errorMessage)} ${this.#renderSkipped(skipped)}
        ${recommendations.length > 0
          ? html`<div class="note hint">${this.localize.term('pageEvaluatorCopilot_recommendationsHint')}</div>`
          : nothing}
      </div>
    `;
  }

  #renderLoading(): TemplateResult {
    return html`
      <div class="status" role="status">
        <uui-icon name="icon-lightbulb"></uui-icon>
        <span>${this.localize.term('pageEvaluatorCopilot_recommendationsLoading')}</span>
        <uui-loader-circle></uui-loader-circle>
      </div>
    `;
  }

  #renderRecommendation(recommendation: RenderedRecommendation, index: number): TemplateResult {
    const labelId = `recommendation-field-${index}`;
    return html`
      <li class="recommendation">
        <span class="field" id=${labelId}>${recommendation.fieldName}</span>
        <pre class="value" tabindex="0" role="region" aria-labelledby=${labelId}>${recommendation.value}</pre>
        ${recommendation.canApply ? nothing : this.#renderNotApplicable(recommendation)}
      </li>
    `;
  }

  #renderNotApplicable(recommendation: RenderedRecommendation): TemplateResult {
    const key = recommendation.blockedByRichTextBlocks
      ? 'pageEvaluatorCopilot_notApplicableRichTextBlocks'
      : 'pageEvaluatorCopilot_notApplicableGeneric';
    return html`<div class="note warning"><uui-icon name="icon-alert"></uui-icon><span>${this.localize.term(key)}</span></div>`;
  }

  #renderError(message: string | null): TemplateResult {
    return html`
      <div class="error" role="alert">
        <uui-icon name="icon-alert"></uui-icon>
        <span>
          <span class="label">${this.localize.term('pageEvaluatorCopilot_recommendationsFailed')}</span>
          ${message ?? nothing}
        </span>
      </div>
    `;
  }

  #renderSkipped(skipped: readonly RenderedSkip[]): TemplateResult | typeof nothing {
    if (skipped.length === 0) return nothing;
    return html`
      <div class="skipped note">
        <span>${this.localize.term('pageEvaluatorCopilot_skippedHeading')}</span>
        <ul>
          ${skipped.map(
            (skip) =>
              html`<li>
                <span class="alias">${skip.propertyAlias}</span>${skip.reason === null
                  ? nothing
                  : html`: <span class="reason">${this.localize.term(SKIP_REASON_KEYS[skip.reason])}</span>`}
              </li>`,
          )}
        </ul>
      </div>
    `;
  }
}

export { RecommendationsRendererElement as element };
export default RecommendationsRendererElement;

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-copilot-recommendations': RecommendationsRendererElement;
  }
}
