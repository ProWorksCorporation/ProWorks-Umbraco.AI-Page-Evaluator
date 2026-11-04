/**
 * Test doubles for the Copilot tools: a document workspace context with the members the tools use, and an entity
 * adapter context provided on a host element under the `UaiEntityAdapterContext` alias.
 */
import { vi } from 'vitest';
import { UmbControllerHostElementMixin } from '@umbraco-cms/backoffice/controller-api';
import { UmbContextProviderController } from '@umbraco-cms/backoffice/context-api';
import { UAI_ENTITY_ADAPTER_CONTEXT, type EntityAdapterContextLike, type SelectedEntityLike } from '../../src/copilot/types.js';

export interface FakeValue {
  alias: string;
  value: unknown;
  culture?: string | null;
  segment?: string | null;
}

export interface FakeVariant {
  culture: string | null;
  state?: string | null;
  name?: string;
}

export interface FakePropertyStructure {
  unique: string;
  alias: string;
  variesByCulture: boolean;
}

export interface FakeWorkspaceOptions {
  alias?: string;
  unique?: string | null;
  name?: string;
  values?: FakeValue[];
  variesByCulture?: boolean;
  activeCulture?: string | null;
  variants?: FakeVariant[];
  hasUnpersistedChanges?: boolean;
  /** Property structures by alias; defaults to one per value alias, varying when the document varies. */
  propertyStructures?: Record<string, FakePropertyStructure>;
  /** `readOnlyGuard.getIsPermittedForVariant` result (true = the variant is read-only). */
  variantReadOnly?: boolean;
  /** `propertyWriteGuard.getIsPermittedForVariantAndProperty` result. */
  propertyWritable?: boolean;
  /** Makes `setPropertyValue` reject. */
  setPropertyValueError?: Error;
}

interface VariantIdLike {
  culture: string | null;
  segment: string | null;
}

export interface FakeDocumentWorkspace {
  readonly options: FakeWorkspaceOptions;
  readonly values: FakeValue[];
  readonly setPropertyValue: ReturnType<typeof vi.fn<(alias: string, value: unknown, variantId?: VariantIdLike) => Promise<void>>>;
  readonly getPropertyValue: (alias: string, variantId?: VariantIdLike) => unknown;
  readonly readOnlyGuard: { getIsPermittedForVariant: ReturnType<typeof vi.fn<(variantId: VariantIdLike) => boolean>> };
  readonly propertyWriteGuard: {
    getIsPermittedForVariantAndProperty: ReturnType<
      typeof vi.fn<(propertyVariantId: VariantIdLike, property: { unique: string }, datasetVariantId: VariantIdLike) => boolean>
    >;
  };
  setHasUnpersistedChanges(value: boolean): void;
  setActiveCulture(culture: string | null): void;
  [member: string]: unknown;
}

export function fakeDocumentWorkspace(options: FakeWorkspaceOptions = {}): FakeDocumentWorkspace {
  const values: FakeValue[] = (options.values ?? []).map((v) => ({ culture: null, segment: null, ...v }));
  let hasUnpersistedChanges = options.hasUnpersistedChanges ?? false;
  let activeCulture = options.activeCulture ?? null;
  const variesByCulture = options.variesByCulture ?? false;

  const structureFor = (alias: string): FakePropertyStructure | undefined => {
    if (options.propertyStructures) return options.propertyStructures[alias];
    return values.some((v) => v.alias === alias) ? { unique: `pt-${alias}`, alias, variesByCulture } : undefined;
  };

  const findValue = (alias: string, variantId?: VariantIdLike): FakeValue | undefined =>
    values.find(
      (v) => v.alias === alias && (v.culture ?? null) === (variantId?.culture ?? null) && (v.segment ?? null) === (variantId?.segment ?? null),
    );

  const workspace: FakeDocumentWorkspace = {
    options,
    values,
    getHostElement: () => document.body,
    getUnique: () => (options.unique === undefined ? 'node-1' : options.unique),
    getEntityType: () => 'document',
    structure: {
      getOwnerContentType: () => ({ alias: options.alias ?? 'landingPage' }),
      getPropertyStructureByAlias: (alias: string) => Promise.resolve(structureFor(alias)),
    },
    getData: () => ({
      unique: options.unique === undefined ? 'node-1' : options.unique,
      values,
      variants: options.variants ?? [{ culture: null, state: 'Draft', name: options.name ?? 'Home' }],
    }),
    getVariesByCulture: () => variesByCulture,
    splitView: { getActiveVariants: () => [{ index: 0, culture: activeCulture, segment: null }] },
    getName: () => options.name ?? 'Home',
    getHasUnpersistedChanges: () => hasUnpersistedChanges,
    getPropertyValue: (alias: string, variantId?: VariantIdLike) => findValue(alias, variantId)?.value,
    setPropertyValue: vi.fn((alias: string, value: unknown, variantId?: VariantIdLike): Promise<void> => {
      if (options.setPropertyValueError) return Promise.reject(options.setPropertyValueError);
      const existing = findValue(alias, variantId);
      if (existing) existing.value = value;
      else values.push({ alias, value, culture: variantId?.culture ?? null, segment: variantId?.segment ?? null });
      hasUnpersistedChanges = true;
      return Promise.resolve();
    }),
    readOnlyGuard: { getIsPermittedForVariant: vi.fn(() => options.variantReadOnly ?? false) },
    propertyWriteGuard: { getIsPermittedForVariantAndProperty: vi.fn(() => options.propertyWritable ?? true) },
    // Must never be called by the tools.
    submit: vi.fn(),
    requestSubmit: vi.fn(),
    publish: vi.fn(),
    save: vi.fn(),
    setHasUnpersistedChanges: (value: boolean) => {
      hasUnpersistedChanges = value;
    },
    setActiveCulture: (culture: string | null) => {
      activeCulture = culture;
    },
  };
  return workspace;
}

/** A Copilot entity adapter context whose selection can change; `applyValueChange` etc. must never be called. */
export interface FakeEntityAdapter extends EntityAdapterContextLike {
  select(entity: SelectedEntityLike | undefined): void;
  readonly applyValueChange: ReturnType<typeof vi.fn>;
  readonly saveSelectedEntity: ReturnType<typeof vi.fn>;
  readonly publishSelectedEntity: ReturnType<typeof vi.fn>;
}

export function fakeEntityAdapter(selected?: SelectedEntityLike): FakeEntityAdapter {
  let current = selected;
  return {
    getHostElement: () => document.body,
    getSelectedEntity: () => current,
    select: (entity) => {
      current = entity;
    },
    applyValueChange: vi.fn(),
    saveSelectedEntity: vi.fn(),
    publishSelectedEntity: vi.fn(),
  };
}

export function documentEntity(workspace: FakeDocumentWorkspace, entityType = 'document'): SelectedEntityLike {
  const unique = workspace.options.unique === undefined ? 'node-1' : workspace.options.unique;
  return { entityContext: { entityType, unique }, workspaceContext: workspace };
}

class CopilotTestHost extends UmbControllerHostElementMixin(HTMLElement) {}
if (!customElements.get('copilot-tool-test-host')) customElements.define('copilot-tool-test-host', CopilotTestHost);

/** A connected host element that provides `adapter` (if any) under the `UaiEntityAdapterContext` alias. */
export function createToolHost(adapter?: EntityAdapterContextLike): HTMLElement & { destroy?: () => void } {
  const host = new CopilotTestHost();
  document.body.appendChild(host);
  if (adapter) new UmbContextProviderController(host, UAI_ENTITY_ADAPTER_CONTEXT, adapter);
  return host;
}
