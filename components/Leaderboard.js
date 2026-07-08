export default function Leaderboard({ room, playerId }) {
  if (!room || !room.players) return null;
  const scores = room.scores || {};
  const players = [...(room.players || [])].map((p) => ({
    ...p,
    score: scores[p.id] || 0,
  }));
  players.sort((a, b) => b.score - a.score);

  return (
    <div id="mp-leaderboard" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
      <div id="mp-leaderboard-title" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' }}>
        Leaderboard
      </div>
      {players.map((p, idx) => {
        const isMe = p.id === playerId;
        return (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.4rem 0.6rem', borderRadius: '6px',
              background: isMe ? 'rgba(255,255,255,0.08)' : 'transparent',
              fontSize: '0.9rem', gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '1.5rem', textAlign: 'right', color: '#94a3b8', fontWeight: 700 }}>{idx + 1}.</span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color || '#94a3b8', display: 'inline-block' }} />
              <span style={{ fontWeight: isMe ? 700 : 400 }}>{p.nickname || 'Guest'}</span>
            </div>
            <span style={{ fontWeight: 800, color: '#fbbf24', minWidth: '2rem', textAlign: 'right' }}>{p.score}</span>
          </div>
        );
      })}
    </div>
  );
}