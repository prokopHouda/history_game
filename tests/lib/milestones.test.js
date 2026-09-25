import { describe, it, expect } from 'vitest';
import { MILESTONES, getMilestone, getNextMilestone } from '../../lib/milestones.js';

const LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const GAMES = Object.keys(MILESTONES);

describe('MILESTONES', () => {
  it('defines milestones for history, mountains and rivers', () => {
    expect(GAMES.sort()).toEqual(['history', 'mountains', 'rivers']);
  });

  it.each(GAMES)('%s: has entries from 5 to 50 in steps of 5', (gk) => {
    expect(Object.keys(MILESTONES[gk]).map(Number).sort((a, b) => a - b))
      .toEqual(LEVELS);
  });

  it.each(GAMES)('%s: each milestone has name and badge', (gk) => {
    Object.values(MILESTONES[gk]).forEach((m) => {
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

  it('returns milestone 5 for streak 5 (history default)', () => {
    expect(getMilestone(5)).toBe(MILESTONES.history[5]);
  });

  it.each(GAMES)('%s: floors to nearest 5, caps at 50, defaults to own game table', (gk) => {
    expect(getMilestone(7, gk)).toBe(MILESTONES[gk][5]);
    expect(getMilestone(49, gk)).toBe(MILESTONES[gk][45]);
    expect(getMilestone(50, gk)).toBe(MILESTONES[gk][50]);
    expect(getMilestone(100, gk)).toBe(MILESTONES[gk][50]);
  });
});

describe('getNextMilestone', () => {
  it.each(GAMES)('%s: returns next level and null past 50', (gk) => {
    expect(getNextMilestone(0, gk)).toBe(MILESTONES[gk][5]);
    expect(getNextMilestone(5, gk)).toBe(MILESTONES[gk][10]);
    expect(getNextMilestone(45, gk)).toBe(MILESTONES[gk][50]);
    expect(getNextMilestone(50, gk)).toBeNull();
    expect(getNextMilestone(100, gk)).toBeNull();
  });
});