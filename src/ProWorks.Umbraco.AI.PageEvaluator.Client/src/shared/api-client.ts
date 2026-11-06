/**
 * Typed fetch wrappers for all ProWorks AI Page Evaluator Management API endpoints.
 * Base path: /umbraco/management/api/v1/page-evaluator
 *
 * Uses Umbraco's shared `umbHttpClient` singleton (re-exported as `apiClient`), which the
 * backoffice configures with Bearer auth before any extension `onInit` runs.
 *
 * Error handling (specs/003-upgrade-umbraco-17-6/contracts/error-responses.md, research R12.3;
 * specs/005-upgrade-cms-17-8-ai-17-6/contracts/client-network-errors.md):
 * `umbHttpClient` is created with `throwOnError: true`, which would reject with the raw error
 * body and bypass `checkResult`. Every call here therefore passes `throwOnError: false`, so
 * non-2xx responses come back as `{ error, response }` and are turned into a typed `ApiError`
 * (`status`, `detail`, `category`, `type`).
 *
 * A fetch-level failure (network drop, no response) becomes `ApiError(0, …, null, 'NetworkError')`.
 * Since CMS 17.8.0 the regenerated client RESOLVES that case as `{ error, response: undefined }`
 * instead of rejecting with a `TypeError` (the 17.6 shape, still handled); it also resolves a 2xx
 * whose body failed to parse as `{ error, response(ok) }`, which `checkResult` treats as a failure.
 *
 * Constitution Principle I: all functions are fully typed; no `any`.
 * Constitution Principle IV: AI calls are always server-side — this client only
 *   calls our own Management API controller.
 */

import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';
import type {
  CreateEvaluatorConfigRequest,
  DocumentTypePropertySummary,
  EvaluatePageRequest,
  EvaluationReportResponse,
  EvaluatorConfigItem,
  EvaluatorConfigListResponse,
  ProfileSystemPromptResponse,
  RecommendRequest,
  RecommendResponse,
  SamplingSupportResponse,
  UpdateEvaluatorConfigRequest,
} from './types.js';

/**
 * Re-export umbHttpClient as apiClient.
 * umbHttpClient is the Umbraco-owned singleton already configured with Bearer auth
 * by app.element.js before any entry-point onInit runs — no further setConfig needed.
 */
export const apiClient = umbHttpClient;

const BASE = '/umbraco/management/api/v1/page-evaluator';

/** Security descriptor used on every request — tells the client to send the Bearer token. */
export const BEARER = [{ scheme: 'bearer', type: 'http' }] as const;

/** `type` value used for fetch-level failures (no HTTP response at all). */
export const NETWORK_ERROR_TYPE = 'NetworkError';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly category: string | null = null,
    public readonly type: string | null = null,
  ) {
    super(`API ${status}: ${detail}`);
  }
}

/** What `apiClient` resolves with (`response` is undefined when no HTTP response arrived — CMS 17.8+). */
interface ApiResult {
  readonly data?: unknown;
  readonly error?: unknown;
  readonly response?: Response;
}

/** A result that has an HTTP response; `send()` guarantees this shape to every caller. */
type SentResult = ApiResult & { readonly response: Response };

const NETWORK_FAILURE_FALLBACK_MESSAGE = 'Network request failed';

function stringField(value: unknown, field: string): string | null {
  if (value === null || typeof value !== 'object' || !(field in value)) return null;
  const fieldValue: unknown = (value as Record<string, unknown>)[field];
  return typeof fieldValue === 'string' ? fieldValue : null;
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message.length > 0 ? error.message : NETWORK_FAILURE_FALLBACK_MESSAGE;
}

function toApiError(result: SentResult): ApiError {
  const err = result.error;
  if (err instanceof Error) {
    // A 2xx whose body failed to parse/validate (CMS 17.8+): keep the parser's message.
    return new ApiError(result.response.status, err.message, null, null);
  }
  const title = stringField(err, 'title');
  const detail =
    title ?? (typeof err === 'string' && err.length > 0 ? err : err ? JSON.stringify(err) : `HTTP ${result.response.status}`);
  return new ApiError(result.response.status, detail, stringField(err, 'category'), stringField(err, 'type'));
}

function checkResult<T>(result: SentResult): T {
  if (!result.response.ok || result.error !== undefined) throw toApiError(result);
  return result.data as T;
}

/**
 * Runs one `apiClient` call and converts a fetch-level failure into
 * `ApiError(0, …, 'NetworkError')`, whichever shape the client uses for it: a resolved result
 * without a `response` (CMS 17.8+) or a rejected `TypeError` (CMS 17.6).
 */
async function send(call: () => Promise<ApiResult>): Promise<SentResult> {
  let result: ApiResult;
  try {
    result = await call();
  } catch (err) {
    if (err instanceof TypeError) {
      throw new ApiError(0, err.message, null, NETWORK_ERROR_TYPE);
    }
    throw err;
  }
  const { response } = result;
  if (response === undefined) {
    throw new ApiError(0, messageOf(result.error), null, NETWORK_ERROR_TYPE);
  }
  return { data: result.data, error: result.error, response };
}

// ---------------------------------------------------------------------------
// Evaluator Configuration endpoints
// ---------------------------------------------------------------------------

export async function getConfigurations(): Promise<EvaluatorConfigListResponse> {
  const result = await send(() =>
    apiClient.get({ security: BEARER, throwOnError: false, url: `${BASE}/configurations` }),
  );
  return checkResult<EvaluatorConfigListResponse>(result);
}

