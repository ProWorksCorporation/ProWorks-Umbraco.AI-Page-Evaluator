import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { UmbContextConsumer } from '@umbraco-cms/backoffice/context-api';
import { UMB_VALIDATION_CONTEXT } from '@umbraco-cms/backoffice/validation';
import { UmbVariantId } from '@umbraco-cms/backoffice/variant';
import { applyRecommendedValue, isRichTextEditor, type ValidationMessageRemover } from '../shared/apply-value.js';
import { canApply, type EligibilityReport } from '../shared/recommend-eligibility.js';
import { currentMarkup } from '../shared/recommend-input.js';
import { canApplyRichText } from '../shared/rte-blocks.js';
import { resolveOpenDocument, type DocumentWorkspaceContext } from './open-document.js';
import { deleteRecommendation, getRecommendation, type RecommendationEntry } from './recommendation-store.js';
import { TOOL_ERROR_MESSAGES, toolFailureFromError } from './tool-error.js';
import { toolFailure, type PageEvaluatorToolApi, type ToolErrorCode, type ToolFailure } from './types.js';

/**
 * Copilot tool `apply_page_recommendation` (contracts/copilot-tools.md §3): writes one accepted recommendation into
 * its field on the open page. The value is staged in the editor and never saved or published (spec FR-008).
 *
 * Agent.UI only calls `execute` after the user approved the manifest's approval prompt. The write goes through
 * `applyRecommendedValue` (the Evaluate Page report's Apply), never Umbraco.AI's `applyValueChange` (CLAUDE.md
 * "Language awareness"). Never throws.
 */

export interface ApplyResult {
  readonly success: true;
  readonly propertyAlias: string;
  /** Lower-cased culture of the written variant's page language; null for invariant documents. */
  readonly culture: string | null;
  readonly saved: false;
  readonly message: string;
}

const STAGED_MESSAGE = 'Staged in the editor. The user must click Save to keep it.';

function fail(code: ToolErrorCode): ToolFailure {
  return toolFailure(code, TOOL_ERROR_MESSAGES[code]);
}

function sameCulture(a: string | null, b: string | null): boolean {
  return (a?.toLowerCase() ?? null) === (b?.toLowerCase() ?? null);
}

/**
 * The workspace's validation messages, consumed from the workspace's host element (where the document workspace
 * provides its validation context). Undefined when there is none; the write still happens.
 */
async function getValidationMessages(workspaceContext: DocumentWorkspaceContext): Promise<ValidationMessageRemover | undefined> {
  let consumer: UmbContextConsumer<typeof UMB_VALIDATION_CONTEXT.TYPE> | undefined;
  try {
    const hostElement = workspaceContext.getHostElement();
    // A disconnected element never answers (the request isn't even sent), so the promise would never settle.
    if (!hostElement.isConnected) return undefined;
    consumer = new UmbContextConsumer(hostElement, UMB_VALIDATION_CONTEXT);
    const promise = consumer.asPromise();
    consumer.hostConnected();
    return (await promise)?.messages;
  } catch {
    return undefined;
  } finally {
    consumer?.destroy();
  }
}

export class ApplyPageRecommendationToolApi extends UmbControllerBase implements PageEvaluatorToolApi {
  async execute(args: Record<string, unknown>): Promise<ApplyResult | ToolFailure> {
    try {
      return await this.#apply(args);
    } catch (err) {
      return toolFailureFromError(err);
    }
  }

  async #apply(args: Record<string, unknown>): Promise<ApplyResult | ToolFailure> {
    const reference = args['reference'];
    if (typeof reference !== 'string' || reference === '') return fail('invalidArguments');

    const entry = getRecommendation(reference);
    if (entry === undefined) return fail('unknownRecommendation');

    const open = await resolveOpenDocument(this);
    if (!open.ok) return open.failure;
    const { workspaceContext, nodeId, culture } = open.document;
    if (nodeId !== entry.nodeId) return fail('differentPage');
    if (!sameCulture(culture, entry.culture)) {
      // The entry is kept: switching back to that language makes it applicable again (spec FR-010).
      const named = entry.culture ?? 'the default language';
      return toolFailure(
        'languageChanged',
        `This recommendation was made for ${named}. Ask the user to switch the editor back to ${named} to apply it.`,
      );
    }

    return await this.#write(workspaceContext, culture, entry);
  }

  async #write(
    workspaceContext: DocumentWorkspaceContext,
    viewedCulture: string | null,
    entry: RecommendationEntry,
  ): Promise<ApplyResult | ToolFailure> {
    const { propertyAlias: alias, editorAlias, value } = entry;
    const propertyStructure = await workspaceContext.structure.getPropertyStructureByAlias(alias);
    if (!propertyStructure) return fail('propertyMissing');

    // Same variant ids as the editor's field (CMS content-workspace-property.element) and as applyRecommendedValue.
    const datasetVariantId = UmbVariantId.Create({ culture: viewedCulture, segment: null });
    const writesCulture =
      viewedCulture !== null && workspaceContext.getVariesByCulture() === true && propertyStructure.variesByCulture === true;
    const propertyVariantId = UmbVariantId.Create({ culture: writesCulture ? viewedCulture : null, segment: null });
    const readOnly =
      workspaceContext.readOnlyGuard.getIsPermittedForVariant(datasetVariantId) === true ||
      workspaceContext.propertyWriteGuard.getIsPermittedForVariantAndProperty(
        propertyVariantId,
        { unique: propertyStructure.unique },
        datasetVariantId,
      ) === false;
    if (readOnly) return fail('readOnly');

    const currentValue: unknown = workspaceContext.getPropertyValue(alias, propertyVariantId);
    if (isRichTextEditor(editorAlias) && !canApplyRichText(currentMarkup(currentValue), value)) {
      return fail('richTextBlocks');
    }
    const eligibility: EligibilityReport = {
      propertyEditorAliases: editorAlias === undefined ? {} : { [alias]: editorAlias },
      additionalRecommendableEditorAliases: entry.additionalRecommendableEditorAliases ?? [],
    };
    if (!canApply(alias, value, currentValue, eligibility)) return fail('notApplicable');

    const validationMessages = await getValidationMessages(workspaceContext);
    const written = await applyRecommendedValue(workspaceContext, alias, editorAlias, value, viewedCulture, validationMessages);
    if (!written) return fail('writeFailed');

    deleteRecommendation(entry.reference);
    return {
      success: true,
      propertyAlias: alias,
      culture: viewedCulture?.toLowerCase() ?? null,
      saved: false,
      message: STAGED_MESSAGE,
    };
  }
}

export { ApplyPageRecommendationToolApi as api };
export default ApplyPageRecommendationToolApi;
