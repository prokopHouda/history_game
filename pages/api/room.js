import { createClient } from '@supabase/supabase-js';
import { pickPair } from '../../lib/pickPair.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function randomRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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

  const { action, roomCode, playerId, total_rounds, filters } = req.body;

  if (action === 'check-heartbeat') {
    if (!roomCode) return res.status(400).json({ error: 'Missing roomCode' });
    const { data: existing } = await supabase.from('rooms').select('id, host, player_b, heartbeats').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });
    const now = Date.now();
    const hb = existing.heartbeats || {};
    // Update this player's heartbeat on check
    hb[playerId] = new Date().toISOString();
    await supabase.from('rooms').update({ heartbeats: hb }).eq('id', existing.id);
    const oppId = existing.host === playerId ? existing.player_b : existing.host;
    const oppLastBeat = oppId && hb[oppId] ? new Date(hb[oppId]).getTime() : null;
    const alive = oppLastBeat ? (now - oppLastBeat) < 35000 : false;
    return res.status(200).json({ alive });
  }

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

  if (action === 'restart') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing fields' });

    const { data: existing } = await supabase.from('rooms').select('*').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const ready = new Set(existing.ready_players || []);
    ready.add(playerId);

    const hostId = existing.host;
    const bId = existing.player_b;
    const bothReady = bId ? ready.size === 2 : ready.size === 1;

    if (bothReady) {
      const shownPairsSet = new Set();
      const firstPair = pickPair(existing.events || [], shownPairsSet);
      const scores = { [hostId]: 0 };
      if (bId) scores[bId] = 0;

      const updates = {
        state: 'playing',
        scores,
        current_round: 1,
        current_pair: firstPair,
        shown_pairs: Array.from(shownPairsSet),
        answered: {},
        winner: null,
        last_result: null,
        next_round_at: null,
        ready_players: [],
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
          scores: { [playerId]: 0 },
          streaks: { [playerId]: 0 },
          answered: {},
          current_round: 1,
          last_result: null,
          next_round_at: null,
          heartbeats: { [playerId]: new Date().toISOString() },
          ready_players: [],
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

  if (action === 'join') {
    if (!roomCode || !playerId) return res.status(400).json({ error: 'Missing roomCode or playerId' });

    const { data: existing } = await supabase.from('rooms').select('*').eq('code', roomCode.toLowerCase()).single();
    if (!existing) return res.status(404).json({ error: 'Room not found' });
    if (existing.player_b && existing.player_b !== playerId) return res.status(403).json({ error: 'Room is full' });

    const scores = { ...(existing.scores || {}) };
    scores[playerId] = 0;

    const heartbeats = { ...(existing.heartbeats || {}) };
    heartbeats[playerId] = new Date().toISOString();

    const updates = {
      player_b: playerId,
      state: 'playing',
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

  return res.status(400).json({ error: 'Invalid action' });
}
