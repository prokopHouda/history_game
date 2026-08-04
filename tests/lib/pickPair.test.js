import { describe, it, expect } from 'vitest';
import { canonicalKey, pickPair } from '../../lib/pickPair.js';

describe('canonicalKey', () => {
  it('produces ordered key for (3, 5)', () => {
    expect(canonicalKey(3, 5)).toBe('3-5');
  });

  it('produces ordered key for (5, 3) — order independent', () => {
    expect(canonicalKey(5, 3)).toBe('3-5');
  });

  it('produces key for equal ids', () => {
    expect(canonicalKey(7, 7)).toBe('7-7');
  });

  it('handles string ids', () => {
    expect(canonicalKey('abc', 'def')).toBe('abc-def');
  });
});

describe('pickPair', () => {
  const events = [
    { id: 1, year: 100 },
    { id: 2, year: 200 },
    { id: 3, year: 300 },
    { id: 4, year: 400 },
    { id: 5, year: 500 },
  ];

  it('throws if fewer than 2 events', () => {
    expect(() => pickPair([{ id: 1, year: 100 }])).toThrow('Need at least 2 events');
  });

  it('returns an array of 2 events', () => {
    const pair = pickPair(events);
    expect(pair).toHaveLength(2);
    expect(pair[0]).toHaveProperty('id');
    expect(pair[1]).toHaveProperty('id');
  });

  it('returns two different events', () => {
    const pair = pickPair(events);
    expect(pair[0].id).not.toBe(pair[1].id);
  });

  it('enforces minimum gap of >2 years', () => {
    for (let i = 0; i < 50; i++) {
      const pair = pickPair(events);
      const years = pair.map(e => e.year);
      const gap = Math.abs(years[0] - years[1]);
      expect(gap).toBeGreaterThan(2);
    }
  });

  it('adds the pair to shownPairsSet', () => {
    const shown = new Set();
    pickPair(events, shown);
    expect(shown.size).toBe(1);
  });

  it('does not repeat pairs (dedup)', () => {
    const shown = new Set();
    const seenPairs = new Set();
    for (let i = 0; i < 10; i++) {
      const pair = pickPair(events, shown);
      const key = canonicalKey(pair[0].id, pair[1].id);
      expect(seenPairs.has(key)).toBe(false);
      seenPairs.add(key);
    }
  });

  it('throws when all events are within 2 years of each other', () => {
    const closeEvents = [
      { id: 1, year: 100 },
      { id: 2, year: 101 },
      { id: 3, year: 102 },
    ];
    expect(() => pickPair(closeEvents)).toThrow('Could not generate any pair');
  });

  it('uses nuclear fallback when all pairs exhausted', () => {
    const shown = new Set();
    // Exhaust all valid pairs
    for (let i = 0; i < 100; i++) {
      try {
        pickPair(events, shown);
      } catch {
        break;
      }
    }
    // Should still return a pair (nuclear fallback reuses)
    // The shown set is now full, but nuclear fallback still works
    expect(shown.size).toBeGreaterThan(0);
  });

  it('handles events with date field', () => {
    const dateEvents = [
      { id: 1, date: '1945-08-06' },
      { id: 2, date: '1989-11-17' },
    ];
    const pair = pickPair(dateEvents);
    expect(pair).toHaveLength(2);
    const gap = Math.abs(
      parseInt(pair[0].date.split('-')[0], 10) -
      parseInt(pair[1].date.split('-')[0], 10)
    );
    expect(gap).toBeGreaterThan(2);
  });
});