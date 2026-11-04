import { UmbControllerBase } from '@umbraco-cms/backoffice/class-api';
import { getCachedEvaluation, recommend } from '../shared/api-client.js';
import { isRichTextEditor } from '../shared/apply-value.js';
import { canApply, canRecommend } from '../shared/recommend-eligibility.js';
import { recommendInputProperties } from '../shared/recommend-input.js';
import type { CheckResult, EvaluationReportResponse } from '../shared/types.js';
import { forgetOtherPages, resolveOpenDocument, type OpenDocument } from './open-document.js';
import { addRecommendation } from './recommendation-store.js';
import { getStoredReport, snapshotOf } from './report-store.js';
import { TOOL_ERROR_MESSAGES, toToolError, toolFailureFromError } from './tool-error.js';
import { toolFailure, type PageEvaluatorToolApi, type ToolError, type ToolFailure } from './types.js';

/**
 * Copilot tool `recommend_page_values` (contracts/copilot-tools.md §2): AI-recommended values for fields named by
 * failing or warning checks in the current, up-to-date report of the open page. Each recommendation gets a reference
 * that `apply_page_recommendation` redeems. Never throws and never writes to the page.
 */

export type SkipReason = 'notFailing' | 'notRecommendable' | 'noRecommendation';

export interface ToolRecommendation {
  readonly reference: string;
  readonly propertyAlias: string;
  readonly propertyName: string;
  readonly checkId: number;
  readonly value: string;
  readonly canApply: boolean;
  readonly applyBlockedReason?: 'richTextBlocks';
}

export interface RecommendResult {
  readonly success: boolean;
  /** Lower-cased culture; null for invariant documents. */
  readonly culture: string | null;
  readonly recommendations: readonly ToolRecommendation[];
  readonly skipped: ReadonlyArray<{ readonly propertyAlias: string; readonly reason: SkipReason }>;
  /** Set when a request failed part-way; `recommendations` holds what succeeded before it. */
  readonly error?: ToolError & { readonly checkId: number };
}

function parseAliases(args: Record<string, unknown>): string[] | null {
  const raw = args['propertyAliases'];
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const aliases: string[] = [];
  for (const item of raw as unknown[]) {
    if (typeof item !== 'string' || item.trim() === '') return null;
    if (!aliases.includes(item)) aliases.push(item);
  }
  return aliases;
}

/** The first Fail check naming `alias`, otherwise the first Warn check. */
function failingCheckFor(alias: string, report: EvaluationReportResponse): CheckResult | undefined {
  const names = (check: CheckResult): boolean => (check.propertyAliases ?? []).includes(alias);
  return (
    report.checks.find((c) => c.status === 'Fail' && names(c)) ?? report.checks.find((c) => c.status === 'Warn' && names(c))
  );
}

export class RecommendPageValuesToolApi extends UmbControllerBase implements PageEvaluatorToolApi {
  async execute(args: Record<string, unknown>): Promise<RecommendResult | ToolFailure> {
    try {
      return await this.#recommend(args);
    } catch (err) {
      return toolFailureFromError(err);
    }
  }

  async #recommend(args: Record<string, unknown>): Promise<RecommendResult | ToolFailure> {
    const aliases = parseAliases(args);
    if (aliases === null) return toolFailure('invalidArguments', TOOL_ERROR_MESSAGES.invalidArguments);

    const open = await resolveOpenDocument(this);
    if (!open.ok) return open.failure;
    const document = open.document;
    forgetOtherPages(document.nodeId);

    const current = await this.#currentReport(document);
    if (current === null) return toolFailure('noReport', TOOL_ERROR_MESSAGES.noReport);
    const { report, upToDate } = current;
    if (!report.recommendationsEnabled) {
      return toolFailure('recommendationsDisabled', TOOL_ERROR_MESSAGES.recommendationsDisabled);
    }
    if (!upToDate) return toolFailure('reportOutOfDate', TOOL_ERROR_MESSAGES.reportOutOfDate);

    const { nodeId, culture, properties } = document;
    const skipped: Array<{ propertyAlias: string; reason: SkipReason }> = [];
    const groups = new Map<number, { check: CheckResult; aliases: string[] }>();
    for (const alias of aliases) {
      const check = failingCheckFor(alias, report);
      if (check === undefined) {
        skipped.push({ propertyAlias: alias, reason: 'notFailing' });
      } else if (!canRecommend(alias, report, properties[alias])) {
        skipped.push({ propertyAlias: alias, reason: 'notRecommendable' });
      } else {
        const group = groups.get(check.checkNumber) ?? { check, aliases: [] };
        group.aliases.push(alias);
        groups.set(check.checkNumber, group);
      }
    }

    const resultCulture = report.culture ?? culture?.toLowerCase() ?? null;
    const inputProperties = recommendInputProperties(properties, report.propertyEditorAliases);
    const recommendations: ToolRecommendation[] = [];
    for (const { check, aliases: checkAliases } of groups.values()) {
      let recommendedValues: Record<string, string | null>;
      try {
        ({ recommendedValues } = await recommend({
          nodeId,
          culture,
          propertyAliases: checkAliases,
          checkLabel: check.label,
          checkExplanation: check.explanation ?? null,
          properties: inputProperties,
        }));
      } catch (err) {
        return { success: false, culture: resultCulture, recommendations, skipped, error: { ...toToolError(err), checkId: check.checkNumber } };
      }

      for (const alias of checkAliases) {
        const value = recommendedValues[alias];
        if (typeof value !== 'string') {
          skipped.push({ propertyAlias: alias, reason: 'noRecommendation' });
          continue;
        }
        const editorAlias = report.propertyEditorAliases[alias];
        const entry = addRecommendation({
          nodeId,
          culture,
          propertyAlias: alias,
          editorAlias,
          value,
          additionalRecommendableEditorAliases: report.additionalRecommendableEditorAliases,
        });
        const applicable = canApply(alias, value, properties[alias], report);
        recommendations.push({
          reference: entry.reference,
          propertyAlias: alias,
          propertyName: report.propertyNames[alias] ?? alias,
          checkId: check.checkNumber,
          value,
          canApply: applicable,
          ...(!applicable && isRichTextEditor(editorAlias) ? { applyBlockedReason: 'richTextBlocks' as const } : {}),
        });
      }
    }

    return { success: true, culture: resultCulture, recommendations, skipped };
  }

  /**
   * The report for the open page and whether it still matches the page (spec FR-002a). A report this tool evaluated
   * fresh is up to date while the captured values equal the evaluated ones (unsaved values included). Any other
   * report must be neither saved over nor have unsaved changes, and the values must not have changed since it was
   * read (a later save would otherwise go unnoticed).
   */
  async #currentReport(
    document: OpenDocument,
  ): Promise<{ report: EvaluationReportResponse; upToDate: boolean } | null> {
    const { nodeId, culture, properties, workspaceContext } = document;
    const snapshot = snapshotOf(properties);
    const stored = getStoredReport(nodeId, culture);
    if (stored?.fresh === true) return { report: stored.report, upToDate: stored.snapshot === snapshot };

    const report = stored?.report ?? (await getCachedEvaluation(nodeId, culture));
    if (report === null) return null;
    const upToDate =
      report.savedSinceEvaluation !== true &&
      !workspaceContext.getHasUnpersistedChanges() &&
      (stored === undefined || stored.snapshot === snapshot);
    return { report, upToDate };
  }
}

export { RecommendPageValuesToolApi as api };
export default RecommendPageValuesToolApi;
