import { describe, it, expect } from 'vitest';
import { GAMES, getGame, lowerWins, pickWinner, valueGap, pointsForGap } from '../../lib/games.js';

describe('getGame', () => {
  it('returns history config for "history"', () => {
    expect(getGame('history').key).toBe('history');
  });

  it('returns mountains config for "mountains"', () => {
    expect(getGame('mountains').key).toBe('mountains');
  });

  it('falls back to history for unknown game', () => {
    expect(getGame('nope').key).toBe('history');
    expect(getGame(undefined).key).toBe('history');
  });
});

describe('pickWinner', () => {
  it('history: picks the earlier event', () => {
    const a = { id: 1, year: 1900 };
    const b = { id: 2, year: 2000 };
    expect(pickWinner(getGame('history'), a, b).id).toBe(1);
    expect(pickWinner(getGame('history'), b, a).id).toBe(1);
  });

  it('history: honours date precision', () => {
    const a = { id: 1, date: '1945-08-06' };
    const b = { id: 2, date: '1945-08-09' };
    expect(pickWinner(getGame('history'), a, b).id).toBe(1);
  });

  it('mountains: picks the higher peak', () => {
    const a = { id: 1, elevation: 4000 };
    const b = { id: 2, elevation: 8000 };
    expect(pickWinner(getGame('mountains'), a, b).id).toBe(2);
    expect(pickWinner(getGame('mountains'), b, a).id).toBe(2);
  });

  it('mountains: handles missing elevation', () => {
    const a = { id: 1 };
    const b = { id: 2, elevation: 100 };
    expect(pickWinner(getGame('mountains'), a, b).id).toBe(2);
  });
});

describe('lowerWins', () => {
  it('history is lower-wins', () => {
    expect(lowerWins(getGame('history'))).toBe(true);
  });

  it('mountains is higher-wins', () => {
    expect(lowerWins(getGame('mountains'))).toBe(false);
  });
});

describe('valueGap', () => {
  it('history: year gap', () => {
    const a = { id: 1, year: 1900 };
    const b = { id: 2, year: 2000 };
    expect(valueGap(getGame('history'), a, b)).toBe(100);
  });

  it('mountains: elevation gap', () => {
    const a = { id: 1, elevation: 4000 };
    const b = { id: 2, elevation: 8000 };
    expect(valueGap(getGame('mountains'), a, b)).toBe(4000);
  });
});

describe('pointsForGap', () => {
  it('history: 100+ years = 1 point, <100 = 2 points', () => {
    const game = getGame('history');
    expect(pointsForGap(game, 100)).toBe(1);
    expect(pointsForGap(game, 500)).toBe(1);
    expect(pointsForGap(game, 99)).toBe(2);
    expect(pointsForGap(game, 0)).toBe(2);
  });

  it('mountains: 500+ m = 1 point, <500 = 2 points', () => {
    const game = getGame('mountains');
    expect(pointsForGap(game, 500)).toBe(1);
    expect(pointsForGap(game, 4000)).toBe(1);
    expect(pointsForGap(game, 499)).toBe(2);
    expect(pointsForGap(game, 51)).toBe(2);
  });
});

describe('registry data config', () => {
  it('all games define table names and translations config', () => {
    Object.values(GAMES).forEach((game) => {
      expect(typeof game.data.table).toBe('string');
      expect(typeof game.data.translationsTable).toBe('string');
      expect(typeof game.data.translationFkColumn).toBe('string');
      expect(typeof game.data.select).toBe('string');
    });
  });

  it('all games define mechanics', () => {
    Object.values(GAMES).forEach((game) => {
      expect(typeof game.mechanics.getValue).toBe('function');
      expect(typeof game.mechanics.getComparable).toBe('function');
      expect(['lower', 'higher']).toContain(game.mechanics.direction);
      expect(game.mechanics.minGap).toBeGreaterThan(0);
      expect(game.mechanics.gapScale).toBeGreaterThan(0);
      expect(game.mechanics.easyGap).toBeGreaterThan(0);
      expect(game.mechanics.filters.range.minKey).toBeTruthy();
      expect(game.mechanics.filters.range.maxKey).toBeTruthy();
      expect(game.mechanics.filters.group.column).toBeTruthy();
    });
  });
});