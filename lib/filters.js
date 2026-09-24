import { getGame } from './games.js';
import { resolveRegionFilter } from './regions.js';

export function filterEvents(events, filters, gameKey = 'history') {
  if (!filters) return events;
  const game = getGame(gameKey);
  const { range, group } = game.mechanics.filters;
  const getValue = game.mechanics.getValue;

  // Grouped filters (history regions) support continent -> sub-region sets.
  // Plain filters (mountain ranges) match the value directly.
  const groupSet = group.grouped ? resolveRegionFilter(filters[group.key]) : null;
  const groupValue = group.grouped ? null : filters[group.key];

  return events.filter((e) => {
    const v = getValue(e);
    const min = filters[range.minKey];
    const max = filters[range.maxKey];
    if (min !== null && min !== undefined && v < min) return false;
    if (max !== null && max !== undefined && v > max) return false;
    if (groupSet) {
      const list = (e[group.column] || '').split(',').map((r) => r.trim()).filter(Boolean);
      if (!list.some((r) => groupSet.has(r))) return false;
    }
    if (groupValue) {
      const list = (e[group.column] || '').split(',').map((r) => r.trim()).filter(Boolean);
      if (!list.includes(groupValue)) return false;
    }
    if (filters.country) {
      const list = (e.countries || '').split(',').map((c) => c.trim()).filter(Boolean);
      if (!list.includes(filters.country)) return false;
    }
    return true;
  });
}

export function getUniqueGroupsAndCountries(data, gameKey = 'history') {
  const game = getGame(gameKey);
  const column = game.mechanics.filters.group.column;

  const groupSet = new Set();
  data.forEach((e) => {
    if (e[column]) {
      e[column].split(',').forEach((g) => {
        const value = g.trim();
        if (value) groupSet.add(value);
      });
    }
  });
  const groups = [...groupSet].sort();

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

  return { groups, countries };
}

// Backwards-compatible alias for the history game (regions).
export function getUniqueRegionsAndCountries(data) {
  const { groups, countries } = getUniqueGroupsAndCountries(data, 'history');
  return { regions: groups, countries };
}

// Comma-joined, deduplicated, sorted uppercase ISO-2 codes for a list of events.
// Suitable for passing to CountryFlags' `countries` prop.
export function getPoolCountriesString(events) {
  const set = new Set();
  events.forEach((e) => {
    if (e.countries) {
      e.countries.split(',').forEach((c) => {
        const code = c.trim().toUpperCase();
        if (code) set.add(code);
      });
    }
  });
  return [...set].sort().join(',');
}