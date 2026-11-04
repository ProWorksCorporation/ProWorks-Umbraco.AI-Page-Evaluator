import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { evaluatePage, getActiveConfiguration, getCachedEvaluation } from '../shared/api-client.js';
import type { EvaluationReportResponse } from '../shared/types.js';
import { toModelReport } from './model-report.js';
import { forgetOtherPages, resolveOpenDocument } from './open-document.js';
import { snapshotOf, storeReport } from './report-store.js';
import { TOOL_ERROR_MESSAGES, toolFailureFromError } from './tool-error.js';
import { toolFailure, type ModelReport, type PageEvaluatorToolApi, type ToolFailure } from './types.js';

/**
 * Copilot tool `evaluate_current_page` (contracts/copilot-tools.md §1): evaluates the page open in the editor with
 * the values on screen, for the viewed language, and returns the model-facing report. Never throws.
 *
 * The active configuration is read first (alongside the cache): it gives the report its `configName` and
 * `scoring` shape, and lets "no configuration" be reported without an evaluation request.
 */
export class EvaluateCurrentPageToolApi extends UmbControllerBase implements PageEvaluatorToolApi {
  async execute(args: Record<string, unknown>): Promise<ModelReport | ToolFailure> {
    try {
      return await this.#evaluate(args['fresh'] === true);
    } catch (err) {
      return toolFailureFromError(err);
    }
  }

  async #evaluate(fresh: boolean): Promise<ModelReport | ToolFailure> {
    const open = await resolveOpenDocument(this);
    if (!open.ok) return open.failure;
    const { workspaceContext, nodeId, documentTypeAlias, culture, properties, name } = open.document;
    forgetOtherPages(nodeId);

    const [config, cached] = await Promise.all([
      getActiveConfiguration(documentTypeAlias),
      fresh ? Promise.resolve(null) : getCachedEvaluation(nodeId, culture),
    ]);
    if (config === null) return toolFailure('noActiveConfig', TOOL_ERROR_MESSAGES.noActiveConfig);

    let report: EvaluationReportResponse;
    let fromCache: boolean;
    let unsavedChanges: boolean;
    if (cached !== null) {
      report = cached;
      fromCache = true;
      unsavedChanges = workspaceContext.getHasUnpersistedChanges();
      storeReport(nodeId, culture, report, snapshotOf(properties), false);
    } else {
      // Same request as the Evaluate Page modal: counts against the rate limit and updates the cache.
      report = await evaluatePage({ nodeId, documentTypeAlias, culture, properties });
      fromCache = false;
      unsavedChanges = false;
      storeReport(nodeId, culture, report, snapshotOf(properties), true);
    }

    return toModelReport(report, {
      page: { nodeId, name, documentTypeAlias, culture },
      configName: config.name,
      scoringEnabled: config.scoringEnabled,
      fromCache,
      unsavedChanges,
      properties,
    });
  }
}

export { EvaluateCurrentPageToolApi as api };
export default EvaluateCurrentPageToolApi;
