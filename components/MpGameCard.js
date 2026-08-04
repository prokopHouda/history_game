import { onCardKey } from '../lib/onCardKey.js';
import CountryFlags from './CountryFlags.js';

export default function MpGameCard({ id, event, state, loading, onClick, ariaLabel, lang, t }) {
  const className = `card${state ? ` ${state}` : ''}`;
  const handleKey = onCardKey(onClick);

  return (
    <div
      className={className}
      id={id}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={handleKey}
    >
      <div className="card-check">✓</div>
      {loading && (
        <div style={{ display: 'block', marginBottom: '0.5rem' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', margin: '0.5rem auto' }} />
        </div>
      )}
      <div style={{ display: loading ? 'none' : '' }}>
        <CountryFlags countries={event?.countries} lang={lang} t={t} />
      </div>
      <h2 style={{ display: loading ? 'none' : '' }}>{event?.short_name || ''}</h2>
      <p style={{ display: loading ? 'none' : '' }}>{event?.description || ''}</p>
    </div>
  );
}