/**
 * 005-upgrade-cms-17-8-ai-17-6 — US3 / FR-010, contracts/client-network-errors.md
 *
 * CMS 17.8.0 regenerated `umbHttpClient`: with `throwOnError: false` a fetch failure now RESOLVES
 * `{ error, request, response: undefined }` instead of rejecting with a `TypeError` (CMS 17.6 shape),
 * and a 2xx whose body failed to parse resolves `{ error, response(ok) }`. Every exported call must
 * still reject with `ApiError` — never a raw `TypeError`, never `undefined` data.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

const httpMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@umbraco-cms/backoffice/http-client', () => ({ umbHttpClient: httpMock }));

import {
  ApiError,
  NETWORK_ERROR_TYPE,
  activateConfiguration,
  createConfiguration,
  deleteConfiguration,
  evaluatePage,
  fetchDocTypeProperties,
  getActiveConfiguration,
  getCachedEvaluation,
  getConfiguration,
  getConfigurations,
  getProfileSystemPrompt,
  getSamplingSupport,
  recommend,
  updateConfiguration,
} from '../../src/shared/api-client.js';
import { localizationKeyForError } from '../../src/shared/error-category.js';
import type {
  CreateEvaluatorConfigRequest,
  EvaluatePageRequest,
  RecommendRequest,
  UpdateEvaluatorConfigRequest,
} from '../../src/shared/types.js';

type Method = keyof typeof httpMock;

interface ApiCall {
  readonly name: string;
  readonly method: Method;
  readonly invoke: () => Promise<unknown>;
}

const createRequest = { documentTypeAlias: 'home' } as unknown as CreateEvaluatorConfigRequest;
const updateRequest = { documentTypeAlias: 'home', version: 1 } as unknown as UpdateEvaluatorConfigRequest;
const evaluateRequest = { nodeId: 'n1', documentTypeAlias: 'home', culture: null, properties: {} } as unknown as EvaluatePageRequest;
const recommendRequest = {
  nodeId: 'n1',
  propertyAliases: ['metaDescription'],
  checkLabel: 'Meta description',
  checkExplanation: null,
  culture: null,
  properties: {},
} as unknown as RecommendRequest;

const CALLS: readonly ApiCall[] = [
  { name: 'getConfigurations', method: 'get', invoke: () => getConfigurations() },
  { name: 'getConfiguration', method: 'get', invoke: () => getConfiguration('c1') },
  { name: 'getActiveConfiguration', method: 'get', invoke: () => getActiveConfiguration('home') },
  { name: 'createConfiguration', method: 'post', invoke: () => createConfiguration(createRequest) },
  { name: 'updateConfiguration', method: 'put', invoke: () => updateConfiguration('c1', updateRequest) },
  { name: 'activateConfiguration', method: 'post', invoke: () => activateConfiguration('c1') },
  { name: 'deleteConfiguration', method: 'delete', invoke: () => deleteConfiguration('c1') },
  { name: 'getCachedEvaluation', method: 'get', invoke: () => getCachedEvaluation('n1', null) },
  { name: 'evaluatePage', method: 'post', invoke: () => evaluatePage(evaluateRequest) },
  { name: 'recommend', method: 'post', invoke: () => recommend(recommendRequest) },
  { name: 'getSamplingSupport', method: 'get', invoke: () => getSamplingSupport('p1') },
  { name: 'getProfileSystemPrompt', method: 'get', invoke: () => getProfileSystemPrompt('p1') },
  { name: 'fetchDocTypeProperties', method: 'get', invoke: () => fetchDocTypeProperties('home') },
];

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('Expected the promise to reject');
}

function mockFor(method: Method): Mock {
  return httpMock[method];
}

beforeEach(() => {
  for (const fn of Object.values(httpMock)) fn.mockReset();
});

describe('api-client — network failure, CMS 17.8 shape (resolved, response undefined)', () => {
  it.each(CALLS.map((c) => [c.name, c] as const))('%s rejects with ApiError(0, NetworkError)', async (_name, call) => {
    mockFor(call.method).mockResolvedValue({
      error: new TypeError('Failed to fetch'),
      request: undefined,
      response: undefined,
    });

    const err = await rejectionOf(call.invoke());

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
    expect((err as ApiError).type).toBe(NETWORK_ERROR_TYPE);
    expect((err as ApiError).detail).toBe('Failed to fetch');
  });

  it('uses a generic message when the returned error is not an Error', async () => {
    httpMock.get.mockResolvedValue({ error: {}, response: undefined });

    const err = await rejectionOf(getConfigurations());

    expect((err as ApiError).type).toBe(NETWORK_ERROR_TYPE);
    expect((err as ApiError).detail).toBe('Network request failed');
  });
});

describe('api-client — network failure, CMS 17.6 shape (rejected TypeError)', () => {
  it.each(CALLS.map((c) => [c.name, c] as const))('%s rejects with ApiError(0, NetworkError)', async (_name, call) => {
    mockFor(call.method).mockRejectedValue(new TypeError('Failed to fetch'));

    const err = await rejectionOf(call.invoke());

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);
    expect((err as ApiError).type).toBe(NETWORK_ERROR_TYPE);
  });
});

describe('api-client — 2xx with a parse/validation error (CMS 17.8 shape)', () => {
  it('rejects with ApiError carrying the response status instead of resolving undefined data', async () => {
    httpMock.post.mockResolvedValue({
      error: new SyntaxError('Unexpected token < in JSON'),
      response: new Response(null, { status: 200 }),
    });

    const err = await rejectionOf(evaluatePage(evaluateRequest));

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(200);
    expect((err as ApiError).type).toBeNull();
  });
});

describe('api-client — 404 → null branches still work', () => {
  it('getCachedEvaluation resolves null on 404', async () => {
    httpMock.get.mockResolvedValue({ error: { title: 'Not found' }, response: new Response(null, { status: 404 }) });

    await expect(getCachedEvaluation('n1', 'da-dk')).resolves.toBeNull();
  });

  it('getActiveConfiguration resolves null on 404', async () => {
    httpMock.get.mockResolvedValue({ error: { title: 'Not found' }, response: new Response(null, { status: 404 }) });

    await expect(getActiveConfiguration('contentPage')).resolves.toBeNull();
  });

  it('a successful call resolves its data', async () => {
    httpMock.get.mockResolvedValue({ data: { temperatureSupported: true }, response: new Response(null, { status: 200 }) });

    await expect(getSamplingSupport('p1')).resolves.toEqual({ temperatureSupported: true });
  });

  it('getProfileSystemPrompt calls the system-prompt route and resolves its data (005 FR-012)', async () => {
    httpMock.get.mockResolvedValue({ data: { hasSystemPrompt: true }, response: new Response(null, { status: 200 }) });

    await expect(getProfileSystemPrompt('a b')).resolves.toEqual({ hasSystemPrompt: true });
    expect(httpMock.get).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/umbraco/management/api/v1/page-evaluator/profiles/a%20b/system-prompt',
        throwOnError: false,
      }),
    );
  });
});

describe('api-client — 429 from the shared evaluation limit (006 contracts/management-api.md §2)', () => {
  const tooMany = {
    type: 'Error',
    title: 'Too many evaluation requests. Please wait a minute and try again.',
    status: 429,
    category: 'temporaryRetryable',
  };

  it.each([
    ['evaluatePage', () => evaluatePage(evaluateRequest)],
    ['recommend', () => recommend(recommendRequest)],
  ])('%s rejects with ApiError(429, temporaryRetryable) → the existing retry message', async (_name, invoke) => {
    httpMock.post.mockResolvedValue({ error: tooMany, response: new Response(null, { status: 429 }) });

    const err = await rejectionOf(invoke());

    expect(err).toBeInstanceOf(ApiError);
    const apiError = err as ApiError;
    expect(apiError.status).toBe(429);
    expect(apiError.category).toBe('temporaryRetryable');
    expect(apiError.type).toBe('Error');
    expect(localizationKeyForError(apiError, 'evaluatePage_aiErrorMessage')).toBe('evaluatePage_temporaryRetryableMessage');
  });
});
