import { useState, useMemo } from 'react';
import { filterEvents, getUniqueRegionsAndCountries } from '../lib/filters.js';
import RegionSelect from './RegionSelect.js';

export default function SettingsPanel({ allEvents, lang, t, MIN_EVENTS, onStart }) {
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [langSelect, setLangSelect] = useState(lang);
  const [error, setError] = useState('');

  const { regions, countries } = useMemo(
    () => getUniqueRegionsAndCountries(allEvents),
    [allEvents]
  );

  const { count, valid } = useMemo(() => {
    const sy = parseInt(startYear, 10) || null;
    const ey = parseInt(endYear, 10) || null;
    if (sy !== null && ey !== null && sy > ey) return { count: 0, valid: false };
    const c = filterEvents(allEvents, { startYear: sy, endYear: ey, region, country }).length;
    return { count: c, valid: c >= MIN_EVENTS };
  }, [allEvents, startYear, endYear, region, country, MIN_EVENTS]);

  function updateStartYear(v) { setStartYear(v); setError(''); }
  function updateEndYear(v) { setEndYear(v); setError(''); }
  function updateRegion(v) { setRegion(v); setError(''); }
  function updateCountry(v) { setCountry(v); setError(''); }

  function handleStart() {
    const sy = parseInt(startYear, 10) || null;
    const ey = parseInt(endYear, 10) || null;
    if (!valid) {
      setError(`${t('needMore')} ${MIN_EVENTS} ${t('toPlay')} (${count})`);
      return;
    }
    onStart({
      startYear: sy,
      endYear: ey,
      region,
      country,
      lang: langSelect,
    });
  }

  const counterColor = valid ? '#34d399' : '#f87171';

  return (
    <div id="settings">
      <h2>{t('settingsTitle')}</h2>

      <div className="field-row">
        <div className="field">
          <label htmlFor="startYear">{t('startYear')}</label>
          <input
            type="number"
            id="startYear"
            placeholder="e.g. 1500"
            value={startYear}
            onChange={(e) => updateStartYear(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="endYear">{t('endYear')}</label>
          <input
            type="number"
            id="endYear"
            placeholder="e.g. 2000"
            value={endYear}
            onChange={(e) => updateEndYear(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="regionFilter">{t('region')}</label>
        <RegionSelect
          id="regionFilter"
          value={region}
          onChange={updateRegion}
          regions={regions}
          t={t}
          tf={tf}
        />
      </div>

      <div className="field">
        <label htmlFor="countryFilter">{t('country')}</label>
        <select id="countryFilter" value={country} onChange={(e) => updateCountry(e.target.value)}>
          <option value="">{t('allCountries')}</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
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