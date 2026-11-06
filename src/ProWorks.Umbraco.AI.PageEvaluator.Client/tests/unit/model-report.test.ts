/**
 * T040 — `toModelReport` (`src/copilot/model-report.ts`, contracts/model-report.md).
 *
 * The fixture in `tests/fixtures/model-report/` is shared with the server's `ModelReportFactoryTests` (T089):
 * - `report-response.json`: the `EvaluationReportResponse` (HTTP body);
 * - `context.json`: what the tool knows besides the body (page, configuration, cache, unsaved changes);
 * - `expected-model-report.json`: the model-facing JSON, key order included.
 */
import { describe, it, expect } from 'vitest';
import { toModelReport, type ModelReportContext } from '../../src/copilot/model-report.js';
import type { EvaluationReportResponse } from '../../src/shared/types.js';
import reportResponseJson from '../fixtures/model-report/report-response.json';
import contextJson from '../fixtures/model-report/context.json';
import expectedJson from '../fixtures/model-report/expected-model-report.json';

const fixtureResponse = reportResponseJson as unknown as EvaluationReportResponse;
const fixtureContext = contextJson as ModelReportContext;

function build(
  response: Partial<EvaluationReportResponse> = {},
  context: Partial<ModelReportContext> = {},
): Record<string, unknown> {
  // Round-trip through JSON, as Agent.UI does before handing the result to the model.
  return JSON.parse(
    JSON.stringify(toModelReport({ ...fixtureResponse, ...response }, { ...fixtureContext, ...context })),
  ) as Record<string, unknown>;
}

describe('toModelReport', () => {
  it('produces the shared fixture exactly, key order included', () => {
    expect(JSON.stringify(toModelReport(fixtureResponse, fixtureContext))).toBe(JSON.stringify(expectedJson));
  });

  it.each([
    'samplingSettingsIgnored',
    'rawResponse',
    'propertyEditorAliases',
    'additionalRecommendableEditorAliases',
    'propertyNames',
    'score',
    'properties',
  ])('never includes %s', (field) => {
    const report = build({ rawResponse: 'raw' }, { properties: { title: 'secret value' } });

    expect(report).not.toHaveProperty(field);
    expect(JSON.stringify(report)).not.toContain('secret value');
  });

  it('has scoring: null when the configuration has scoring disabled', () => {
    expect(build({ overallScore: null, axisScores: null }, { scoringEnabled: false })['scoring']).toBeNull();
  });

  it('keeps scoring with a null overallScore when the AI omitted the score', () => {
    expect(build({ overallScore: null, axisScores: null })['scoring']).toEqual({ scale: { min: 1, max: 5 }, overallScore: null, axisScores: [] });
  });

  it('returns the parseFailed shape: no checks, no scoring, nothing recommendable, a note, no raw response', () => {
    const report = build({
      parseFailed: true,
      checks: [],
      overallScore: null,
      axisScores: null,
      rawResponse: 'The page looks fine overall...',
      savedSinceEvaluation: false,
    }, { unsavedChanges: false });

    expect(report['parseFailed']).toBe(true);
    expect(report['checks']).toEqual([]);
    expect(report['scoring']).toBeNull();
    expect(report['recommendable']).toEqual([]);
    expect(report['note']).toBe("The AI response couldn't be read as a report. A fresh evaluation may help.");
    expect(JSON.stringify(report)).not.toContain('looks fine');
  });

  describe('outOfDate', () => {
    it('is false with no reasons and no note when nothing changed', () => {
      const report = build({ savedSinceEvaluation: false }, { unsavedChanges: false });

      expect(report['outOfDate']).toBe(false);
      expect(report['outOfDateReasons']).toEqual([]);
      expect(report).not.toHaveProperty('note');
    });

    it('reports savedSinceEvaluation from the server', () => {
      const report = build({ savedSinceEvaluation: true }, { unsavedChanges: false });

      expect(report['outOfDate']).toBe(true);
      expect(report['outOfDateReasons']).toEqual(['savedSinceEvaluation']);
    });

    it('reports unsavedChanges from the workspace', () => {
      const report = build({ savedSinceEvaluation: false }, { unsavedChanges: true });

      expect(report['outOfDate']).toBe(true);
      expect(report['outOfDateReasons']).toEqual(['unsavedChanges']);
    });

    it('treats a response without savedSinceEvaluation (older server) as not saved since', () => {
      const { savedSinceEvaluation: _omitted, ...older } = fixtureResponse;
      const report = JSON.parse(
        JSON.stringify(toModelReport(older, { ...fixtureContext, unsavedChanges: false })),
      ) as Record<string, unknown>;

      expect(report['outOfDate']).toBe(false);
    });
  });

  it('has an empty recommendable list when recommendations are disabled', () => {
    const report = build({ recommendationsEnabled: false });

    expect(report['recommendationsEnabled']).toBe(false);
    expect(report['recommendable']).toEqual([]);
  });

  it('uses the response culture, falling back to the lower-cased viewed culture', () => {
    expect((build({ culture: null }, { page: { ...fixtureContext.page, culture: 'da-DK' } })['page'] as Record<string, unknown>)['culture']).toBe('da-dk');
    expect((build({ culture: null }, { page: { ...fixtureContext.page, culture: null } })['page'] as Record<string, unknown>)['culture']).toBeNull();
  });

  it('has evaluatedAt: null when the response has no cache time', () => {
    expect(build({ cachedAt: null })['evaluatedAt']).toBeNull();
  });
});
