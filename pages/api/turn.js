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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { roomId, playerId, choice } = req.body; // choice: 'A' | 'B'
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

  const scores = { ...(room.scores || {}) };
  const streaks = { ...(room.streaks || {}) };
  const answered = { ...(room.answered || {}) };

  if (isCorrect) {
    scores[playerId] = (scores[playerId] || 0) + 1;
    streaks[playerId] = (streaks[playerId] || 0) + 1;
  } else {
    streaks[playerId] = 0;
  }
  answered[playerId] = { choice, isCorrect };

  const hostId = room.host;
  const bId = room.player_b;
  const answeredIds = Object.keys(answered);
  const allAnswered = bId ? answeredIds.length === 2 : answeredIds.length === 1;

  let nextPair = pair;
  let round = room.current_round || 0;
  let state = room.state;
  let winner = room.winner;
  let resets = {};

  if (allAnswered) {
    round += 1;
    const events = room.events || [];
    if (events.length >= 2) {
      nextPair = pickPair(events);
    }
    resets = { answered: {} };

    // Check streak win (streak of 3 = win for simplicity in multiplayer)
    const hostStreak = streaks[hostId] || 0;
    const bStreak = streaks[bId] || 0;
    if (hostStreak >= 3) winner = { id: hostId, badge: '🏆' };
    if (bStreak >= 3) winner = { id: bId, badge: '🏆' };
    if (winner) state = 'finished';
  }

  const { error: updErr } = await supabase
    .from('rooms')
    .update({
      scores,
      streaks,
      answered,
      current_pair: nextPair,
      current_round: round,
      state,
      winner,
      ...resets,
    })
    .eq('id', roomId);

  if (updErr) return res.status(500).json({ error: updErr.message });

  res.status(200).json({
    isCorrect,
    earlier: getTime(a) < getTime(b) ? a : b,
    later: getTime(a) < getTime(b) ? b : a,
    scores,
    streaks,
    allAnswered,
    round,
    winner,
  });
}
