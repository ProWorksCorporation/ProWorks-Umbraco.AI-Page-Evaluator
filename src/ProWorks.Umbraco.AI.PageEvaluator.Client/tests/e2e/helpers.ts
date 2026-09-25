/**
 * Shared helpers for the Page Evaluator e2e specs.
 *
 * AI-dependent endpoints are mocked with page.route() so the suite never calls a live AI
 * provider. Everything else (auth, content, the package's config/active-config endpoints,
 * the backoffice itself and its error interceptor) is the real TestSite.
 */
import type { Page, Route } from '@playwright/test';

export const API = '/umbraco/management/api/v1/page-evaluator';

/** A report shaped like the package's EvaluationReport response. */
export function mockReport(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    parseFailed: false,
    score: { passed: 1, total: 2, displayText: '1/2 checks passed' },
    checks: [
      { checkNumber: 1, status: 'Pass', label: 'E2E: headline present', explanation: null, propertyAliases: ['heroHeadline'] },
      {
        checkNumber: 2,
        status: 'Fail',
        label: 'E2E: intro text too short',
        explanation: 'The intro needs more detail.',
        propertyAliases: ['introText'],
      },
    ],
    suggestions: 'E2E suggestion text.',
    rawResponse: null,
    cachedAt: new Date().toISOString(),
    overallScore: null,
    axisScores: null,
    propertyEditorAliases: { heroHeadline: 'Umbraco.TextBox', introText: 'Umbraco.RichText' },
    propertyNames: { heroHeadline: 'Hero Headline', introText: 'Intro Text' },
    recommendationsEnabled: true,
    additionalRecommendableEditorAliases: [],
    samplingSettingsIgnored: false,
    culture: null,
    ...overrides,
  };
}

function json(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** No cached result: the modal falls through to POST /evaluate. */
export async function mockNoCachedEvaluation(page: Page): Promise<void> {
  await page.route(`**${API}/evaluate/cached/**`, (route) =>
    json(route, 404, { type: 'Error', title: 'No cached evaluation', status: 404 }),
  );
}

export async function mockCachedEvaluation(page: Page, report: Record<string, unknown>): Promise<void> {
  await page.route(`**${API}/evaluate/cached/**`, (route) => json(route, 200, report));
}

/** POST /evaluate returns `body` with `status`; records each request body in `sent`. */
export async function mockEvaluate(
  page: Page,
  status: number,
  body: unknown,
  sent: unknown[] = [],
): Promise<void> {
  await page.route(`**${API}/evaluate`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    sent.push(route.request().postDataJSON());
    return json(route, status, body);
  });
}

export async function mockRecommend(page: Page, recommendedValues: Record<string, string | null>): Promise<void> {
  await page.route(`**${API}/recommend`, (route) => json(route, 200, { recommendedValues }));
}

export async function mockSamplingSupport(page: Page, temperatureSupported: boolean): Promise<void> {
  await page.route(`**${API}/profiles/*/sampling-support`, (route) => json(route, 200, { temperatureSupported }));
}
