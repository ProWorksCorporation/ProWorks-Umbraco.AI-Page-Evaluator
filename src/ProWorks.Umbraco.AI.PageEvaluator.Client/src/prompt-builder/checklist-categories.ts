/**
 * T056 — Static checklist categories for the Prompt Builder.
 *
 * Each category contributes a promptFragment template that is assembled
 * into the generated evaluation prompt. Placeholders:
 *   {{propertyAliases}} — comma-separated list of doc type property aliases
 *   {{siteContext}}     — free-text site context entered by the admin
 */

import type { ChecklistCategory } from '../shared/types.js';

export const CHECKLIST_CATEGORIES: readonly ChecklistCategory[] = [
  {
    id: 'required-fields',
    label: 'Required Fields',
    promptFragment:
      'Verify that all required fields are populated. ' +
      'The document type has the following properties: {{propertyAliases}}. ' +
      'Check each one and report any that are empty or missing. ' +
      'Site context: {{siteContext}}',
  },
  {
    id: 'metadata-seo',
    label: 'Metadata & SEO',
    promptFragment:
      'Evaluate the SEO metadata for this page. ' +
      'Check the following property aliases for SEO-relevant content: {{propertyAliases}}. ' +
      'Verify meta description length (max 160 chars), browser title length (max 60 chars), ' +
      'and Open Graph tags if present. ' +
      'Site context: {{siteContext}}',
  },
  {
    id: 'content-quality',
    label: 'Content Quality',
    promptFragment:
      'Assess the content quality of this page. ' +
      'The page properties are: {{propertyAliases}}. ' +
      'Check for spelling/grammar issues, appropriate reading level, ' +
      'sufficient content length, and clear headings structure. ' +
      'Site context: {{siteContext}}',
  },
  {
    id: 'schema-structured-data',
    label: 'Schema & Structured Data',
    promptFragment:
      'Evaluate schema markup and structured data opportunities for this page. ' +
      'Review properties: {{propertyAliases}}. ' +
      'Identify which fields map to schema.org types and whether structured data ' +
      'is present or recommended. ' +
      'Site context: {{siteContext}}',
  },
  {
    id: 'accessibility-visibility',
    label: 'Accessibility & Visibility',
    promptFragment:
      'Review this page for accessibility and discoverability. ' +
      'Properties to evaluate: {{propertyAliases}}. ' +
      'Check for descriptive image alt text, meaningful link labels, ' +
      'logical heading hierarchy, and robots/sitemap inclusion. ' +
      'Site context: {{siteContext}}',
  },
  {
    id: 'calls-to-action',
    label: 'Calls to Action',
    promptFragment:
      'Evaluate the calls to action on this page. ' +
      'Review the following properties: {{propertyAliases}}. ' +
      'Check for clear, actionable CTAs, appropriate placement, ' +
      'and alignment with the page goal. ' +
      'Site context: {{siteContext}}',
  },
] as const;
