/**
 * E2E: the Prompt Builder inside the evaluator configuration form.
 * Read-only against the TestSite's "Home Page Scoring Test" configuration.
 */
import { expect } from '@playwright/test';
import { test } from '@umbraco/playwright-testhelpers';

test.describe('Prompt Builder', () => {
  test.beforeEach(async ({ umbracoUi }) => {
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection('AI', false);
    await umbracoUi.page.getByRole('link', { name: 'Page Evaluator' }).click();
    await umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ }).getByRole('button', { name: 'Edit' }).click();
  });

  test('generates a draft that references the document type properties', async ({ umbracoUi }) => {
    await umbracoUi.page.getByRole('button', { name: 'Open Prompt Builder' }).click();

    const builder = umbracoUi.page.locator('page-evaluator-prompt-builder');
    // UUI 2 checkboxes keep the native input visually hidden, so assert state rather than visibility.
    await expect(builder.getByRole('checkbox', { name: 'Required Fields' })).toBeChecked({ timeout: 15000 });
    await builder.getByRole('button', { name: 'Generate Prompt Draft' }).click();

    const draft = builder.locator('pre[data-draft]');
    await expect(draft).toContainText('heroHeadline');
    await expect(builder.getByRole('button', { name: 'Use This Prompt' }).first()).toBeVisible();
  });
});
