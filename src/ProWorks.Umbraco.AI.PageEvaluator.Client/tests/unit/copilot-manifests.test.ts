/**
 * T052 — the three `uaiAgentFrontendTool` manifests registered by `entry-point.ts`
 * (contracts/copilot-tools.md, research R5).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { copilotToolManifests, copilotToolRendererManifests } from '../../src/entry-point.js';
import type { PageEvaluatorFrontendToolManifest, PageEvaluatorToolRendererManifest } from '../../src/copilot/types.js';
import en from '../../src/localization/en.js';

const manifests = copilotToolManifests as unknown as PageEvaluatorFrontendToolManifest[];
const rendererManifests = copilotToolRendererManifests as unknown as PageEvaluatorToolRendererManifest[];

function byToolName(toolName: string): PageEvaluatorFrontendToolManifest {
  const manifest = manifests.find((m) => m.meta.toolName === toolName);
  if (!manifest) throw new Error(`No manifest for ${toolName}`);
  return manifest;
}

/** Agent.UI's label key convention: `uaiTool_{camelCase(toolName)}Label`. */
function camel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}

const copilotDir = join(__dirname, '../../src/copilot');

/** Every .ts file under `dir`, recursively. */
function tsFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsFilesUnder(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('Copilot tool manifests', () => {
  it('registers three uaiAgentFrontendTool manifests with unique aliases', () => {
    expect(manifests).toHaveLength(3);
    expect(manifests.every((m) => m.type === 'uaiAgentFrontendTool')).toBe(true);
    expect(new Set(manifests.map((m) => m.alias)).size).toBe(3);
    expect(manifests.every((m) => m.alias.startsWith('ProWorks.AI.PageEvaluator.Tool.'))).toBe(true);
  });

  it('has unique tool names', () => {
    expect(manifests.map((m) => m.meta.toolName).sort()).toEqual([
      'apply_page_recommendation',
      'evaluate_current_page',
      'recommend_page_values',
    ]);
  });

  it('uses the read scope for evaluate and recommend and the write scope for apply', () => {
    expect(byToolName('evaluate_current_page').meta.scope).toBe('page-evaluator-read');
    expect(byToolName('recommend_page_values').meta.scope).toBe('page-evaluator-read');
    expect(byToolName('apply_page_recommendation').meta.scope).toBe('page-evaluator-write');
  });

  it('marks only apply as destructive, and only apply asks for approval with localized text', () => {
    const apply = byToolName('apply_page_recommendation');
    expect(apply.meta.isDestructive).toBe(true);
    expect(apply.meta.approval).toEqual({
      config: {
        title: '#pageEvaluatorCopilot_applyApprovalTitle',
        message: '#pageEvaluatorCopilot_applyApprovalMessage',
      },
    });

    for (const toolName of ['evaluate_current_page', 'recommend_page_values']) {
      const manifest = byToolName(toolName);
      expect(manifest.meta.isDestructive ?? false).toBe(false);
      expect(manifest.meta.approval).toBeUndefined();
    }
  });

  it.each(['evaluate_current_page', 'recommend_page_values', 'apply_page_recommendation'])(
    '%s has object parameters that reject extra properties',
    (toolName) => {
      const parameters = byToolName(toolName).meta.parameters;
      expect(parameters['type']).toBe('object');
      expect(parameters['additionalProperties']).toBe(false);
      const properties = parameters['properties'] as Record<string, Record<string, unknown>>;
      expect(typeof properties).toBe('object');
      for (const property of Object.values(properties)) {
        expect(typeof property['type']).toBe('string');
        expect(typeof property['description']).toBe('string');
      }
      for (const required of (parameters['required'] as string[] | undefined) ?? []) {
        expect(properties).toHaveProperty(required);
      }
    },
  );

  it('declares the contract parameters', () => {
    expect(byToolName('evaluate_current_page').meta.parameters['properties']).toHaveProperty('fresh.type', 'boolean');
    expect(byToolName('recommend_page_values').meta.parameters).toMatchObject({
      required: ['propertyAliases'],
      properties: { propertyAliases: { type: 'array', minItems: 1, items: { type: 'string' } } },
    });
    expect(byToolName('apply_page_recommendation').meta.parameters).toMatchObject({
      required: ['reference'],
      properties: { reference: { type: 'string' } },
    });
  });

  it('has English model descriptions', () => {
    for (const manifest of manifests) {
      expect(manifest.meta.description.length).toBeGreaterThan(50);
    }
    expect(byToolName('apply_page_recommendation').meta.description).toContain('NOT saved');
  });

  it.each(['evaluate_current_page', 'recommend_page_values', 'apply_page_recommendation'])(
    '%s loads its api lazily, as a default-exported class',
    async (toolName) => {
      const { api } = byToolName(toolName);
      expect(typeof api).toBe('function');
      const loaded = await (api as () => Promise<{ default: unknown }>)();
      expect(typeof loaded.default).toBe('function');
    },
  );

  it('has an admin-facing label and description for each tool and for the approval prompt', () => {
    const l = en as Record<string, Record<string, string>>;
    for (const manifest of manifests) {
      expect(l['uaiTool']?.[`${camel(manifest.meta.toolName)}Label`]).toBeTruthy();
      expect(l['uaiTool']?.[`${camel(manifest.meta.toolName)}Description`]).toBeTruthy();
    }
    expect(l['pageEvaluatorCopilot']?.['applyApprovalTitle']).toBeTruthy();
    expect(l['pageEvaluatorCopilot']?.['applyApprovalMessage']).toBeTruthy();
  });

  it('never imports @umbraco-ai/* from src/copilot (renderers included) or the entry point', () => {
    const files = tsFilesUnder(copilotDir);
    expect(files.some((f) => f.includes('renderers'))).toBe(true);
    files.push(join(__dirname, '../../src/entry-point.ts'));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      expect(readFileSync(file, 'utf-8'), file).not.toMatch(/from\s+['"]@umbraco-ai\/|import\(\s*['"]@umbraco-ai\//);
    }
  });
});

describe('Copilot tool renderer manifests', () => {
  function rendererFor(toolName: string): PageEvaluatorToolRendererManifest {
    const manifest = rendererManifests.find((m) => m.meta.toolName === toolName);
    if (!manifest) throw new Error(`No renderer for ${toolName}`);
    return manifest;
  }

  it('registers two uaiAgentToolRenderer manifests with unique aliases', () => {
    expect(rendererManifests).toHaveLength(2);
    expect(rendererManifests.every((m) => m.type === 'uaiAgentToolRenderer')).toBe(true);
    expect(rendererManifests.every((m) => m.kind === undefined)).toBe(true);
    expect(new Set(rendererManifests.map((m) => m.alias)).size).toBe(2);
    expect(rendererManifests.every((m) => m.alias.startsWith('ProWorks.AI.PageEvaluator.ToolRenderer.'))).toBe(true);
    const toolAliases = new Set(manifests.map((m) => m.alias));
    expect(rendererManifests.some((m) => toolAliases.has(m.alias))).toBe(false);
  });

  it('renders recommend_page_values and apply_page_recommendation, which are our frontend tools', () => {
    expect(rendererManifests.map((m) => m.meta.toolName).sort()).toEqual(['apply_page_recommendation', 'recommend_page_values']);
    const toolNames = manifests.map((m) => m.meta.toolName);
    for (const renderer of rendererManifests) expect(toolNames).toContain(renderer.meta.toolName);
  });

  it('has a label and an Umbraco icon for each renderer', () => {
    expect(rendererFor('recommend_page_values').meta.icon).toBe('icon-lightbulb');
    expect(rendererFor('apply_page_recommendation').meta.icon).toBe('icon-edit');
    for (const renderer of rendererManifests) expect(renderer.meta.label?.length ?? 0).toBeGreaterThan(0);
  });

  it.each([
    ['recommend_page_values', 'page-evaluator-copilot-recommendations'],
    ['apply_page_recommendation', 'page-evaluator-copilot-apply'],
  ])('%s loads its element lazily, as a custom element class', async (toolName, tag) => {
    const { element } = rendererFor(toolName);
    expect(typeof element).toBe('function');
    const loaded = await (element as () => Promise<{ default: unknown; element: unknown }>)();
    expect(typeof loaded.default).toBe('function');
    expect(loaded.element).toBe(loaded.default);
    expect(customElements.get(tag)).toBe(loaded.default);
  });
});
