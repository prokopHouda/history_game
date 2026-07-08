import { getEventYear } from './eventTime.js';

export function filterEvents(events, filters) {
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

export function getUniqueRegionsAndCountries(data) {
  const regions = [...new Set(data.map((e) => e.region).filter(Boolean))].sort();

  const countrySet = new Set();
  data.forEach((e) => {
    if (e.countries) {
      e.countries.split(',').forEach((c) => {
        const code = c.trim();
        if (code) countrySet.add(code);
      });
    }
  });
  const countries = [...countrySet].sort();

  return { regions, countries };
}