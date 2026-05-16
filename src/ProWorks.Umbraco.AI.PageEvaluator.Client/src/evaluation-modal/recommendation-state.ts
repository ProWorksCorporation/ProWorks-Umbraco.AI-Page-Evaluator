/**
 * Per-check-item recommendation UI state.
 * Lit renders the appropriate UI for each state kind.
 */
export type RecommendationState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'generating' }
  | { readonly kind: 'result'; readonly value: string | null }
  | { readonly kind: 'applied'; readonly value: string | null }
  | { readonly kind: 'error' };
