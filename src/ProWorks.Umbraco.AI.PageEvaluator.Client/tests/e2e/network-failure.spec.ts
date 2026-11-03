/**
 * E2E: network loss (005-upgrade-cms-17-8-ai-17-6 US3 / FR-010, contracts/client-network-errors.md).
 *
 * On CMS 17.8 the regenerated umbHttpClient resolves `{ response: undefined }` for a fetch failure instead
 * of rejecting. The package must still show its translated messages and never raw text such as
 * "TypeError" or "Failed to fetch". The network drop is simulated by aborting the package's request with
 * `internetdisconnected` (the same failure the browser reports when it goes offline), so the rest of the
 * backoffice keeps working. Read-only: nothing is saved.
 */
import { expect } from '@playwright/test';
import { ConstantHelper, test } from '@umbraco-cms/acceptance-test-helpers';
import { API, mockNoCachedEvaluation } from './helpers';

const RAW_ERROR_TEXT = /TypeError|Failed to fetch|API 0/;

test.describe('Network failure', () => {
  test('a dropped evaluation request shows the localized connectivity message', async ({ umbracoUi }) => {
    await mockNoCachedEvaluation(umbracoUi.page);
    await umbracoUi.page.route(`**${API}/evaluate`, (route) =>
      route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.fallback(),
    );

    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content, false);
    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

    await expect(umbracoUi.page.getByRole('alert').filter({ hasText: /could not reach the ai provider/i })).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByText(RAW_ERROR_TEXT)).toHaveCount(0);
  });

  test('a dropped cached-result request falls through to a fresh evaluation, which also fails cleanly', async ({ umbracoUi }) => {
    await umbracoUi.page.route(`**${API}/evaluate/cached/**`, (route) => route.abort('internetdisconnected'));
    await umbracoUi.page.route(`**${API}/evaluate`, (route) =>
      route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.fallback(),
    );

    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection(ConstantHelper.sections.content, false);
    await umbracoUi.content.goToContentWithName('Home');
    await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();

    await expect(umbracoUi.page.getByRole('alert').filter({ hasText: /could not reach the ai provider/i })).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByText(RAW_ERROR_TEXT)).toHaveCount(0);
  });

  test('a dropped configuration save shows the localized connectivity message', async ({ umbracoUi }) => {
    await umbracoUi.page.route(`**${API}/configurations/*`, (route) =>
      route.request().method() === 'PUT' ? route.abort('internetdisconnected') : route.fallback(),
    );

    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection('AI', false);
    await umbracoUi.page.getByRole('link', { name: 'Page Evaluator' }).click();
    await umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ }).getByRole('button', { name: 'Edit' }).click();
    await expect(umbracoUi.page.getByRole('textbox', { name: 'Name' })).toHaveValue('Home Page Scoring Test', { timeout: 15000 });
    await umbracoUi.page.getByRole('button', { name: 'Save' }).click();

    await expect(umbracoUi.page.getByText(/could not reach the ai provider|check your connection/i).first()).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByText(RAW_ERROR_TEXT)).toHaveCount(0);
  });
});
