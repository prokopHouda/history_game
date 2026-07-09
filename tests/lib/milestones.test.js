import { describe, it, expect } from 'vitest';
import { MILESTONES, getMilestone, getNextMilestone } from '../../lib/milestones.js';

describe('MILESTONES', () => {
  it('has entries from 5 to 50 in steps of 5', () => {
    expect(Object.keys(MILESTONES).map(Number).sort((a, b) => a - b))
      .toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
  });

  it('each milestone has name and badge', () => {
    Object.values(MILESTONES).forEach(m => {
      expect(m).toHaveProperty('name');
      expect(m).toHaveProperty('badge');
      expect(typeof m.name).toBe('string');
      expect(typeof m.badge).toBe('string');
    });
  });
});

describe('getMilestone', () => {
  it('returns null for streak 0', () => {
    expect(getMilestone(0)).toBeNull();
  });

  it('returns null for streak 4', () => {
    expect(getMilestone(4)).toBeNull();
  });

  it('returns milestone 5 for streak 5', () => {
    expect(getMilestone(5)).toBe(MILESTONES[5]);
  });

  it('returns milestone 5 for streak 7 (floors to nearest 5)', () => {
    expect(getMilestone(7)).toBe(MILESTONES[5]);
  });

  it('returns milestone 45 for streak 49', () => {
    expect(getMilestone(49)).toBe(MILESTONES[45]);
  });

  it('returns milestone 50 for streak 50', () => {
    expect(getMilestone(50)).toBe(MILESTONES[50]);
  });

  it('returns milestone 50 for streak 100 (caps at 50)', () => {
    expect(getMilestone(100)).toBe(MILESTONES[50]);
  });
});

describe('getNextMilestone', () => {
  it('returns milestone 5 for streak 0', () => {
    expect(getNextMilestone(0)).toBe(MILESTONES[5]);
  });

  it('returns milestone 10 for streak 5', () => {
    expect(getNextMilestone(5)).toBe(MILESTONES[10]);
  });

  it('returns milestone 50 for streak 45', () => {
    expect(getNextMilestone(45)).toBe(MILESTONES[50]);
  });

  it('returns null for streak 50', () => {
    expect(getNextMilestone(50)).toBeNull();
  });

  it('returns null for streak 100', () => {
    expect(getNextMilestone(100)).toBeNull();
  });
});