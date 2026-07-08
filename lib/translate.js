export async function ensureTranslated(events, cache, lang) {
  if (lang === 'en') return;
  if (!cache[lang]) cache[lang] = {};
  const langCache = cache[lang];
  const ids = events.filter((e) => e && !langCache[e.id]).map((e) => e.id);
  if (ids.length === 0) return;

  try {
    const res = await fetch(`/api/translate?ids=${ids.join(',')}&lang=${lang}`);
    if (res.ok) {
      const data = await res.json();
      Object.entries(data).forEach(([id, tr]) => {
        langCache[Number(id)] = tr;
      });
    }
  } catch (err) {
    console.error('Translation fetch failed', err);
  }
}

export function getText(event, cache, lang) {
  const tr = cache[lang]?.[event.id];
  return {
    short_name: tr?.short_name || event.short_name || '???',
    description: tr?.description || event.description || '',
    fun_fact: tr?.fun_fact || '',
  };
}