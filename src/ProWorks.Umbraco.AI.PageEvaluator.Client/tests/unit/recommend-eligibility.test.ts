/**
 * T038 — Recommend/Apply eligibility shared by the Evaluate Page report and the Copilot tools
 * (`src/shared/recommend-eligibility.ts`, `src/shared/recommend-input.ts`; 006 FR-005).
 */
import { describe, it, expect } from 'vitest';
import {
  canApply,
  canRecommend,
  recommendableFields,
  type EligibilityReport,
} from '../../src/shared/recommend-eligibility.js';
import { currentMarkup, recommendInputProperties, recommendInputValue } from '../../src/shared/recommend-input.js';
import type { CheckResult, EvaluationReportResponse } from '../../src/shared/types.js';

const editors: EligibilityReport = {
  propertyEditorAliases: {
    title: 'Umbraco.TextBox',
    summary: 'Umbraco.TextArea',
    notes: 'Umbraco.Markdown',
    keywords: 'Umbraco.Tags',
    body: 'Umbraco.RichText',
    legacyBody: 'Umbraco.TinyMCE',
    heroImage: 'Umbraco.MediaPicker3',
    custom: 'Acme.FancyText',
  },
  additionalRecommendableEditorAliases: ['acme.fancytext'],
};

const noEditorMap: EligibilityReport = { propertyEditorAliases: {}, additionalRecommendableEditorAliases: [] };

const block = '<umb-rte-block data-content-key="b1"><!--Umbraco-Block--></umb-rte-block>';

describe('canRecommend', () => {
  it.each(['title', 'summary', 'notes', 'keywords', 'body', 'legacyBody'])('is true for the full-recommend editor of %s', (alias) => {
    expect(canRecommend(alias, editors)).toBe(true);
  });

  it('is false for an editor that is not recommendable', () => {
    expect(canRecommend('heroImage', editors)).toBe(false);
  });

  it('is true for an additional editor, matched case-insensitively', () => {
    expect(canRecommend('custom', editors)).toBe(true);
    expect(
      canRecommend('custom', { ...editors, additionalRecommendableEditorAliases: ['ACME.FANCYTEXT'] }),
    ).toBe(true);
  });

  it('is false for an additional editor that is not listed', () => {
    expect(canRecommend('custom', { ...editors, additionalRecommendableEditorAliases: [] })).toBe(false);
  });

  describe('value heuristic when the editor map has no entry', () => {
    it.each([
      ['plain text', 'Hello world', true],
      ['an empty string', '', true],
      ['a JSON object', '{"a":1}', false],
      ['a JSON array', '  [1,2]', false],
      ['a document UDI', 'umb://document/abc', false],
      ['a non-string value', 42, false],
      ['a missing value', undefined, false],
    ])('%s → %s', (_case, value, expected) => {
      expect(canRecommend('anything', noEditorMap, value)).toBe(expected);
    });
  });
});

describe('canApply', () => {
  it('is true for a plain-text editor', () => {
    expect(canApply('title', 'New title', 'Old title', editors)).toBe(true);
  });

  it('is false for an editor that is not recommendable', () => {
    expect(canApply('heroImage', 'x', null, editors)).toBe(false);
  });

  it('is true for an additional editor', () => {
    expect(canApply('custom', 'x', 'y', editors)).toBe(true);
  });

  it('requires canApplyRichText for rich text: every block placeholder kept exactly once', () => {
    const current = { markup: `<p>Intro</p>${block}`, blocks: {} };

    expect(canApply('body', `<p>Better intro</p>${block}`, current, editors)).toBe(true);
    expect(canApply('body', '<p>Better intro</p>', current, editors)).toBe(false);
    expect(canApply('body', `${block}${block}`, current, editors)).toBe(false);
  });

  it('accepts a rich-text value given as a markup string', () => {
    expect(canApply('legacyBody', '<p>New</p>', '<p>Old</p>', editors)).toBe(true);
  });

  it('is false for rich text without a recommendation', () => {
    expect(canApply('body', null, '<p>Old</p>', editors)).toBe(false);
  });

  it('falls back to the value heuristic without an editor map', () => {
    expect(canApply('anything', 'x', 'plain', noEditorMap)).toBe(true);
    expect(canApply('anything', 'x', '{"a":1}', noEditorMap)).toBe(false);
  });
});

