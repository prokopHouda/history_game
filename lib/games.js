// Central game registry. Every game (history, mountains, ...) is fully
// described by one entry here. Pages, components, APIs and libs read their
// game-specific behaviour from this config instead of hardcoding it.

import { getEventYear, getEventTime } from './eventTime.js';

export const GAMES = {
  history: {
    key: 'history',
    icon: '🏛️',
    name: { en: 'History', cs: 'Historie', it: 'Storia' },
    tagline: { en: 'Which happened earlier?', cs: 'Co se stalo dříve?', it: 'Quale è avvenuto prima?' },
    data: {
      table: 'events',
      translationsTable: 'event_translations',
      translationFkColumn: 'event_id',
      // Columns fetched for the in-memory event pool (SP + rooms.events JSONB)
      select: 'id, short_name, date, year, description, countries, region',
    },
    mechanics: {
      // Numeric value used for pairing + scoring (year for events)
      getValue: (item) => getEventYear(item),
      // Full-precision comparison value (date-aware for events)
      getComparable: (item) => getEventTime(item),
      // 'lower' = the item with the lower comparable wins ("which happened earlier")
      direction: 'lower',
      // Pairs closer than this are never shown (avoids ambiguity)
      minGap: 2,
      // Weight decay scale for proximity weighting (weight = exp(-gap/scale))
      gapScale: 50,
      // Gap >= easyGap is worth 1 point, below it 2 points
      easyGap: 100,
      filters: {
        // Range filter over getValue
        range: { minKey: 'startYear', maxKey: 'endYear' },
        // Multi-value grouping filter (csv column on rows)
        group: { key: 'region', column: 'region', grouped: true },
      },
    },
  },

  mountains: {
    key: 'mountains',
    icon: '🏔️',
    name: { en: 'Mountains', cs: 'Hory', it: 'Montagne' },
    tagline: { en: 'Which mountain is higher?', cs: 'Která hora je vyšší?', it: 'Quale montagna è più alta?' },
    data: {
      table: 'mountains',
      translationsTable: 'mountain_translations',
      translationFkColumn: 'mountain_id',
      select: 'id, short_name, elevation, description, countries, range',
    },
    mechanics: {
      getValue: (item) => item.elevation ?? 0,
      getComparable: (item) => item.elevation ?? 0,
      // 'higher' = the item with the higher comparable wins ("which is higher")
      direction: 'higher',
      minGap: 50,           // metres — near-ties excluded
      gapScale: 500,       // metres — 500 m gap ≈ 50 years in history
      easyGap: 500,         // < 500 m = +2 points, >= 500 m = +1 point
      filters: {
        range: { minKey: 'minElevation', maxKey: 'maxElevation' },
        group: { key: 'range', column: 'range', grouped: false },
      },
    },
  },
};

export function getGame(gameKey) {
  return GAMES[gameKey] || GAMES.history;
}

// True when the item with the LOWER comparable value is the correct answer.
export function lowerWins(game) {
  return game.mechanics.direction === 'lower';
}

// The correct/winning item of a pair, honouring the game's direction.
export function pickWinner(game, a, b) {
  const va = game.mechanics.getComparable(a);
  const vb = game.mechanics.getComparable(b);
  if (lowerWins(game)) return va < vb ? a : b;
  return va > vb ? a : b;
}

// Absolute distance between two items (years apart / metres apart).
export function valueGap(game, a, b) {
  return Math.abs(game.mechanics.getValue(a) - game.mechanics.getValue(b));
}

// Points for a correct answer (2 = tough/close pair, 1 = easy pair).
export function pointsForGap(game, gap) {
  return gap >= game.mechanics.easyGap ? 1 : 2;
}