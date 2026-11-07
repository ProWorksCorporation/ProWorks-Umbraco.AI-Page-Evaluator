/**
 * E2E: the Copilot frontend tools are registered in the live backoffice (006 US1, contracts/copilot-tools.md).
 *
 * `entry-point.ts` registers three `uaiAgentFrontendTool` manifests unconditionally; on the TestSite Umbraco.AI
 * Agent.UI (Copilot) is installed, so they must be in the extension registry with the scopes admins grant to an
 * agent, and the apply tool must carry `meta.approval` (Copilot's approval prompt). The registry is read in the page
 * through the backoffice import map (`@umbraco-cms/backoffice/extension-registry`), the same way extensions import
 * it. Also checks that loading the backoffice logs no browser errors from this package. Read-only.
 */
import { expect } from '@playwright/test';
import { test } from '@umbraco-cms/acceptance-test-helpers';

interface RegisteredTool {
  alias: string;
  toolName: string | undefined;
  scope: string | undefined;
  isDestructive: boolean | undefined;
  approval: { config?: { title?: string; message?: string } } | boolean | undefined;
}

/**
 * Runs in the page. Passed as a string so the test runner's transpiler can't rewrite the dynamic `import()`
 * (the specifier only resolves through the backoffice's browser import map).
 */
const READ_PAGE_EVALUATOR_TOOLS = `(async () => {
  const { umbExtensionsRegistry } = await import('@umbraco-cms/backoffice/extension-registry');
  const manifests = await new Promise((resolve) => {
    const subscription = umbExtensionsRegistry.byType('uaiAgentFrontendTool').subscribe((list) => {
      resolve(list);
      queueMicrotask(() => subscription.unsubscribe());
    });
  });
  return manifests
    .filter((m) => m.alias.startsWith('ProWorks.AI.PageEvaluator.'))
    .map((m) => ({
      alias: m.alias,
      toolName: m.meta?.toolName,
      scope: m.meta?.scope,
      isDestructive: m.meta?.isDestructive,
      approval: m.meta?.approval,
    }))
    .sort((a, b) => a.alias.localeCompare(b.alias));
})()`;

const OUR_PACKAGE = /ProWorks\.AI\.PageEvaluator|page-evaluator|PageEvaluator/i;

test.describe('Copilot tools', () => {
  test('the three Page Evaluator tools are registered with their scopes, and apply needs approval', async ({ umbracoUi }) => {
    const page = umbracoUi.page;
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url}`);
    });
    page.on('pageerror', (error) => errors.push(`${error.message}\n${error.stack ?? ''}`));
    const failedAssets: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/App_Plugins/ProWorks.AI.PageEvaluator/')) {
        failedAssets.push(`${response.status()} ${response.url()}`);
      }
    });

    await umbracoUi.goToBackOffice();
    await expect(page.getByRole('tab', { name: 'Content' })).toBeVisible({ timeout: 20000 });

    // The package registers its manifests in onInit, after the backoffice shell has rendered.
    await expect
      .poll(async () => ((await page.evaluate(READ_PAGE_EVALUATOR_TOOLS)) as RegisteredTool[]).length, { timeout: 15000 })
      .toBe(3);
    const tools = (await page.evaluate(READ_PAGE_EVALUATOR_TOOLS)) as RegisteredTool[];

    expect(tools.map(({ toolName, scope }) => ({ toolName, scope }))).toEqual([
      { toolName: 'apply_page_recommendation', scope: 'page-evaluator-write' },
      { toolName: 'evaluate_current_page', scope: 'page-evaluator-read' },
      { toolName: 'recommend_page_values', scope: 'page-evaluator-read' },
    ]);

    const apply = tools.find((t) => t.toolName === 'apply_page_recommendation');
    expect(apply?.isDestructive).toBe(true);
    expect(apply?.approval).toEqual({
      config: {
        title: '#pageEvaluatorCopilot_applyApprovalTitle',
        message: '#pageEvaluatorCopilot_applyApprovalMessage',
      },
    });
    for (const readTool of tools.filter((t) => t.scope === 'page-evaluator-read')) {
      expect(readTool.isDestructive, readTool.toolName).toBe(false);
      expect(readTool.approval, readTool.toolName).toBeUndefined();
    }

    expect(errors.filter((e) => OUR_PACKAGE.test(e)), 'browser errors from this package').toEqual([]);
    expect(failedAssets, 'package assets that failed to load').toEqual([]);
  });
});
