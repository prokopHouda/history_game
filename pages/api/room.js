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
  const { method } = req;

  if (method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { action, roomCode, playerId } = req.body;

  if (action === 'create') {
    let code = randomRoomCode();
    let attempts = 0;
    let room;

    while (!room && attempts < 10) {
      const { data, error } = await supabase
        .from('rooms')
        .insert({ code, host: playerId, state: 'lobby' })
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

    // Fetch events to populate the room
    const { data: events } = await supabase.from('events').select('id, short_name, date, year, description').limit(200);
    if (!events || events.length < 2) return res.status(500).json({ error: 'Not enough events' });
    const pair = pickPair(events);

    const updates = {
      player_b: playerId,
      state: 'playing',
      events,
      current_pair: pair,
      scores: { [existing.host]: 0, [playerId]: 0 },
      streaks: { [existing.host]: 0, [playerId]: 0 },
      answered: {},
      current_round: 1,
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
