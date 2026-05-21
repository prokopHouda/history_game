import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { roomId, playerId } = req.body;
  if (!roomId || !playerId) return res.status(400).json({ error: 'Missing fields' });

  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, host, player_b, scores, total_rounds')
    .eq('id', roomId)
    .single();

  if (error || !room) return res.status(404).json({ error: 'Room not found' });

  const scores = { ...(room.scores || {}) };
  const hostId = room.host;
  const bId = room.player_b;

  const hostScore = scores[hostId] || 0;
  const bScore = scores[bId] || 0;

  let winner;
  if (playerId === hostId) {
    winner = { id: hostId, score: hostScore, badge: '🏆' };
  } else if (playerId === bId) {
    winner = { id: bId, score: bScore, badge: '🏆' };
  } else {
    return res.status(403).json({ error: 'Player not in this room' });
  }

  const { error: updErr } = await supabase
    .from('rooms')
    .update({ state: 'finished', winner })
    .eq('id', roomId);

  if (updErr) return res.status(500).json({ error: updErr.message });

  res.status(200).json({ ok: true, winner });
}
