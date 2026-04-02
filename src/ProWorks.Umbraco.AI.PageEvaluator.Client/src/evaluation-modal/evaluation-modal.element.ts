import { html, css, nothing, type TemplateResult, customElement, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import { evaluatePage } from '../shared/api-client.js';
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
 * Extends UmbModalBaseElement so this.data and this.modalContext are wired
 * automatically by the framework. Uses umb-body-layout for the standard
 * Umbraco modal chrome (headline + close button).
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

  private _retry(): void {
    void this._runEvaluation();
  }

  private _close(): void {
    this._rejectModal();
  }

  /** Yields to the browser's render queue so the progress message is painted. */
  private _tick(): Promise<void> {
    return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  override render(): TemplateResult {
    return html`
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
          <page-evaluator-report
            .report="${this._report!}"></page-evaluator-report>
        `;

      case 'parse-failed':
        return html`
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
              @click="${() => this._retry()}">
              Retry
            </uui-button>
          </div>
        `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-modal': EvaluationModalElement;
  }
}
