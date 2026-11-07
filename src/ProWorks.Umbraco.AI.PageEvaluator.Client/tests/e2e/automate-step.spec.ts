/**
 * E2E: the "Evaluate Page" Automate step in the backoffice step picker (006 US2, T071; contracts/automate-step.md).
 *
 * The TestSite references Umbraco Automate 17.5.1 and the Automate add-on. Automate only lets you build an automation
 * inside a workspace, and a workspace needs an API user as its service account, which the TestSite doesn't have, so
 * this spec creates both (Automate's own Management API, `/umbraco/automate/management/api/v1`, with the same
 * cookie + `Bearer [redacted]` auth as the CMS API) and deletes them in `finally`. The automation itself is never saved.
 *
 * Checks: "Evaluate Page" is listed in the "Select Action" picker under the AI group, and once added its settings
 * dialog shows the localized labels (`pageEvaluatorAutomate_*` in `src/localization/en.ts`) instead of raw
 * `#pageEvaluatorAutomate_…` keys.
 */
import { expect, type Page } from '@playwright/test';
import { test } from '@umbraco-cms/acceptance-test-helpers';
import { PageEvaluatorApi } from './page-evaluator-api';

const AUTOMATE_API = '/umbraco/automate/management/api/v1';
const WORKSPACE_ALIAS = 'zzE2ePageEvaluatorWorkspace';
const WORKSPACE_NAME = 'ZZ E2E Page Evaluator Workspace';
const API_USER_NAME = 'ZZ E2E Automate Service Account';
const API_USER_EMAIL = 'zz-e2e-automate@example.com';

interface Created {
  userId?: string;
  workspaceId?: string;
}

async function deleteLeftovers(api: PageEvaluatorApi): Promise<void> {
  const response = await api.send(() => api.helpers.get(`${api.helpers.baseUrl}${AUTOMATE_API}/workspaces`), [200]);
  const { items } = (await response.json()) as { items: { id: string; alias: string }[] };
  for (const workspace of items.filter((w) => w.alias === WORKSPACE_ALIAS)) {
    await api.send(() => api.helpers.delete(`${api.helpers.baseUrl}${AUTOMATE_API}/workspaces/${workspace.id}`), [200, 204, 404]);
  }
  await api.helpers.user.ensureNameNotExists(API_USER_NAME);
}

async function createWorkspace(api: PageEvaluatorApi, created: Created): Promise<string> {
  const administrators = (await api.helpers.userGroup.getByName('Administrators')) as { id: string } | null;
  expect(administrators?.id, 'the "Administrators" user group').toBeDefined();

  // Automate rejects a regular backoffice user as the service account ("must be an API user").
  created.userId = await api.helpers.user.createDefaultUser(API_USER_NAME, API_USER_EMAIL, [administrators!.id], 'Api');
  expect(created.userId, 'the API user').toBeTruthy();

  const response = await api.send(
    () =>
      api.helpers.post(`${api.helpers.baseUrl}${AUTOMATE_API}/workspaces`, {
        alias: WORKSPACE_ALIAS,
        name: WORKSPACE_NAME,
        serviceAccountKey: created.userId,
        userGroups: [administrators!.id],
        allowedConnections: [],
      }),
    [200, 201],
  );
  created.workspaceId = api.helpers.getIdFromLocation(response);
  expect(created.workspaceId, 'the workspace id').toBeTruthy();
  return created.workspaceId!;
}

async function deleteTestData(api: PageEvaluatorApi, created: Created): Promise<void> {
  await api.ensureAuthenticated();
  // The workspace first: it references the API user as its service account.
  if (created.workspaceId) {
    await api.send(
      () => api.helpers.delete(`${api.helpers.baseUrl}${AUTOMATE_API}/workspaces/${created.workspaceId}`),
      [200, 204, 404],
    );
  }
  if (created.userId) await api.helpers.user.delete(created.userId);
}


