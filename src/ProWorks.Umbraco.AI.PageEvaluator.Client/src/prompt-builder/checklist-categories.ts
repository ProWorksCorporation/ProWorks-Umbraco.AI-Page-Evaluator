/**
 * T056 — Static checklist categories for the Prompt Builder.
 *
 * Each category contributes a promptFragment template that is assembled
 * into the generated evaluation prompt. Placeholders:
 *   {{propertyAliases}} — comma-separated list of doc type property aliases
 *   {{siteContext}}     — free-text site context entered by the admin
 *
 * scoringDimension is used when scoringEnabled is true to generate structured
 * evaluation axes with score 1/3/5 descriptors.
 */

import type { ChecklistCategory } from '../shared/types.js';

export const CHECKLIST_CATEGORIES: readonly ChecklistCategory[] = [
  {
    id: 'required-fields',
    labelKey: 'promptBuilder_categoryRequiredFields',
    promptFragment:
      'Verify that all required fields are populated. ' +
      'The document type has the following properties: {{propertyAliases}}. ' +
      'Check each one and report any that are empty or missing. ' +
      'Site context: {{siteContext}}',
    scoringDimension: {
      name: 'Required Field Completeness',
      scoreHigh: 'All required fields are populated with meaningful content; no empty or placeholder values.',
      scoreMid: 'Most required fields are populated, but 1–2 contain minimal or missing content.',
      scoreLow: 'Multiple required fields are empty or missing; the page is not ready to publish.',
    },
  },
  {
    id: 'metadata-seo',
    labelKey: 'promptBuilder_categoryMetadataSeo',
    promptFragment:
      'Evaluate the SEO metadata for this page. ' +
      'Check the following property aliases for SEO-relevant content: {{propertyAliases}}. ' +
      'Verify meta description length (max 160 chars), browser title length (max 60 chars), ' +
      'and Open Graph tags if present. ' +
      'Site context: {{siteContext}}',
    scoringDimension: {
      name: 'SEO Metadata Quality',
      scoreHigh: 'Meta description (120–160 chars), browser title (50–60 chars), and Open Graph tags are all present, unique, and keyword-rich.',
      scoreMid: 'Some SEO fields present but others are missing or outside optimal length ranges.',
      scoreLow: 'No meta description or browser title; page will not perform well in search results.',
    },
  },
  {
    id: 'content-quality',
    labelKey: 'promptBuilder_categoryContentQuality',
    promptFragment:
      'Assess the content quality of this page. ' +
      'The page properties are: {{propertyAliases}}. ' +
      'Check for spelling/grammar issues, appropriate reading level, ' +
      'sufficient content length, and clear headings structure. ' +
      'Site context: {{siteContext}}',
    scoringDimension: {
      name: 'Content Quality',
      scoreHigh: 'Clear, error-free prose at an appropriate reading level; sufficient length; logical heading structure; compelling and relevant.',
      scoreMid: 'Readable but has some grammar issues, thin content, or unclear headings.',
      scoreLow: 'Significant errors, extremely thin content, or content that is off-topic or incoherent.',
    },
  },
  {
    id: 'schema-structured-data',
    labelKey: 'promptBuilder_categorySchemaStructuredData',
    promptFragment:
      'Evaluate schema markup and structured data opportunities for this page. ' +
      'Review properties: {{propertyAliases}}. ' +
      'Identify which fields map to schema.org types and whether structured data ' +
      'is present or recommended. ' +
      'Site context: {{siteContext}}',
    scoringDimension: {
      name: 'Structured Data Readiness',
      scoreHigh: 'All relevant properties map cleanly to schema.org types; structured data markup would be complete and valid.',
      scoreMid: 'Some properties suitable for schema markup but key fields are missing or poorly formatted.',
      scoreLow: 'Fields lack the specificity or structure needed to map to any schema.org type; no structured data opportunities are identifiable.',
    },
  },
  {
    id: 'accessibility-visibility',
    labelKey: 'promptBuilder_categoryAccessibilityVisibility',
    promptFragment:
      'Review this page for accessibility and discoverability. ' +
      'Properties to evaluate: {{propertyAliases}}. ' +
      'Check for descriptive image alt text, meaningful link labels, ' +
      'logical heading hierarchy, and robots/sitemap inclusion. ' +
      'Site context: {{siteContext}}',
    scoringDimension: {
      name: 'Accessibility & Discoverability',
      scoreHigh: 'All images have descriptive alt text; links have meaningful labels; heading hierarchy is logical; page is indexable.',
      scoreMid: 'Most accessibility elements are present but some images lack alt text or heading levels are skipped.',
      scoreLow: 'Missing alt text throughout, vague link labels, broken heading hierarchy, or page is blocked from indexing.',
    },
  },
  {
    id: 'calls-to-action',
    labelKey: 'promptBuilder_categoryCallsToAction',
    promptFragment:
      'Evaluate the calls to action on this page. ' +
      'Review the following properties: {{propertyAliases}}. ' +
      'Check for clear, actionable CTAs, appropriate placement, ' +
      'and alignment with the page goal. ' +
      'Site context: {{siteContext}}',
    scoringDimension: {
      name: 'CTA Effectiveness',
      scoreHigh: 'Clear, compelling CTAs aligned with the page goal; specific action language; prominent and logical placement.',
      scoreMid: 'CTAs present but generic ("Click Here"), poorly placed, or misaligned with the page purpose.',
      scoreLow: 'No CTAs present, or CTAs are so vague they provide no direction to the visitor.',
    },
  },
] as const;
