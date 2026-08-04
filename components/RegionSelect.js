import { useMemo } from 'react';
import {
  CONTINENTS,
  CONTINENT_TO_SUBREGIONS,
  isContinent,
} from '../lib/regions.js';

// Single <select> with continents as <optgroup> labels. Each group has an
// "All <continent>" option at the top (selecting the whole continent) followed
// by the sub-regions actually present in `regions`. Only continents that have
// at least one matching sub-region in `regions` are shown.
//
// Props:
//   value    - current selection ('' = all, continent key, or sub-region)
//   onChange - (value) => void
//   regions  - string[] of sub-regions present in the dataset
//   t        - translation function (t('allRegions'), t('allContinent'), t('continent<X>'))
//   tf       - translation function with vars (tf('allContinent', { continent }))
//   id       - optional id for the <select>
export default function RegionSelect({ value, onChange, regions, t, tf, id }) {
  const groups = useMemo(() => {
    const present = new Set(regions);
    return CONTINENTS
      .map((continent) => ({
        continent,
        subs: CONTINENT_TO_SUBREGIONS[continent].filter((s) => present.has(s)),
      }))
      .filter((g) => g.subs.length > 0);
  }, [regions]);

  const continentLabel = (continent) => t(`continent${continent}`);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{t('allRegions')}</option>
      {groups.map(({ continent, subs }) => (
        <optgroup key={continent} label={continentLabel(continent)}>
          <option value={continent}>
            {tf('allContinent', { continent: continentLabel(continent) })}
          </option>
          {subs.map((sub) => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// Re-export for convenience so callers don't need regions.js directly.
export { isContinent };