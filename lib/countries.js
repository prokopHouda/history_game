// Country helpers shared by filters and filter UIs.
// ISO-2 code -> UN M49 sub-region for the region filter, and ISO-2 ->
// localized display names for the country dropdowns (via Intl.DisplayNames,
// same mechanism as CountryFlags tooltips).

export const COUNTRY_TO_SUBREGION = Object.freeze({
  // Asia
  CN: 'Eastern Asia', JP: 'Eastern Asia', KP: 'Eastern Asia', KR: 'Eastern Asia', TW: 'Eastern Asia',
  KZ: 'Central Asia', KG: 'Central Asia', TJ: 'Central Asia', TM: 'Central Asia', UZ: 'Central Asia',
  BT: 'Southern Asia', IN: 'Southern Asia', IR: 'Southern Asia', LK: 'Southern Asia', NP: 'Southern Asia', PK: 'Southern Asia', AF: 'Southern Asia', BD: 'Southern Asia', MV: 'Southern Asia',
  ID: 'South-Eastern Asia', MY: 'South-Eastern Asia', PH: 'South-Eastern Asia', SG: 'South-Eastern Asia', TH: 'South-Eastern Asia', VN: 'South-Eastern Asia', BN: 'South-Eastern Asia', KH: 'South-Eastern Asia', LA: 'South-Eastern Asia', MM: 'South-Eastern Asia',
  TR: 'Western Asia', SY: 'Western Asia', LB: 'Western Asia', IL: 'Western Asia', SA: 'Western Asia', AE: 'Western Asia', YE: 'Western Asia', JO: 'Western Asia', IQ: 'Western Asia', OM: 'Western Asia', QA: 'Western Asia', KW: 'Western Asia', BH: 'Western Asia', AM: 'Western Asia', AZ: 'Western Asia', GE: 'Western Asia',

  // Europe
  CZ: 'Eastern Europe', SK: 'Eastern Europe', PL: 'Eastern Europe', HU: 'Eastern Europe', RO: 'Eastern Europe', BG: 'Eastern Europe', UA: 'Eastern Europe', BY: 'Eastern Europe', MD: 'Eastern Europe', RU: 'Eastern Europe',
  GB: 'Northern Europe', IE: 'Northern Europe', NO: 'Northern Europe', SE: 'Northern Europe', DK: 'Northern Europe', FI: 'Northern Europe', IS: 'Northern Europe', EE: 'Northern Europe', LV: 'Northern Europe', LT: 'Northern Europe',
  IT: 'Southern Europe', SI: 'Southern Europe', HR: 'Southern Europe', GR: 'Southern Europe', ES: 'Southern Europe', PT: 'Southern Europe', MT: 'Southern Europe', CY: 'Southern Europe', RS: 'Southern Europe',
  FR: 'Western Europe', CH: 'Western Europe', DE: 'Western Europe', AT: 'Western Europe', BE: 'Western Europe', NL: 'Western Europe', LU: 'Western Europe',

  // Americas
  US: 'Northern America', CA: 'Northern America', MX: 'Northern America', GL: 'Northern America',
  AR: 'South America', BO: 'South America', BR: 'South America', CL: 'South America', CO: 'South America', EC: 'South America', PE: 'South America', PY: 'South America', UY: 'South America', VE: 'South America', GF: 'South America',
  CR: 'Central America', PA: 'Central America', GT: 'Central America', CU: 'Central America', JM: 'Central America', DO: 'Central America',

  // Africa
  ET: 'Eastern Africa', KE: 'Eastern Africa', TZ: 'Eastern Africa', UG: 'Eastern Africa', ZM: 'Eastern Africa', RW: 'Eastern Africa', BI: 'Eastern Africa', SO: 'Eastern Africa',
  CD: 'Middle Africa', AO: 'Middle Africa', CM: 'Middle Africa', GA: 'Middle Africa',
  MA: 'Northern Africa', DZ: 'Northern Africa', TN: 'Northern Africa', LY: 'Northern Africa', EG: 'Northern Africa', EH: 'Northern Africa',
  ZA: 'Southern Africa', LS: 'Southern Africa', NA: 'Southern Africa', BW: 'Southern Africa', SZ: 'Southern Africa',

  // Oceania
  AU: 'Australia & New Zealand', NZ: 'Australia & New Zealand',
  PG: 'Melanesia', FJ: 'Melanesia', SB: 'Melanesia', VU: 'Melanesia',

  // Antarctica (reserved ISO code for the continent)
  AQ: 'Antarctica',
});

// Localized country name from ISO-2 code (Intl.DisplayNames).
// Falls back to the code itself when unavailable.
export function getCountryName(code, lang = 'en') {
  const u = (code || '').trim().toUpperCase();
  try {
    const dn = new Intl.DisplayNames([lang], { type: 'region' });
    const name = dn.of(u);
    return name || u;
  } catch (e) {
    return u;
  }
}

// Sort country codes by their localized display name.
export function sortCountriesByLocalizedName(codes, lang = 'en') {
  return [...codes].sort((a, b) => {
    const na = getCountryName(a, lang);
    const nb = getCountryName(b, lang);
    return na.localeCompare(nb, lang);
  });
}

// UN M49 sub-region for an ISO-2 country code (or null when unknown).
export function getSubregionForCountry(code) {
  return COUNTRY_TO_SUBREGION[(code || '').trim().toUpperCase()] || null;
}