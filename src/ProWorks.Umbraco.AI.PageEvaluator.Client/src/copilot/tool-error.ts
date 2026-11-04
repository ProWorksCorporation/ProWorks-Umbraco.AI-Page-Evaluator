import { ApiError, NETWORK_ERROR_TYPE } from '../shared/api-client.js';
import { toolFailure, type ToolError, type ToolErrorCode, type ToolFailure } from './types.js';

/**
 * Maps a failed API call to a model-report error (contracts/model-report.md "Failure"). Messages are English and
 * aimed at the model; they never contain stack traces, raw provider text or HTTP bodies (spec FR-014). The only
 * server text passed on is a guardrail's own message (the 422 `title`), which is meant for the user.
 */

export const TOOL_ERROR_MESSAGES: Readonly<Record<ToolErrorCode, string>> = {
  noOpenPage: 'No page is open in the editor. Ask the user to open the page they want to work on.',
  pageNotSaved: 'The page has not been saved yet. Ask the user to save the page first.',
  cultureNotCreated: "The page doesn't have a version in this language yet.",
  invalidCulture: "The language isn't valid for this page.",
  notFound: "The page doesn't exist.",
  forbidden: "The user doesn't have permission to browse this page.",
  noActiveConfig: "There is no active Page Evaluator configuration for this page's document type.",
  rateLimited: 'Too many evaluation requests. Wait a minute and try again.',
  guardrailBlocked: 'A guardrail blocked the request.',
  providerUnavailable: 'The AI provider is temporarily unavailable. Try again shortly.',
  providerConfiguration:
    "The AI provider couldn't be used because of an authentication or configuration problem. An administrator needs to check the AI connection.",
  networkError: "The browser couldn't reach the Umbraco server. Check the connection and try again.",
  unexpected: 'Something went wrong. Try again later.',
  invalidArguments: 'The tool arguments are not valid. Check the parameter descriptions and try again.',
  noReport: 'Evaluate the page first.',
  recommendationsDisabled: 'Recommendations are turned off in the Page Evaluator configuration for this document type.',
  reportOutOfDate: 'Run a fresh evaluation first.',
  unknownRecommendation:
    'The recommendation reference is unknown or has expired. Get a new recommendation with recommend_page_values.',
  differentPage: 'The recommendation was made for a different page than the one open in the editor.',
  languageChanged: 'The recommendation was made for a different language than the one the editor is showing.',
  propertyMissing: 'The field no longer exists on this page.',
  readOnly: "The field is read-only for the user, so the value can't be written.",
  notApplicable: "The recommendation can't be applied automatically to this field. The user can copy it instead.",
  richTextBlocks:
    "The recommendation would remove or duplicate an embedded block, so it can't be applied automatically. The user can copy it instead.",
  writeFailed: "The editor didn't accept the value. The field was left unchanged.",
};

/** Gateway types the backoffice interceptor sets (504/524/598 → GatewayTimeout; 52x/530/599 → GatewayUnreachable). */
const GATEWAY_TIMEOUT_TYPE = 'GatewayTimeout';
const GATEWAY_UNREACHABLE_TYPE = 'GatewayUnreachable';

/** A guardrail's `title` is shown only when it reads like a sentence, not a serialized body or a status line. */
function guardrailText(detail: string): string | null {
  const text = detail.trim();
  if (text.length === 0 || /^[{[]/.test(text) || /^HTTP \d+$/.test(text)) return null;
  return text;
}

function codeFor(err: ApiError, notFound: ToolErrorCode): ToolErrorCode {
  if (err.type === NETWORK_ERROR_TYPE || err.type === GATEWAY_UNREACHABLE_TYPE) return 'networkError';
  if (err.type === GATEWAY_TIMEOUT_TYPE) return 'providerUnavailable';
  switch (err.status) {
    case 429:
      return 'rateLimited';
    case 422:
      return 'guardrailBlocked';
    case 404:
      return notFound;
    case 403:
      return 'forbidden';
    case 502:
    case 503:
      return 'providerUnavailable';
    case 400:
      if (err.category === 'invalidCulture') return 'invalidCulture';
      if (err.category === 'cultureNotCreated') return 'cultureNotCreated';
      return 'unexpected';
    case 500:
      return err.category === 'authenticationConfiguration' || err.category === 'unclassified'
        ? 'providerConfiguration'
        : 'unexpected';
    default:
      return 'unexpected';
  }
}

export interface ToolErrorOptions {
  /** What a 404 means for this call. Defaults to `noActiveConfig` (POST /evaluate's 404). */
  readonly notFound?: ToolErrorCode;
}

export function toToolError(err: unknown, options: ToolErrorOptions = {}): ToolError {
  if (!(err instanceof ApiError)) return { code: 'unexpected', message: TOOL_ERROR_MESSAGES.unexpected };

  const code = codeFor(err, options.notFound ?? 'noActiveConfig');
  if (code === 'guardrailBlocked') {
    const text = guardrailText(err.detail);
    return { code, message: text === null ? TOOL_ERROR_MESSAGES.guardrailBlocked : `${TOOL_ERROR_MESSAGES.guardrailBlocked} ${text}` };
  }
  return { code, message: TOOL_ERROR_MESSAGES[code] };
}

export function toolFailureFromError(err: unknown, options: ToolErrorOptions = {}): ToolFailure {
  const { code, message } = toToolError(err, options);
  return toolFailure(code, message);
}
