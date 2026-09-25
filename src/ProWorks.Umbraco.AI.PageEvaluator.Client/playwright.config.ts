/**
 * Playwright E2E configuration (runs against a live TestSite).
 *
 * Follows the umbraco-cms-backoffice-testing-skills `umbraco-e2e-testing` pattern:
 * a one-off `auth.setup.ts` project logs in with @umbraco/playwright-testhelpers and saves
 * the session to STORAGE_STATE, which every spec reuses.
 *
 * Environment:
 *   UMBRACO_URL            e.g. https://localhost:44318 (no trailing /umbraco)
 *   UMBRACO_USER_LOGIN     backoffice admin email
 *   UMBRACO_USER_PASSWORD  backoffice admin password
 *
 * Vitest never loads this file (its `include` only covers tests/unit and tests/integration),
 * and Playwright only picks up tests/e2e, so the two runners don't collide.
 */
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

export const STORAGE_STATE = join(here, 'tests/e2e/.auth/user.json');

// The testhelpers read the saved auth tokens from this path.
process.env['STORAGE_STAGE_PATH'] = STORAGE_STATE;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'line' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['UMBRACO_URL'] ?? 'https://localhost:44318',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    // Umbraco marks elements with data-mark, not data-testid.
    testIdAttribute: 'data-mark',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/*.setup.ts',
    },
    {
      name: 'e2e',
      testMatch: '**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        ignoreHTTPSErrors: true,
        storageState: STORAGE_STATE,
      },
    },
  ],
});