/**
 * The page's aria snapshot as trimmed lines (`heading "AI" [level=5]`, `button "Evaluate Page …"`, …). Automate's
 * modals project their headline and content into the `dialog` element through slots, so they are inside it in the
 * accessibility tree but not in its DOM subtree: locators chained off `getByRole('dialog')` find nothing. The spec
 * therefore uses page-level locators while exactly one modal is open.
 */
async function ariaLines(page: Page): Promise<string[]> {
  return (await page.locator('body').ariaSnapshot()).split(/\r?\n/).map((line) => line.trim().replace(/^- /, ''));
}

test.describe('Automate step', () => {
  test('"Evaluate Page" is listed under AI and its settings show localized labels', async ({ umbracoUi }) => {
    test.setTimeout(120 * 1000); // leaves time for the clean-up in `finally` if a step times out
    const page = umbracoUi.page;
    const api = new PageEvaluatorApi(page);
    const created: Created = {};
    try {
      await api.ensureAuthenticated();
      await deleteLeftovers(api);
      const workspaceId = await createWorkspace(api, created);

      // A new, unsaved automation in that workspace (the route the workspace's "Create → Automation" opens).
      await page.goto(`${api.helpers.baseUrl}/umbraco/section/automation/workspace/ua:automation/create/ua:workspace/${workspaceId}`);
      // One modal at a time: the trigger picker, then the action picker, then the step's settings.
      await page.getByRole('button', { name: 'Add trigger' }).click();
      await expect(page.getByRole('heading', { name: 'Select Trigger' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: /^Manual Trigger/ }).click();

      await page.getByRole('button', { name: 'Add action' }).first().click();
      await expect(page.getByRole('heading', { name: 'Select Action' })).toBeVisible({ timeout: 15000 });
      const evaluatePage = page.getByRole('button', { name: /^Evaluate Page/ });
      await expect(evaluatePage).toBeVisible({ timeout: 15000 });
      await expect(evaluatePage).toContainText('Evaluates the latest saved version of a page');

      // Under the AI group: after the picker's "AI" group heading and before its next group heading.
      const lines = await ariaLines(page);
      const snapshot = lines.join('\n');
      const picker = lines.findIndex((l) => l.startsWith('heading "Select Action"'));
      const aiHeading = lines.findIndex((l, i) => i > picker && /^heading "AI" \[level=5\]/.test(l));
      const step = lines.findIndex((l) => /^button "Evaluate Page\b/.test(l));
      const nextHeading = lines.findIndex((l, i) => i > aiHeading && /^heading ".*" \[level=5\]/.test(l));
      expect(picker, snapshot).toBeGreaterThanOrEqual(0);
      expect(aiHeading, snapshot).toBeGreaterThan(picker);
      expect(step, snapshot).toBeGreaterThan(aiHeading);
      if (nextHeading >= 0) expect(step, snapshot).toBeLessThan(nextHeading);

      // Add it: the action picker closes and the step's settings open.
      await evaluatePage.click();
      await expect(page.getByRole('heading', { name: 'Evaluate Page', level: 3 })).toBeVisible({ timeout: 15000 });

      // The fields' accessible names come from the localized labels.
      // exact: Playwright matches names by substring, and "Field for Page language" also contains "Field for Page".
      const pageField = page.getByRole('textbox', { name: 'Field for Page', exact: true });
      await expect(pageField).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Field for Page language', exact: true })).toBeVisible();
      await expect(page.getByRole('spinbutton', { name: 'Pass threshold' })).toBeVisible();
      await expect(page.getByRole('switch', { name: 'Toggle for Fail on any failed check' })).toBeChecked();
      await expect(page.getByRole('combobox', { name: 'Field for Report language' })).toBeVisible();
      // Localized descriptions too, and no raw `#pageEvaluatorAutomate_…` keys anywhere.
      await expect(page.getByText('Which language version of the page to evaluate')).toBeVisible();
      await expect(page.getByText('The lowest overall score (1–5')).toBeVisible();
      await expect(page.getByText(/pageEvaluatorAutomate_/)).toHaveCount(0);
    } finally {
      await deleteTestData(api, created);
    }
  });
});
