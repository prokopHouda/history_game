import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getEventYear(e) {
  if (e.date) return parseInt(e.date.split('-')[0], 10);
  return e.year ?? 0;
}

function getTime(e) {
  if (e.date) return Date.parse(e.date + 'T00:00:00Z');
  const y = String(e.year).padStart(4, '0');
  return Date.parse(`${y}-01-01T00:00:00Z`);
}

function pickPair(events) {
  let i = Math.floor(Math.random() * events.length);
  let j = Math.floor(Math.random() * events.length);
  let guard = 0;
  while (j === i) {
    j = Math.floor(Math.random() * events.length);
    if (++guard > 1000) throw new Error('Stuck picking pair');
  }
  return [events[i], events[j]];
}

function yearDiff(years) {
  return Math.abs(years[0] - years[1]);
}

function calculatePoints(a, b, isCorrect) {
  const yA = getEventYear(a);
  const yB = getEventYear(b);
  const diff = yearDiff([yA, yB]);

  if (isCorrect) {
    return diff >= 100 ? 1 : 2;
  }
  // No punishment — all wrong answers score 0
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { roomId, playerId, choice } = req.body;
  if (!roomId || !playerId || !choice) return res.status(400).json({ error: 'Missing fields' });

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error || !room) return res.status(404).json({ error: 'Room not found' });
  if (room.answered && room.answered[playerId] !== undefined) return res.status(409).json({ error: 'Already answered' });

  const pair = room.current_pair || [];
  if (pair.length < 2) return res.status(400).json({ error: 'No active pair' });

  const a = pair[0];
  const b = pair[1];
  const earlierId = getTime(a) < getTime(b) ? a.id : b.id;
  const chosen = choice === 'A' ? a : b;
  const isCorrect = chosen.id === earlierId;

  const points = calculatePoints(a, b, isCorrect);

  const scores = { ...(room.scores || {}) };
  const answered = { ...(room.answered || {}) };
  answered[playerId] = { choice, isCorrect, points };

  const hostId = room.host;
  const bId = room.player_b;
  const allAnswered = bId ? Object.keys(answered).length === 2 : Object.keys(answered).length === 1;

  let nextPair = pair;
  let round = room.current_round || 0;
  let state = room.state;
  let winner = null;
  const totalRounds = room.total_rounds || 10;

  let lastResult = null;
  let nextRoundAt = null;

  if (allAnswered) {
    // Only update scores when BOTH players have answered, so both clients
    // see the score change coincide with the result overlay.
    Object.entries(answered).forEach(([pid, ans]) => {
      scores[pid] = (scores[pid] || 0) + ans.points;
    });

    round += 1;
    const events = room.events || [];
    if (events.length >= 2) {
      nextPair = pickPair(events);
    }

    // Build result summary for the round that just ended
    const earlier = getTime(a) < getTime(b) ? a : b;
    lastResult = {
      pair: [a, b],
      earlier,
      answered: { ...answered },
      scores: { ...scores },
      round,
    };
    nextRoundAt = new Date(Date.now() + 3500).toISOString();

    if (round > totalRounds) {
      state = 'finished';
      const hostScore = scores[hostId] || 0;
      const bScore = scores[bId] || 0;
      if (hostScore > bScore) winner = { id: hostId, score: hostScore, badge: '🏆' };
      else if (bScore > hostScore) winner = { id: bId, score: bScore, badge: '🏆' };
      else winner = { id: null, score: hostScore, badge: '🤝' };
    }
  }

  const updateData = {
    scores,
    current_pair: nextPair,
    current_round: round,
    state,
    winner,
    last_result: lastResult,
    next_round_at: nextRoundAt,
  };
  if (allAnswered) {
    updateData.answered = {};
  } else {
    updateData.answered = answered;
  }

  const { error: updErr } = await supabase
    .from('rooms')
    .update(updateData)
    .eq('id', roomId);

  if (updErr) return res.status(500).json({ error: updErr.message });

  res.status(200).json({
    isCorrect,
    points,
    earlier: getTime(a) < getTime(b) ? a : b,
    later: getTime(a) < getTime(b) ? b : a,
    scores,
    allAnswered,
    round,
    totalRounds,
    winner,
  });
}
