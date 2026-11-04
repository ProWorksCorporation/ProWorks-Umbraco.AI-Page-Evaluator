/**
 * Local declarations for the Copilot frontend tools (006 research R5, contracts/copilot-tools.md).
 *
 * The Agent.UI manifest and API shapes are declared here instead of being imported from `@umbraco-ai/agent-ui` /
 * `@umbraco-ai/core`: this package must not depend on the Agent packages (spec FR-012), and nothing under
 * `src/copilot/` may import `@umbraco-ai/*` (checked by `copilot-manifests.test.ts`).
 */
import { UmbContextToken } from '@umbraco-cms/backoffice/context-api';
import type { ManifestApi, UmbApi } from '@umbraco-cms/backoffice/extension-api';
import type { RecommendableField } from '../shared/recommend-eligibility.js';
import type { CheckStatus } from '../shared/types.js';

// ---------------------------------------------------------------------------
// Agent.UI (mirrors Umbraco.AI.Agent.UI 17.3 `ManifestUaiAgentFrontendTool` / `UaiAgentToolApi`)
// ---------------------------------------------------------------------------

/** A frontend tool API: Agent.UI calls `execute` with the model's arguments and JSON-stringifies the result. */
export interface PageEvaluatorToolApi extends UmbApi {
  execute(args: Record<string, unknown>): Promise<unknown>;
}

/** HITL approval: `true` for Agent.UI's defaults, or a static config for its default approval element. */
export type PageEvaluatorToolApproval = true | { readonly config?: Record<string, unknown> };

/** Manifest of type `uaiAgentFrontendTool`. */
export interface PageEvaluatorFrontendToolManifest extends ManifestApi<PageEvaluatorToolApi> {
  type: 'uaiAgentFrontendTool';
  meta: {
    /** Tool name the model calls. */
    toolName: string;
    /** Instructions for the model (English). */
    description: string;
    /** JSON Schema of the arguments. */
    parameters: Record<string, unknown>;
    /** Tool scope id; checked server-side against `[AIToolScope]` classes. */
    scope?: string;
    /** Permission metadata only; it does not prompt (research R5). */
    isDestructive?: boolean;
    /** Drives the approval prompt before `execute` runs. */
    approval?: PageEvaluatorToolApproval;
  };
}

// ---------------------------------------------------------------------------
// Umbraco.AI entity adapter (mirrors `UaiEntityAdapterContext` / `UaiDetectedEntity`)
// ---------------------------------------------------------------------------

/** The entity the Copilot user has selected. */
export interface SelectedEntityLike {
  readonly entityContext: { readonly entityType: string; readonly unique: string | null };
  /** The live workspace context of the entity (the document workspace context for documents). */
  readonly workspaceContext: object | null | undefined;
}

/** The part of Copilot's `UaiEntityAdapterContext` the tools use. */
export interface EntityAdapterContextLike {
  getHostElement(): Element;
  getSelectedEntity(): SelectedEntityLike | undefined;
}

/**
 * Copilot provides its entity adapter context globally under the alias `UaiEntityAdapterContext`. Context
 * consumption matches by alias, so this locally declared token resolves to that instance (research R5).
 */
export const UAI_ENTITY_ADAPTER_CONTEXT = new UmbContextToken<EntityAdapterContextLike>('UaiEntityAdapterContext');

// ---------------------------------------------------------------------------
// Model-facing report (contracts/model-report.md, data-model §4)
// ---------------------------------------------------------------------------

export type ModelOutOfDateReason = 'savedSinceEvaluation' | 'unsavedChanges';

export interface ModelReportPage {
  readonly nodeId: string;
  /** The page name in the viewed culture; null when unknown. */
  readonly name: string | null;
  readonly documentTypeAlias: string;
  /** Lower-cased ISO code; null for invariant documents. */
  readonly culture: string | null;
}

export interface ModelCheck {
  readonly id: number;
  readonly title: string;
  readonly status: CheckStatus;
  readonly explanation: string | null;
  readonly propertyAliases: readonly string[];
}

export interface ModelAxisScore {
  readonly name: string;
  readonly score: number;
  readonly feedback: string | null;
}

export interface ModelScoring {
  readonly overallScore: number | null;
  readonly axisScores: readonly ModelAxisScore[];
}

export interface ModelReport {
  readonly success: true;
  readonly page: ModelReportPage;
  readonly configName: string;
  /** ISO-8601 UTC with milliseconds (`Date.toISOString()`); null when the response had no time. */
  readonly evaluatedAt: string | null;
  readonly fromCache: boolean;
  readonly outOfDate: boolean;
  readonly outOfDateReasons: readonly ModelOutOfDateReason[];
  readonly parseFailed: boolean;
  /** Null when the configuration has scoring disabled (and when the AI response couldn't be read). */
  readonly scoring: ModelScoring | null;
  readonly checks: readonly ModelCheck[];
  readonly suggestions: string | null;
  readonly recommendationsEnabled: boolean;
  readonly recommendable: readonly RecommendableField[];
  /** English hint for the model. */
  readonly note?: string;
}

/** Error codes shared by the Copilot tools and the `evaluate_page` server tool. */
export type ToolErrorCode =
  | 'noOpenPage'
  | 'pageNotSaved'
  | 'cultureNotCreated'
  | 'invalidCulture'
  | 'notFound'
  | 'forbidden'
  | 'noActiveConfig'
  | 'rateLimited'
  | 'guardrailBlocked'
  | 'providerUnavailable'
  | 'providerConfiguration'
  | 'networkError'
  | 'unexpected'
  | 'invalidArguments'
  // recommend_page_values / apply_page_recommendation
  | 'noReport'
  | 'recommendationsDisabled'
  | 'reportOutOfDate'
  | 'unknownRecommendation'
  | 'differentPage'
  | 'languageChanged'
  | 'propertyMissing'
  | 'readOnly'
  | 'notApplicable'
  | 'richTextBlocks'
  | 'writeFailed';

export interface ToolError {
  readonly code: ToolErrorCode;
  /** English, model-facing; never a raw HTTP body or stack trace (spec FR-014). */
  readonly message: string;
}

export interface ToolFailure {
  readonly success: false;
  readonly error: ToolError;
}

export function toolFailure(code: ToolErrorCode, message: string): ToolFailure {
  return { success: false, error: { code, message } };
}
