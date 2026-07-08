import { createClient } from '@supabase/supabase-js';
import { pickPair } from '../../lib/pickPair.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULT_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308',
  '#a855f7', '#f97316', '#ec4899', '#14b8a6',
  '#84cc16', '#6366f1',
];

function randomRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function nextGuestNumber(players) {
  const used = new Set(
    players
      .filter((p) => p.nickname && /^Guest \d+$/.test(p.nickname))
      .map((p) => parseInt(p.nickname.replace('Guest ', ''), 10))
  );
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

function assignColor(players) {
  const used = new Set(players.map((p) => p.color).filter(Boolean));
  for (const c of DEFAULT_COLORS) {
    if (!used.has(c)) return c;
  }
  return DEFAULT_COLORS[0];
}

function getHost(players) {
  return players.find((p) => p.isHost);
}

function applyFilters(events, filters) {
  if (!filters) return events;
  return events.filter((e) => {
    const y = e.year_int ?? 0;
    if (filters.startYear !== null && filters.startYear !== undefined && y < filters.startYear) return false;
    if (filters.endYear !== null && filters.endYear !== undefined && y > filters.endYear) return false;
    if (filters.region && e.region !== filters.region) return false;
    if (filters.country) {
      const list = (e.countries || '').split(',').map((c) => c.trim()).filter(Boolean);
      if (!list.includes(filters.country)) return false;
    }
    return true;
  });
}

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { action, roomCode, playerId, total_rounds, filters, nickname, color } = req.body;

  // ------------------------------------------------------------------
  // HEARTBEAT
  // ------------------------------------------------------------------
  if (action === 'heartbeat') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing fields' });
    const { data: existing } = await supabase.from('rooms').select('id, heartbeats').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });
    const hb = { ...(existing.heartbeats || {}) };
    hb[playerId] = new Date().toISOString();
    const { error: updErr } = await supabase.from('rooms').update({ heartbeats: hb }).eq('id', existing.id);
    if (updErr) return res.status(500).json({ error: updErr.message });
    return res.status(200).json({ ok: true });
  }

  // ------------------------------------------------------------------
  // CHECK-HEARTBEAT (multi-player)
  // ------------------------------------------------------------------
  if (action === 'check-heartbeat') {
    if (!roomCode) return res.status(400).json({ error: 'Missing roomCode' });
    const { data: existing } = await supabase.from('rooms').select('id, players, heartbeats, state').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const now = Date.now();
    const hb = existing.heartbeats || {};
    // Update this player's heartbeat on check
    hb[playerId] = new Date().toISOString();
    await supabase.from('rooms').update({ heartbeats: hb }).eq('id', existing.id);

    const players = existing.players || [];
    const aliveMap = {};
    let hostAlive = true;

    players.forEach((p) => {
      if (p.id === playerId) {
        aliveMap[p.id] = true;
        return;
      }
      const lastBeat = hb[p.id] ? new Date(hb[p.id]).getTime() : null;
      // If a player has no heartbeat entry yet (e.g. just joined), assume alive
      const isAlive = lastBeat ? (now - lastBeat) < 35000 : true;
      aliveMap[p.id] = isAlive;
      if (p.isHost && !isAlive) hostAlive = false;
    });

    // If lobby and host is dead → room is closed
    if (existing.state === 'lobby' && !hostAlive) {
      return res.status(200).json({ alive: aliveMap, roomClosed: true });
    }

    return res.status(200).json({ alive: aliveMap, roomClosed: false });
  }

  // ------------------------------------------------------------------
  // CREATE
  // ------------------------------------------------------------------
  if (action === 'create') {
    const rounds = parseInt(total_rounds, 10) || 10;
    if (rounds < 5 || rounds > 50) {
      return res.status(400).json({ error: 'Rounds must be 5–50' });
    }

    // Validate filters produce 25+ events
    const { data: allEvents } = await supabase.from('events').select('id, short_name, date, year, year_int, description, countries, region');
    if (!allEvents || allEvents.length < 25) {
      return res.status(500).json({ error: 'Not enough total events in database' });
    }

    const filtered = applyFilters(allEvents, filters);
    if (filtered.length < 25) {
      return res.status(400).json({ error: `Filter yields only ${filtered.length} events. Need at least 25.` });
    }

    let code = randomRoomCode();
    let attempts = 0;
    let room;

    while (!room && attempts < 10) {
      const shownPairsSet = new Set();
      const firstPair = pickPair(filtered, shownPairsSet);
      const players = [{
        id: playerId,
        nickname: nickname || 'Host',
        color: color || assignColor([]),
        isHost: true,
      }];

      const { data, error } = await supabase
        .from('rooms')
        .insert({
          code,
          host: playerId,
          state: 'lobby',
          total_rounds: rounds,
          events: filtered,
          current_pair: firstPair,
          shown_pairs: Array.from(shownPairsSet),
          scores: {},
          streaks: {},
          answered: {},
          current_round: 1,
          last_result: null,
          next_round_at: null,
          heartbeats: { [playerId]: new Date().toISOString() },
          ready_players: [],
          players,
          max_players: 10,
        })
        .select()
        .single();
      if (data) room = data;
      else code = randomRoomCode();
      attempts++;
    }

    if (!room) return res.status(500).json({ error: 'Could not generate room' });
    return res.status(200).json({ room });
  }

  // ------------------------------------------------------------------
  // JOIN
  // ------------------------------------------------------------------
  if (action === 'join') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing roomCode or playerId' });

    const { data: existing } = await supabase.from('rooms').select('*').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });
    if (existing.state === 'playing' || existing.state === 'finished') {
      return res.status(403).json({ error: 'Game already in progress' });
    }

    const players = existing.players || [];
    if (players.find((p) => p.id === playerId)) {
      // Already in room — just return it
      return res.status(200).json({ room: existing });
    }
    if (players.length >= (existing.max_players || 10)) {
      return res.status(403).json({ error: 'Room is full' });
    }

    const newPlayer = {
      id: playerId,
      nickname: nickname || `Guest ${nextGuestNumber(players)}`,
      color: color || assignColor(players),
      isHost: false,
    };
    players.push(newPlayer);

    const scores = { ...(existing.scores || {}) };
    scores[playerId] = 0;

    const heartbeats = { ...(existing.heartbeats || {}) };
    heartbeats[playerId] = new Date().toISOString();

    const updates = {
      players,
      scores,
      heartbeats,
    };

    const { data: room, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ room });
  }

  // ------------------------------------------------------------------
  // UPDATE-PROFILE
  // ------------------------------------------------------------------
  if (action === 'update-profile') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing fields' });
    const { data: existing } = await supabase.from('rooms').select('id, players').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    let players = existing.players || [];
    const validColor = DEFAULT_COLORS.includes(color);
    players = players.map((p) => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        nickname: nickname !== undefined ? (nickname || p.nickname).slice(0, 15) : p.nickname,
        color: (color !== undefined && validColor) ? color : p.color,
      };
    });

    const { error: updErr } = await supabase.from('rooms').update({ players }).eq('id', existing.id);
    if (updErr) return res.status(500).json({ error: updErr.message });
    return res.status(200).json({ ok: true, players });
  }

  // ------------------------------------------------------------------
  // START (host only)
  // ------------------------------------------------------------------
  if (action === 'start') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing fields' });
    const { data: existing } = await supabase.from('rooms').select('*').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const players = existing.players || [];
    const host = getHost(players);
    if (!host || host.id !== playerId) {
      return res.status(403).json({ error: 'Only host can start the game' });
    }
    if (players.length < 2) {
      return res.status(403).json({ error: 'Need at least 2 players to start' });
    }

    const shownPairsSet = new Set();
    const firstPair = pickPair(existing.events || [], shownPairsSet);
    const scores = {};
    const streaks = {};
    players.forEach((p) => {
      scores[p.id] = 0;
      streaks[p.id] = 0;
    });

    const updates = {
      state: 'playing',
      scores,
      streaks,
      current_round: 1,
      current_pair: firstPair,
      shown_pairs: Array.from(shownPairsSet),
      answered: {},
      winner: null,
      last_result: null,
      next_round_at: null,
      ready_players: [],
      round_started_at: new Date().toISOString(),
    };

    const { data: room, error } = await supabase.from('rooms').update(updates).eq('id', existing.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ room });
  }

  // ------------------------------------------------------------------
  // RESTART (Play Again — back to lobby)
  // ------------------------------------------------------------------
  if (action === 'restart') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing fields' });

    const { data: existing } = await supabase.from('rooms').select('*').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const players = existing.players || [];
    const ready = new Set(existing.ready_players || []);
    ready.add(playerId);

    const allReady = ready.size === players.length;

    if (allReady) {
      const updates = {
        state: 'lobby',
        scores: {},
        streaks: {},
        current_round: 0,
        current_pair: [],
        shown_pairs: [],
        answered: {},
        winner: null,
        last_result: null,
        next_round_at: null,
        ready_players: [],
        round_started_at: null,
      };

      const { data: room, error } = await supabase.from('rooms').update(updates).eq('id', existing.id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ room, restarted: true });
    } else {
      const { error: updErr } = await supabase.from('rooms').update({ ready_players: Array.from(ready) }).eq('id', existing.id);
      if (updErr) return res.status(500).json({ error: updErr.message });
      return res.status(200).json({ waiting: true });
    }
  }

  // ------------------------------------------------------------------
  // LEAVE
  // ------------------------------------------------------------------
  if (action === 'leave') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing fields' });
    const { data: existing } = await supabase.from('rooms').select('id, players, state, host').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const players = (existing.players || []).filter((p) => p.id !== playerId);

    // If host leaves in lobby, destroy the room
    const wasHost = existing.host === playerId;
    if (wasHost && existing.state === 'lobby') {
      await supabase.from('rooms').delete().eq('id', existing.id);
      return res.status(200).json({ roomClosed: true });
    }

    // If game is in progress, just remove the player (game continues)
    const scores = { ...(existing.scores || {}) };
    delete scores[playerId];
    const streaks = { ...(existing.streaks || {}) };
    delete streaks[playerId];
    const heartbeats = { ...(existing.heartbeats || {}) };
    delete heartbeats[playerId];
    const answered = { ...(existing.answered || {}) };
    delete answered[playerId];

    const { error: updErr } = await supabase.from('rooms').update({ players, scores, streaks, heartbeats, answered }).eq('id', existing.id);
    if (updErr) return res.status(500).json({ error: updErr.message });
    return res.status(200).json({ ok: true, players });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
