import { describe, it, expect } from 'vitest';
import {
  CONTINENTS,
  CONTINENT_TO_SUBREGIONS,
  SUBREGION_TO_CONTINENT,
  isContinent,
  resolveRegionFilter,
} from '../../lib/regions.js';

describe('regions taxonomy', () => {
  it('every sub-region maps back to exactly one continent', () => {
    for (const [continent, subs] of Object.entries(CONTINENT_TO_SUBREGIONS)) {
      for (const sub of subs) {
        expect(SUBREGION_TO_CONTINENT[sub]).toBe(continent);
      }
    }
  });

  it('CONTINENTS lists the 5 continents', () => {
    expect(CONTINENTS).toEqual(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania']);
  });

  it('isContinent recognises continent keys', () => {
    expect(isContinent('Europe')).toBe(true);
    expect(isContinent('Asia')).toBe(true);
    expect(isContinent('Eastern Europe')).toBe(false);
    expect(isContinent('')).toBe(false);
  });

  it('resolveRegionFilter returns null for empty/unknown values', () => {
    expect(resolveRegionFilter('')).toBeNull();
    expect(resolveRegionFilter(null)).toBeNull();
    expect(resolveRegionFilter(undefined)).toBeNull();
  });

  it('resolveRegionFilter returns the full continent sub-region set for a continent', () => {
    const set = resolveRegionFilter('Europe');
    expect(set).toBeInstanceOf(Set);
    expect([...set].sort()).toEqual(
      ['Eastern Europe', 'Northern Europe', 'Southern Europe', 'Western Europe']
    );
  });

  it('resolveRegionFilter returns a singleton set for a sub-region', () => {
    const set = resolveRegionFilter('Eastern Europe');
    expect([...set]).toEqual(['Eastern Europe']);
  });
});