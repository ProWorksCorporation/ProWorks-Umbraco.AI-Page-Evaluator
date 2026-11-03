/**
 * Logs in once with @umbraco-cms/acceptance-test-helpers and saves the session for all specs
 * (see playwright.config.ts). Pattern from CMS 17.8's own acceptance tests (`tests/auth.setup.ts`).
 *
 * Use a dedicated automation user: with `AllowConcurrentLogins: false` every login signs that user
 * out elsewhere.
 */
import { expect, test as setup } from '@playwright/test';
import { UiHelpers } from '@umbraco-cms/acceptance-test-helpers';
import { BASE_URL, STORAGE_STATE } from '../../playwright.config';

setup('authenticate', async ({ page }) => {
  const login = process.env['UMBRACO_USER_LOGIN'];
  const password = process.env['UMBRACO_USER_PASSWORD'];
  if (!login || !password) {
    throw new Error('Set UMBRACO_USER_LOGIN and UMBRACO_USER_PASSWORD before running the e2e suite.');
  }

  const umbracoUi = new UiHelpers(page);
  await umbracoUi.goToBackOffice();
  // The helpers build absolute URLs from process.env.URL (default :44339) — fail fast on a wrong host.
  expect(new URL(page.url()).origin, 'set URL (or UMBRACO_URL) to the TestSite origin').toBe(new URL(BASE_URL ?? '').origin);
  await umbracoUi.login.enterEmail(login);
  await umbracoUi.login.enterPassword(password);
  await umbracoUi.login.clickLoginButtonAndWaitForBackOffice();
  await page.context().storageState({ path: STORAGE_STATE });
});
