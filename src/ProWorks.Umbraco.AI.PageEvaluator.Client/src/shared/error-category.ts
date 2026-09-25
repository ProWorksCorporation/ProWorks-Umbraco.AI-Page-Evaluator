/**
 * Maps an API error to a localization key (specs/003-upgrade-umbraco-17-6/contracts/error-responses.md).
 *
 * Precedence:
 *  1. `type` — set by the CMS 17.6 backoffice interceptor for gateway failures
 *     (`GatewayTimeout`, `GatewayUnreachable`), or by our api-client for fetch-level failures
 *     (`NetworkError`). These arrive without a usable `category`.
 *  2. `category` — the discriminator our /evaluate and /recommend error bodies carry.
 *  3. the caller-supplied fallback key (404/422/generic-500 responses carry no category).
 */
const TYPE_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  GatewayTimeout: 'evaluatePage_gatewayTimeoutMessage',
  GatewayUnreachable: 'evaluatePage_gatewayUnreachableMessage',
  NetworkError: 'evaluatePage_connectivityMessage',
};

const CATEGORY_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  temporaryRetryable: 'evaluatePage_temporaryRetryableMessage',
  connectivity: 'evaluatePage_connectivityMessage',
  authenticationConfiguration: 'evaluatePage_authenticationConfigurationMessage',
  cultureNotCreated: 'evaluatePage_cultureNotCreatedMessage',
  invalidCulture: 'evaluatePage_invalidCultureMessage',
};

/** The error shape `localizationKeyForError` reads — satisfied by `ApiError` and by recommendation error state. */
export interface ErrorKeySource {
  readonly type?: string | null;
  readonly category?: string | null;
}

/** Types whose server/interceptor `title`/`detail` is English-only and must not be shown to editors. */
const TYPES_WITHOUT_DETAIL: ReadonlySet<string> = new Set(Object.keys(TYPE_MESSAGE_KEYS));

export function localizationKeyForError(err: ErrorKeySource, fallbackKey: string): string {
  const byType = err.type ? TYPE_MESSAGE_KEYS[err.type] : undefined;
  if (byType) return byType;
  const byCategory = err.category ? CATEGORY_MESSAGE_KEYS[err.category] : undefined;
  return byCategory ?? fallbackKey;
}

/** True when the error's own `title`/`detail` text should be hidden (gateway and network failures). */
export function shouldHideErrorDetail(err: ErrorKeySource): boolean {
  return !!err.type && TYPES_WITHOUT_DETAIL.has(err.type);
}

/** @deprecated Use `localizationKeyForError`; kept for callers that only have a category. */
export function localizationKeyForErrorCategory(category: string | null | undefined, fallbackKey: string): string {
  return localizationKeyForError({ category: category ?? null }, fallbackKey);
}
