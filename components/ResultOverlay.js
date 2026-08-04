import RoundLeaderboard from './RoundLeaderboard.js';
import CountryFlags from './CountryFlags.js';

export default function ResultOverlay({ result, room, playerId, t, earlierText, pairTextA, pairTextB, funFactText, lang }) {
  if (!result || !result.answered) return null;

  const myAns = result.answered[playerId];
  if (!myAns) return null;

  let icon, color, labelKey;
  if (myAns.timedOut) {
    icon = '⏱️'; color = '#fbbf24'; labelKey = 'timedOut';
  } else if (myAns.isCorrect) {
    icon = '✅'; color = '#22c55e'; labelKey = 'correct';
  } else {
    icon = '❌'; color = '#ef4444'; labelKey = 'wrong';
  }

  const bgColor = myAns.timedOut ? 'rgba(251,191,36,0.1)'
    : myAns.isCorrect ? 'rgba(34,197,94,0.1)'
    : 'rgba(239,68,68,0.1)';

  return (
    <div className="win-overlay">
      <div className="win-content" style={{ maxWidth: '480px' }}>
        <div id="mp-result-pair" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <CountryFlags countries={pairTextA.countries} lang={lang} t={t} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pairTextA.short_name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{pairTextA.date}</div>
            </div>
            <div style={{ color: '#94a3b8' }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <CountryFlags countries={pairTextB.countries} lang={lang} t={t} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pairTextB.short_name}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{pairTextB.date}</div>
            </div>
          </div>
          {funFactText && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: '#818cf8', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                {t('didYouKnow')}
              </div>
              <div style={{ fontSize: '0.95rem', color: '#c7d2fe', fontStyle: 'italic', lineHeight: 1.5 }}>
                {funFactText}
              </div>
            </div>
          )}
        </div>

        <div
          id="mp-my-result"
          style={{
            padding: '1rem', borderRadius: '12px', border: '2px solid',
            borderColor: color, background: bgColor,
            marginBottom: '0.75rem', textAlign: 'center',
          }}
        >
          <div style={{ color, fontSize: '1.5rem', fontWeight: 800 }}>
            {icon} {t(labelKey)}{' '}
            <span style={{ color: '#fbbf24' }}>
              {myAns.points > 0 ? '+' : ''}{myAns.points}pts
            </span>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {earlierText.short_name} {t('wasEarlier')}
          </div>
        </div>

        <RoundLeaderboard result={result} playerId={playerId} t={t} />

        <div id="mp-next-round" style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
          {t('nextRound')}
        </div>
        <div className="spinner" style={{ margin: '1rem auto', width: '32px', height: '32px' }} />
      </div>
    </div>
  );
}