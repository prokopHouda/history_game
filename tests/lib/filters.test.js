import { describe, it, expect } from 'vitest';
import { filterEvents, getUniqueRegionsAndCountries } from '../../lib/filters.js';

const sampleEvents = [
  { id: 1, year: 100, region: 'Eastern Europe', countries: 'CZ, SK' },
  { id: 2, year: 200, region: 'Eastern Asia', countries: 'CN' },
  { id: 3, year: 300, region: 'Eastern Europe', countries: 'CZ' },
  { id: 4, year: 400, region: 'Northern Africa', countries: 'EG' },
  { id: 5, year: 500, region: 'Western Europe, Southern Europe, Western Europe', countries: 'FR, DE, IT' },
];

describe('filterEvents', () => {
  it('returns all events when no filters', () => {
    expect(filterEvents(sampleEvents, null)).toHaveLength(5);
    expect(filterEvents(sampleEvents, {})).toHaveLength(5);
  });

  it('filters by startYear', () => {
    const result = filterEvents(sampleEvents, { startYear: 300 });
    expect(result).toHaveLength(3);
    expect(result.map(e => e.id)).toEqual([3, 4, 5]);
  });

  it('filters by endYear', () => {
    const result = filterEvents(sampleEvents, { endYear: 200 });
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual([1, 2]);
  });

  it('filters by both startYear and endYear', () => {
    const result = filterEvents(sampleEvents, { startYear: 200, endYear: 400 });
    expect(result).toHaveLength(3);
    expect(result.map(e => e.id)).toEqual([2, 3, 4]);
  });

  it('filters by region', () => {
    const result = filterEvents(sampleEvents, { region: 'Eastern Europe' });
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual([1, 3]);
  });

  it('matches multi-region events', () => {
    const result = filterEvents(sampleEvents, { region: 'Southern Europe' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });

  it('filters by continent (matches any event touching a sub-region of it)', () => {
    const europe = filterEvents(sampleEvents, { region: 'Europe' });
    expect(europe.map(e => e.id).sort()).toEqual([1, 3, 5]);

    const americas = filterEvents(sampleEvents, { region: 'Americas' });
    expect(americas).toHaveLength(0);
  });

  it('continent filter matches multi-region events spanning the continent', () => {
    // id 5 spans Western Europe + Southern Europe -> Europe continent matches it
    const europe = filterEvents(sampleEvents, { region: 'Europe' });
    expect(europe.some(e => e.id === 5)).toBe(true);
  });

  it('filters by country', () => {
    const result = filterEvents(sampleEvents, { country: 'CZ' });
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual([1, 3]);
  });

  it('matches multi-country events', () => {
    const result = filterEvents(sampleEvents, { country: 'IT' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
  });

  it('combines year + region + country filters', () => {
    const result = filterEvents(sampleEvents, {
      startYear: 100,
      endYear: 300,
      region: 'Eastern Europe',
      country: 'CZ',
    });
    expect(result).toHaveLength(2);
    expect(result.map(e => e.id)).toEqual([1, 3]);
  });

  it('returns empty when no events match', () => {
    const result = filterEvents(sampleEvents, { region: 'Australia & New Zealand' });
    expect(result).toHaveLength(0);
  });

  it('handles events with date instead of year', () => {
    const events = [
      { id: 1, date: '1945-08-06', region: 'Eastern Asia', countries: 'JP' },
      { id: 2, year: 1900, region: 'Western Europe', countries: 'FR' },
    ];
    const result = filterEvents(events, { startYear: 1900, endYear: 1945 });
    expect(result).toHaveLength(2);
  });

  it('handles events with no countries field', () => {
    const events = [{ id: 1, year: 100, region: 'Eastern Europe' }];
    const result = filterEvents(events, { country: 'CZ' });
    expect(result).toHaveLength(0);
  });

  it('handles null/undefined startYear and endYear', () => {
    const result = filterEvents(sampleEvents, { startYear: null, endYear: undefined });
    expect(result).toHaveLength(5);
  });
});

describe('getUniqueRegionsAndCountries', () => {
  it('extracts unique sorted regions, splitting comma-separated values', () => {
    const { regions } = getUniqueRegionsAndCountries(sampleEvents);
    expect(regions).toEqual([
      'Eastern Asia',
      'Eastern Europe',
      'Northern Africa',
      'Southern Europe',
      'Western Europe',
    ]);
  });

  it('extracts unique sorted countries', () => {
    const { countries } = getUniqueRegionsAndCountries(sampleEvents);
    expect(countries).toEqual(['CN', 'CZ', 'DE', 'EG', 'FR', 'IT', 'SK']);
  });

  it('handles empty data', () => {
    const { regions, countries } = getUniqueRegionsAndCountries([]);
    expect(regions).toEqual([]);
    expect(countries).toEqual([]);
  });

  it('skips events with no region', () => {
    const events = [
      { id: 1, region: null, countries: 'CZ' },
      { id: 2, region: 'Western Europe', countries: 'FR' },
    ];
    const { regions } = getUniqueRegionsAndCountries(events);
    expect(regions).toEqual(['Western Europe']);
  });

  it('skips events with no countries', () => {
    const events = [
      { id: 1, region: 'Western Europe', countries: null },
      { id: 2, region: 'Eastern Asia', countries: 'JP' },
    ];
    const { countries } = getUniqueRegionsAndCountries(events);
    expect(countries).toEqual(['JP']);
  });
});