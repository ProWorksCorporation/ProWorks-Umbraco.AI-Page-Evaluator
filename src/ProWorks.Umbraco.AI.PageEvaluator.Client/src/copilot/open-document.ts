import { UmbContextConsumerController } from '@umbraco-cms/backoffice/context-api';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';
import type { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { captureDocumentDraft, type DocumentDraft } from '../shared/capture-draft.js';
import { clearRecommendationsForOtherEntity } from './recommendation-store.js';
import { clearReportsForOtherEntity } from './report-store.js';
import { TOOL_ERROR_MESSAGES } from './tool-error.js';
import { UAI_ENTITY_ADAPTER_CONTEXT, toolFailure, type EntityAdapterContextLike, type ToolFailure } from './types.js';

/**
 * Resolves the document the Copilot user has selected (contracts/copilot-tools.md "Shared helpers").
 *
 * Tool APIs are hosted on the backoffice entry-point element, outside the document workspace, so
 * `UMB_DOCUMENT_WORKSPACE_CONTEXT` can't be consumed. Copilot's entity adapter context (provided globally under the
 * alias `UaiEntityAdapterContext`) hands out the selected entity's live workspace context instead (research R5).
 */

export type DocumentWorkspaceContext = typeof UMB_DOCUMENT_WORKSPACE_CONTEXT.TYPE;

export interface OpenDocument extends DocumentDraft {
  /** The page name in the viewed culture (the first active variant); null when unknown. */
  readonly name: string | null;
  readonly workspaceContext: DocumentWorkspaceContext;
}

export type OpenDocumentResult =
  | { readonly ok: true; readonly document: OpenDocument }
  | { readonly ok: false; readonly failure: ToolFailure };

const DOCUMENT_ENTITY_TYPE = 'document';

/** Members the tools call on the workspace; their presence identifies a document workspace context. */
const REQUIRED_MEMBERS = [
  'getData',
  'getName',
  'getVariesByCulture',
  'getHasUnpersistedChanges',
  'getPropertyValue',
  'setPropertyValue',
] as const;

/**
 * The adapter types `workspaceContext` as `object`. A context that has every member the tools call (and the
 * structure, split view and guard managers) is treated as the document workspace context.
 */
function isDocumentWorkspaceContext(ctx: object | null | undefined): ctx is DocumentWorkspaceContext {
  if (typeof ctx !== 'object' || ctx === null) return false;
  const members = ctx as Record<string, unknown>;
  return (
    REQUIRED_MEMBERS.every((name) => typeof members[name] === 'function') &&
    typeof members['structure'] === 'object' &&
    typeof members['splitView'] === 'object' &&
    typeof members['readOnlyGuard'] === 'object' &&
    typeof members['propertyWriteGuard'] === 'object'
  );
}

function fail(code: 'noOpenPage' | 'pageNotSaved' | 'cultureNotCreated'): OpenDocumentResult {
  return { ok: false, failure: toolFailure(code, TOOL_ERROR_MESSAGES[code]) };
}

/** The adapter context, or undefined when Copilot isn't there (`getContext` rejects when nothing answers in time). */
async function getAdapterContext(host: UmbControllerHost): Promise<EntityAdapterContextLike | undefined> {
  try {
    return await new UmbContextConsumerController(host, UAI_ENTITY_ADAPTER_CONTEXT).asPromise();
  } catch {
    return undefined;
  }
}

export async function resolveOpenDocument(host: UmbControllerHost): Promise<OpenDocumentResult> {
  const adapter = await getAdapterContext(host);
  const selected = adapter?.getSelectedEntity();
  if (!selected || selected.entityContext.entityType !== DOCUMENT_ENTITY_TYPE) return fail('noOpenPage');

  const workspaceContext = selected.workspaceContext;
  if (!isDocumentWorkspaceContext(workspaceContext)) return fail('noOpenPage');

  const draft = captureDocumentDraft(workspaceContext);
  if (draft.nodeId === '' || !selected.entityContext.unique) return fail('pageNotSaved');
  if (draft.cultureNotCreated) return fail('cultureNotCreated');

  return { ok: true, document: { ...draft, name: workspaceContext.getName() ?? null, workspaceContext } };
}

/**
 * Stored reports and recommendation references belong to one page: once the user is on another page, the others'
 * entries are dropped (data-model §5 lifecycle).
 */
export function forgetOtherPages(nodeId: string): void {
  clearReportsForOtherEntity(nodeId);
  clearRecommendationsForOtherEntity(nodeId);
}
