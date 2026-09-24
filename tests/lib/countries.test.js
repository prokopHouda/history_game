import { describe, it, expect } from 'vitest';
import {
  COUNTRY_TO_SUBREGION,
  getCountryName,
  sortCountriesByLocalizedName,
  getSubregionForCountry,
} from '../../lib/countries.js';
import { SUBREGION_TO_CONTINENT } from '../../lib/regions.js';

describe('COUNTRY_TO_SUBREGION', () => {
  it('every mapped sub-region exists in the regions taxonomy', () => {
    for (const [code, sub] of Object.entries(COUNTRY_TO_SUBREGION)) {
      expect(SUBREGION_TO_CONTINENT[sub], `${code} -> ${sub}`).toBeTruthy();
    }
  });

  it('maps representative countries correctly', () => {
    expect(COUNTRY_TO_SUBREGION.NP).toBe('Southern Asia');
    expect(COUNTRY_TO_SUBREGION.CH).toBe('Western Europe');
    expect(COUNTRY_TO_SUBREGION.US).toBe('Northern America');
    expect(COUNTRY_TO_SUBREGION.AQ).toBe('Antarctica');
    expect(COUNTRY_TO_SUBREGION.GL).toBe('Northern America');
  });
});

describe('getSubregionForCountry', () => {
  it('returns the sub-region for known codes', () => {
    expect(getSubregionForCountry('jp')).toBe('Eastern Asia');
    expect(getSubregionForCountry(' IT ')).toBe('Southern Europe');
  });

  it('returns null for unknown codes', () => {
    expect(getSubregionForCountry('XX')).toBeNull();
    expect(getSubregionForCountry('')).toBeNull();
    expect(getSubregionForCountry(null)).toBeNull();
  });
});

describe('getCountryName', () => {
  it('returns localized country names', () => {
    expect(getCountryName('CH', 'en')).toBe('Switzerland');
    expect(getCountryName('CZ', 'en')).toBe('Czechia');
  });

  it('respects the language', () => {
    const cs = getCountryName('CH', 'cs');
    const it = getCountryName('CH', 'it');
    expect(cs).not.toBe('Switzerland');
    expect(it).not.toBe('Switzerland');
  });

  it('falls back to the code for unknown values', () => {
    expect(getCountryName('XX', 'en')).toBe('XX');
    expect(getCountryName('', 'en')).toBe('');
  });
});

describe('sortCountriesByLocalizedName', () => {
  it('sorts by localized name, not code', () => {
    const sorted = sortCountriesByLocalizedName(['US', 'CH', 'AR'], 'en');
    expect(sorted).toEqual(['AR', 'CH', 'US']); // Argentina, Switzerland, United States
  });

  it('keeps all codes', () => {
    const codes = ['NP', 'CH', 'IT', 'JP', 'US'];
    expect(sortCountriesByLocalizedName(codes, 'en')).toHaveLength(5);
  });
});