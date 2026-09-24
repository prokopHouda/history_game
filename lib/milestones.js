export const MILESTONES = {
  history: {
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
  },
  mountains: {
    5:  { name: 'Base Camp Wanderer',    badge: '🥾' },
    10: { name: 'Peak Seeker',           badge: '🏔️' },
    15: { name: 'Slope Slider',          badge: '🏂' },
    20: { name: 'Altitude Adept',        badge: '💨' },
    25: { name: 'Summit Striver',        badge: '🚩' },
    30: { name: 'Ridge Runner',          badge: '🏃' },
    35: { name: 'Cloud Climber',        badge: '☁️' },
    40: { name: 'Mountain Master',       badge: '🧗' },
    45: { name: 'Apex Conqueror',        badge: '🦅' },
    50: { name: 'King of the Mountains',  badge: '🏆' },
  },
  rivers: {
    5:  { name: 'River Rafter',          badge: '🛶' },
    10: { name: 'Stream Seeker',         badge: '💧' },
    15: { name: 'Current Cruiser',       badge: '🚤' },
    20: { name: 'Delta Dweller',         badge: '🏝️' },
    25: { name: 'Waterway Warrior',      badge: '⚓' },
    30: { name: 'Flow Finder',           badge: '🌊' },
    35: { name: 'Basin Bounder',         badge: '🗺️' },
    40: { name: 'River Master',          badge: '🚢' },
    45: { name: 'Tide Turner',           badge: '🔱' },
    50: { name: 'Lord of the Waters',    badge: '🏆' },
  },
};

export function getMilestone(s, gameKey = 'history') {
  if (s >= 50) return MILESTONES[gameKey][50];
  const level = Math.floor(s / 5) * 5;
  return MILESTONES[gameKey][level] || null;
}

export function getNextMilestone(s, gameKey = 'history') {
  if (s >= 50) return null;
  const next = (Math.floor(s / 5) + 1) * 5;
  return MILESTONES[gameKey][next] || null;
}
