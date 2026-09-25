import { html, css, nothing, type TemplateResult, customElement, state } from '@umbraco-cms/backoffice/external/lit';
import { UmbModalBaseElement } from '@umbraco-cms/backoffice/modal';
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { ApiError, getCachedEvaluation, evaluatePage } from '../shared/api-client.js';
import { localizationKeyForError, shouldHideErrorDetail } from '../shared/error-category.js';
import type { EvaluationReportResponse } from '../shared/types.js';
import type { EvaluationModalData, EvaluationModalValue } from './evaluation-modal.token.js';
import { applyRecommendedValue } from '../shared/apply-value.js';
import type { RecApplyEventDetail } from './evaluation-report.element.js';
import './evaluation-report.element.js';
import './evaluation-warning.element.js';

type ModalState = 'idle' | 'loading' | 'success' | 'parse-failed' | 'guardrail-blocked' | 'error' | 'culture-not-created';

/** Localization keys for each progress phase, resolved via this.localize.term(). */
const PROGRESS_KEYS = {
  sending: 'evaluatePage_progressSendingData',
  waiting: 'evaluatePage_progressWaitingForAI',
  rendering: 'evaluatePage_progressRendering',
} as const;

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
      padding: var(--uui-size-layout-2, 30px);
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
      background: var(--uui-color-danger-standalone, #b91c1c);
      border-radius: var(--uui-border-radius, 4px);
      color: var(--uui-color-danger-contrast, #fff);
    }
  `;

  @state() private _modalState: ModalState = 'idle';
  @state() private _progressKey = '';
  @state() private _report: EvaluationReportResponse | null = null;
  @state() private _errorDetail: string | null = null;
  @state() private _errorCategory: string | null = null;
  @state() private _errorType: string | null = null;
  private _inFlight = false;
  private _workspaceContext: typeof UMB_DOCUMENT_WORKSPACE_CONTEXT.TYPE | undefined;

  private readonly _onRecApply = (e: Event): void => {
    const detail = (e as CustomEvent<RecApplyEventDetail>).detail;
    // The report lives in this modal's shadow root, so e.target is retargeted to the modal host;
    // composedPath()[0] is the report element that dispatched it (and must receive any failure).
    void this._applyRecommendation(e.composedPath()[0] ?? null, detail);
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (ctx) => {
      this._workspaceContext = ctx;
    });
    this.addEventListener('page-evaluator-rec-apply', this._onRecApply);
    void this._checkCacheAndLoad();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('page-evaluator-rec-apply', this._onRecApply);
  }

  private async _checkCacheAndLoad(): Promise<void> {
    const data = this.data;
    if (!data) return;

    // FR-018: a language version with no content yet has nothing to evaluate — say so, no API call.
    if (data.cultureNotCreated) {
      this._modalState = 'culture-not-created';
      return;
    }

    try {
      const cached = await getCachedEvaluation(data.nodeId, data.culture);
      if (cached) {
        if (!this.isConnected) return;
        this._report = cached;
        this._modalState = cached.parseFailed ? 'parse-failed' : 'success';
        return;
      }
    } catch {
      // Cache check failed — fall through to a fresh evaluation.
    }

    if (!this.isConnected) return;
    void this._runEvaluation();
  }

  private async _runEvaluation(): Promise<void> {
    if (this._inFlight) return;
    this._inFlight = true;
    const data = this.data;
    if (!data) {
      this._inFlight = false;
      return;
    }

    try {
      this._modalState = 'loading';
      this._progressKey = PROGRESS_KEYS.sending;
      await this._tick();

      if (!this.isConnected) return;
      this._progressKey = PROGRESS_KEYS.waiting;
      const report = await evaluatePage({
        nodeId: data.nodeId,
        documentTypeAlias: data.documentTypeAlias,
        culture: data.culture,
        properties: data.properties,
      });

      if (!this.isConnected) return;
      this._progressKey = PROGRESS_KEYS.rendering;
      await this._tick();

      if (!this.isConnected) return;
      this._report = report;
      this._modalState = report.parseFailed ? 'parse-failed' : 'success';
    } catch (err) {
      if (!this.isConnected) return;
      const apiError = err instanceof ApiError ? err : null;
      const type = apiError?.type ?? null;
      const category = apiError?.category ?? null;
      const hideDetail = shouldHideErrorDetail({ type });
      // Gateway/network types are checked first: a proxy can't produce our guardrail 422.
      if (!hideDetail && apiError?.status === 422) {
        this._modalState = 'guardrail-blocked';
        this._errorDetail = apiError.detail;
      } else {
        this._modalState = 'error';
        // The interceptor's gateway/network text is English-only — show just the localized message.
        this._errorDetail = hideDetail ? null : (apiError?.detail ?? null);
        this._errorCategory = category;
        this._errorType = type;
      }
    } finally {
      this._inFlight = false;
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

  /**
   * Writes a recommendation into the document (FR-016). On failure, tells the report element so it
   * can show the apply-failed message instead of "Applied"; existing content is left untouched.
   */
  private async _applyRecommendation(source: EventTarget | null, detail: RecApplyEventDetail): Promise<void> {
    const ctx = this._workspaceContext;
    const ok = ctx
      ? await applyRecommendedValue(
          ctx,
          detail.propertyAlias,
          this._report?.propertyEditorAliases[detail.propertyAlias],
          detail.value,
          // FR-018c: the helper writes the viewed culture only for culture-varying properties.
          this.data?.culture ?? null,
        )
      : false;
    if (ok || !this.isConnected) return;
    source?.dispatchEvent(
      new CustomEvent<RecApplyEventDetail>('page-evaluator-rec-apply-failed', {
        detail: { propertyAlias: detail.propertyAlias, checkNumber: detail.checkNumber },
      }),
    );
  }

  override render(): TemplateResult {
    return html`
      <umb-body-layout headline=${this.localize.term('evaluatePage_modalHeadline')}>
        ${this._renderBody()}
        <div slot="actions">
          ${this._modalState === 'success' || this._modalState === 'parse-failed'
            ? html`
                <uui-button
                  look="secondary"
                  label=${this.localize.term('evaluatePage_rerunButton')}
                  @click=${() => this._rerun()}>
                  ${this.localize.term('evaluatePage_rerunButton')}
                </uui-button>
              `
            : nothing}
          <uui-button
            label=${this.localize.term('evaluatePage_closeButton')}
            @click=${() => this._close()}>
            ${this.localize.term('evaluatePage_closeButton')}
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
            <p aria-live="polite" aria-atomic="true">${this.localize.term(this._progressKey)}</p>
          </div>
        `;

      case 'success':
        return html`
          ${this._renderCacheBar()}
          <page-evaluator-report
            .report="${this._report}"
            .nodeId="${this.data?.nodeId ?? ''}"
            .culture="${this.data?.culture ?? null}"
            .properties="${this.data?.properties ?? {}}"
            .propertyEditorAliases="${this._report?.propertyEditorAliases ?? {}}"
            .propertyNames="${this._report?.propertyNames ?? {}}"
            .recommendationsEnabled="${this._report?.recommendationsEnabled ?? true}"
            .additionalRecommendableEditorAliases="${this._report?.additionalRecommendableEditorAliases ?? []}">
          </page-evaluator-report>
        `;

      case 'parse-failed':
        return html`
          ${this._renderCacheBar()}
          <page-evaluator-warning
            .rawResponse="${this._report?.rawResponse ?? null}"></page-evaluator-warning>
        `;

      case 'culture-not-created':
        return html`
          <div class="error-container" role="status">
            <p>${this.localize.term('evaluatePage_cultureNotCreatedMessage')}</p>
          </div>
        `;

      case 'guardrail-blocked':
        return html`
          <div class="error-container" role="alert">
            <p>${this.localize.term('evaluatePage_guardrailBlockedMessage')}</p>
            ${this._errorDetail ? html`<p><em>${this._errorDetail}</em></p>` : nothing}
          </div>
        `;

      case 'error': {
        const messageKey = localizationKeyForError({ type: this._errorType, category: this._errorCategory }, 'evaluatePage_aiErrorMessage');
        return html`
          <div class="error-container" role="alert">
            <p>${this.localize.term(messageKey)}</p>
            ${this._errorDetail ? html`<p><em>${this._errorDetail}</em></p>` : nothing}
            <uui-button
              look="primary"
              color="warning"
              label=${this.localize.term('evaluatePage_retryButton')}
              @click="${() => this._rerun()}">
              ${this.localize.term('evaluatePage_retryButton')}
            </uui-button>
          </div>
        `;
      }
    }
  }

  private _renderCacheBar(): TemplateResult | typeof nothing {
    const cachedAt = this._report?.cachedAt;
    if (!cachedAt) return nothing;
    return html`
      <div class="cache-bar">
        <span>${this.localize.term('evaluatePage_lastEvaluated')} ${this._formatCachedAt(cachedAt)}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-modal': EvaluationModalElement;
  }
}
