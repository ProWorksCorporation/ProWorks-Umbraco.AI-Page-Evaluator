import { UmbVariantId } from '@umbraco-cms/backoffice/variant';
import type { UMB_DOCUMENT_WORKSPACE_CONTEXT } from '@umbraco-cms/backoffice/document';
import { createEmptyBlocks, normaliseBlockMarkup, type RichTextBlocks } from './rte-blocks.js';

/**
 * Writes an AI recommendation into the document being edited (FR-016, FR-018c).
 *
 * The value goes straight to the document workspace context with an explicit variant
 * (research R12.2). Umbraco.AI's `applyValueChange` is deliberately not used: it looks up the
 * current value culture-blind, and for editors without a value preparer it `JSON.parse`s plain
 * strings, so an answer such as `42`, `true` or `"quoted"` would be stored as the wrong type.
 */

type DocumentWorkspaceContext = typeof UMB_DOCUMENT_WORKSPACE_CONTEXT.TYPE;

const RICH_TEXT_EDITORS: ReadonlySet<string> = new Set(['Umbraco.RichText', 'Umbraco.TinyMCE']);

export function isRichTextEditor(editorAlias: string | undefined): boolean {
  return editorAlias !== undefined && RICH_TEXT_EDITORS.has(editorAlias);
}

/**
 * The Tags editor stores `string[]`. Recommendations arrive as a JSON array string (the enforced schema) or,
 * from some models, a comma- or newline-separated string. Umbraco.AI's `applyValueChange` used to
 * `JSON.parse` the former into an array for us; writing directly, we convert both here.
 */
function toTagArray(value: unknown): string[] {
  let items: unknown[];
  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === 'string') {
    let parsed: unknown = null;
    if (value.trim().startsWith('[')) {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = null;
      }
    }
    items = Array.isArray(parsed) ? parsed : value.split(/[,\n]/);
  } else {
    items = [];
  }
  const tags = items.map((item) => String(item).trim()).filter((tag) => tag.length > 0);
  return [...new Set(tags)];
}

interface RichTextValue {
  markup: string;
  blocks: RichTextBlocks;
}

function isRichTextBlocks(value: unknown): value is RichTextBlocks {
  return (
    typeof value === 'object' &&
    value !== null &&
    'layout' in value &&
    'contentData' in value &&
    Array.isArray(value.contentData)
  );
}

function currentBlocks(value: unknown): RichTextBlocks | null {
  if (typeof value !== 'object' || value === null || !('blocks' in value)) return null;
  return isRichTextBlocks(value.blocks) ? value.blocks : null;
}

/**
 * Applies `value` to the property `alias`.
 *
 * @param viewedCulture The culture the editor is viewing, or `null`. It is only used when both the
 *   document and the property vary by culture; otherwise the invariant slot is written (writing a
 *   culture to an invariant property would create a stray variant entry).
 * @returns `true` on success, `false` if the workspace rejected the write. Existing content is untouched on failure.
 */
export async function applyRecommendedValue(
  ctx: DocumentWorkspaceContext,
  alias: string,
  editorAlias: string | undefined,
  value: unknown,
  viewedCulture: string | null,
): Promise<boolean> {
  try {
    const property = await ctx.structure.getPropertyStructureByAlias(alias);
    const culture =
      viewedCulture !== null && ctx.getVariesByCulture() === true && property?.variesByCulture === true
        ? viewedCulture
        : null;
    const variantId = UmbVariantId.Create({ culture, segment: null });

    let writeValue: unknown = value;
    if (isRichTextEditor(editorAlias)) {
      const current: unknown = ctx.getPropertyValue(alias, variantId);
      const richText: RichTextValue = {
        // Recommendations for rich text are always HTML strings; anything else is not applicable markup.
        markup: normaliseBlockMarkup(typeof value === 'string' ? value : ''),
        blocks: currentBlocks(current) ?? createEmptyBlocks(),
      };
      writeValue = richText;
    } else if (editorAlias === 'Umbraco.Tags') {
      writeValue = toTagArray(value);
    }

    await ctx.setPropertyValue(alias, writeValue, variantId);
    return true;
  } catch {
    return false;
  }
}
