/**
 * Every localization file must define exactly the same nested keys as en.ts (the source of truth).
 * A missing key doesn't error in the backoffice — it silently renders the raw key — so this guards
 * against partial updates when a key is added (CLAUDE.md "UmbLitElement & Localization").
 */
import { describe, it, expect } from 'vitest';
import en from '../../src/localization/en.js';
import es from '../../src/localization/es.js';
import fr from '../../src/localization/fr.js';
import da from '../../src/localization/da.js';
import de from '../../src/localization/de.js';
import nb from '../../src/localization/nb.js';
import sv from '../../src/localization/sv.js';
import it_ from '../../src/localization/it.js';
import hi from '../../src/localization/hi.js';
import pt from '../../src/localization/pt.js';

type Localization = Record<string, Record<string, string>>;

function keysOf(localization: Localization): string[] {
  return Object.entries(localization)
    .flatMap(([section, entries]) => Object.keys(entries).map((key) => `${section}_${key}`))
    .sort();
}

const others: Record<string, Localization> = { es, fr, da, de, nb, sv, it: it_, hi, pt };

describe('localization files', () => {
  const expected = keysOf(en as Localization);

  it.each(Object.entries(others))('%s defines exactly the same keys as en', (_culture, localization) => {
    expect(keysOf(localization)).toEqual(expected);
  });

  it.each(Object.entries({ en, ...others }))('%s has no empty values', (_culture, localization) => {
    for (const [section, entries] of Object.entries(localization as Localization)) {
      for (const [key, value] of Object.entries(entries)) {
        expect(value.trim(), `${section}_${key}`).not.toBe('');
      }
    }
  });
});
