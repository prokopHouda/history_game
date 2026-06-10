import { createClient } from '@supabase/supabase-js';
import { pickPair } from '../../lib/pickPair.js';

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
  return 0;
}

const TURN_TIMEOUT_MS = 45000;

function getActivePlayers(players, heartbeats) {
  const now = Date.now();
  return (players || []).filter((p) => {
    const lastBeat = heartbeats?.[p.id] ? new Date(heartbeats[p.id]).getTime() : null;
    return lastBeat ? (now - lastBeat) < 60000 : false;
  });
}

function buildStandings(scores, players) {
  const list = (players || []).map((p) => ({
    id: p.id,
    nickname: p.nickname || 'Guest',
    color: p.color || '#94a3b8',
    score: scores?.[p.id] || 0,
  }));
  list.sort((a, b) => b.score - a.score);
  return list;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { roomId, playerId, choice } = req.body;
  if (!roomId || !playerId) return res.status(400).json({ error: 'Missing fields' });

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error || !room) return res.status(404).json({ error: 'Room not found' });

  const pair = room.current_pair || [];
  if (pair.length < 2) return res.status(400).json({ error: 'No active pair' });

  const a = pair[0];
  const b = pair[1];
  const earlierId = getTime(a) < getTime(b) ? a.id : b.id;

  let answered;
  try {
    answered = JSON.parse(room.answered || '{}');
  } catch {
    answered = room.answered || {};
    if (!answered || typeof answered !== 'object' || Array.isArray(answered)) answered = {};
  }
  if (answered[playerId] !== undefined) return res.status(409).json({ error: 'Already answered' });

  const scores = { ...(room.scores || {}) };

  let isCorrect = false;
  let points = 0;

  if (choice === 'timeout') {
    answered[playerId] = { choice: null, isCorrect: false, points: 0, timedOut: true };
  } else if (!choice) {
    return res.status(400).json({ error: 'Missing choice' });
  } else {
    const chosen = choice === 'A' ? a : b;
    isCorrect = chosen.id === earlierId;
    points = calculatePoints(a, b, isCorrect);
    answered[playerId] = { choice, isCorrect, points };
  }

  const players = room.players || [];
  const activePlayers = getActivePlayers(players, room.heartbeats);
  const activeIds = new Set(activePlayers.map((p) => p.id));

  const roundStart = room.round_started_at ? new Date(room.round_started_at).getTime() : Date.now();
  const deadlinePassed = (Date.now() - roundStart) >= TURN_TIMEOUT_MS;

  const answeredActiveCount = Object.keys(answered).filter((id) => activeIds.has(id)).length;
  const allAnswered = answeredActiveCount >= activePlayers.length || deadlinePassed;

  let nextPair = pair;
  let round = room.current_round || 0;
  let state = room.state;
  let winner = null;
  const totalRounds = room.total_rounds || 10;

  let lastResult = null;
  let nextRoundAt = null;
  let shownPairsToSave = null;
  let roundStartedAt = room.round_started_at;

  if (allAnswered) {
    // Auto-mark any missing active players as timed out
    activePlayers.forEach((p) => {
      if (answered[p.id] === undefined) {
        answered[p.id] = { choice: null, isCorrect: false, points: 0, timedOut: true };
      }
    });

    // Update scores for everyone
    Object.entries(answered).forEach(([pid, ans]) => {
      scores[pid] = (scores[pid] || 0) + ans.points;
    });

    const earlier = getTime(a) < getTime(b) ? a : b;

    // Fetch fun_fact for the earlier event directly from DB
    let funFact = '';
    try {
      const { data: factData } = await supabase
        .from('events')
        .select('fun_fact')
        .eq('id', earlier.id)
        .single();
      if (factData?.fun_fact) funFact = factData.fun_fact;
    } catch (e) {
      console.error('Failed to fetch fun_fact', e);
    }

    round += 1;
    const events = room.events || [];
    if (events.length >= 2) {
      const shownPairsSet = new Set(room.shown_pairs || []);
      nextPair = pickPair(events, shownPairsSet);
      shownPairsToSave = Array.from(shownPairsSet);
    }

    // Build result summary for the round that just ended
    const perPlayerResults = {};
    players.forEach((p) => {
      perPlayerResults[p.id] = {
        ...answered[p.id],
        nickname: p.nickname,
        color: p.color,
      };
    });

    lastResult = {
      pair: [a, b],
      earlier,
      answered: perPlayerResults,
      scores: { ...scores },
      round,
      fun_fact: funFact,
    };

    const resultDisplayMs = funFact ? 10000 : 3500;
    nextRoundAt = new Date(Date.now() + resultDisplayMs).toISOString();
    roundStartedAt = new Date(Date.now() + resultDisplayMs).toISOString();

    if (round > totalRounds) {
      state = 'finished';
      const standings = buildStandings(scores, players);
      winner = standings; // full array of {id, nickname, color, score}
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
    round_started_at: roundStartedAt,
    ...(shownPairsToSave ? { shown_pairs: shownPairsToSave } : {}),
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
