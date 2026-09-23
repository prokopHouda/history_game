import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export default async function handler(req, res) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const start = Date.now();
  const { data, error } = await supabase
    .from('events')
    .select('id, short_name')
    .order('id', { ascending: false })
    .limit(1)
    .range(0, 0);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    ok: true,
    lastEvent: data?.[0]?.short_name || null,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
}