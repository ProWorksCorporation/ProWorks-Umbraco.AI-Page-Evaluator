/**
 * E2E: evaluating a page from the document workspace (US1, US2, US3, US4 of
 * specs/003-upgrade-umbraco-17-6), against the running TestSite.
 *
 * Prerequisites: the TestSite's synced content — a "Home" page (document type `home`, which has an
 * active evaluator config and a rich-text `introText`) and "About Us" (`contentPage`, no config).
 * AI responses are mocked (see helpers.ts), so no AI provider is called.
 *
 * Rewritten in 003 onto @umbraco/playwright-testhelpers navigation: the original specs used
 * selectors that never matched a real backoffice.
 */
import { expect, type Page } from '@playwright/test';
import { ConstantHelper, test } from '@umbraco/playwright-testhelpers';
import {
  mockCachedEvaluation,
  mockEvaluate,
  mockNoCachedEvaluation,
  mockRecommend,
  mockReport,
} from './helpers';

test.describe('Evaluate Page', () => {
  test.beforeEach(async ({ umbracoUi }) => {
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content, false);
  });

  test('shows the Evaluate Page action only for document types with an active evaluator', async ({ umbracoUi }) => {
    await umbracoUi.content.goToContentWithName('Home');
    await expect(umbracoUi.page.getByRole('button', { name: 'Evaluate Page' })).toBeVisible({ timeout: 15000 });

    // About Us is a child of Home in the TestSite tree.
    await umbracoUi.content.openContentCaretButtonForName('Home');
    await umbracoUi.content.goToContentWithName('About Us');
    await expect(umbracoUi.page.getByRole('textbox', { name: 'Enter a name...' })).toHaveValue('About Us', { timeout: 15000 });
    await expect(umbracoUi.page.getByRole('button', { name: 'Evaluate Page' })).toHaveCount(0);
  });

  test('shows a cached report without calling the AI', async ({ umbracoUi }) => {
    const sent: unknown[] = [];
    await mockCachedEvaluation(umbracoUi.page, mockReport());
    await mockEvaluate(umbracoUi.page, 200, mockReport(), sent);

    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

    await expect(umbracoUi.page.locator('page-evaluator-report')).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByText('E2E: intro text too short')).toBeVisible();
    expect(sent).toHaveLength(0);
  });

  test('runs a fresh evaluation when nothing is cached and sends the invariant culture', async ({ umbracoUi }) => {
    const sent: unknown[] = [];
    await mockNoCachedEvaluation(umbracoUi.page);
    await mockEvaluate(umbracoUi.page, 200, mockReport(), sent);

    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

    await expect(umbracoUi.page.getByText('E2E: headline present')).toBeVisible({ timeout: 15000 });
    expect(sent).toHaveLength(1);
    expect((sent[0] as { culture: unknown }).culture).toBeNull();
  });

  test('shows the localized gateway-timeout message for a 504 from a proxy', async ({ umbracoUi }) => {
    await mockNoCachedEvaluation(umbracoUi.page);
    // The backoffice interceptor rewrites 504 to type GatewayTimeout whatever the body says.
    await mockEvaluate(umbracoUi.page, 504, '<html>Gateway Timeout</html>');

    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

    await expect(umbracoUi.page.getByText(/took longer than your network gateway allows/i)).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByText(/fatal server error/i)).toHaveCount(0);
  });

  test('shows the retryable message for a temporarily unavailable provider (incl. Cancelled)', async ({ umbracoUi }) => {
    await mockNoCachedEvaluation(umbracoUi.page);
    await mockEvaluate(umbracoUi.page, 503, {
      type: 'Error',
      title: 'The AI provider is temporarily unavailable.',
      status: 503,
      category: 'temporaryRetryable',
    });

    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

    await expect(umbracoUi.page.getByText(/temporarily unavailable/i).first()).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('shows the variability notice on a report produced by a model that ignores temperature', async ({ umbracoUi }) => {
    await mockCachedEvaluation(umbracoUi.page, mockReport({ samplingSettingsIgnored: true }));

    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

    await expect(umbracoUi.page.getByRole('status').filter({ hasText: /scores may vary/i })).toBeVisible({ timeout: 15000 });
  });

  test('applies a rich-text recommendation into the editor', async ({ umbracoUi }) => {
    await mockCachedEvaluation(umbracoUi.page, mockReport());
    await mockRecommend(umbracoUi.page, { introText: '<p>E2E applied intro paragraph.</p>' });

    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();
    await umbracoUi.page.getByRole('button', { name: /generate recommendation/i }).first().click();
    await umbracoUi.page.getByRole('button', { name: 'Apply' }).click();

    await expect(umbracoUi.page.getByText(/applied/i).first()).toBeVisible({ timeout: 15000 });
    await umbracoUi.page.getByRole('button', { name: 'Close' }).click();
    await expect(
      umbracoUi.page.getByTestId('input:tiptap-rte').getByText('E2E applied intro paragraph.'),
    ).toBeVisible({ timeout: 15000 });
  });

  test.describe('on a multilingual page', () => {
    // "ProWorks AI Page Evaluator" (landingPage, varies by culture). Its Danish introText embeds one
    // testBlock; the English intro has none (tasks T003, validation.md).
    const TEST_PAGE = '3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7';
    const DA_BLOCK = '<umb-rte-block data-content-key="d3a0c1e2-5b7f-4c1a-9e2d-7f003da00001"><!--Umbraco-Block--></umb-rte-block>';

    async function openVariant(umbracoUi: { page: Page }, culture: string): Promise<void> {
      await umbracoUi.page.goto(`/umbraco/section/content/workspace/document/edit/${TEST_PAGE}/${culture}`);
      await expect(umbracoUi.page.getByRole('button', { name: 'Evaluate Page' })).toBeVisible({ timeout: 15000 });
    }

    for (const [culture, expectedTitle] of [
      ['da-DK', 'Stop med at udgive sider'],
      ['en-US', 'Stop Publishing Pages'],
    ] as const) {
      test(`evaluates the ${culture} variant with that language's values`, async ({ umbracoUi }) => {
        const cachedUrls: string[] = [];
        umbracoUi.page.on('request', (r) => {
          if (r.url().includes('/page-evaluator/evaluate/cached/')) cachedUrls.push(r.url());
        });
        const sent: unknown[] = [];
        await mockNoCachedEvaluation(umbracoUi.page);
        await mockEvaluate(umbracoUi.page, 200, mockReport({ culture }), sent);

        await openVariant(umbracoUi, culture);
        await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

        await expect(umbracoUi.page.getByText('E2E: intro text too short')).toBeVisible({ timeout: 15000 });
        expect(cachedUrls.some((u) => u.includes(`culture=${culture}`))).toBe(true);
        expect(sent).toHaveLength(1);
        const body = sent[0] as { culture: string; properties: Record<string, unknown> };
        expect(body.culture).toBe(culture);
        expect(String(body.properties['pageTitle'])).toContain(expectedTitle);
        // Invariant properties are still sent alongside the culture's own values.
        expect(body.properties).toHaveProperty('headerImage');
      });
    }

    test('withholds rich-text Apply when the recommendation drops an embedded block', async ({ umbracoUi }) => {
      await mockCachedEvaluation(umbracoUi.page, mockReport({ culture: 'da-DK' }));
      await mockRecommend(umbracoUi.page, { introText: '<p>Ingen blokke her.</p>' });

      await openVariant(umbracoUi, 'da-DK');
      await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();
      await umbracoUi.page.getByRole('button', { name: /generate recommendation/i }).first().click();

      await expect(umbracoUi.page.getByText(/would remove embedded content/i)).toBeVisible({ timeout: 15000 });
      await expect(umbracoUi.page.getByRole('button', { name: 'Apply' })).toHaveCount(0);
      await expect(umbracoUi.page.getByRole('button', { name: /copy/i }).first()).toBeVisible();
    });

    test('offers rich-text Apply when the recommendation keeps the embedded block', async ({ umbracoUi }) => {
      await mockCachedEvaluation(umbracoUi.page, mockReport({ culture: 'da-DK' }));
      await mockRecommend(umbracoUi.page, { introText: `<p>Ny indledning.</p>${DA_BLOCK}` });

      await openVariant(umbracoUi, 'da-DK');
      await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();
      await umbracoUi.page.getByRole('button', { name: /generate recommendation/i }).first().click();

      await expect(umbracoUi.page.getByRole('button', { name: 'Apply' })).toBeVisible({ timeout: 15000 });
      await expect(umbracoUi.page.getByText(/would remove embedded content/i)).toHaveCount(0);
    });
  });
});
