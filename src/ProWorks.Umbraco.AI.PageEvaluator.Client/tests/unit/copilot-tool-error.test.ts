/**
 * T043 — `toToolError` (`src/copilot/tool-error.ts`): maps an `ApiError` to the model-report error codes
 * (contracts/model-report.md "Failure"), with English messages and never a raw body.
 */
import { describe, it, expect } from 'vitest';
import { ApiError } from '../../src/shared/api-client.js';
import { toToolError, toolFailureFromError } from '../../src/copilot/tool-error.js';

describe('toToolError', () => {
  it.each([
    ['429 rate limit', new ApiError(429, 'Too many evaluation requests.', 'temporaryRetryable', 'Error'), 'rateLimited'],
    ['422 guardrail', new ApiError(422, 'Blocked by the PII guardrail.', null, 'Error'), 'guardrailBlocked'],
    ['503 transient', new ApiError(503, 'The AI provider is busy.', 'temporaryRetryable', 'Error'), 'providerUnavailable'],
    ['502 connectivity', new ApiError(502, 'Could not reach the provider.', 'connectivity', 'Error'), 'providerUnavailable'],
    ['504 gateway timeout', new ApiError(504, 'Timeout', null, 'GatewayTimeout'), 'providerUnavailable'],
    ['500 authentication', new ApiError(500, 'Auth failed', 'authenticationConfiguration', 'Error'), 'providerConfiguration'],
    ['500 unclassified', new ApiError(500, 'Bad request to provider', 'unclassified', 'Error'), 'providerConfiguration'],
    ['500 without category', new ApiError(500, 'A fatal server error occurred', null, 'ServerError'), 'unexpected'],
    ['network failure', new ApiError(0, 'Failed to fetch', null, 'NetworkError'), 'networkError'],
    ['gateway unreachable', new ApiError(522, 'Unreachable', null, 'GatewayUnreachable'), 'networkError'],
    ['404 no active config', new ApiError(404, 'Not Found'), 'noActiveConfig'],
    ['403 no Browse', new ApiError(403, 'Forbidden'), 'forbidden'],
    ['400 invalid culture', new ApiError(400, 'Unknown culture', 'invalidCulture', 'Error'), 'invalidCulture'],
    ['400 culture not created', new ApiError(400, 'Not created', 'cultureNotCreated', 'Error'), 'cultureNotCreated'],
    ['400 other', new ApiError(400, 'Bad request', null, 'Error'), 'unexpected'],
    ['a non-ApiError', new Error('boom'), 'unexpected'],
    ['a thrown string', 'boom', 'unexpected'],
  ])('%s → %s', (_case, error, code) => {
    expect(toToolError(error).code).toBe(code);
  });

  it('lets the caller choose what a 404 means', () => {
    expect(toToolError(new ApiError(404, 'Not Found'), { notFound: 'notFound' }).code).toBe('notFound');
  });

  it("carries the guardrail's text", () => {
    expect(toToolError(new ApiError(422, 'Blocked by the PII guardrail.', null, 'Error')).message).toContain(
      'Blocked by the PII guardrail.',
    );
  });

  it('does not pass a raw JSON body through as the guardrail text', () => {
    const message = toToolError(new ApiError(422, '{"errors":{"x":["secret"]}}')).message;

    expect(message).not.toContain('secret');
    expect(message).not.toContain('{');
  });

  it.each([
    new ApiError(500, 'System.NullReferenceException at Foo.Bar() in C:\\src\\x.cs:line 4', null, 'ServerError'),
    new ApiError(503, '{"providerMessage":"secret raw text"}', 'temporaryRetryable', 'Error'),
    new Error('stack trace detail'),
  ])('never includes the raw detail for non-guardrail errors (%#)', (error) => {
    const message = toToolError(error).message;

    expect(message).not.toContain('NullReference');
    expect(message).not.toContain('secret');
    expect(message).not.toContain('stack trace');
    expect(message.length).toBeGreaterThan(0);
  });

  it('toolFailureFromError wraps the error in a failure result', () => {
    expect(toolFailureFromError(new ApiError(429, 'x'))).toEqual({
      success: false,
      error: { code: 'rateLimited', message: expect.any(String) as unknown as string },
    });
  });
});
