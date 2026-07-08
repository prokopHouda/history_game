export default function RoundLeaderboard({ result, playerId, t }) {
  if (!result || !result.answered) return null;

  const entries = Object.entries(result.answered).map(([pid, ans]) => {
    return {
      id: pid,
      nickname: ans.nickname || 'Guest',
      color: ans.color || '#94a3b8',
      points: ans.points || 0,
      isCorrect: ans.isCorrect,
      timedOut: ans.timedOut,
      isMe: pid === playerId,
    };
  });
  entries.sort((a, b) => b.points - a.points);

  return (
    <div id="mp-round-leaderboard" style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' }}>
        {t('leaderboard')}
      </div>
      {entries.map((entry, idx) => {
        let symbol = '';
        if (entry.timedOut) symbol = '⏱️';
        else if (entry.isCorrect) symbol = '✅';
        else symbol = '❌';
        let symbolColor = '#ef4444';
        if (entry.isCorrect) symbolColor = '#22c55e';
        else if (entry.timedOut) symbolColor = '#fbbf24';

        return (
          <div
            key={entry.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.3rem 0.5rem', borderRadius: '4px',
              fontSize: '0.85rem', gap: '0.5rem',
              background: entry.isMe ? 'rgba(255,255,255,0.06)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
              <span style={{ fontWeight: entry.isMe ? 700 : 400 }}>
                {idx + 1}. {entry.nickname}
              </span>
            </div>
            <span style={{ fontWeight: 700, color: symbolColor }}>
              {symbol} {entry.points > 0 ? '+' : ''}{entry.points}pts
            </span>
          </div>
        );
      })}
    </div>
  );
}