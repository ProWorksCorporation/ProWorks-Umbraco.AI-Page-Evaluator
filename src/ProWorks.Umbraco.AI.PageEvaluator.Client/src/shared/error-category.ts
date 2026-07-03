/**
 * Maps the `category` field returned by the /evaluate and /recommend error contracts
 * (see specs/004-upgrade-umbraco-ai-uui/contracts/evaluate-recommend-error-responses.md)
 * to a localization key. Falls back to the caller-supplied default key for `null`/unrecognized
 * categories (404/422/generic-500 responses never carry a `category`).
 */
const CATEGORY_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  temporaryRetryable: 'evaluatePage_temporaryRetryableMessage',
  connectivity: 'evaluatePage_connectivityMessage',
  authenticationConfiguration: 'evaluatePage_authenticationConfigurationMessage',
};

export function localizationKeyForErrorCategory(category: string | null | undefined, fallbackKey: string): string {
  return (category && CATEGORY_MESSAGE_KEYS[category]) ?? fallbackKey;
}
