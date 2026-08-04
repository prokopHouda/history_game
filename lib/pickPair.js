import { getEventYear } from './eventTime.js';

const MIN_GAP_YEARS = 2;

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

function gapWeight(gapYears) {
  // Strongly favour nearby events. Uses an exponential decay so that
  // close pairs dominate the weighted pool.
  // 25-year gap ≈ 10x more likely than 150-year gap.
  // 50-year gap  ≈ 3x  more likely than 150-year gap.
  return Math.exp(-gapYears / 50);
}

export function pickPair(events, shownPairsSet = new Set()) {
  if (events.length < 2) throw new Error('Need at least 2 events');

  const years = new Map();
  for (const e of events) {
    years.set(e.id, getEventYear(e));
  }

  // --- 1) Weighted proximity sampling with collision guard ---
  for (let attempt = 0; attempt < 20; attempt++) {
    const idxA = Math.floor(Math.random() * events.length);
    const evA = events[idxA];
    const yA = years.get(evA.id);

    const candidates = [];
    const weights = [];

    for (let j = 0; j < events.length; j++) {
      if (j === idxA) continue;
      const evB = events[j];
      const key = canonicalKey(evA.id, evB.id);
      if (shownPairsSet.has(key)) continue;

      const yB = years.get(evB.id);
      const gap = Math.abs(yA - yB);
      if (gap <= MIN_GAP_YEARS) continue; // Exclude events too close in time

      candidates.push(evB);
      weights.push(gapWeight(gap));
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
      const gap = Math.abs(years.get(events[i].id) - years.get(events[j].id));
      if (gap <= MIN_GAP_YEARS) continue;

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
      const gap = Math.abs(years.get(events[i].id) - years.get(events[j].id));
      if (gap <= MIN_GAP_YEARS) continue;

      shownPairsSet.add(canonicalKey(events[i].id, events[j].id));
      return [events[i], events[j]];
    }
  }

  throw new Error(`Could not generate any pair with gap > ${MIN_GAP_YEARS} years. Check your event data or filters.`);
}
