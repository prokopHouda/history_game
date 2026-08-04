import LangNav from './LangNav.js';
import Leaderboard from './Leaderboard.js';
import MpGameCard from './MpGameCard.js';

export default function GameScreen({ room, playerId, lang, t, statusText, cardAState, cardBState, translating, onGuess, onLangChange, getText }) {
  if (!room || !room.current_pair || room.current_pair.length < 2) return null;

  const [a, b] = room.current_pair;
  const ta = getText(a);
  const tb = getText(b);
  const round = room.current_round || 1;
  const total = room.total_rounds || 10;

  return (
    <div id="mp-game">
      <LangNav lang={lang} onChange={onLangChange} />

      <Leaderboard room={room} playerId={playerId} />

      <div id="mp-round" style={{ textAlign: 'center', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }}>
        {t('round')} {round} / {total}
      </div>

      <div id="mp-status" style={{ marginBottom: '1rem', fontWeight: 700, textAlign: 'center' }}>
        {statusText}
      </div>

      <div className="cards">
        <MpGameCard
          id="mp-cardA"
          event={{ ...a, short_name: ta.short_name, description: ta.description }}
          state={cardAState}
          loading={translating}
          onClick={() => onGuess('A')}
          ariaLabel="Pick this event as earlier"
          lang={lang}
          t={t}
        />
        <MpGameCard
          id="mp-cardB"
          event={{ ...b, short_name: tb.short_name, description: tb.description }}
          state={cardBState}
          loading={translating}
          onClick={() => onGuess('B')}
          ariaLabel="Pick this event as earlier"
          lang={lang}
          t={t}
        />
      </div>
    </div>
  );
}