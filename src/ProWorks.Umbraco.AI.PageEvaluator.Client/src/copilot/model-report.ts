import { recommendableFields } from '../shared/recommend-eligibility.js';
import type { EvaluationReportResponse } from '../shared/types.js';
import type { ModelOutOfDateReason, ModelReport, ModelReportPage, ModelScoring } from './types.js';

/**
 * Turns an `EvaluationReportResponse` into the model-facing report (contracts/model-report.md). The server's
 * `evaluate_page` tool produces the same shape; `tests/fixtures/model-report/` pins both.
 */

/** Model-facing hints (English; the model relays them in the conversation's language). */
export const OUT_OF_DATE_NOTE =
  'This report may not reflect the latest changes. Offer to run a fresh evaluation before recommending.';
export const PARSE_FAILED_NOTE = "The AI response couldn't be read as a report. A fresh evaluation may help.";

/** What the tool knows besides the response body. */
export interface ModelReportContext {
  /** The page; `culture` may be the workspace's casing (e.g. `da-DK`), it is lower-cased when the response has none. */
  readonly page: ModelReportPage;
  readonly configName: string;
  /** From the active configuration: decides between `scoring: null` and a scoring object. */
  readonly scoringEnabled: boolean;
  readonly fromCache: boolean;
  /** `workspaceContext.getHasUnpersistedChanges()`; always false right after a fresh evaluation. */
  readonly unsavedChanges: boolean;
  /** Captured values, used only by the eligibility heuristic when the report has no editor map. Never output. */
  readonly properties?: Readonly<Record<string, unknown>>;
}

function toIsoUtc(value: string | null): string | null {
  if (value === null) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export function toModelReport(response: EvaluationReportResponse, context: ModelReportContext): ModelReport {
  const outOfDateReasons: ModelOutOfDateReason[] = [];
  if (response.savedSinceEvaluation === true) outOfDateReasons.push('savedSinceEvaluation');
  if (context.unsavedChanges) outOfDateReasons.push('unsavedChanges');

  const parseFailed = response.parseFailed;
  const scoring: ModelScoring | null =
    context.scoringEnabled && !parseFailed
      ? {
          overallScore: response.overallScore,
          axisScores: (response.axisScores ?? []).map((axis) => ({
            name: axis.name,
            score: axis.score,
            feedback: axis.feedback,
          })),
        }
      : null;

  const notes: string[] = [];
  if (parseFailed) notes.push(PARSE_FAILED_NOTE);
  if (outOfDateReasons.length > 0) notes.push(OUT_OF_DATE_NOTE);

  const report: ModelReport = {
    success: true,
    page: {
      nodeId: context.page.nodeId,
      name: context.page.name,
      documentTypeAlias: context.page.documentTypeAlias,
      culture: response.culture ?? context.page.culture?.toLowerCase() ?? null,
    },
    configName: context.configName,
    evaluatedAt: toIsoUtc(response.cachedAt),
    fromCache: context.fromCache,
    outOfDate: outOfDateReasons.length > 0,
    outOfDateReasons,
    parseFailed,
    scoring,
    checks: parseFailed
      ? []
      : response.checks.map((check) => ({
          id: check.checkNumber,
          title: check.label,
          status: check.status,
          explanation: check.explanation,
          propertyAliases: check.propertyAliases ?? [],
        })),
    suggestions: response.suggestions,
    recommendationsEnabled: response.recommendationsEnabled,
    recommendable: parseFailed ? [] : recommendableFields(response, context.properties),
  };
  return notes.length > 0 ? { ...report, note: notes.join(' ') } : report;
}
