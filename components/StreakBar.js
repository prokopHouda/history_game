import { MILESTONES, getMilestone, getNextMilestone } from '../lib/milestones.js';

export default function StreakBar({ streak, t }) {
  const current = getMilestone(streak);
  const next = getNextMilestone(streak);
  const isMilestone = streak > 0 && streak % 5 === 0 && current;
  const mod = streak % 5;
  const pct = isMilestone ? 100 : (mod / 5) * 100;

  let text;
  if (isMilestone) {
    text = `🎉 ${current.badge} ${current.name} — ${t('milestone')} ${streak} ${t('reached')}`;
  } else if (next && streak < 50) {
    text = `${next.badge} ${next.name} — ${t('nextReward')} ${Math.ceil(streak / 5) * 5}`;
  } else if (streak >= 50) {
    const final = MILESTONES[50];
    text = `👑 ${final.badge} ${final.name}`;
  } else {
    const first = MILESTONES[5];
    text = `${first.badge} ${first.name} — ${t('nextReward')} 5`;
  }

  return (
    <div className="streak-panel">
      <div className="streak-header">
        <span className="streak-title">{t('streakProgress')}</span>
        <span className="streak-target">{text}</span>
      </div>
      <div className="progress-track">
        <div
          className={`progress-fill${isMilestone ? ' milestone-glow' : ''}`}
          style={{ width: pct + '%' }}
        />
        <div className="progress-masks">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    </div>
  );
}