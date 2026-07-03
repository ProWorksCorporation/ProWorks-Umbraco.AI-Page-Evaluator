/**
 * Per-check-item recommendation UI state.
 * Applied and copied state is tracked per-alias separately in EvaluationReportElement.
 */
export type RecommendationState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'generating' }
  | { readonly kind: 'result'; readonly values: Record<string, string | null> }
  | { readonly kind: 'error'; readonly category?: string | null };
