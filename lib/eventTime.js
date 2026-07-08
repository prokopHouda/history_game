export function getEventYear(e) {
  if (e.date) return parseInt(e.date.split('-')[0], 10);
  return e.year ?? 0;
}

export function getEventTime(e) {
  if (e.date) return Date.parse(e.date + 'T00:00:00Z');
  const y = String(e.year).padStart(4, '0');
  return Date.parse(`${y}-01-01T00:00:00Z`);
}