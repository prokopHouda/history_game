import PlayerList from './PlayerList.js';
import ColorPicker from './ColorPicker.js';
import { DEFAULT_COLORS } from '../lib/mpColors.js';

export default function WaitingRoom({ room, playerId, t, tf, isHost, nickname, pendingColor, nicknameDirty, startError, onSaveProfile, onStart, onNicknameChange, onColorSelect }) {
  if (!room) return null;

  const codeDisplay = room.code ? room.code.toUpperCase() : '—';
  const canStart = (room.players?.length || 0) >= 2;
  const me = room.players?.find((p) => p.id === playerId);
  const selectedColor = pendingColor || me?.color;
  const takenColors = new Set((room.players || []).map((p) => p.color).filter(Boolean));

  return (
    <div id="mp-waiting">
      <div id="mp-waiting-content" style={{ maxWidth: '480px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{t('waiting')}</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '1.5rem' }}>
          Room: {codeDisplay} — {tf('playersConnected', { count: room.players?.length || 1, max: room.max_players || 10 })}
        </p>

        <div id="mp-profile-editor" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
          <div className="field" style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="mp-nickname-input">{t('nickname')}</label>
            <input
              type="text"
              id="mp-nickname-input"
              maxLength={15}
              placeholder="Your name"
              value={nickname}
              onChange={(e) => onNicknameChange(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: '0.5rem' }}>
            <label>{t('pickColor')}</label>
            <ColorPicker
              colors={DEFAULT_COLORS}
              takenColors={takenColors}
              selectedColor={selectedColor}
              onSelect={onColorSelect}
            />
          </div>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={onSaveProfile}>{t('save')}</button>
        </div>

        <PlayerList players={room.players} playerId={playerId} t={t} />

        {isHost ? (
          <div id="mp-host-controls">
            <button
              className="btn-primary"
              style={{ width: '100%' }}
              disabled={!canStart}
              onClick={onStart}
            >
              {t('startGame')}
            </button>
            {startError && (
              <p style={{ color: '#f87171', textAlign: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>{startError}</p>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
            {t('waitingHost')}
          </div>
        )}
      </div>
    </div>
  );
}