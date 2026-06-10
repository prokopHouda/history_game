import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

  const { roomId, playerId } = req.body;
  if (!roomId || !playerId) return res.status(400).json({ error: 'Missing fields' });

  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, players, scores, total_rounds')
    .eq('id', roomId)
    .single();

  if (error || !room) return res.status(404).json({ error: 'Room not found' });

  const players = room.players || [];
  const isInRoom = players.some((p) => p.id === playerId);
  if (!isInRoom) {
    return res.status(403).json({ error: 'Player not in this room' });
  }

  const standings = buildStandings(room.scores, players);

  const { error: updErr } = await supabase
    .from('rooms')
    .update({ state: 'finished', winner: standings })
    .eq('id', roomId);

  if (updErr) return res.status(500).json({ error: updErr.message });

  res.status(200).json({ ok: true, winner: standings });
}
