import { describe, it, expect } from 'vitest';
import { getEventYear, getEventTime } from '../../lib/eventTime.js';

describe('getEventYear', () => {
  it('parses year from date string', () => {
    expect(getEventYear({ date: '1969-07-20' })).toBe(1969);
  });

  it('parses year from date with single-digit month/day', () => {
    expect(getEventYear({ date: '1945-08-06' })).toBe(1945);
  });

  it('uses year field when date is null', () => {
    expect(getEventYear({ year: 618 })).toBe(618);
  });

  it('returns 0 when both date and year are null/undefined', () => {
    expect(getEventYear({})).toBe(0);
    expect(getEventYear({ date: null, year: null })).toBe(0);
  });

  it('handles year 0', () => {
    expect(getEventYear({ year: 0 })).toBe(0);
  });

  it('handles negative years (BC)', () => {
    expect(getEventYear({ year: -44 })).toBe(-44);
  });

  it('prioritizes date over year', () => {
    expect(getEventYear({ date: '1500-01-01', year: 999 })).toBe(1500);
  });

  it('handles ancient dates', () => {
    expect(getEventYear({ date: '0001-01-01' })).toBe(1);
  });
});

describe('getEventTime', () => {
  it('returns a timestamp for date events', () => {
    const ts = getEventTime({ date: '2000-01-01' });
    expect(typeof ts).toBe('number');
    expect(ts).toBe(Date.parse('2000-01-01T00:00:00Z'));
  });

  it('returns a timestamp for year-only events (Jan 1 of that year)', () => {
    const ts = getEventTime({ year: 1969 });
    expect(ts).toBe(Date.parse('1969-01-01T00:00:00Z'));
  });

  it('orders year-only event (Jan 1) before date event later in same year', () => {
    const dateEvent = { date: '1969-07-20' };
    const yearEvent = { year: 1969 };
    expect(getEventTime(yearEvent)).toBeLessThan(getEventTime(dateEvent));
  });

  it('orders two year-only events correctly', () => {
    expect(getEventTime({ year: 100 })).toBeLessThan(getEventTime({ year: 200 }));
  });

  it('handles year 0 (padded to 0000)', () => {
    const ts = getEventTime({ year: 0 });
    expect(typeof ts).toBe('number');
  });

  it('handles negative years', () => {
    const ts = getEventTime({ year: -100 });
    expect(typeof ts).toBe('number');
  });
});