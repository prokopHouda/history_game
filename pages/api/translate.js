import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function translateWithContext(rows, lang, key) {
  const deeplKey = process.env.DEEPL_API_KEY;
  if (!deeplKey) return null;

  // descriptions act as context for short_name translations
  const context = rows.map((r) => r.description).join('\n\n');

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${deeplKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: rows.map((r) => r.short_name),
      context,
      source_lang: 'EN',
      target_lang: lang.toUpperCase(),
    }),
  });

  if (!res.ok) {
    console.error('DeepL context translate error', await res.text());
    return null;
  }
  const { translations } = await res.json();
  return translations.map((t) => t.text);
}

async function translatePlain(rows, lang) {
  const deeplKey = process.env.DEEPL_API_KEY;
  if (!deeplKey) return null;

  const texts = rows.flatMap((r) => [
    r.description,
    r.fun_fact || '',
  ]);

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${deeplKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      source_lang: 'EN',
      target_lang: lang.toUpperCase(),
    }),
  });

  if (!res.ok) {
    console.error('DeepL plain translate error', await res.text());
    return null;
  }
  const { translations } = await res.json();

  return rows.map((r, i) => {
    const desc = translations[i * 2].text;
    const ffRaw = translations[i * 2 + 1]?.text || '';
    const ff = r.fun_fact ? (ffRaw || 'No fun fact available.') : '';
    return { description: desc, fun_fact: ff };
  });
}

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
  const missingRows = [];

  idArr.forEach((id) => {
    const hit = cached?.find((c) => c.event_id === id);
    // Treat null short_name as a cache miss so bad/stale translations get overwritten
    if (hit && hit.short_name != null) {
      result[id] = { short_name: hit.short_name, description: hit.description, fun_fact: hit.fun_fact };
    } else {
      missingRows.push(id);
    }
  });

  // 2. Translate anything missing via DeepL
  if (missingRows.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from('events')
      .select('id, short_name, description, fun_fact')
      .in('id', missingRows);

    // Parallel calls: short_names (with description context) + descriptions/fun_facts (plain)
    const [shortNames, extras] = await Promise.all([
      translateWithContext(rows, lang),
      translatePlain(rows, lang),
    ]);

    // If either call failed, fall back gracefully
    if (!shortNames || !extras) {
      return res.status(200).json(result);
    }

    const inserts = rows.map((r, i) => {
      const sn = shortNames[i];
      const { description, fun_fact } = extras[i];
      result[r.id] = { short_name: sn, description, fun_fact };
      return { event_id: r.id, lang, short_name: sn, description, fun_fact };
    });

    await supabaseAdmin.from('event_translations')
      .upsert(inserts, { onConflict: 'event_id,lang' });
  }

  res.status(200).json(result);
}
