import { isRichTextEditor } from './apply-value.js';

/**
 * How current property values are sent to `POST /recommend` (moved out of `EvaluationReportElement` for the
 * Copilot `recommend_page_values` tool, 006 FR-005): rich text as its markup, strings as-is, anything else as JSON.
 */

/** The current rich-text markup of a value: a markup string, or the `.markup` of a `{ markup, blocks }` value; else `''`. */
export function currentMarkup(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'markup' in value && typeof value.markup === 'string') {
    return value.markup;
  }
  return '';
}

/** The string sent to /recommend as a property's current value (rich text → its markup). */
export function recommendInputValue(editorAlias: string | undefined, value: unknown): string {
  if (isRichTextEditor(editorAlias)) return currentMarkup(value);
  return typeof value === 'string' ? value : JSON.stringify(value ?? '');
}

/** Converts every captured value with {@link recommendInputValue}. */
export function recommendInputProperties(
  properties: Readonly<Record<string, unknown>>,
  propertyEditorAliases: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(properties).map(([alias, value]) => [alias, recommendInputValue(propertyEditorAliases[alias], value)]),
  );
}
