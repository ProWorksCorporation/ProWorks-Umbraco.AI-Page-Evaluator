/**
 * Shared TypeScript interfaces mirroring all API request/response shapes
 * from contracts/management-api.md.
 *
 * Constitution Principle I: strict typings, no `any`.
 */

// ---------------------------------------------------------------------------
// Evaluator Configuration
// ---------------------------------------------------------------------------

/** A single EvaluatorConfiguration as returned by GET /configurations and GET /configurations/{id}. */
export interface EvaluatorConfigItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly documentTypeAlias: string;
  readonly documentTypeName: string | null;
  readonly profileId: string;
  readonly profileName: string | null;
  readonly contextId: string | null;
  readonly contextName: string | null;
  readonly promptText: string;
  readonly isActive: boolean;
  readonly dateCreated: string; // ISO 8601
  readonly dateModified: string; // ISO 8601
  readonly propertyAliases: string[] | null;
  readonly version: number;
}

/** Response body for GET /configurations. */
export interface EvaluatorConfigListResponse {
  readonly items: readonly EvaluatorConfigItem[];
  readonly total: number;
}

/** Request body for POST /configurations. */
export interface CreateEvaluatorConfigRequest {
  readonly name: string;
  readonly documentTypeAlias: string;
  readonly profileId: string;
  readonly contextId?: string | null;
  readonly promptText: string;
  readonly description?: string | null;
  readonly propertyAliases?: string[] | null;
}

/** Request body for PUT /configurations/{id}. */
export interface UpdateEvaluatorConfigRequest {
  readonly name: string;
  readonly documentTypeAlias: string;
  readonly profileId: string;
  readonly contextId?: string | null;
  readonly promptText: string;
  readonly description?: string | null;
  readonly propertyAliases?: string[] | null;
  readonly version: number;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export type CheckStatus = 'Pass' | 'Fail' | 'Warn';

/** A single check result within an EvaluationReport. */
export interface CheckResult {
  readonly checkNumber: number;
  readonly status: CheckStatus;
  readonly label: string;
  readonly explanation: string | null;
}

/** Overall pass/total score. */
export interface EvaluationScore {
  readonly passed: number;
  readonly total: number;
  readonly displayText: string;
}

/**
 * Response body for POST /evaluate and GET /evaluate/cached/{nodeId}.
 * When parseFailed is true, score is null and checks is empty; rawResponse contains the AI output.
 * cachedAt is the UTC ISO-8601 timestamp when the result was saved; always populated on success.
 */
export interface EvaluationReportResponse {
  readonly parseFailed: boolean;
  readonly score: EvaluationScore | null;
  readonly checks: readonly CheckResult[];
  readonly suggestions: string | null;
  readonly rawResponse: string | null;
  readonly cachedAt: string | null;
}

/** Request body for POST /evaluate. */
export interface EvaluatePageRequest {
  readonly nodeId: string;
  readonly documentTypeAlias: string;
  readonly properties: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Prompt Builder (front-end only — never sent to server)
// ---------------------------------------------------------------------------

export interface DocumentTypePropertySummary {
  readonly alias: string;
  readonly label: string;
  readonly groupName: string;
  readonly editorAlias: string;
}

export interface ChecklistCategory {
  readonly id: string;
  readonly label: string;
  readonly promptFragment: string;
}
