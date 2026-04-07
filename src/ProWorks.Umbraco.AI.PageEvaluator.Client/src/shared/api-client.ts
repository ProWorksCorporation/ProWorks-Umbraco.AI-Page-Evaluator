/**
 * Typed fetch wrappers for all ProWorks AI Page Evaluator Management API endpoints.
 * Base path: /umbraco/management/api/v1/page-evaluator
 *
 * Uses a dedicated @hey-api/openapi-ts client instance (apiClient) that is
 * configured at entry-point onInit time via UMB_AUTH_CONTEXT, following the
 * same pattern used by the Umbraco.AI packages.
 *
 * Constitution Principle I: all functions are fully typed; no `any`.
 * Constitution Principle IV: AI calls are always server-side — this client only
 *   calls our own Management API controller.
 */

import { umbHttpClient } from '@umbraco-cms/backoffice/http-client';
import type {
  CreateEvaluatorConfigRequest,
  EvaluatePageRequest,
  EvaluationReportResponse,
  EvaluatorConfigItem,
  EvaluatorConfigListResponse,
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

async function checkResult<T>(result: { data?: T; error?: unknown; response: Response }): Promise<T> {
  if (!result.response.ok) {
    const text = await result.response.text().catch(() => '');
    throw new Error(`API ${result.response.status}: ${text}`);
  }
  return result.data as T;
}

// ---------------------------------------------------------------------------
// Evaluator Configuration endpoints
// ---------------------------------------------------------------------------

export async function getConfigurations(): Promise<EvaluatorConfigListResponse> {
  const result = await apiClient.get({
    security: BEARER,
    url: `${BASE}/configurations`,
  });
  return checkResult<EvaluatorConfigListResponse>(result);
}

export async function getConfiguration(id: string): Promise<EvaluatorConfigItem> {
  const result = await apiClient.get({
    security: BEARER,
    url: `${BASE}/configurations/${encodeURIComponent(id)}`,
  });
  return checkResult<EvaluatorConfigItem>(result);
}

export async function getActiveConfiguration(
  documentTypeAlias: string,
): Promise<EvaluatorConfigItem | null> {
  const result = await apiClient.get({
    security: BEARER,
    url: `${BASE}/configurations/active/${encodeURIComponent(documentTypeAlias)}`,
  });
  if (result.response.status === 404) return null;
  return checkResult<EvaluatorConfigItem>(result);
}

export async function createConfiguration(
  request: CreateEvaluatorConfigRequest,
): Promise<EvaluatorConfigItem> {
  const result = await apiClient.post({
    security: BEARER,
    url: `${BASE}/configurations`,
    body: request,
  });
  return checkResult<EvaluatorConfigItem>(result);
}

export async function updateConfiguration(
  id: string,
  request: UpdateEvaluatorConfigRequest,
): Promise<EvaluatorConfigItem> {
  const result = await apiClient.put({
    security: BEARER,
    url: `${BASE}/configurations/${encodeURIComponent(id)}`,
    body: request,
  });
  return checkResult<EvaluatorConfigItem>(result);
}

export async function activateConfiguration(id: string): Promise<EvaluatorConfigItem> {
  const result = await apiClient.post({
    security: BEARER,
    url: `${BASE}/configurations/${encodeURIComponent(id)}/activate`,
  });
  return checkResult<EvaluatorConfigItem>(result);
}

export async function deleteConfiguration(id: string): Promise<void> {
  const result = await apiClient.delete({
    security: BEARER,
    url: `${BASE}/configurations/${encodeURIComponent(id)}`,
  });
  if (!result.response.ok) {
    const text = await result.response.text().catch(() => '');
    throw new Error(`API ${result.response.status}: ${text}`);
  }
}

// ---------------------------------------------------------------------------
// Evaluation endpoints
// ---------------------------------------------------------------------------

/**
 * Returns a previously cached evaluation for a node, or null if none exists.
 * Call this first when opening the modal; only call evaluatePage when this returns null
 * or when the user clicks "Re-run Evaluation".
 */
export async function getCachedEvaluation(
  nodeId: string,
): Promise<EvaluationReportResponse | null> {
  const result = await apiClient.get({
    security: BEARER,
    url: `${BASE}/evaluate/cached/${encodeURIComponent(nodeId)}`,
  });
  if (result.response.status === 404) return null;
  return checkResult<EvaluationReportResponse>(result);
}

/** Runs a fresh AI evaluation and saves the result to the server-side cache. */
export async function evaluatePage(
  request: EvaluatePageRequest,
): Promise<EvaluationReportResponse> {
  const result = await apiClient.post({
    security: BEARER,
    url: `${BASE}/evaluate`,
    body: request,
  });
  return checkResult<EvaluationReportResponse>(result);
}
