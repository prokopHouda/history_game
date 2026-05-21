import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { ids, lang } = req.query;
  if (!ids || !lang) return res.status(400).json({ error: 'Missing ids or lang' });
  if (lang === 'en') return res.status(200).json({});

  const idArr = ids.split(',').map(Number);

  // 1. Check cache
  const { data: cached } = await supabaseAdmin
    .from('event_translations')
    .select('event_id, short_name, description, fun_fact')
    .in('event_id', idArr)
    .eq('lang', lang);

  const result = {};
  const missingIds = [];

  idArr.forEach((id) => {
    const hit = cached?.find((c) => c.event_id === id);
    if (hit) {
      result[id] = { short_name: hit.short_name, description: hit.description, fun_fact: hit.fun_fact };
    } else {
      missingIds.push(id);
    }
  });

  // 2. Translate anything missing via DeepL
  if (missingIds.length > 0) {
    const deeplKey = process.env.DEEPL_API_KEY;
    if (!deeplKey) return res.status(200).json(result); // graceful fallback to English

    const { data: rows } = await supabaseAdmin
      .from('events')
      .select('id, short_name, description, fun_fact')
      .in('id', missingIds);

    const texts = rows.flatMap((r) => [r.short_name, r.description, r.fun_fact || '']);

    const params = new URLSearchParams();
    texts.forEach((t) => params.append('text', t));
    params.append('target_lang', lang.toUpperCase());
    params.append('source_lang', 'EN');

    const deeplRes = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${deeplKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!deeplRes.ok) {
      console.error('DeepL error', await deeplRes.text());
      return res.status(200).json(result); // fallback
    }

    const { translations } = await deeplRes.json();

    const inserts = rows.map((r, i) => {
      const sn = translations[i * 3].text;
      const desc = translations[i * 3 + 1].text;
      const ffRaw = translations[i * 3 + 2]?.text || '';
      // Preserve empty string for events with no fun fact
      const ff = r.fun_fact ? (ffRaw || 'No fun fact available.') : '';
      result[r.id] = { short_name: sn, description: desc, fun_fact: ff };
      return { event_id: r.id, lang, short_name: sn, description: desc, fun_fact: ff };
    });

    await supabaseAdmin.from('event_translations').insert(inserts);
  }

  res.status(200).json(result);
}
