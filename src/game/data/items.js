// Item data: slots, rarities, weapon types and affixes. Affix value(ilvl, roll 0..1).
import { gearPower as S } from '../curves.js';

export const SLOTS = ['weapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
export const SLOT_NAME = { weapon: 'Weapon', helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', amulet: 'Amulet' };

export const RARITIES = [
  { id: 'common', name: 'Common', mul: 1.0, affixes: 0, weight: 60, salvage: 1 },
  { id: 'uncommon', name: 'Uncommon', mul: 1.12, affixes: 1, weight: 28, salvage: 2 },
  { id: 'rare', name: 'Rare', mul: 1.28, affixes: 2, weight: 9, salvage: 4 },
  { id: 'epic', name: 'Epic', mul: 1.5, affixes: 3, weight: 2.5, salvage: 9 },
  { id: 'legendary', name: 'Legendary', mul: 1.8, affixes: 4, weight: 0.5, salvage: 22 },
];

export const WEAPONS = {
  Sword: { atk: 1.0, spd: 1.0, kind: 'phys' },
  Axe: { atk: 1.35, spd: 0.82, kind: 'phys', critdmg: 20 },
  Dagger: { atk: 0.72, spd: 1.25, kind: 'phys', crit: 6 },
  Bow: { atk: 0.9, spd: 1.1, kind: 'phys', acc: 10 },
  Staff: { matk: 1.15, spd: 0.9, kind: 'magic', mp: 20 },
  Wand: { matk: 0.85, spd: 1.15, kind: 'magic', crit: 3 },
};

export const ITEM_NAMES = {
  helm: ['Cap', 'Helm', 'Hood', 'Circlet'], armor: ['Vest', 'Mail', 'Robe', 'Plate'],
  gloves: ['Gloves', 'Gauntlets', 'Wraps'], boots: ['Boots', 'Greaves', 'Sandals'],
  ring: ['Ring', 'Band', 'Signet'], amulet: ['Amulet', 'Pendant', 'Talisman'],
};
export const MATERIALS = ['Rusted', 'Iron', 'Bronze', 'Steel', 'Silvered', 'Runed', 'Obsidian', 'Starforged', 'Abyssal', 'Godwrought'];

const roll = q => 0.6 + 0.4 * q;
export const AFFIXES = {
  atk: { name: 'Attack', value: (l, q) => 4 * S(l) * roll(q) },
  matk: { name: 'Magic', value: (l, q) => 4 * S(l) * roll(q) },
  hp: { name: 'HP', value: (l, q) => 22 * S(l) * roll(q) },
  def: { name: 'Defense', value: (l, q) => (3 + 1.5 * l) * roll(q) },
  mres: { name: 'Magic Resist', value: (l, q) => (3 + 1.5 * l) * roll(q) },
  atkp: { name: '% Attack', percent: true, value: (l, q) => 4 + 6 * q },
  matkp: { name: '% Magic', percent: true, value: (l, q) => 4 + 6 * q },
  hpp: { name: '% HP', percent: true, value: (l, q) => 4 + 6 * q },
  crit: { name: '% Crit', percent: true, value: (l, q) => 2 + 3 * q },
  critdmg: { name: '% Crit Damage', percent: true, value: (l, q) => 8 + 12 * q },
  spd: { name: '% Speed', percent: true, value: (l, q) => 3 + 5 * q },
  ls: { name: '% Lifesteal', percent: true, value: (l, q) => 1 + 2 * q },
  pen: { name: '% Armor Pen', percent: true, value: (l, q) => 3 + 5 * q },
  str: { name: 'STR', value: (l, q) => (2 + 0.4 * l) * roll(q) },
  dex: { name: 'DEX', value: (l, q) => (2 + 0.4 * l) * roll(q) },
  int: { name: 'INT', value: (l, q) => (2 + 0.4 * l) * roll(q) },
  vit: { name: 'VIT', value: (l, q) => (2 + 0.4 * l) * roll(q) },
  luk: { name: 'LUK', value: (l, q) => (2 + 0.4 * l) * roll(q) },
  mf: { name: '% Item Rarity', percent: true, value: (l, q) => 5 + 10 * q },
  gf: { name: '% Gold Find', percent: true, value: (l, q) => 5 + 15 * q },
  mp: { name: 'MP', value: (l, q) => (8 + l) * roll(q) },
  eva: { name: 'Evasion', value: (l, q) => (3 + 1.5 * l) * roll(q) },
};

// Enhancement
export const ENHANCE_MAX = 15;
export const ENHANCE_RATES = [1, 1, 1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.3, 0.25, 0.2, 0.15];
export const ENHANCE_DROP_FROM = 7; // failing at this level or above loses a level
export const ENHANCED_STATS = ['atk', 'matk', 'hp', 'def', 'mres', 'eva'];
