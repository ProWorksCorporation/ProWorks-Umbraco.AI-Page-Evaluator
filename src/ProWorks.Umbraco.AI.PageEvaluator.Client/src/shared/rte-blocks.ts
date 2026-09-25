/**
 * Helpers for the rich-text Apply safeguard (FR-016, research R9).
 *
 * Umbraco.RichText values are `{ markup, blocks }`. Embedded blocks and inline blocks appear in the
 * markup as placeholders — `<umb-rte-block data-content-key="…"><!--Umbraco-Block--></umb-rte-block>`
 * (and `umb-rte-block-inline`) — that reference entries in `blocks`. The Delivery API output the
 * evaluator reads rewrites the attribute to `data-content-id` and drops the comment, so AI output may
 * use either form. Apply is only safe when the recommendation keeps every placeholder exactly once;
 * otherwise block data would be orphaned (the editor only prunes unused blocks on its own change events).
 */

/** Empty `blocks` envelope for a rich-text value with no embedded blocks. */
export interface RichTextBlocks {
  layout: Record<string, unknown>;
  contentData: unknown[];
  settingsData: unknown[];
  expose: unknown[];
}

/** Returns a fresh empty `blocks` envelope (never shared, so no block manager holds another value's arrays). */
export function createEmptyBlocks(): RichTextBlocks {
  return { layout: {}, contentData: [], settingsData: [], expose: [] };
}

/** Opening tag of a block or inline-block placeholder. */
const PLACEHOLDER_OPEN_TAG = /<umb-rte-block(?:-inline)?\b[^>]*>/gi;
/** The content-key attribute in either the editor (`key`) or Delivery API (`id`) form. */
const CONTENT_KEY_ATTRIBUTE = /\bdata-content-(?:key|id)\s*=\s*"([^"]*)"/i;
/** An empty placeholder element (opening tag immediately followed by its closing tag). */
const EMPTY_PLACEHOLDER = /(<umb-rte-block(-inline)?\b[^>]*>)\s*(<\/umb-rte-block\2>)/gi;

/** Returns the content keys of every block placeholder, in document order, duplicates preserved. */
export function extractBlockKeys(markup: string): string[] {
  const keys: string[] = [];
  for (const match of markup.matchAll(PLACEHOLDER_OPEN_TAG)) {
    const key = CONTENT_KEY_ATTRIBUTE.exec(match[0])?.[1];
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * Converts Delivery API placeholder markup back to the editor form:
 * `data-content-id` → `data-content-key`, and an empty placeholder gets its `<!--Umbraco-Block-->` comment back.
 */
export function normaliseBlockMarkup(markup: string): string {
  return markup
    .replace(PLACEHOLDER_OPEN_TAG, (tag) => tag.replace(/\bdata-content-id(\s*=)/i, 'data-content-key$1'))
    .replace(EMPTY_PLACEHOLDER, '$1<!--Umbraco-Block-->$3');
}

/**
 * True when applying `recommendedMarkup` over `currentMarkup` keeps every embedded item exactly once:
 * no placeholder missing, none duplicated, none unknown. Order doesn't matter.
 */
export function canApplyRichText(currentMarkup: string, recommendedMarkup: string): boolean {
  const recommended = extractBlockKeys(recommendedMarkup);
  const recommendedSet = new Set(recommended);
  if (recommendedSet.size !== recommended.length) return false;

  const currentSet = new Set(extractBlockKeys(currentMarkup));
  if (currentSet.size !== recommendedSet.size) return false;
  for (const key of currentSet) {
    if (!recommendedSet.has(key)) return false;
  }
  return true;
}
