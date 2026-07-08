export default function Hud({ score, streak, t }) {
  return (
    <div className="hud">
      <div className="badge">
        <span className="label">{t('score')}</span> <span>{score}</span>
      </div>
      <div className="badge">
        <span className="label">{t('streak')}</span> <span>{streak}</span>
      </div>
    </div>
  );
}