export async function getConfiguration(id: string): Promise<EvaluatorConfigItem> {
  const result = await send(() =>
    apiClient.get({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/configurations/${encodeURIComponent(id)}`,
    }),
  );
  return checkResult<EvaluatorConfigItem>(result);
}

export async function getActiveConfiguration(
  documentTypeAlias: string,
): Promise<EvaluatorConfigItem | null> {
  const result = await send(() =>
    apiClient.get({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/configurations/active/${encodeURIComponent(documentTypeAlias)}`,
    }),
  );
  if (result.response.status === 404) return null;
  return checkResult<EvaluatorConfigItem>(result);
}

export async function createConfiguration(
  request: CreateEvaluatorConfigRequest,
): Promise<EvaluatorConfigItem> {
  const result = await send(() =>
    apiClient.post({ security: BEARER, throwOnError: false, url: `${BASE}/configurations`, body: request }),
  );
  return checkResult<EvaluatorConfigItem>(result);
}

export async function updateConfiguration(
  id: string,
  request: UpdateEvaluatorConfigRequest,
): Promise<EvaluatorConfigItem> {
  const result = await send(() =>
    apiClient.put({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/configurations/${encodeURIComponent(id)}`,
      body: request,
    }),
  );
  return checkResult<EvaluatorConfigItem>(result);
}

export async function activateConfiguration(id: string): Promise<EvaluatorConfigItem> {
  const result = await send(() =>
    apiClient.post({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/configurations/${encodeURIComponent(id)}/activate`,
    }),
  );
  return checkResult<EvaluatorConfigItem>(result);
}

export async function deleteConfiguration(id: string): Promise<void> {
  const result = await send(() =>
    apiClient.delete({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/configurations/${encodeURIComponent(id)}`,
    }),
  );
  if (!result.response.ok || result.error !== undefined) throw toApiError(result);
}

// ---------------------------------------------------------------------------
// Evaluation endpoints
// ---------------------------------------------------------------------------

/**
 * Returns a previously cached evaluation for a node (and, for culture-varying documents,
 * the given culture), or null if none exists.
 * Call this first when opening the modal; only call evaluatePage when this returns null
 * or when the user clicks "Re-run Evaluation".
 *
 * "Nothing cached" is 204 No Content since 17.6.1 (it was 404, which browsers log as a failed resource). Check the
 * status before `checkResult`: depending on its version, the CMS client resolves a 204 with `data` null or `{}`, and
 * `{}` must never reach the modal or the Copilot tools as a report. 404 still means null too (a missing page, or a
 * server from before 17.6.1).
 */
export async function getCachedEvaluation(
  nodeId: string,
  culture: string | null = null,
): Promise<EvaluationReportResponse | null> {
  const query = culture !== null ? `?culture=${encodeURIComponent(culture)}` : '';
  const result = await send(() =>
    apiClient.get({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/evaluate/cached/${encodeURIComponent(nodeId)}${query}`,
    }),
  );
  if (result.response.status === 204 || result.response.status === 404) return null;
  return checkResult<EvaluationReportResponse>(result);
}

/** Runs a fresh AI evaluation and saves the result to the server-side cache. */
export async function evaluatePage(
  request: EvaluatePageRequest,
): Promise<EvaluationReportResponse> {
  const result = await send(() =>
    apiClient.post({ security: BEARER, throwOnError: false, url: `${BASE}/evaluate`, body: request }),
  );
  return checkResult<EvaluationReportResponse>(result);
}

/** Requests an AI-generated text recommendation for a specific property check. */
export async function recommend(
  request: RecommendRequest,
): Promise<RecommendResponse> {
  const result = await send(() =>
    apiClient.post({ security: BEARER, throwOnError: false, url: `${BASE}/recommend`, body: request }),
  );
  return checkResult<RecommendResponse>(result);
}

// ---------------------------------------------------------------------------
// AI profile sampling support (FR-015a)
// ---------------------------------------------------------------------------

/** Whether the profile's model honours the temperature setting (drives the "scores may vary" notice). */
export async function getSamplingSupport(profileId: string): Promise<SamplingSupportResponse> {
  const result = await send(() =>
    apiClient.get({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/profiles/${encodeURIComponent(profileId)}/sampling-support`,
    }),
  );
  return checkResult<SamplingSupportResponse>(result);
}

/**
 * Whether the profile has its own system prompt (005 FR-012): Umbraco.AI 17.5+ sends it ahead of the
 * evaluator's instructions on every call, so the config form warns administrators.
 */
export async function getProfileSystemPrompt(profileId: string): Promise<ProfileSystemPromptResponse> {
  const result = await send(() =>
    apiClient.get({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/profiles/${encodeURIComponent(profileId)}/system-prompt`,
    }),
  );
  return checkResult<ProfileSystemPromptResponse>(result);
}

// ---------------------------------------------------------------------------
// Document type properties endpoint
// ---------------------------------------------------------------------------

export interface DocumentTypeInfo {
  readonly name: string;
  readonly properties: DocumentTypePropertySummary[];
}

export async function fetchDocTypeProperties(
  documentTypeAlias: string,
): Promise<DocumentTypeInfo> {
  const result = await send(() =>
    apiClient.get({
      security: BEARER,
      throwOnError: false,
      url: `${BASE}/document-type/${encodeURIComponent(documentTypeAlias)}/properties`,
    }),
  );
  const data = checkResult<{
    name: string;
    properties: readonly { alias: string; label: string; groupName: string; editorAlias: string }[];
  }>(result);
  return {
    name: data.name,
    properties: data.properties.map((p) => ({
      alias: p.alias,
      label: p.label,
      groupName: p.groupName,
      editorAlias: p.editorAlias,
    })),
  };
}
