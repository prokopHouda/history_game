import { onCardKey } from '../lib/onCardKey.js';

export default function GameCard({ id, event, meta, showMeta, state, onClick, ariaLabel }) {
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
      <h2>{event?.short_name || ''}</h2>
      <p>{event?.description || ''}</p>
      {showMeta && <div className="meta">{meta}</div>}
    </div>
  );
}