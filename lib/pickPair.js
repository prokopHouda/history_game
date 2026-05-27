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
  // Smoothly favour nearby events without banning distant ones.
  // 50-year gap is ~1.67x more likely than 150-year gap.
  return 1 / (1 + gapYears / 100);
}

export function pickPair(events, shownPairsSet = new Set()) {
  if (events.length < 2) throw new Error('Need at least 2 events');

  const years = new Map();
  for (const e of events) {
    years.set(e.id, e.year_int ?? 0);
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

  // --- 2) Fallback: linear scan for any unused pair ---
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const key = canonicalKey(events[i].id, events[j].id);
      if (!shownPairsSet.has(key)) {
        shownPairsSet.add(key);
        return [events[i], events[j]];
      }
    }
  }

  // --- 3) Nuclear fallback: clear history and reuse ---
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      shownPairsSet.add(canonicalKey(events[i].id, events[j].id));
      return [events[i], events[j]];
    }
  }

  throw new Error('Could not generate any pair');
}
