/**
 * Logs in once with @umbraco/playwright-testhelpers and saves the session for all specs
 * (see playwright.config.ts). Pattern from the umbraco-e2e-testing skill.
 */
import { test as setup } from '@playwright/test';
import { ConstantHelper, UiHelpers } from '@umbraco/playwright-testhelpers';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate', async ({ page }) => {
  const login = process.env['UMBRACO_USER_LOGIN'];
  const password = process.env['UMBRACO_USER_PASSWORD'];
  if (!login || !password) {
    throw new Error('Set UMBRACO_USER_LOGIN and UMBRACO_USER_PASSWORD before running the e2e suite.');
  }

  const umbracoUi = new UiHelpers(page);
  await umbracoUi.goToBackOffice();
  await umbracoUi.login.enterEmail(login);
  await umbracoUi.login.enterPassword(password);
  await umbracoUi.login.clickLoginButton();
  await umbracoUi.login.goToSection(ConstantHelper.sections.content);
  await page.context().storageState({ path: STORAGE_STATE });
});
