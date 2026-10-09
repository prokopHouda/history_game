import { useMemo } from 'react';
import {
  CONTINENTS,
  CONTINENT_TO_SUBREGIONS,
  isContinent,
} from '../lib/regions.js';

// Build the optgroup structure: continents -> sub-regions present in the dataset.
function useGroups(regions) {
  return useMemo(() => {
    const present = new Set(regions);
    return CONTINENTS
      .map((continent) => ({
        continent,
        subs: CONTINENT_TO_SUBREGIONS[continent].filter((s) => present.has(s)),
      }))
      .filter((g) => g.subs.length > 0);
  }, [regions]);
}

// Label for a value (continent key or sub-region name).
function regionLabel(value, t, tf) {
  if (isContinent(value)) return tf('allContinent', { continent: t(`continent${value}`) });
  return value;
}

// ── Single-select mode (backward compatible) ──────────────────────────────
// Props:
//   value    - current selection ('' = all, continent key, or sub-region)
//   onChange - (value) => void
//   regions  - string[] of sub-regions present in the dataset
//   t, tf    - translation functions
//   id       - optional id for the <select>

// ── Multi-select mode ─────────────────────────────────────────────────────
// Props:
//   multiple   - true to enable multi-select
//   values     - string[] of selected values (continents or sub-regions)
//   onChange   - (string[]) => void
//   regions    - string[] of sub-regions present in the dataset
//   t, tf      - translation functions
//   id         - optional id

export default function RegionSelect({
  value,
  onChange,
  regions,
  t,
  tf,
  id,
  multiple = false,
  values: multiValues,
}) {
  const groups = useGroups(regions);
  const continentLabel = (continent) => t(`continent${continent}`);

  // ── Multi-select mode ──
  if (multiple) {
    const selected = multiValues || [];
    const selectedSet = new Set(selected);

    const availableGroups = groups
      .map(({ continent, subs }) => ({
        continent,
        subs: subs.filter((s) => !selectedSet.has(s)),
        continentSelected: selectedSet.has(continent),
      }))
      .filter((g) => !g.continentSelected && g.subs.length > 0);

    function handleAdd(val) {
      if (!val || selectedSet.has(val)) return;
      onChange([...selected, val]);
    }

    function handleRemove(val) {
      onChange(selected.filter((v) => v !== val));
    }

    return (
      <div className="multiselect">
        {selected.length === 0 ? (
          <div className="multiselect-empty">{t('allRegions')}</div>
        ) : (
          <div className="multiselect-pills">
            {selected.map((v) => (
              <span key={v} className="multiselect-pill">
                {regionLabel(v, t, tf)}
                <button
                  type="button"
                  className="multiselect-pill-remove"
                  onClick={() => handleRemove(v)}
                  aria-label="Remove"
                >
                  ×
                </button>
              </span>
            ))}
            {selected.length > 1 && (
              <button
                type="button"
                className="multiselect-clear-all"
                onClick={() => onChange([])}
              >
                {t('clearAll')}
              </button>
            )}
          </div>
        )}

        {availableGroups.length > 0 && (
          <select
            id={id}
            className="multiselect-add"
            value=""
            onChange={(e) => {
              handleAdd(e.target.value);
              e.target.value = '';
            }}
          >
            <option value="">{t('addMore')}</option>
            {availableGroups.map(({ continent, subs }) => (
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
        )}
      </div>
    );
  }

  // ── Single-select mode (original) ──
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