export default function FinalStandings({ standings, playerId, t, onRestart, onReturnToLobby }) {
  return (
    <div className="win-overlay">
      <div className="win-content" style={{ maxWidth: '520px' }}>
        <h2 className="win-title" style={{ marginBottom: '1rem' }}>{t('finalStandings')}</h2>

        <div id="mp-standings" style={{ marginBottom: '1.5rem', width: '100%' }}>
          {(standings || []).map((s, idx) => {
            const isMe = s.id === playerId;
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 1rem', borderRadius: '8px',
                  background: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                  marginBottom: '0.4rem', fontSize: '1rem',
                  border: isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ width: '2.5rem', textAlign: 'center', fontWeight: 800, color: idx < 3 ? '#fbbf24' : '#94a3b8', fontSize: '1.1rem' }}>#{idx + 1}</span>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color || '#94a3b8', display: 'inline-block' }} />
                  <span style={{ fontWeight: isMe ? 700 : 400 }}>{s.nickname || 'Guest'}</span>
                </div>
                <span style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1.2rem' }}>{s.score}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
          <button className="btn-primary" onClick={onRestart}>{t('restartGame')}</button>
          <button className="btn-secondary" onClick={onReturnToLobby}>{t('returnToLobby')}</button>
        </div>
      </div>
    </div>
  );
}