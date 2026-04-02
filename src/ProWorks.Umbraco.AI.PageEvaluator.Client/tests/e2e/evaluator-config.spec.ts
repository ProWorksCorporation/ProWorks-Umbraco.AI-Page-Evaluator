/**
 * T045 — Playwright E2E tests for the evaluator configuration workflow.
 *
 * Tests: create evaluator, verify Active badge, edit, delete, verify button absent.
 *
 * These tests require a running Umbraco v17 instance with Umbraco.AI configured.
 * They are excluded from the Vitest test run (vite.config.ts excludes tests/e2e/**).
 * Run with: npx playwright test tests/e2e/evaluator-config.spec.ts
 */

import { test, expect } from '@playwright/test';

const BACKOFFICE_URL = process.env['UMBRACO_URL'] ?? 'https://localhost:44382/umbraco';
const ADMIN_EMAIL = process.env['UMBRACO_ADMIN_EMAIL'] ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env['UMBRACO_ADMIN_PASSWORD'] ?? 'Password1234!';

test.describe('Evaluator Configuration Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BACKOFFICE_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL(`${BACKOFFICE_URL}/**`);
  });

  test('can create a new evaluator configuration', async ({ page }) => {
    // Navigate to Addons > Page Evaluator
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();

    // Click Create New
    await page.getByRole('button', { name: 'Create New' }).click();

    // Fill in the form
    await page.getByLabel('Name').fill('Blog Post Evaluator E2E');
    await page.getByLabel('Document Type').fill('blogPost');
    // Profile picker — select first available Chat profile
    await page.locator('uai-profile-picker').click();
    await page.getByRole('option').first().click();
    await page.getByLabel('Prompt').fill('Evaluate this blog post for content quality.');

    // Save
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify config appears in list with Active badge
    await expect(page.getByText('Blog Post Evaluator E2E')).toBeVisible();
    await expect(page.locator('uui-badge', { hasText: 'Active' }).first()).toBeVisible();
  });

  test('active badge appears on most recently saved config for a doc type', async ({ page }) => {
    // Navigate to Page Evaluator config list
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();

    // Find the blogPost group
    const blogGroup = page.locator('[data-doc-type="blogPost"]');
    await expect(blogGroup.locator('uui-badge', { hasText: 'Active' })).toBeVisible();
  });

  test('can edit an existing evaluator configuration', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();

    // Click edit on the first config
    await page.getByRole('button', { name: 'Edit' }).first().click();

    // Update the name
    const nameInput = page.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill('Blog Post Evaluator E2E (Edited)');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('Blog Post Evaluator E2E (Edited)')).toBeVisible();
  });

  test('can delete a configuration and Evaluate Page button disappears', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Addons' }).click();
    await page.getByRole('menuitem', { name: 'Page Evaluator' }).click();

    // Delete the Blog Post evaluator
    await page.getByRole('button', { name: 'Delete' }).first().click();

    // Confirm deletion dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText('Blog Post Evaluator E2E')).not.toBeVisible();

    // Navigate to a blog post content node and verify button is absent
    await page.getByRole('menuitem', { name: 'Content' }).click();
    await page.getByRole('treeitem', { name: /blog/i }).first().click();

    await expect(page.getByRole('button', { name: 'Evaluate Page' })).not.toBeVisible();
  });
});
