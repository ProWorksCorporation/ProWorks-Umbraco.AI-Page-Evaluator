/**
 * T050 — Copilot `apply_page_recommendation` tool (`src/copilot/apply-page-recommendation.tool.api.ts`,
 * contracts/copilot-tools.md §3) with a fake document workspace context.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UmbContextProviderController } from '@umbraco-cms/backoffice/context-api';
import { UMB_VALIDATION_CONTEXT } from '@umbraco-cms/backoffice/validation';
import ApplyPageRecommendationToolApi from '../../src/copilot/apply-page-recommendation.tool.api.js';
import {
  RECOMMENDATION_TTL_MS,
  addRecommendation,
  getRecommendation,
  resetRecommendationStore,
  type RecommendationInput,
} from '../../src/copilot/recommendation-store.js';
import {
  createToolHost,
  documentEntity,
  fakeDocumentWorkspace,
  fakeEntityAdapter,
  type FakeDocumentWorkspace,
  type FakeEntityAdapter,
  type FakeWorkspaceOptions,
} from '../fixtures/copilot-fakes.js';

const NODE_ID = 'node-1';
const hosts: HTMLElement[] = [];

beforeEach(() => resetRecommendationStore());
afterEach(() => {
  vi.useRealTimers();
  for (const host of hosts.splice(0)) host.remove();
});

const block = '<umb-rte-block data-content-key="b1"><!--Umbraco-Block--></umb-rte-block>';
const existingBlocks = { layout: { 'Umbraco.RichText': [{ contentKey: 'b1' }] }, contentData: [{ key: 'b1' }], settingsData: [], expose: [] };

function setup(options: FakeWorkspaceOptions = {}): {
  tool: ApplyPageRecommendationToolApi;
  workspace: FakeDocumentWorkspace;
  adapter: FakeEntityAdapter;
} {
  const workspace = fakeDocumentWorkspace({
    unique: NODE_ID,
    values: [
      { alias: 'metaDescription', value: 'Old' },
      { alias: 'keywords', value: ['old'] },
      { alias: 'introText', value: { markup: `<p>Old</p>${block}`, blocks: existingBlocks } },
    ],
    ...options,
  });
  const adapter = fakeEntityAdapter(documentEntity(workspace));
  const host = createToolHost(adapter);
  hosts.push(host);
  return { tool: new ApplyPageRecommendationToolApi(host), workspace, adapter };
}

function recommendation(overrides: Partial<RecommendationInput> = {}): string {
  return addRecommendation({
    nodeId: NODE_ID,
    culture: null,
    propertyAlias: 'metaDescription',
    editorAlias: 'Umbraco.TextArea',
    value: 'A better description',
    ...overrides,
  }).reference;
}

type Result = Record<string, unknown>;

async function run(tool: ApplyPageRecommendationToolApi, reference: unknown): Promise<Result> {
  return JSON.parse(JSON.stringify(await tool.execute({ reference }))) as Result;
}

function errorCode(result: Result): unknown {
  return (result['error'] as Result | undefined)?.['code'];
}

describe('apply_page_recommendation', () => {
  it('writes the value, keeps it unsaved, and deletes the reference', async () => {
    const { tool, workspace } = setup();
    const reference = recommendation();

    const result = await run(tool, reference);

    expect(result).toEqual({
      success: true,
      propertyAlias: 'metaDescription',
      culture: null,
      saved: false,
      message: 'Staged in the editor. The user must click Save to keep it.',
    });
    expect(workspace.setPropertyValue).toHaveBeenCalledTimes(1);
    expect(workspace.setPropertyValue.mock.calls[0]?.[0]).toBe('metaDescription');
    expect(workspace.setPropertyValue.mock.calls[0]?.[1]).toBe('A better description');
    expect(getRecommendation(reference)).toBeUndefined();
  });

  it('never saves or publishes and never uses the adapter write methods', async () => {
    const { tool, workspace, adapter } = setup();

    await run(tool, recommendation());

    expect(adapter.applyValueChange).not.toHaveBeenCalled();
    expect(adapter.saveSelectedEntity).not.toHaveBeenCalled();
    expect(adapter.publishSelectedEntity).not.toHaveBeenCalled();
    for (const member of ['submit', 'requestSubmit', 'save', 'publish']) {
      expect(workspace[member]).not.toHaveBeenCalled();
    }
  });

  it('returns unknownRecommendation for an unknown reference', async () => {
    const { tool } = setup();

    expect(errorCode(await run(tool, 'rec_doesnotexist'))).toBe('unknownRecommendation');
  });

  it('returns unknownRecommendation for an expired reference', async () => {
    vi.useFakeTimers();
    const { tool, workspace } = setup();
    const reference = recommendation();
    vi.advanceTimersByTime(RECOMMENDATION_TTL_MS + 1);

    expect(errorCode(await run(tool, reference))).toBe('unknownRecommendation');
    expect(workspace.setPropertyValue).not.toHaveBeenCalled();
  });

  it('returns invalidArguments when no reference is given', async () => {
    const { tool } = setup();

    expect(errorCode(await run(tool, undefined))).toBe('invalidArguments');
  });

  it('returns differentPage when the reference is for another page', async () => {
    const { tool, workspace } = setup();

    expect(errorCode(await run(tool, recommendation({ nodeId: 'node-2' })))).toBe('differentPage');
    expect(workspace.setPropertyValue).not.toHaveBeenCalled();
  });

  it('returns languageChanged naming the culture, and keeps the reference', async () => {
    const { tool, workspace } = setup({
      variesByCulture: true,
      activeCulture: 'en-US',
      variants: [{ culture: 'en-US', state: 'Draft' }, { culture: 'da-DK', state: 'Draft' }],
      values: [{ alias: 'metaDescription', value: 'Old', culture: 'en-US' }],
    });
    const reference = recommendation({ culture: 'da-DK' });

    const result = await run(tool, reference);

    expect(errorCode(result)).toBe('languageChanged');
    expect((result['error'] as Result)['message']).toBe(
      'This recommendation was made for da-DK. Ask the user to switch the editor back to da-DK to apply it.',
    );
    expect(getRecommendation(reference)).toBeDefined();
    expect(workspace.setPropertyValue).not.toHaveBeenCalled();

    workspace.setActiveCulture('da-DK');
    expect((await run(tool, reference))['success']).toBe(true);
  });

  it('matches the culture case-insensitively', async () => {
    const { tool } = setup({
      variesByCulture: true,
      activeCulture: 'da-DK',
      variants: [{ culture: 'da-DK', state: 'Draft' }],
      values: [{ alias: 'metaDescription', value: 'Old', culture: 'da-DK' }],
    });

    expect((await run(tool, recommendation({ culture: 'da-dk' })))['success']).toBe(true);
  });

  it('returns propertyMissing when the field no longer exists', async () => {
    const { tool } = setup();

    expect(errorCode(await run(tool, recommendation({ propertyAlias: 'gone' })))).toBe('propertyMissing');
  });

  it('returns readOnly when the viewed variant is read-only', async () => {
    const { tool, workspace } = setup({ variantReadOnly: true });

    expect(errorCode(await run(tool, recommendation()))).toBe('readOnly');
    expect(workspace.setPropertyValue).not.toHaveBeenCalled();
  });

  it('returns readOnly when the property is not writable for the user, using the same variant ids as the editor', async () => {
    const { tool, workspace } = setup({
      variesByCulture: true,
      activeCulture: 'da-DK',
      variants: [{ culture: 'da-DK', state: 'Draft' }],
      values: [{ alias: 'metaDescription', value: 'Old', culture: 'da-DK' }],
      propertyWritable: false,
    });

    expect(errorCode(await run(tool, recommendation({ culture: 'da-DK' })))).toBe('readOnly');
    const [propertyVariantId, property, datasetVariantId] =
      workspace.propertyWriteGuard.getIsPermittedForVariantAndProperty.mock.calls[0] ?? [];
    expect(propertyVariantId).toMatchObject({ culture: 'da-DK', segment: null });
    expect(property).toEqual({ unique: 'pt-metaDescription' });
    expect(datasetVariantId).toMatchObject({ culture: 'da-DK', segment: null });
    expect(workspace.readOnlyGuard.getIsPermittedForVariant.mock.calls[0]?.[0]).toMatchObject({ culture: 'da-DK', segment: null });
  });

  it('checks an invariant property of a varying document with an invariant property variant', async () => {
    const { tool, workspace } = setup({
      variesByCulture: true,
      activeCulture: 'da-DK',
      variants: [{ culture: 'da-DK', state: 'Draft' }],
      values: [{ alias: 'metaDescription', value: 'Old' }],
      propertyStructures: { metaDescription: { unique: 'pt-1', alias: 'metaDescription', variesByCulture: false } },
    });

    await run(tool, recommendation({ culture: 'da-DK' }));

    const [propertyVariantId, , datasetVariantId] = workspace.propertyWriteGuard.getIsPermittedForVariantAndProperty.mock.calls[0] ?? [];
    expect(propertyVariantId).toMatchObject({ culture: null, segment: null });
    expect(datasetVariantId).toMatchObject({ culture: 'da-DK' });
    // The write goes to the invariant slot too (culture only when both the document and the property vary).
    expect(workspace.setPropertyValue.mock.calls[0]?.[2]).toMatchObject({ culture: null, segment: null });
  });

  it('writes to the culture variant when both the document and the property vary', async () => {
    const { tool, workspace } = setup({
      variesByCulture: true,
      activeCulture: 'da-DK',
      variants: [{ culture: 'da-DK', state: 'Draft' }],
      values: [{ alias: 'metaDescription', value: 'Old', culture: 'da-DK' }],
    });

    const result = await run(tool, recommendation({ culture: 'da-DK' }));

    expect(result['culture']).toBe('da-dk');
    expect(workspace.setPropertyValue.mock.calls[0]?.[2]).toMatchObject({ culture: 'da-DK', segment: null });
  });

  it('returns notApplicable when the editor is not applicable', async () => {
    const { tool, workspace } = setup({ values: [{ alias: 'heroImage', value: [] }] });

    expect(errorCode(await run(tool, recommendation({ propertyAlias: 'heroImage', editorAlias: 'Umbraco.MediaPicker3' })))).toBe(
      'notApplicable',
    );
    expect(workspace.setPropertyValue).not.toHaveBeenCalled();
  });

  it('applies an additional recommendable editor recorded on the reference', async () => {
    const { tool } = setup({ values: [{ alias: 'custom', value: 'Old' }] });
    const reference = recommendation({
      propertyAlias: 'custom',
      editorAlias: 'Acme.FancyText',
      additionalRecommendableEditorAliases: ['acme.fancytext'],
    });

    expect((await run(tool, reference))['success']).toBe(true);
  });

  it('returns richTextBlocks when a rich-text recommendation drops an embedded block', async () => {
    const { tool, workspace } = setup();
    const reference = recommendation({ propertyAlias: 'introText', editorAlias: 'Umbraco.RichText', value: '<p>New</p>' });

    const result = await run(tool, reference);

    expect(result).toEqual({
      success: false,
      error: {
        code: 'richTextBlocks',
        message:
          "The recommendation would remove or duplicate an embedded block, so it can't be applied automatically. The user can copy it instead.",
      },
    });
    expect(workspace.setPropertyValue).not.toHaveBeenCalled();
  });

  it('writes rich text as { markup, blocks }, keeping the existing blocks', async () => {
    const { tool, workspace } = setup();
    const recommended = '<p>New</p><umb-rte-block data-content-id="b1"></umb-rte-block>';

    await run(tool, recommendation({ propertyAlias: 'introText', editorAlias: 'Umbraco.RichText', value: recommended }));

    expect(workspace.setPropertyValue.mock.calls[0]?.[1]).toEqual({ markup: `<p>New</p>${block}`, blocks: existingBlocks });
  });

  it('writes tags as a string array', async () => {
    const { tool, workspace } = setup();

    await run(tool, recommendation({ propertyAlias: 'keywords', editorAlias: 'Umbraco.Tags', value: '["seo", "umbraco", "seo"]' }));

    expect(workspace.setPropertyValue.mock.calls[0]?.[1]).toEqual(['seo', 'umbraco']);
  });

  it("removes the validation messages at the property's data path", async () => {
    const workspaceHost = createToolHost();
    hosts.push(workspaceHost);
    const removeMessagesByPath = vi.fn();
    new UmbContextProviderController(workspaceHost, UMB_VALIDATION_CONTEXT, {
      getHostElement: () => workspaceHost,
      messages: { removeMessagesByPath },
    } as unknown as typeof UMB_VALIDATION_CONTEXT.TYPE);
    const { tool, workspace } = setup();
    workspace['getHostElement'] = () => workspaceHost;

    await run(tool, recommendation());

    expect(removeMessagesByPath).toHaveBeenCalledWith(
      "$.values[?(@.alias == 'metaDescription' && @.culture == null && @.segment == null)].value",
    );
  });

  it('still applies when the workspace has no validation context', async () => {
    const { tool } = setup();

    expect((await run(tool, recommendation()))['success']).toBe(true);
  });

  it('returns writeFailed when the workspace rejects the write, and keeps the reference', async () => {
    const { tool } = setup({ setPropertyValueError: new Error('nope') });
    const reference = recommendation();

    const result = await run(tool, reference);

    expect(errorCode(result)).toBe('writeFailed');
    expect(JSON.stringify(result)).not.toContain('nope');
    expect(getRecommendation(reference)).toBeDefined();
  });

  it('returns noOpenPage when no page is selected', async () => {
    const host = createToolHost(fakeEntityAdapter(undefined));
    hosts.push(host);

    expect(errorCode(await run(new ApplyPageRecommendationToolApi(host), recommendation()))).toBe('noOpenPage');
  });
});
