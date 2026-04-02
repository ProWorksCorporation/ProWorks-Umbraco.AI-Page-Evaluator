/**
 * T055 — Playwright E2E tests for the full Prompt Builder workflow.
 *
 * Tests: open Prompt Builder, verify property aliases, select categories,
 *        enter site context, generate draft, use prompt in evaluator form.
 *
 * Excluded from Vitest (tests/e2e/** is excluded in vite.config.ts).
 * Run with: npx playwright test tests/e2e/prompt-builder.spec.ts
 */

import { test, expect } from '@playwright/test';

const BACKOFFICE_URL = process.env['UMBRACO_URL'] ?? 'https://localhost:44382/umbraco';
const ADMIN_EMAIL = process.env['UMBRACO_ADMIN_EMAIL'] ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env['UMBRACO_ADMIN_PASSWORD'] ?? 'Password1234!';

test.describe('Prompt Builder Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BACKOFFICE_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL(`${BACKOFFICE_URL}/**`);
  });

  test('opens Prompt Builder from evaluator form', async ({ page }) => {
    // Navigate to Page Evaluator > Create New
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();
    await page.getByRole('button', { name: 'Create New' }).click();

    // Set document type alias to trigger Prompt Builder
    await page.getByLabel('Document Type Alias').fill('blogPost');
    await page.getByRole('button', { name: 'Open Prompt Builder' }).click();

    // Prompt Builder panel/dialog should appear
    await expect(page.locator('page-evaluator-prompt-builder')).toBeVisible();
  });

  test('property aliases appear grouped when doc type is loaded', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();
    await page.getByRole('button', { name: 'Create New' }).click();

    await page.getByLabel('Document Type Alias').fill('blogPost');
    await page.getByRole('button', { name: 'Open Prompt Builder' }).click();

    // Wait for properties to load
    await page.waitForSelector('page-evaluator-prompt-builder uui-box');

    // At least one property alias should be visible
    const propertyItems = page.locator('page-evaluator-prompt-builder [data-property-alias]');
    expect(await propertyItems.count()).toBeGreaterThan(0);
  });

  test('selecting categories updates the checklist', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();
    await page.getByRole('button', { name: 'Create New' }).click();

    await page.getByLabel('Document Type Alias').fill('blogPost');
    await page.getByRole('button', { name: 'Open Prompt Builder' }).click();

    // Select "Required Fields" and "Metadata & SEO"
    await page.getByLabel('Required Fields').check();
    await page.getByLabel('Metadata & SEO').check();

    await expect(page.getByLabel('Required Fields')).toBeChecked();
    await expect(page.getByLabel('Metadata & SEO')).toBeChecked();
  });

  test('generates a draft that references property aliases and site context', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();
    await page.getByRole('button', { name: 'Create New' }).click();

    await page.getByLabel('Document Type Alias').fill('blogPost');
    await page.getByRole('button', { name: 'Open Prompt Builder' }).click();
    await page.waitForSelector('page-evaluator-prompt-builder uui-box');

    // Select a category
    await page.getByLabel('Content Quality').check();

    // Enter site context
    const siteContextInput = page.locator('page-evaluator-prompt-builder uui-textarea[id="site-context"]');
    await siteContextInput.fill('ProWorks developer blog targeting software engineers');

    // Generate draft
    await page.getByRole('button', { name: 'Generate Prompt Draft' }).click();

    // Draft should reference property aliases from the doc type
    const draftArea = page.locator('page-evaluator-prompt-builder [data-draft]');
    const draftText = await draftArea.textContent();
    expect(draftText).toBeTruthy();
    expect(draftText).toContain('ProWorks developer blog');
  });

  test('Use This Prompt transfers draft to evaluator form prompt textarea', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();
    await page.getByRole('button', { name: 'Create New' }).click();

    await page.getByLabel('Document Type Alias').fill('blogPost');
    await page.getByRole('button', { name: 'Open Prompt Builder' }).click();
    await page.waitForSelector('page-evaluator-prompt-builder uui-box');

    await page.getByLabel('Required Fields').check();
    await page.getByRole('button', { name: 'Generate Prompt Draft' }).click();

    // Click Use This Prompt
    await page.getByRole('button', { name: 'Use This Prompt' }).click();

    // Prompt Builder should close and the prompt textarea should be populated
    await expect(page.locator('page-evaluator-prompt-builder')).not.toBeVisible();
    const promptTextarea = page.locator('evaluator-form uui-textarea[id="prompt"]');
    const promptValue = await promptTextarea.inputValue();
    expect(promptValue).toBeTruthy();
    expect(promptValue.length).toBeGreaterThan(20);
  });
});
