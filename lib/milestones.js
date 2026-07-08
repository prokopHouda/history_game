export const MILESTONES = {
  5:  { name: 'History Noob',          badge: '🌱' },
  10: { name: 'Time Traveler',         badge: '⏳' },
  15: { name: 'History Buff',          badge: '📚' },
  20: { name: 'Chronicle Keeper',      badge: '📜' },
  25: { name: 'Timeline Warrior',      badge: '⚔️' },
  30: { name: 'Century Sage',          badge: '🧙' },
  35: { name: 'Era Conqueror',         badge: '🛡️' },
  40: { name: 'Living Legend',         badge: '🔥' },
  45: { name: 'Immortal Historian',    badge: '👑' },
  50: { name: 'King of Historical Knowledge', badge: '🏆' },
};

export function getMilestone(s) {
  if (s >= 50) return MILESTONES[50];
  const level = Math.floor(s / 5) * 5;
  return MILESTONES[level] || null;
}

export function getNextMilestone(s) {
  if (s >= 50) return null;
  const next = (Math.floor(s / 5) + 1) * 5;
  return MILESTONES[next] || null;
}