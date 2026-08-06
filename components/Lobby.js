import { useState, useMemo } from 'react';
import { filterEvents, getUniqueRegionsAndCountries, getPoolCountriesString } from '../lib/filters.js';
import RegionSelect from './RegionSelect.js';
import CountryFlags from './CountryFlags.js';

export default function Lobby({ allEvents, lang, t, tf, MIN_EVENTS, onCreate, onJoin, creating, error }) {
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [langSelect, setLangSelect] = useState(lang);
  const [rounds, setRounds] = useState(10);
  const [joinCode, setJoinCode] = useState('');
  const [localError, setLocalError] = useState('');

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

  const poolCountries = useMemo(() => {
    const sy = parseInt(startYear, 10) || null;
    const ey = parseInt(endYear, 10) || null;
    if (sy !== null && ey !== null && sy > ey) return '';
    return getPoolCountriesString(filterEvents(allEvents, { startYear: sy, endYear: ey, region, country }));
  }, [allEvents, startYear, endYear, region, country]);

  function handleCreate() {
    const r = parseInt(rounds, 10) || 10;
    if (r < 5 || r > 50) {
      setLocalError(t('roundsRange'));
      return;
    }
    if (!valid) {
      setLocalError(tf('needEvents', { min: MIN_EVENTS, count }));
      return;
    }
    setLocalError('');
    const filters = {
      startYear: parseInt(startYear, 10) || null,
      endYear: parseInt(endYear, 10) || null,
      region,
      country,
    };
    onCreate(filters, r, langSelect);
  }

  function handleJoin() {
    const code = joinCode.trim().toLowerCase();
    if (!code) return;
    setLocalError('');
    onJoin(code, langSelect);
  }

  const counterColor = valid ? '#34d399' : '#f87171';
  const displayError = localError || error;

  return (
    <div id="mp-lobby">
      <div className="field">
        <label htmlFor="mp-langSelect">{t('language')}</label>
        <select id="mp-langSelect" value={langSelect} onChange={(e) => setLangSelect(e.target.value)}>
          <option value="en">English</option>
          <option value="cs">Čeština</option>
          <option value="it">Italiano</option>
        </select>
      </div>

      <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

      <h3 style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1rem' }}>{t('createGame')}</h3>

      <div className="field-row">
        <div className="field">
          <label htmlFor="mp-startYear">{t('startYear')}</label>
          <input type="number" id="mp-startYear" placeholder={t('placeholderStartYear')} value={startYear} onChange={(e) => { setStartYear(e.target.value); setLocalError(''); }} />
        </div>
        <div className="field">
          <label htmlFor="mp-endYear">{t('endYear')}</label>
          <input type="number" id="mp-endYear" placeholder={t('placeholderEndYear')} value={endYear} onChange={(e) => { setEndYear(e.target.value); setLocalError(''); }} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="mp-regionFilter">{t('region')}</label>
        <RegionSelect
          id="mp-regionFilter"
          value={region}
          onChange={(v) => { setRegion(v); setLocalError(''); }}
          regions={regions}
          t={t}
          tf={tf}
        />
      </div>

      <div className="field">
        <label htmlFor="mp-countryFilter">{t('country')}</label>
        <select id="mp-countryFilter" value={country} onChange={(e) => { setCountry(e.target.value); setLocalError(''); }}>
          <option value="">{t('allCountries')}</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="roundsInput">{t('rounds')}</label>
        <input type="number" id="roundsInput" value={rounds} min={5} max={50} onChange={(e) => setRounds(e.target.value)} />
      </div>

      <div id="mp-poolCounter" className="pool-counter" style={{ color: counterColor }}>
        {valid
          ? `${count} events available ✅`
          : tf('needEvents', { min: MIN_EVENTS, count })}
      </div>

      {poolCountries && (
        <div className="pool-flags">
          <div className="pool-flags-label">{t('poolCountries')}</div>
          <CountryFlags countries={poolCountries} lang={lang} t={t} />
        </div>
      )}

      <button className="btn-primary" id="btn-create" disabled={creating} onClick={handleCreate}>
        {creating ? t('creating') : t('createRoom')}
      </button>

      <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

      <h3 style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1rem' }}>{t('joinGame')}</h3>

      <div className="field">
        <label htmlFor="joinCode">{t('roomCode')}</label>
        <input type="text" id="joinCode" placeholder={t('placeholderRoomCode')} maxLength={3} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
        <button className="btn-secondary" id="btn-join" onClick={handleJoin}>{t('joinRoom')}</button>
      </div>

      {displayError && (
        <div style={{ color: '#f87171', marginTop: '1rem' }}>{displayError}</div>
      )}
    </div>
  );
}