import { isRichTextEditor } from './apply-value.js';
import { canApplyRichText } from './rte-blocks.js';
import { currentMarkup } from './recommend-input.js';
import type { CheckStatus, EvaluationReportResponse } from './types.js';

/**
 * Which fields get Recommend and Apply (FR-016; 006 FR-005). Shared by the Evaluate Page report and the Copilot
 * tools so both offer exactly the same fields.
 */

/** Editors with full Recommend + Apply. Rich text Apply additionally needs the embedded-block check (`canApply`). */
export const FULL_RECOMMEND_EDITORS: ReadonlySet<string> = new Set([
  'Umbraco.TextBox',
  'Umbraco.TextArea',
  'Umbraco.Markdown',
  'Umbraco.Tags',
  'Umbraco.RichText',
  'Umbraco.TinyMCE',
]);

/** The parts of a report eligibility depends on. */
export type EligibilityReport = Pick<
  EvaluationReportResponse,
  'propertyEditorAliases' | 'additionalRecommendableEditorAliases'
>;

/** A field the report offers a recommendation for (model-report `recommendable`). */
export interface RecommendableField {
  readonly propertyAlias: string;
  readonly propertyName: string;
  readonly checkId: number;
  readonly checkStatus: Exclude<CheckStatus, 'Pass'>;
  readonly canApply: boolean;
}

/** True when `editorAlias` is one of the site's additional recommendable editors (case-insensitive). */
export function isAdditionalEditor(editorAlias: string, report: EligibilityReport): boolean {
  const wanted = editorAlias.toLowerCase();
  return report.additionalRecommendableEditorAliases.some((a) => a.toLowerCase() === wanted);
}

/** Without editor info, only values that look like plain text qualify (not JSON, not a UDI). */
function looksLikePlainText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trimStart();
  if (trimmed.length === 0) return true;
  return trimmed[0] !== '{' && trimmed[0] !== '[' && !trimmed.startsWith('umb://');
}

/** Editor rule shared by Recommend and Apply; falls back to the value heuristic when the editor is unknown. */
function editorQualifies(alias: string, report: EligibilityReport, currentValue: unknown): boolean {
  const editorAlias = report.propertyEditorAliases[alias];
  if (editorAlias !== undefined) {
    return FULL_RECOMMEND_EDITORS.has(editorAlias) || isAdditionalEditor(editorAlias, report);
  }
  return looksLikePlainText(currentValue);
}

/**
 * True when a recommendation can be offered for `alias`. Uses the report's editor map first; when it has no
 * entry (e.g. the server couldn't resolve the document type) the current value decides.
 */
export function canRecommend(alias: string, report: EligibilityReport, currentValue?: unknown): boolean {
  return editorQualifies(alias, report, currentValue);
}

/**
 * True when `recommended` can be written into `alias`. Rich text is applicable only when the recommendation keeps
 * every embedded block placeholder of the current value exactly once (FR-016).
 */
export function canApply(
  alias: string,
  recommended: string | null,
  currentValue: unknown,
  report: EligibilityReport,
): boolean {
  if (isRichTextEditor(report.propertyEditorAliases[alias])) {
    return recommended !== null && canApplyRichText(currentMarkup(currentValue), recommended);
  }
  return editorQualifies(alias, report, currentValue);
}

/**
 * The fields a report offers recommendations for: each recommendable alias once, under the first Fail check naming
 * it, otherwise the first Warn check. Empty when the configuration has recommendations disabled. `canApply` is the
 * rule without a value: the rich-text block check can only run once there is a recommendation.
 */
export function recommendableFields(
  report: EvaluationReportResponse,
  properties: Readonly<Record<string, unknown>> = {},
): RecommendableField[] {
  if (!report.recommendationsEnabled) return [];

  const fields: RecommendableField[] = [];
  const seen = new Set<string>();
  for (const status of ['Fail', 'Warn'] as const) {
    for (const check of report.checks) {
      if (check.status !== status) continue;
      for (const alias of check.propertyAliases ?? []) {
        if (seen.has(alias) || !canRecommend(alias, report, properties[alias])) continue;
        seen.add(alias);
        fields.push({
          propertyAlias: alias,
          propertyName: report.propertyNames[alias] ?? alias,
          checkId: check.checkNumber,
          checkStatus: status,
          canApply: editorQualifies(alias, report, properties[alias]),
        });
      }
    }
  }
  return fields;
}
