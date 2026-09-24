import { useState, useMemo } from 'react';
import { filterEvents, getUniqueGroupsAndCountries, getPoolCountriesString } from '../lib/filters.js';
import { getCountryName, sortCountriesByLocalizedName } from '../lib/countries.js';
import RegionSelect from './RegionSelect.js';
import CountryFlags from './CountryFlags.js';

export default function SettingsPanel({ allEvents, lang, t, tf, game, MIN_EVENTS, onStart }) {
  const { range, group } = game.mechanics.filters;
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [groupValue, setGroupValue] = useState('');
  const [country, setCountry] = useState('');
  const [langSelect, setLangSelect] = useState(lang);
  const [error, setError] = useState('');

  const { groups, countries } = useMemo(
    () => getUniqueGroupsAndCountries(allEvents, game.key),
    [allEvents, game.key]
  );

  const sortedCountries = useMemo(
    () => sortCountriesByLocalizedName(countries, lang),
    [countries, lang]
  );

  const filters = useMemo(() => ({
    [range.minKey]: parseInt(minValue, 10) || null,
    [range.maxKey]: parseInt(maxValue, 10) || null,
    [group.key]: groupValue,
    country,
  }), [minValue, maxValue, groupValue, country, range.minKey, range.maxKey, group.key]);

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
  function updateGroup(v) { setGroupValue(v); setError(''); }
  function updateCountry(v) { setCountry(v); setError(''); }

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
            value={groupValue}
            onChange={updateGroup}
            regions={groups}
            t={t}
            tf={tf}
          />
        ) : (
          <select id="groupFilter" value={groupValue} onChange={(e) => updateGroup(e.target.value)}>
            <option value="">{t('allRegions')}</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        )}
      </div>

      <div className="field">
        <label htmlFor="countryFilter">{t('country')}</label>
        <select id="countryFilter" value={country} onChange={(e) => updateCountry(e.target.value)}>
          <option value="">{t('allCountries')}</option>
          {sortedCountries.map((c) => (
            <option key={c} value={c}>{getCountryName(c, lang)}</option>
          ))}
        </select>
      </div>

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