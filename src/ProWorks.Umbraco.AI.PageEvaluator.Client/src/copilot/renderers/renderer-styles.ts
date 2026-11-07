import { css } from '@umbraco-cms/backoffice/external/lit';

/**
 * Styles shared by the Copilot tool renderers. They follow Agent.UI's default `uai-agent-tool-status` chip (small
 * type, surface-alt background, UUI radius and spacing) so the cards sit naturally in the chat.
 * `--uai-chat-surface-alt` is the chat's own surface token (the one the default chip uses), with the UUI token as
 * its fallback outside the chat.
 */
export const rendererStyles = css`
  :host {
    display: block;
    max-width: 100%;
    font-size: var(--uui-type-small-size);
    color: var(--uui-color-text);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: var(--uui-size-space-2);
    padding: var(--uui-size-space-2) var(--uui-size-space-3);
    background: var(--uai-chat-surface-alt, var(--uui-color-surface-alt));
    border-radius: var(--uui-border-radius);
  }

  .status uui-loader-circle {
    font-size: var(--uui-type-small-size);
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: var(--uui-size-space-3);
    padding: var(--uui-size-space-3);
    background: var(--uai-chat-surface-alt, var(--uui-color-surface-alt));
    border: 1px solid var(--uui-color-border);
    border-radius: var(--uui-border-radius);
    min-width: 0;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--uui-size-space-2);
    font-weight: 600;
    min-width: 0;
  }

  .header.positive {
    color: var(--uui-color-positive);
  }

  .header .field,
  .header .title {
    overflow-wrap: anywhere;
  }

  .field {
    font-weight: 600;
    color: var(--uui-color-text);
    overflow-wrap: anywhere;
  }

  .value {
    margin: 0;
    padding: var(--uui-size-space-2) var(--uui-size-space-3);
    max-height: var(--uui-size-80);
    overflow: auto;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: inherit;
    font-size: var(--uui-type-small-size);
    line-height: 1.5;
    background: var(--uui-color-surface);
    border: 1px solid var(--uui-color-divider);
    border-radius: var(--uui-border-radius);
  }

  .value:focus-visible {
    outline: 2px solid var(--uui-color-focus);
    outline-offset: 1px;
  }

  .note {
    margin: 0;
    color: var(--uui-color-text-alt);
  }

  .note.warning {
    display: flex;
    align-items: flex-start;
    gap: var(--uui-size-space-2);
    color: var(--uui-color-text);
  }

  .note.warning uui-icon {
    color: var(--uui-color-warning-standalone);
  }

  .error {
    display: flex;
    align-items: flex-start;
    gap: var(--uui-size-space-2);
    color: var(--uui-color-danger);
    overflow-wrap: anywhere;
  }

  .error .label {
    font-weight: 600;
  }

  .error uui-icon,
  .note uui-icon {
    flex: none;
    margin-top: var(--uui-size-1);
  }
`;
