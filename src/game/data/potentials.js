// Potential lines and cubes, modelled on MapleStory. A line's tier is 0 (Normal) to 4 (Legendary);
// percent lines have fixed values per tier, flat lines also scale with item level.
import { gearPower as S } from '../curves.js';

const ALL = ['weapon', 'subweapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
const WEAPONS = ['weapon', 'subweapon']; // sub weapons roll weapon lines, as in MapleStory
const ARMOR = ['helm', 'armor', 'gloves', 'boots'];
const ACCESSORY = ['ring', 'amulet'];
const flatAttr = (t, l) => Math.round((2 + 0.4 * l) * (t + 1) / 5);

// value(tier, ilvl). slots: where the line can roll.
export const POTENTIALS = {
  atkp: { name: '% Attack', percent: true, slots: WEAPONS, value: t => [1, 3, 6, 9, 12][t] },
  matkp: { name: '% Magic', percent: true, slots: WEAPONS, value: t => [1, 3, 6, 9, 12][t] },
  dmg: { name: '% Damage', percent: true, slots: WEAPONS, value: t => [1, 3, 6, 9, 12][t] },
  boss: { name: '% Boss Damage', percent: true, slots: WEAPONS, value: t => [0, 0, 10, 20, 30][t], minTier: 2 },
  pen: { name: '% Armor Pen', percent: true, slots: WEAPONS, value: t => [1, 3, 5, 10, 15][t] },
  critdmg: { name: '% Crit Damage', percent: true, slots: ['gloves'], value: t => [0, 0, 8, 12, 16][t], minTier: 2 },
  crit: { name: '% Crit', percent: true, slots: [...WEAPONS, 'gloves', 'helm', ...ACCESSORY], value: t => [1, 2, 4, 6, 8][t] },
  allstat: { name: '% All Stats', percent: true, slots: [...ARMOR, ...ACCESSORY], value: t => [1, 2, 4, 6, 9][t] },
  hpp: { name: '% HP', percent: true, slots: [...ARMOR, 'amulet'], value: t => [1, 3, 6, 9, 12][t] },
  spd: { name: '% Speed', percent: true, slots: ['boots', 'gloves'], value: t => [1, 2, 4, 6, 8][t] },
  ls: { name: '% Lifesteal', percent: true, slots: ACCESSORY, value: t => [0.5, 1, 2, 3, 4][t] },
  mf: { name: '% Item Rarity', percent: true, slots: ACCESSORY, value: t => [2, 5, 10, 15, 20][t] },
  gf: { name: '% Gold Find', percent: true, slots: ACCESSORY, value: t => [2, 5, 10, 15, 20][t] },
  atk: { name: 'Attack', slots: ['gloves', ...ACCESSORY], value: (t, l) => 0.6 * S(l) * (t + 1) },
  matk: { name: 'Magic', slots: ['gloves', ...ACCESSORY], value: (t, l) => 0.6 * S(l) * (t + 1) },
  hp: { name: 'HP', slots: ALL.filter(s => s !== 'weapon'), value: (t, l) => 3.6 * S(l) * (t + 1) },
  def: { name: 'Defense', slots: ARMOR, value: (t, l) => (3 + 1.5 * l) * (t + 1) / 5 },
  mres: { name: 'Magic Resist', slots: ARMOR, value: (t, l) => (3 + 1.5 * l) * (t + 1) / 5 },
  str: { name: 'STR', slots: ALL, value: flatAttr },
  dex: { name: 'DEX', slots: ALL, value: flatAttr },
  int: { name: 'INT', slots: ALL, value: flatAttr },
  vit: { name: 'VIT', slots: ALL, value: flatAttr },
  luk: { name: 'LUK', slots: ALL, value: flatAttr },
};

export const POTENTIAL_LINES = 3;

// Cubes reroll every line. The first line always has the item's tier; later lines have it only with the
// "prime" chance, otherwise they are one tier lower. tierUp[t] is the chance to move from tier t to t+1.
// pity[t]: that many cubes on one item at tier t guarantee the next tier.
// A Black Cube shows the new lines next to the old ones and lets you keep either.
export const CUBES = {
  red: { name: 'Red Cube', shards: 6, tierUp: [1, 0.08, 0.03, 0.01], prime: [1, 0.15, 0.05], pity: [1, 15, 40, 100], choose: false },
  black: { name: 'Black Cube', shards: 20, tierUp: [1, 0.15, 0.06, 0.02], prime: [1, 0.25, 0.1], pity: [1, 10, 25, 60], choose: true },
};
