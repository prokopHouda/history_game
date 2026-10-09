import { getGame } from './games.js';
import { resolveRegionFilter } from './regions.js';

// Normalize a filter value into an array of non-empty strings.
// Accepts: undefined, null, '', 'val', ['val'], ['a', 'b'].
// Returns: [] when no filter, otherwise the array of values.
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((v) => v);
  return [val];
}

export function filterEvents(events, filters, gameKey = 'history') {
  if (!filters) return events;
  const game = getGame(gameKey);
  const { range, group } = game.mechanics.filters;
  const getValue = game.mechanics.getValue;

  // Grouped filters (regions) support continent -> sub-region sets.
  // Multi-select: resolve each selected value into its sub-region set,
  // then merge into one combined set.
  const groupValues = toArray(filters[group.key]);
  const groupSets = group.grouped
    ? groupValues.map((v) => resolveRegionFilter(v)).filter(Boolean)
    : [];

  // Optional sport-type filter (sportclubs game only).
  const sportKey = game.mechanics.filters.sport?.key;
  const sportColumn = game.mechanics.filters.sport?.column;
  const sportValues = sportKey ? toArray(filters[sportKey]) : [];

  // Country filter — multi-select.
  const countryValues = toArray(filters.country);

  return events.filter((e) => {
    const v = getValue(e);
    const min = filters[range.minKey];
    const max = filters[range.maxKey];
    if (min !== null && min !== undefined && v < min) return false;
    if (max !== null && max !== undefined && v > max) return false;

    // Group / region filter
    if (groupValues.length > 0) {
      const list = (e[group.column] || '').split(',').map((r) => r.trim()).filter(Boolean);
      if (group.grouped) {
        // Merged sub-region sets: event passes if ANY of its regions match ANY selected group
        const matched = list.some((r) => groupSets.some((set) => set.has(r)));
        if (!matched) return false;
      } else {
        if (!list.some((r) => groupValues.includes(r))) return false;
      }
    }

    // Sport filter
    if (sportValues.length > 0) {
      const list = (e[sportColumn] || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!list.some((s) => sportValues.includes(s))) return false;
    }

    // Country filter
    if (countryValues.length > 0) {
      const list = (e.countries || '').split(',').map((c) => c.trim()).filter(Boolean);
      if (!list.some((c) => countryValues.includes(c))) return false;
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

// Unique sport types present in the dataset (sportclubs game only).
export function getUniqueSports(data, gameKey = 'sportclubs') {
  const game = getGame(gameKey);
  const sportColumn = game.mechanics.filters.sport?.column;
  if (!sportColumn) return [];
  const set = new Set();
  data.forEach((e) => {
    if (e[sportColumn]) {
      e[sportColumn].split(',').forEach((s) => {
        const value = s.trim();
        if (value) set.add(value);
      });
    }
  });
  return [...set].sort();
}