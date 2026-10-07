// Growth curves. Tuning these changes the whole game's pacing, so re-run `npm run sim` after any edit.

// Power curve for loot: gear found on floor N is "worth" floor N.
export const gearPower = f => Math.pow(1.085, f - 1) * (1 + 0.03 * (f - 1));

// Enemies outgrow gear a little each floor. Enhancement, rarity, levels and smart builds cover the gap.
export const enemyPower = f => Math.pow(1.105, f - 1) * (1 + 0.03 * (f - 1));

export const expToLevel = lvl => Math.round(30 * Math.pow(1.105, lvl - 1) * (1 + 0.04 * lvl));

export const POINTS_PER_LEVEL = 4;
export const KILLS_PER_FLOOR = 10;
export const isBossFloor = f => f % 10 === 0;
