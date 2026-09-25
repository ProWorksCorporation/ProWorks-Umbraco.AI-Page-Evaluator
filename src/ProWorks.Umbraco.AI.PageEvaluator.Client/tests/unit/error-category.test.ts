/**
 * localizationKeyForError precedence (contracts/error-responses.md "Client mapping"):
 * gateway/network `type` first, then the server's `category`, then the fallback key.
 */
import { describe, it, expect } from 'vitest';
import { localizationKeyForError } from '../../src/shared/error-category.js';

const FALLBACK = 'evaluatePage_aiErrorMessage';

describe('localizationKeyForError', () => {
  it('maps GatewayTimeout ahead of any category', () => {
    expect(localizationKeyForError({ type: 'GatewayTimeout', category: 'connectivity' }, FALLBACK)).toBe(
      'evaluatePage_gatewayTimeoutMessage',
    );
  });

  it('maps GatewayUnreachable to its own key', () => {
    expect(localizationKeyForError({ type: 'GatewayUnreachable', category: null }, FALLBACK)).toBe(
      'evaluatePage_gatewayUnreachableMessage',
    );
  });

  it('maps NetworkError to the connectivity message', () => {
    expect(localizationKeyForError({ type: 'NetworkError', category: null }, FALLBACK)).toBe(
      'evaluatePage_connectivityMessage',
    );
  });

  it.each([
    ['temporaryRetryable', 'evaluatePage_temporaryRetryableMessage'],
    ['connectivity', 'evaluatePage_connectivityMessage'],
    ['authenticationConfiguration', 'evaluatePage_authenticationConfigurationMessage'],
    ['cultureNotCreated', 'evaluatePage_cultureNotCreatedMessage'],
    ['invalidCulture', 'evaluatePage_invalidCultureMessage'],
  ])('maps category %s to %s', (category, key) => {
    expect(localizationKeyForError({ type: 'Error', category }, FALLBACK)).toBe(key);
  });

  it('falls back for unknown or missing values', () => {
    expect(localizationKeyForError({ type: 'Error', category: 'somethingNew' }, FALLBACK)).toBe(FALLBACK);
    expect(localizationKeyForError({ type: null, category: null }, FALLBACK)).toBe(FALLBACK);
    expect(localizationKeyForError({}, FALLBACK)).toBe(FALLBACK);
  });
});
