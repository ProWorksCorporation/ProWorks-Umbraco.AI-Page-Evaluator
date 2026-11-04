/**
 * E2E: the Page Evaluator configuration workspace (AI section → Add-ons → Page Evaluator).
 *
 * Uses the TestSite's existing configurations ("Home Page Scoring Test" for `home`,
 * "Blog Post Checker" for `blogPost`). Read-only: nothing is created, saved or deleted.
 * The sampling-support endpoint is mocked to exercise both notice states (US3 / FR-015a), and the
 * system-prompt endpoint likewise for the profile system-prompt notice (005 FR-012).
 */
import { expect } from '@playwright/test';
import { test } from '@umbraco-cms/acceptance-test-helpers';
import { mockProfileSystemPrompt, mockSamplingSupport } from './helpers';

test.describe('Evaluator configuration workspace', () => {
  test.beforeEach(async ({ umbracoUi }) => {
    await umbracoUi.goToBackOffice();
    await umbracoUi.content.goToSection('AI', false);
    await umbracoUi.page.getByRole('link', { name: 'Page Evaluator' }).click();
  });

  test('lists configurations grouped by document type with their status', async ({ umbracoUi }) => {
    await expect(umbracoUi.page.getByRole('heading', { name: 'Page Evaluator Configurations' })).toBeVisible({ timeout: 15000 });
    const homeRow = umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ });
    await expect(homeRow).toBeVisible();
    await expect(homeRow.getByText('Active')).toBeVisible();
    await expect(homeRow.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(homeRow.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('opens an existing configuration in the form', async ({ umbracoUi }) => {
    await umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ }).getByRole('button', { name: 'Edit' }).click();

    await expect(umbracoUi.page.getByRole('textbox', { name: 'Name' })).toHaveValue('Home Page Scoring Test', { timeout: 15000 });
    await expect(umbracoUi.page.getByRole('textbox', { name: 'Evaluation Prompt' })).not.toBeEmpty();
    await expect(umbracoUi.page.getByRole('button', { name: 'Back to list' })).toBeVisible();
  });

  test('shows the "scores may vary" notice when the profile model ignores temperature', async ({ umbracoUi }) => {
    await mockSamplingSupport(umbracoUi.page, false);

    await umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ }).getByRole('button', { name: 'Edit' }).click();

    await expect(umbracoUi.page.getByRole('status').filter({ hasText: /scores may vary/i })).toBeVisible({ timeout: 15000 });
  });

  test('does not show the notice when the profile model honours temperature', async ({ umbracoUi }) => {
    await mockSamplingSupport(umbracoUi.page, true);

    await umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ }).getByRole('button', { name: 'Edit' }).click();

    await expect(umbracoUi.page.getByRole('textbox', { name: 'Name' })).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByRole('status').filter({ hasText: /scores may vary/i })).toHaveCount(0);
  });

  // 005 FR-012: Umbraco.AI 17.5+ sends a profile's own system prompt ahead of the evaluator's instructions.
  test('warns when the selected profile has its own system prompt', async ({ umbracoUi }) => {
    await mockProfileSystemPrompt(umbracoUi.page, true);

    await umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ }).getByRole('button', { name: 'Edit' }).click();

    await expect(umbracoUi.page.getByRole('status').filter({ hasText: /its own system prompt/i })).toBeVisible({ timeout: 15000 });
  });

  test('does not warn when the selected profile has no system prompt', async ({ umbracoUi }) => {
    await mockProfileSystemPrompt(umbracoUi.page, false);

    await umbracoUi.page.getByRole('row', { name: /Home Page Scoring Test/ }).getByRole('button', { name: 'Edit' }).click();

    await expect(umbracoUi.page.getByRole('textbox', { name: 'Name' })).toBeVisible({ timeout: 15000 });
    await expect(umbracoUi.page.getByRole('status').filter({ hasText: /its own system prompt/i })).toHaveCount(0);
  });
});
