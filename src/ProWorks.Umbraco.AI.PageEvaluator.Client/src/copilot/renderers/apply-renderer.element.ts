import { customElement, html, nothing, property, type PropertyValues, type TemplateResult } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { getRecommendation } from '../recommendation-store.js';
import type { PageEvaluatorToolElementProps, PageEvaluatorToolStatus } from '../types.js';
import { errorMessageOf, readApplyResult } from './renderer-results.js';
import { rendererStyles } from './renderer-styles.js';

/**
 * Chat renderer for `apply_page_recommendation` (contracts/copilot-tools.md "Tool renderers"). While the tool waits
 * for approval it shows the exact value that will be written, because Agent.UI's approval prompt is static text and
 * can't show it (live test 2026-11-05).
 *
 * The value comes from the recommendation store (the same module instance the tool uses). A successful apply deletes
 * the entry, so the entry is captured when the reference first arrives and kept for the completed view. The value
 * is a text binding: rich-text HTML is shown escaped, never parsed.
 */

interface CapturedRecommendation {
  readonly fieldName: string;
  readonly value: string;
}

const RUNNING: readonly PageEvaluatorToolStatus[] = ['pending', 'streaming', 'awaiting_approval', 'executing'];

const FIELD_ID = 'apply-field';

@customElement('page-evaluator-copilot-apply')
export class ApplyRendererElement extends UmbLitElement implements PageEvaluatorToolElementProps {
  static override styles = rendererStyles;

  @property({ attribute: false })
  args: Record<string, unknown> = {};

  @property({ type: String })
  status: PageEvaluatorToolStatus = 'pending';

  @property({ attribute: false })
  result?: unknown;

  /** The reference last looked up; null until the arguments have streamed in. */
  #reference: string | null = null;
  /** The entry for {@link #reference} as it was when first seen; undefined when the store didn't have it. */
  #captured: CapturedRecommendation | undefined;

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!changed.has('args')) return;
    const reference = this.args['reference'];
    if (typeof reference !== 'string' || reference === '' || reference === this.#reference) return;
    this.#reference = reference;
    const entry = getRecommendation(reference);
    this.#captured =
      entry === undefined
        ? undefined
        : { fieldName: entry.propertyName?.trim() || entry.propertyAlias, value: entry.value };
  }

  override render(): TemplateResult {
    if (RUNNING.includes(this.status)) return this.#renderPending();
    if (this.status === 'error') return this.#renderNotApplied(errorMessageOf(this.result), this.#captured?.fieldName ?? null);

    const outcome = readApplyResult(this.result);
    if (!outcome.applied) {
      if (outcome.code === 'unknownRecommendation') return this.#renderNotFound();
      return this.#renderNotApplied(outcome.message, this.#captured?.fieldName ?? null);
    }

    const fieldName = this.#captured?.fieldName ?? outcome.propertyAlias;
    return html`
      <div class="card">
        <div class="header positive">
          <uui-icon name="icon-check"></uui-icon>
          ${fieldName === null ? nothing : html`<span class="field" id=${FIELD_ID}>${fieldName}</span>`}
        </div>
        <div role="status">${this.localize.term('pageEvaluatorCopilot_applyApplied')}</div>
        ${this.#captured === undefined ? nothing : this.#renderValue(this.#captured.value)}
      </div>
    `;
  }

  #renderPending(): TemplateResult {
    if (this.#reference === null) {
      return html`
        <div class="status" role="status">
          <uui-icon name="icon-edit"></uui-icon>
          <span>${this.localize.term('pageEvaluatorCopilot_applyLoading')}</span>
          <uui-loader-circle></uui-loader-circle>
        </div>
      `;
    }
    if (this.#captured === undefined) return this.#renderNotFound();

    return html`
      <div class="card">
        <div class="header">
          <uui-icon name="icon-edit"></uui-icon>
          <span class="field" id=${FIELD_ID}>${this.#captured.fieldName}</span>
        </div>
        <div>${this.localize.term('pageEvaluatorCopilot_applyWillWrite')}</div>
        ${this.#renderValue(this.#captured.value)}
        <div class="note">${this.localize.term('pageEvaluatorCopilot_applyStagedNote')}</div>
      </div>
    `;
  }

  #renderValue(value: string): TemplateResult {
    return html`<pre class="value" tabindex="0" role="region" aria-labelledby=${FIELD_ID}>${value}</pre>`;
  }

  #renderNotFound(): TemplateResult {
    return html`
      <div class="card">
        <div class="error" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this.localize.term('pageEvaluatorCopilot_applyNotFound')}</span>
        </div>
      </div>
    `;
  }

  #renderNotApplied(message: string | null, fieldName: string | null): TemplateResult {
    return html`
      <div class="card">
        ${fieldName === null
          ? nothing
          : html`<div class="header">
              <uui-icon name="icon-edit"></uui-icon>
              <span class="field">${fieldName}</span>
            </div>`}
        <div class="error" role="alert">
          <uui-icon name="icon-alert"></uui-icon>
          <span>
            <span class="label">${this.localize.term('pageEvaluatorCopilot_applyNotApplied')}</span>
            ${message ?? nothing}
          </span>
        </div>
      </div>
    `;
  }
}

export { ApplyRendererElement as element };
export default ApplyRendererElement;

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-copilot-apply': ApplyRendererElement;
  }
}
