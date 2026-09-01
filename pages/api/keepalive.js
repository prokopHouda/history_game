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
  const { count, error } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    ok: true,
    events: count,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
}