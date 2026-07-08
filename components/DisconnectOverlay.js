export default function DisconnectOverlay({ t, onBackToLobby }) {
  return (
    <div className="win-overlay">
      <div className="win-content">
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚪</div>
        <h2 className="win-title">{t('roomClosedTitle')}</h2>
        <p style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: '0.5rem 0' }}>{t('roomClosedMsg')}</p>
        <p style={{ fontSize: '1rem', color: '#94a3b8', margin: '1rem 0' }}>{t('roomClosedSub')}</p>
        <button className="btn-primary" onClick={onBackToLobby}>{t('backToLobby')}</button>
      </div>
    </div>
  );
}