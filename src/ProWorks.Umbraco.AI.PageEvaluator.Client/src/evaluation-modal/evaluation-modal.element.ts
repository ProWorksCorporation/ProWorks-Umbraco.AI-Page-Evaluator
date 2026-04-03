import { html, css, nothing, type TemplateResult, customElement, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import { getCachedEvaluation, evaluatePage } from '../shared/api-client.js';
import type { EvaluationReportResponse } from '../shared/types.js';
import type { EvaluationModalData, EvaluationModalValue } from './evaluation-modal.token.js';
import './evaluation-report.element.js';
import './evaluation-warning.element.js';

type ModalState = 'idle' | 'loading' | 'success' | 'parse-failed' | 'error';

const PROGRESS_MESSAGES: Readonly<Record<string, string>> = {
  sending: 'Sending page data\u2026',
  waiting: 'Waiting for AI response\u2026',
  rendering: 'Rendering report\u2026',
};

/**
 * Slide-in modal element for the page evaluation flow.
 * On open, checks the server-side cache first. If a cached result exists it is shown
 * immediately without calling the AI. The "Re-run Evaluation" button forces a fresh call.
 */
@customElement('page-evaluator-modal')
export class EvaluationModalElement extends UmbModalBaseElement<EvaluationModalData, EvaluationModalValue> {
  static override styles = css`
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

  @state() private _modalState: ModalState = 'idle';
  @state() private _progressMessage = '';
  @state() private _report: EvaluationReportResponse | null = null;
  @state() private _errorMessage = '';

  override connectedCallback(): void {
    super.connectedCallback();
    void this._checkCacheAndLoad();
  }

  private async _checkCacheAndLoad(): Promise<void> {
    const data = this.data;
    if (!data) return;

    try {
      const cached = await getCachedEvaluation(data.nodeId);
      if (cached) {
        this._report = cached;
        this._modalState = cached.parseFailed ? 'parse-failed' : 'success';
        return;
      }
    } catch {
      // Cache check failed — fall through to a fresh evaluation.
    }

    void this._runEvaluation();
  }

  private async _runEvaluation(): Promise<void> {
    const data = this.data;
    if (!data) return;

    try {
      this._modalState = 'loading';
      this._progressMessage = PROGRESS_MESSAGES['sending'] ?? '';
      await this._tick();

      this._progressMessage = PROGRESS_MESSAGES['waiting'] ?? '';
      const report = await evaluatePage(data);

      this._progressMessage = PROGRESS_MESSAGES['rendering'] ?? '';
      await this._tick();

      this._report = report;
      this._modalState = report.parseFailed ? 'parse-failed' : 'success';
    } catch {
      this._modalState = 'error';
      this._errorMessage =
        'The evaluation could not be completed. The AI provider returned an error.';
    }
  }

  private _rerun(): void {
    void this._runEvaluation();
  }

  private _close(): void {
    this._rejectModal();
  }

  /** Yields to the browser's render queue so the progress message is painted. */
  private _tick(): Promise<void> {
    return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  private _formatCachedAt(isoString: string | null): string {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  }

  override render(): TemplateResult {
    return html`
      <umb-body-layout headline="Page Evaluation">
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === 'success' || this._modalState === 'parse-failed'
            ? html`
                <uui-button
                  look="secondary"
                  label="Re-run Evaluation"
                  @click=${() => this._rerun()}>
                  Re-run Evaluation
                </uui-button>
              `
            : nothing}
          <uui-button
            label="Close"
            @click=${() => this._close()}>
            Close
          </uui-button>
        </div>
      </umb-body-layout>
    `;
  }

  private _renderBody(): TemplateResult | typeof nothing {
    switch (this._modalState) {
      case 'idle':
        return nothing;

      case 'loading':
        return html`
          <div class="progress-container">
            <uui-loader></uui-loader>
            <p aria-live="polite" aria-atomic="true">${this._progressMessage}</p>
          </div>
        `;

      case 'success':
        return html`
          ${this._renderCacheBar()}
          <page-evaluator-report
            .report="${this._report!}"></page-evaluator-report>
        `;

      case 'parse-failed':
        return html`
          ${this._renderCacheBar()}
          <page-evaluator-warning
            .rawResponse="${this._report?.rawResponse ?? null}"></page-evaluator-warning>
        `;

      case 'error':
        return html`
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

  private _renderCacheBar(): TemplateResult | typeof nothing {
    const cachedAt = this._report?.cachedAt;
    if (!cachedAt) return nothing;
    return html`
      <div class="cache-bar">
        <span>Last evaluated: ${this._formatCachedAt(cachedAt)}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-modal': EvaluationModalElement;
  }
}
