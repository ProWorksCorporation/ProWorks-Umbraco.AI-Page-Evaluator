import { html, css, type TemplateResult, customElement, property } from '@umbraco-cms/backoffice/external/lit';
import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';

/**
 * Parse-failure warning banner shown when the AI response could not be structured.
 * Displays the raw AI response and a link to the evaluator configuration.
 */
@customElement('page-evaluator-warning')
export class EvaluationWarningElement extends UmbLitElement {
  static override styles = css`
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

  /** Raw AI response text to display beneath the warning banner. */
  @property({ type: String })
  rawResponse: string | null = null;

  override render(): TemplateResult {
    return html`
      <div class="warning-banner">
        <p>
          <uui-icon name="icon-alert"></uui-icon>
          ${this.localize.term('evaluatePage_parseFailedWarning')}
        </p>
        <p>
          <a href="/umbraco/section/ai/page-evaluator">${this.localize.term('evaluatePage_parseFailedLinkText')}</a>
          to improve structured output.
        </p>
      </div>
      ${this.rawResponse
        ? html`<pre class="raw-response">${this.rawResponse}</pre>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'page-evaluator-warning': EvaluationWarningElement;
  }
}
