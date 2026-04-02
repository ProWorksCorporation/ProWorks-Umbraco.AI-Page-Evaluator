/**
 * T030 — Playwright E2E test for the full evaluate-page flow.
 *
 * Prerequisites (must be true for this test to pass):
 * 1. A local Umbraco v17 instance is running at UMBRACO_URL.
 * 2. The ProWorks AI Page Evaluator package is installed and the dist bundle is built.
 * 3. An evaluator configuration exists for the "blogPost" document type.
 * 4. At least one Blog Post content node exists in the CMS.
 * 5. Umbraco.AI is configured with a working AI connection (real or mocked).
 *
 * RED STATE: This test will fail until T031-T039 implement the full US1 feature.
 */
import { test, expect } from '@playwright/test';

const UMBRACO_URL = process.env['UMBRACO_URL'] ?? 'http://localhost:5000';
const UMBRACO_USERNAME = process.env['UMBRACO_USERNAME'] ?? 'admin@example.com';
const UMBRACO_PASSWORD = process.env['UMBRACO_PASSWORD'] ?? 'adminPassword123!';

test.describe('US1 — Content Editor Evaluates a Page', () => {
  test.beforeEach(async ({ page }) => {
    // Log into the Umbraco back-office
    await page.goto(`${UMBRACO_URL}/umbraco`);
    await page.getByLabel('Email').fill(UMBRACO_USERNAME);
    await page.getByLabel('Password').fill(UMBRACO_PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('main')).toBeVisible({ timeout: 15000 });
  });

  test('Evaluate Page button is visible on a blog post with an active evaluator', async ({ page }) => {
    // Navigate to the Content section
    await page.getByRole('link', { name: /content/i }).click();

    // Open a Blog Post node (assumes at least one exists)
    await page.getByRole('treeitem', { name: /blog post/i }).first().click();

    // The workspace action button should be visible
    const evaluateButton = page.getByRole('button', { name: /evaluate page/i });
    await expect(evaluateButton).toBeVisible({ timeout: 5000 });
  });

  test('Evaluate Page button is NOT visible on a document type without an evaluator', async ({ page }) => {
    // Navigate to a node of a type that has no evaluator configured
    await page.getByRole('link', { name: /content/i }).click();
    await page.getByRole('treeitem', { name: /home/i }).first().click();

    // The evaluate button must NOT appear
    const evaluateButton = page.getByRole('button', { name: /evaluate page/i });
    await expect(evaluateButton).not.toBeVisible({ timeout: 3000 });
  });

  test('Opens evaluation modal when Evaluate Page is clicked', async ({ page }) => {
    await page.getByRole('link', { name: /content/i }).click();
    await page.getByRole('treeitem', { name: /blog post/i }).first().click();

    await page.getByRole('button', { name: /evaluate page/i }).click();

    // Slide-in dialog (sidebar modal) should appear
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test('Shows progress messages while evaluation is running', async ({ page }) => {
    await page.getByRole('link', { name: /content/i }).click();
    await page.getByRole('treeitem', { name: /blog post/i }).first().click();
    await page.getByRole('button', { name: /evaluate page/i }).click();

    // Progress messages should appear while waiting for AI
    const progressMessage = page.getByText(/sending page data|waiting for ai response/i);
    await expect(progressMessage).toBeVisible({ timeout: 5000 });
  });

  test('Renders structured evaluation report within 30 seconds', async ({ page }) => {
    await page.getByRole('link', { name: /content/i }).click();
    await page.getByRole('treeitem', { name: /blog post/i }).first().click();
    await page.getByRole('button', { name: /evaluate page/i }).click();

    // The structured report element must become visible within 30 seconds (FR-004, FR-013)
    const reportElement = page.locator('page-evaluator-report');
    await expect(reportElement).toBeVisible({ timeout: 30000 });
  });

  test('Report contains score, passing items, and attention items sections', async ({ page }) => {
    await page.getByRole('link', { name: /content/i }).click();
    await page.getByRole('treeitem', { name: /blog post/i }).first().click();
    await page.getByRole('button', { name: /evaluate page/i }).click();

    const reportElement = page.locator('page-evaluator-report');
    await expect(reportElement).toBeVisible({ timeout: 30000 });

    // Score section
    await expect(page.getByText(/\d+\/\d+ checks passed/i)).toBeVisible();

    // At least one of passing or attention sections
    const hasPassing = await page.getByText(/passing items/i).isVisible().catch(() => false);
    const hasAttention = await page.getByText(/attention/i).isVisible().catch(() => false);
    expect(hasPassing || hasAttention).toBe(true);
  });

  test('Shows parse-failed warning when AI returns unstructured response', async ({ page }) => {
    // This test requires a misconfigured evaluator that causes parse failure.
    // Skip if not applicable in current test environment.
    test.skip(true, 'Requires a specifically misconfigured evaluator for parse-fail scenario.');
  });

  test('Shows retry button on 502 AI provider error', async ({ page }) => {
    // This test requires the AI provider to be misconfigured or unavailable.
    test.skip(true, 'Requires AI provider to return a 502 error.');
  });
});
