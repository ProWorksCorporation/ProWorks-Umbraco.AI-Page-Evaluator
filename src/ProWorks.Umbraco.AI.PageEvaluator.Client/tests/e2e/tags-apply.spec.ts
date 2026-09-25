/**
 * E2E: applying a Tags recommendation into the real Tags editor (FR-016, research R12.2).
 *
 * The Tags editor stores string[]. Before 003 the value went through Umbraco.AI's applyValueChange, which
 * JSON.parse()d the recommendation into that array; the package now writes directly and converts it itself
 * (shared/apply-value.ts). The TestSite has no doc type with a Tags property, so this spec creates its own
 * throwaway doc type, document and evaluator config through the Management API, and removes them again.
 * AI responses are mocked.
 */
import { existsSync, readdirSync, rmSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { expect } from '@playwright/test';
import { DocumentBuilder, DocumentTypeBuilder } from '@umbraco/json-models-builders';
import { ConstantHelper, test } from '@umbraco/playwright-testhelpers';
import { API, mockCachedEvaluation, mockRecommend, mockReport } from './helpers';
import { ManagementApi } from './management-api';

const MGMT = '/umbraco/management/api/v1';
const DOC_TYPE_ALIAS = 'zzE2eTagsPage';
const DOC_NAME = 'ZZ E2E Tags Doc';

interface Created {
  docTypeId: string;
  docId: string;
  configId: string;
}

async function createTestData(api: ManagementApi): Promise<Created> {
  const dataTypes = await api.get<{ items: { id: string; name: string }[] }>(`${MGMT}/filter/data-type?skip=0&take=20&name=Tags`);
  const tags = dataTypes.items.find((d) => d.name === 'Tags');
  expect(tags, 'the core "Tags" data type').toBeDefined();

  const containerId = crypto.randomUUID();
  const docTypeId = await api.create(`${MGMT}/document-type`, new DocumentTypeBuilder()
    .withName('ZZ E2E Tags Page').withAlias(DOC_TYPE_ALIAS).withAllowedAsRoot(true)
    .addContainer().withName('Content').withId(containerId).withType('Group').done()
    .addProperty().withContainerId(containerId).withAlias('tags').withName('Tags').withDataTypeId(tags!.id).done()
    .build());
  const docId = await api.create(`${MGMT}/document`, new DocumentBuilder()
    .withDocumentTypeId(docTypeId)
    .addVariant().withName(DOC_NAME).done()
    .addValue().withAlias('tags').withValue(['old tag']).done()
    .build());

  const profiles = await api.get<{ items: { id: string }[] }>('/umbraco/ai/management/api/v1/profiles?skip=0&take=1');
  const configId = await api.create(`${API}/configurations`, {
    name: 'ZZ E2E Tags config',
    description: 'Temporary: tags-apply.spec.ts',
    documentTypeAlias: DOC_TYPE_ALIAS,
    profileId: profiles.items[0]!.id,
    contextId: null,
    promptText: 'Evaluate the tags.',
    propertyAliases: null,
    scoringEnabled: false,
    recommendationsEnabled: true,
  });
  return { docTypeId, docId, configId };
}

async function deleteTestData(api: ManagementApi, created: Partial<Created>): Promise<void> {
  if (created.configId) await api.delete(`${API}/configurations/${created.configId}`);
  if (created.docId) await api.delete(`${MGMT}/document/${created.docId}`);
  if (created.docTypeId) await api.delete(`${MGMT}/document-type/${created.docTypeId}`);
  removeUSyncArtifacts();
}

/**
 * The TestSite exports to uSync on save, so the throwaway doc type and document leave files in
 * `uSync/v17` (after deletion, `<Empty Change="Delete">` markers). Remove this spec's own files so they
 * never end up committed. Only runs when the TestSite folder is local (it is when the suite targets
 * the TestSite from this repo); otherwise there is nothing to clean.
 */
function removeUSyncArtifacts(): void {
  const uSync = resolve(dirname(fileURLToPath(import.meta.url)), '../../../ProWorks.Umbraco.AI.PageEvaluator.TestSite/uSync/v17');
  for (const [folder, prefix] of [['Content', 'zz-e2e-tags-doc'], ['ContentTypes', DOC_TYPE_ALIAS.toLowerCase()]] as const) {
    const dir = join(uSync, folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (file.toLowerCase().startsWith(prefix) && file.endsWith('.config')) rmSync(join(dir, file));
    }
  }
}

for (const [label, recommended] of [
  ['a JSON array', '["headless CMS", "cms strategy"]'],
  ['a comma-separated string', 'headless CMS, cms strategy'],
] as const) {
  test(`applies a Tags recommendation given as ${label} as separate tags`, async ({ umbracoUi }) => {
    const api = new ManagementApi(umbracoUi.page);
    await umbracoUi.goToBackOffice(); // establishes the page's origin for relative API paths
    let created: Partial<Created> = {};
    try {
      created = await createTestData(api);
      await mockCachedEvaluation(umbracoUi.page, mockReport({
        checks: [{ checkNumber: 1, status: 'Fail', label: 'E2E: tags too generic', explanation: 'Use specific tags.', propertyAliases: ['tags'] }],
        propertyEditorAliases: { tags: 'Umbraco.Tags' },
        propertyNames: { tags: 'Tags' },
      }));
      await mockRecommend(umbracoUi.page, { tags: recommended });

      await umbracoUi.content.goToSection(ConstantHelper.sections.content, false);
      await umbracoUi.content.goToContentWithName(DOC_NAME);
      await umbracoUi.page.getByRole('button', { name: 'Evaluate Page' }).click();
      await umbracoUi.page.getByRole('button', { name: /generate recommendation/i }).first().click();
      await umbracoUi.page.getByRole('button', { name: 'Apply' }).click();
      await umbracoUi.page.getByRole('button', { name: 'Close' }).click();

      const tagsEditor = umbracoUi.page.locator('umb-property-editor-ui-tags');
      await expect(tagsEditor.getByText('headless CMS', { exact: true })).toBeVisible({ timeout: 15000 });
      await expect(tagsEditor.getByText('cms strategy', { exact: true })).toBeVisible();
      await expect(tagsEditor.getByText('old tag', { exact: true })).toHaveCount(0);
      // Never a single tag holding the whole recommendation.
      await expect(tagsEditor.getByText(recommended, { exact: true })).toHaveCount(0);
    } finally {
      await deleteTestData(api, created);
    }
  });
}
