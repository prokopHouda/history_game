import { getGame } from './games.js';

export function canonicalKey(idA, idB) {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
}

function weightedPick(weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rnd = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return i;
  }
  return weights.length - 1;
}

function gapWeight(gap, scale) {
  // Strongly favour nearby events. Uses an exponential decay so that
  // close pairs dominate the weighted pool.
  // 25-year gap ≈ 10x more likely than 150-year gap.
  // 50-year gap  ≈ 3x  more likely than 150-year gap.
  return Math.exp(-gap / scale);
}

export function pickPair(events, shownPairsSet = new Set(), gameKey = 'history') {
  if (events.length < 2) throw new Error('Need at least 2 events');

  const game = getGame(gameKey);
  const getValue = game.mechanics.getValue;
  const minGap = game.mechanics.minGap;
  const scale = game.mechanics.gapScale;

  const values = new Map();
  for (const e of events) {
    values.set(e.id, getValue(e));
  }

  // --- 1) Weighted proximity sampling with collision guard ---
  for (let attempt = 0; attempt < 20; attempt++) {
    const idxA = Math.floor(Math.random() * events.length);
    const evA = events[idxA];
    const vA = values.get(evA.id);

    const candidates = [];
    const weights = [];

    for (let j = 0; j < events.length; j++) {
      if (j === idxA) continue;
      const evB = events[j];
      const key = canonicalKey(evA.id, evB.id);
      if (shownPairsSet.has(key)) continue;

      const vB = values.get(evB.id);
      const gap = Math.abs(vA - vB);
      if (gap <= minGap) continue; // Exclude events too close in value

      candidates.push(evB);
      weights.push(gapWeight(gap, scale));
    }

    if (candidates.length === 0) continue;

    const idxW = weightedPick(weights);
    const evB = candidates[idxW];
    const key = canonicalKey(evA.id, evB.id);
    shownPairsSet.add(key);
    return [evA, evB];
  }

  // --- 2) Fallback: linear scan for any unused pair respecting MIN_GAP ---
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const gap = Math.abs(values.get(events[i].id) - values.get(events[j].id));
      if (gap <= minGap) continue;

      const key = canonicalKey(events[i].id, events[j].id);
      if (!shownPairsSet.has(key)) {
        shownPairsSet.add(key);
        return [events[i], events[j]];
      }
    }
  }

  // --- 3) Nuclear fallback: clear history and reuse respecting MIN_GAP ---
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const gap = Math.abs(values.get(events[i].id) - values.get(events[j].id));
      if (gap <= minGap) continue;

      shownPairsSet.add(canonicalKey(events[i].id, events[j].id));
      return [events[i], events[j]];
    }
  }

  throw new Error(`Could not generate any pair with gap > ${minGap}. Check your event data or filters.`);
}