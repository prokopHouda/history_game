import { createClient } from '@supabase/supabase-js';

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

function getEventYear(e) {
  if (e.date) return parseInt(e.date.split('-')[0], 10);
  return e.year ?? 0;
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

function applyFilters(events, filters) {
  if (!filters) return events;
  return events.filter((e) => {
    const y = getEventYear(e);
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

  if (action === 'create') {
    const rounds = parseInt(total_rounds, 10) || 10;
    if (rounds < 5 || rounds > 50) {
      return res.status(400).json({ error: 'Rounds must be 5–50' });
    }

    // Validate filters produce 25+ events
    const { data: allEvents } = await supabase.from('events').select('id, short_name, date, year, description, countries, region');
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
      const { data, error } = await supabase
        .from('rooms')
        .insert({ 
          code, 
          host: playerId, 
          state: 'lobby', 
          total_rounds: rounds,
          events: filtered,
          current_pair: pickPair(filtered),
          scores: { [playerId]: 0 },
          streaks: { [playerId]: 0 },
          answered: {},
          current_round: 1,
          last_result: null,
          next_round_at: null,
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

    const updates = {
      player_b: playerId,
      state: 'playing',
      scores,
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

  if (action === 'clear-result') {
    if (!roomCode) return res.status(400).json({ error: 'Missing roomCode' });

    const { error: updErr } = await supabase
      .from('rooms')
      .update({ last_result: null, next_round_at: null })
      .eq('code', roomCode.toLowerCase());

    if (updErr) return res.status(500).json({ error: updErr.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
