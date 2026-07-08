export default function PlayerList({ players, playerId, t }) {
  return (
    <div id="mp-players-list" style={{ marginBottom: '1.5rem' }}>
      {(players || []).map((p) => {
        const isMe = p.id === playerId;
        return (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              marginBottom: '0.4rem',
              fontWeight: isMe ? 700 : 400,
              border: isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
            }}
          >
            <span
              style={{
                width: 12, height: 12, borderRadius: '50%',
                background: p.color || '#94a3b8',
                display: 'inline-block', flexShrink: 0,
              }}
            />
            <span>
              {p.nickname || (p.isHost ? 'Host' : 'Guest')}
              {isMe && (
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}> ({t('you')})</span>
              )}
              {p.isHost && <span style={{ fontSize: '0.8rem' }}> 👑</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}