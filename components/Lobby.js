import { useState, useMemo } from 'react';
import { filterEvents, getUniqueGroupsAndCountries, getPoolCountriesString } from '../lib/filters.js';
import RegionSelect from './RegionSelect.js';
import CountryFlags from './CountryFlags.js';

export default function Lobby({ allEvents, lang, t, tf, game, MIN_EVENTS, onCreate, onJoin, creating, error }) {
  const { range, group } = game.mechanics.filters;
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [groupValue, setGroupValue] = useState('');
  const [country, setCountry] = useState('');
  const [langSelect, setLangSelect] = useState(lang);
  const [rounds, setRounds] = useState(10);
  const [joinCode, setJoinCode] = useState('');
  const [localError, setLocalError] = useState('');

  const { groups, countries } = useMemo(
    () => getUniqueGroupsAndCountries(allEvents, game.key),
    [allEvents, game.key]
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
          <label htmlFor="mp-minValue">{t('minValueLabel')}</label>
          <input type="number" id="mp-minValue" placeholder={t('placeholderMinValue')} value={minValue} onChange={(e) => { setMinValue(e.target.value); setLocalError(''); }} />
        </div>
        <div className="field">
          <label htmlFor="mp-maxValue">{t('maxValueLabel')}</label>
          <input type="number" id="mp-maxValue" placeholder={t('placeholderMaxValue')} value={maxValue} onChange={(e) => { setMaxValue(e.target.value); setLocalError(''); }} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="mp-groupFilter">{t('groupLabel')}</label>
        {group.grouped ? (
          <RegionSelect
            id="mp-groupFilter"
            value={groupValue}
            onChange={(v) => { setGroupValue(v); setLocalError(''); }}
            regions={groups}
            t={t}
            tf={tf}
          />
        ) : (
          <select id="mp-groupFilter" value={groupValue} onChange={(e) => { setGroupValue(e.target.value); setLocalError(''); }}>
            <option value="">{t('allRegions')}</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
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
          ? tf('poolAvailable', { count })
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