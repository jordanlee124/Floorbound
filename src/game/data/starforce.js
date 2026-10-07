// Star Force, modelled on MapleStory's classic table. Index = current stars (the attempt goes from s to s+1).
// Odds are fractions of one attempt: success, else destroy (if listed), else fail.

export const STAR_SUCCESS = [
  0.95, 0.9, 0.85, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, // 0-9
  0.5, 0.45, 0.4, 0.35, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, // 10-19
  0.3, 0.3, 0.03, 0.02, 0.01, // 20-24
];
export const STAR_DESTROY = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0.006, 0.013, 0.014, 0.021, 0.021, 0.021, 0.028, 0.028,
  0.07, 0.07, 0.194, 0.294, 0.396,
];

// A failed attempt at these star counts never loses a star. Below 11 nothing is lost either.
export const STAR_SAFE_FLOORS = [15, 20];
export const STAR_DROP_FROM = 11;
// Two failures in a row that each lost a star make the next attempt certain ("Chance Time").
export const CHANCE_TIME_AFTER = 2;
// Safeguard: pay double to remove the destroy chance on attempts from these star counts.
export const SAFEGUARD_FROM = 12;
export const SAFEGUARD_TO = 16;
export const SAFEGUARD_COST_MUL = 2;
// A destroyed item drops to this many stars and gives no stats until repaired.
export const DESTROYED_STARS = 12;
export const REPAIR_COST_MUL = 5; // x the gold cost of one attempt at DESTROYED_STARS

// Max stars by item level, like MapleStory's equipment level caps.
export const MAX_STARS = [[60, 25], [40, 20], [20, 15], [0, 10]];

// Base stats are multiplied by this. Stars past 15 are worth twice as much, as in MapleStory.
export const starMultiplier = s => 1 + 0.08 * Math.min(s, 15) + 0.15 * Math.max(0, s - 15);

// Gold per attempt is this times gearPower(item power level); cost climbs steeply past 10 and again past 15.
export const starCostFactor = s => 6 * (s < 10 ? s + 1 : s < 15 ? Math.pow(s + 1, 1.6) / 2.5 : Math.pow(s + 1, 2.1) / 10.8);
