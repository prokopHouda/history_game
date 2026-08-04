// UN M49 sub-region taxonomy.
// Each sub-region maps to exactly one continent. Used by the region filter
// (continent selection matches any event touching one of its sub-regions)
// and by the RegionSelect dropdown (continents as optgroups with an
// "All <continent>" option that selects the whole continent).

export const CONTINENT_TO_SUBREGIONS = Object.freeze({
  Africa: Object.freeze([
    'Eastern Africa',
    'Middle Africa',
    'Northern Africa',
    'Southern Africa',
    'Western Africa',
  ]),
  Americas: Object.freeze([
    'Caribbean',
    'Central America',
    'Northern America',
    'South America',
  ]),
  Asia: Object.freeze([
    'Central Asia',
    'Eastern Asia',
    'South-Eastern Asia',
    'Southern Asia',
    'Western Asia',
  ]),
  Europe: Object.freeze([
    'Eastern Europe',
    'Northern Europe',
    'Southern Europe',
    'Western Europe',
  ]),
  Oceania: Object.freeze([
    'Australia & New Zealand',
    'Melanesia',
    'Micronesia',
    'Polynesia',
  ]),
});

// Sub-region -> continent (inverse of the above).
export const SUBREGION_TO_CONTINENT = Object.freeze(
  Object.fromEntries(
    Object.entries(CONTINENT_TO_SUBREGIONS).flatMap(([continent, subs]) =>
      subs.map((sub) => [sub, continent])
    )
  )
);

export const CONTINENTS = Object.freeze(Object.keys(CONTINENT_TO_SUBREGIONS));

// True when `value` is a continent key (Africa, Americas, Asia, Europe, Oceania).
export function isContinent(value) {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(CONTINENT_TO_SUBREGIONS, value);
}

// Resolve any filter value ("" / continent / sub-region) to the set of
// sub-regions it covers. Empty/unknown values return null (no filter).
export function resolveRegionFilter(value) {
  if (!value) return null;
  if (isContinent(value)) return new Set(CONTINENT_TO_SUBREGIONS[value]);
  return new Set([value]);
}