function check(checkNumber: number, status: CheckResult['status'], propertyAliases: string[] | null): CheckResult {
  return { checkNumber, status, label: `Check ${checkNumber}`, explanation: null, propertyAliases };
}

function report(checks: CheckResult[], overrides: Partial<EvaluationReportResponse> = {}): EvaluationReportResponse {
  return {
    parseFailed: false,
    score: null,
    checks,
    suggestions: null,
    rawResponse: null,
    cachedAt: '2026-11-03T10:15:00Z',
    overallScore: null,
    axisScores: null,
    propertyEditorAliases: editors.propertyEditorAliases,
    propertyNames: { title: 'Title', summary: 'Summary', heroImage: 'Hero image' },
    recommendationsEnabled: true,
    additionalRecommendableEditorAliases: editors.additionalRecommendableEditorAliases,
    samplingSettingsIgnored: null,
    culture: null,
    ...overrides,
  };
}

describe('recommendableFields', () => {
  it('lists each recommendable alias once, under its first Fail check, then its first Warn check', () => {
    const r = report([
      check(1, 'Pass', ['title']),
      check(2, 'Warn', ['title', 'summary']),
      check(3, 'Fail', ['title']),
      check(4, 'Fail', ['title', 'summary']),
      check(5, 'Warn', ['keywords']),
    ]);

    expect(recommendableFields(r)).toEqual([
      { propertyAlias: 'title', propertyName: 'Title', checkId: 3, checkStatus: 'Fail', canApply: true },
      { propertyAlias: 'summary', propertyName: 'Summary', checkId: 4, checkStatus: 'Fail', canApply: true },
      { propertyAlias: 'keywords', propertyName: 'keywords', checkId: 5, checkStatus: 'Warn', canApply: true },
    ]);
  });

  it('skips aliases whose editor is not recommendable and checks without aliases', () => {
    const r = report([check(1, 'Fail', ['heroImage']), check(2, 'Fail', null)]);

    expect(recommendableFields(r)).toEqual([]);
  });

  it('is empty when recommendations are disabled', () => {
    const r = report([check(1, 'Fail', ['title'])], { recommendationsEnabled: false });

    expect(recommendableFields(r)).toEqual([]);
  });

  it('uses the captured values for the heuristic when the report has no editor map', () => {
    const r = report([check(1, 'Fail', ['title', 'links'])], { propertyEditorAliases: {} });

    expect(
      recommendableFields(r, { title: 'Hello', links: '[{"udi":"umb://document/1"}]' }).map((f) => f.propertyAlias),
    ).toEqual(['title']);
  });
});

describe('recommend input', () => {
  it('currentMarkup reads a markup string or the markup of a { markup, blocks } value', () => {
    expect(currentMarkup('<p>a</p>')).toBe('<p>a</p>');
    expect(currentMarkup({ markup: '<p>b</p>', blocks: {} })).toBe('<p>b</p>');
    expect(currentMarkup(null)).toBe('');
  });

  it('recommendInputValue sends rich text as markup, strings as-is and anything else as JSON', () => {
    expect(recommendInputValue('Umbraco.RichText', { markup: '<p>b</p>', blocks: {} })).toBe('<p>b</p>');
    expect(recommendInputValue('Umbraco.TextBox', 'Hello')).toBe('Hello');
    expect(recommendInputValue('Umbraco.Tags', ['a', 'b'])).toBe('["a","b"]');
    expect(recommendInputValue(undefined, null)).toBe('""');
  });

  it('recommendInputProperties converts every captured value', () => {
    expect(
      recommendInputProperties(
        { title: 'Hello', body: { markup: '<p>b</p>', blocks: {} } },
        { body: 'Umbraco.RichText' },
      ),
    ).toEqual({ title: 'Hello', body: '<p>b</p>' });
  });
});
