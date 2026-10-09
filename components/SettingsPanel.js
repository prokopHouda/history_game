import { useState, useMemo } from 'react';
import { filterEvents, getUniqueGroupsAndCountries, getPoolCountriesString, getUniqueSports } from '../lib/filters.js';
import { getCountryName, sortCountriesByLocalizedName } from '../lib/countries.js';
import RegionSelect from './RegionSelect.js';
import MultiSelect from './MultiSelect.js';
import CountryFlags from './CountryFlags.js';

export default function SettingsPanel({ allEvents, lang, t, tf, game, MIN_EVENTS, onStart }) {
  const { range, group, sport: sportFilter } = game.mechanics.filters;
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [groupValues, setGroupValues] = useState([]);
  const [countries, setCountries] = useState([]);
  const [sportValues, setSportValues] = useState([]);
  const [langSelect, setLangSelect] = useState(lang);
  const [error, setError] = useState('');

  const { groups, countries: allCountryCodes } = useMemo(
    () => getUniqueGroupsAndCountries(allEvents, game.key),
    [allEvents, game.key]
  );

  const sortedCountries = useMemo(
    () => sortCountriesByLocalizedName(allCountryCodes, lang),
    [allCountryCodes, lang]
  );

  const sports = useMemo(
    () => sportFilter ? getUniqueSports(allEvents, game.key) : [],
    [allEvents, game.key, sportFilter]
  );

  const filters = useMemo(() => ({
    [range.minKey]: parseInt(minValue, 10) || null,
    [range.maxKey]: parseInt(maxValue, 10) || null,
    [group.key]: groupValues,
    ...(sportFilter ? { [sportFilter.key]: sportValues } : {}),
    country: countries,
  }), [minValue, maxValue, groupValues, sportValues, countries, range.minKey, range.maxKey, group.key, sportFilter]);

  const { count, valid } = useMemo(() => {
    const min = filters[range.minKey];
    const max = filters[range.maxKey];
    if (min !== null && max !== null && min > max) return { count: 0, valid: false };
    const c = filterEvents(allEvents, filters, game.key).length;
    return { count: c, valid: c >= MIN_EVENTS };
  }, [allEvents, filters, game.key, MIN_EVENTS, range.minKey, range.maxKey]);

  const poolCountries = useMemo(() => {
    const min = filters[range.minKey];
    const max = filters[range.maxKey];
    if (min !== null && max !== null && min > max) return '';
    return getPoolCountriesString(filterEvents(allEvents, filters, game.key));
  }, [allEvents, filters, game.key, range.minKey, range.maxKey]);

  function updateMin(v) { setMinValue(v); setError(''); }
  function updateMax(v) { setMaxValue(v); setError(''); }
  function updateGroups(v) { setGroupValues(v); setError(''); }
  function updateCountries(v) { setCountries(v); setError(''); }
  function updateSports(v) { setSportValues(v); setError(''); }

  function handleStart() {
    if (!valid) {
      setError(`${t('needMore')} ${MIN_EVENTS} ${t('toPlay')} (${count})`);
      return;
    }
    onStart({ ...filters, lang: langSelect });
  }

  const counterColor = valid ? '#34d399' : '#f87171';

  return (
    <div id="settings">
      <h2>{t('settingsTitle')}</h2>

      <div className="field-row">
        <div className="field">
          <label htmlFor="minValue">{t('minValueLabel')}</label>
          <input
            type="number"
            id="minValue"
            placeholder={t('placeholderMinValue')}
            value={minValue}
            onChange={(e) => updateMin(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="maxValue">{t('maxValueLabel')}</label>
          <input
            type="number"
            id="maxValue"
            placeholder={t('placeholderMaxValue')}
            value={maxValue}
            onChange={(e) => updateMax(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="groupFilter">{t('groupLabel')}</label>
        {group.grouped ? (
          <RegionSelect
            id="groupFilter"
            multiple
            values={groupValues}
            onChange={updateGroups}
            regions={groups}
            t={t}
            tf={tf}
          />
        ) : (
          <MultiSelect
            id="groupFilter"
            values={groupValues}
            onChange={updateGroups}
            options={groups.map((g) => ({ value: g, label: g }))}
            allLabel={t('allRegions')}
            addLabel={t('addMore')}
            t={t}
          />
        )}
      </div>

      <div className="field">
        <label htmlFor="countryFilter">{t('country')}</label>
        <MultiSelect
          id="countryFilter"
          values={countries}
          onChange={updateCountries}
          options={sortedCountries.map((c) => ({ value: c, label: getCountryName(c, lang) }))}
          allLabel={t('allCountries')}
          addLabel={t('addMore')}
          t={t}
        />
      </div>

      {sportFilter && (
        <div className="field">
          <label htmlFor="sportFilter">{t('sportLabel')}</label>
          <MultiSelect
            id="sportFilter"
            values={sportValues}
            onChange={updateSports}
            options={sports.map((s) => ({ value: s, label: s }))}
            allLabel={t('allSports')}
            addLabel={t('addMore')}
            t={t}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="langSelect">{t('language')}</label>
        <select
          id="langSelect"
          value={langSelect}
          onChange={(e) => setLangSelect(e.target.value)}
        >
          <option value="en">English</option>
          <option value="cs">Čeština</option>
          <option value="it">Italiano</option>
        </select>
      </div>

      <div id="poolCounter" className="pool-counter" style={{ color: counterColor }}>
        {valid
          ? `${count} ${t('eventsAvailable')} ✅`
          : `${t('needMore')} ${MIN_EVENTS} ${t('toPlay')} (${count}) ❌`}
      </div>

      {poolCountries && (
        <div className="pool-flags">
          <div className="pool-flags-label">{t('poolCountries')}</div>
          <CountryFlags countries={poolCountries} lang={lang} t={t} />
        </div>
      )}

      <button
        className="btn-primary"
        id="startBtn"
        onClick={handleStart}
        disabled={!valid}
        style={{
          opacity: valid ? '1' : '0.5',
          cursor: valid ? 'pointer' : 'not-allowed',
        }}
      >
        {t('startGame')}
      </button>
      {error && <div id="settingsError">{error}</div>}
    </div>
  );
}