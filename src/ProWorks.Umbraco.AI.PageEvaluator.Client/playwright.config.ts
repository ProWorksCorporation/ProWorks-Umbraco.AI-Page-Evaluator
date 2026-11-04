/**
 * Playwright E2E configuration (runs against a live TestSite).
 *
 * Follows the umbraco-cms-backoffice-testing-skills `umbraco-e2e-testing` pattern:
 * a one-off `auth.setup.ts` project logs in with @umbraco-cms/acceptance-test-helpers (the helpers CMS's
 * own acceptance tests use since 17.6.2; replaces the deprecated @umbraco/playwright-testhelpers and
 * @umbraco/json-models-builders, 005 FR-023) and saves the session to STORAGE_STATE, which every spec reuses.
 *
 * Environment:
 *   URL                    TestSite origin, e.g. https://localhost:44318 (no trailing /umbraco). The helpers
 *                          build absolute URLs from it and default to https://localhost:44339 when unset, so
 *                          it falls back to UMBRACO_URL, then to the TestSite's port, below.
 *   UMBRACO_URL            accepted as an alias for URL (older docs/scripts)
 *   UMBRACO_USER_LOGIN     backoffice user email — use a dedicated automation user (AllowConcurrentLogins: false)
 *   UMBRACO_USER_PASSWORD  backoffice user password
 *
 * Vitest never loads this file (its `include` only covers tests/unit and tests/integration),
 * and Playwright only picks up tests/e2e, so the two runners don't collide.
 */
import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

export const STORAGE_STATE = join(here, 'tests/e2e/.auth/user.json');

// The acceptance-test helpers read the saved session from this path (the old package misspelled it
// STORAGE_STAGE_PATH). Set before any spec imports the helpers: their config is read at module load.
process.env['STORAGE_STATE_PATH'] = STORAGE_STATE;
process.env['URL'] ??= process.env['UMBRACO_URL'] ?? 'https://localhost:44318';
export const BASE_URL = process.env['URL'];

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
    baseURL: BASE_URL,
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
