import { describe, it, expect } from 'vitest';
import { SP_UI, MP_UI } from '../../lib/gameUi.js';
import { baseUiText } from '../../lib/i18n.js';

const LANGS = ['en', 'cs', 'it'];
const GAMES = ['history', 'mountains'];

describe('gameUi key parity', () => {
  for (const [name, dict] of [['SP_UI', SP_UI], ['MP_UI', MP_UI]]) {
    for (const gk of GAMES) {
      it(`${name}.${gk}: defined for all langs`, () => {
        expect(Object.keys(dict[gk]).sort()).toEqual(LANGS.slice().sort());
      });

      it(`${name}.${gk}: all langs share identical keys`, () => {
        const enKeys = Object.keys(dict[gk].en).sort();
        for (const l of LANGS) {
          expect(Object.keys(dict[gk][l]).sort()).toEqual(enKeys);
        }
      });

      it(`${name}.${gk}: extends baseUiText keys`, () => {
        for (const l of LANGS) {
          Object.keys(baseUiText[l]).forEach((k) => {
            expect(dict[gk][l]).toHaveProperty(k);
          });
        }
      });

      it(`${name}.${gk}: every key has non-empty string value`, () => {
        for (const l of LANGS) {
          Object.entries(dict[gk][l]).forEach(([k, v]) => {
            expect(typeof v).toBe('string');
            expect(v.length).toBeGreaterThan(0);
          });
        }
      });
    }
  }
});

describe('gameUi game-specific wording', () => {
  it('history SP title asks about earlier events', () => {
    expect(SP_UI.history.en.title).toBe('Which happened earlier?');
  });

  it('mountains SP title asks about higher peaks', () => {
    expect(SP_UI.mountains.en.title).toBe('Which mountain is higher?');
  });

  it('mountains distance text uses metres', () => {
    expect(SP_UI.mountains.en.yearsApart).toContain('m apart');
  });

  it('filter labels are elevation-based for mountains, year-based for history', () => {
    expect(SP_UI.mountains.en.minValueLabel).toContain('Elevation');
    expect(SP_UI.history.en.minValueLabel).toContain('Year');
    expect(MP_UI.mountains.en.minValueLabel).toContain('Elevation');
    expect(MP_UI.history.en.minValueLabel).toContain('Year');
  });

  it('group labels differ per game', () => {
    expect(SP_UI.history.en.groupLabel).toBe('Region');
    expect(SP_UI.mountains.en.groupLabel).toBe('Range');
  });
});