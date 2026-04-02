/**
 * T052 — Vitest unit tests for checklist-categories.ts
 *
 * Tests: all 6 categories defined, each has id/label/promptFragment,
 *        each promptFragment contains {{propertyAliases}} and {{siteContext}}.
 *
 * RED STATE: Fails to collect until T056 creates
 * `src/prompt-builder/checklist-categories.ts`.
 */

import { describe, it, expect } from 'vitest';

// RED STATE: this import will fail until T056 creates the file
import { CHECKLIST_CATEGORIES } from '../../src/prompt-builder/checklist-categories.js';

describe('checklist-categories', () => {
  it('defines exactly 6 categories', () => {
    expect(CHECKLIST_CATEGORIES).toHaveLength(6);
  });

  it('each category has a non-empty id, label, and promptFragment', () => {
    for (const cat of CHECKLIST_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.promptFragment).toBeTruthy();
    }
  });

  it('all category ids are unique', () => {
    const ids = CHECKLIST_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('includes Required Fields category', () => {
    expect(CHECKLIST_CATEGORIES.some((c) => c.id === 'required-fields')).toBe(true);
  });

  it('includes Metadata & SEO category', () => {
    expect(CHECKLIST_CATEGORIES.some((c) => c.id === 'metadata-seo')).toBe(true);
  });

  it('includes Content Quality category', () => {
    expect(CHECKLIST_CATEGORIES.some((c) => c.id === 'content-quality')).toBe(true);
  });

  it('includes Schema & Structured Data category', () => {
    expect(CHECKLIST_CATEGORIES.some((c) => c.id === 'schema-structured-data')).toBe(true);
  });

  it('includes Accessibility & Visibility category', () => {
    expect(CHECKLIST_CATEGORIES.some((c) => c.id === 'accessibility-visibility')).toBe(true);
  });

  it('includes Calls to Action category', () => {
    expect(CHECKLIST_CATEGORIES.some((c) => c.id === 'calls-to-action')).toBe(true);
  });

  it('each promptFragment contains {{propertyAliases}} placeholder', () => {
    for (const cat of CHECKLIST_CATEGORIES) {
      expect(cat.promptFragment).toContain('{{propertyAliases}}');
    }
  });

  it('each promptFragment contains {{siteContext}} placeholder', () => {
    for (const cat of CHECKLIST_CATEGORIES) {
      expect(cat.promptFragment).toContain('{{siteContext}}');
    }
  });
});
