import { UmbModalToken } from '@umbraco-cms/backoffice/modal';
import type { EvaluatePageRequest } from '../shared/types.js';

/**
 * Modal data passed when opening the evaluation slide-in dialog.
 * Carries the node context needed to call POST /evaluate.
 */
export interface EvaluationModalData extends EvaluatePageRequest {
  /**
   * True when the viewed culture has no content yet (FR-018 edge case): the modal shows
   * evaluatePage_cultureNotCreatedMessage and makes no API call.
   */
  readonly cultureNotCreated: boolean;
}

/** No return value — the modal is informational only. */
export type EvaluationModalValue = Record<string, never>;

/**
 * UmbModalToken for the page evaluation slide-in dialog.
 * type: 'sidebar' renders as a slide-in panel from the right.
 *
 * Usage:
 * ```typescript
 * modalContext.open(this, EVALUATION_MODAL, { data: { nodeId, documentTypeAlias, properties } });
 * ```
 */
export const EVALUATION_MODAL = new UmbModalToken<EvaluationModalData, EvaluationModalValue>(
  'ProWorks.AI.PageEvaluator.Modal.Evaluation',
  { modal: { type: 'sidebar', size: 'medium' } },
);
