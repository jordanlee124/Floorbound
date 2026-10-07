// Item data: slots, rarities, level brackets, weapon types and names. Potentials and Star Force have their own files.

export const SLOTS = ['weapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
export const SLOT_NAME = { weapon: 'Weapon', helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', amulet: 'Amulet' };

// An item's rarity is its potential tier, as in MapleStory: Normal items have no potential.
export const RARITIES = [
  { id: 'normal', name: 'Normal', weight: 60, salvage: 1 },
  { id: 'rare', name: 'Rare', weight: 28, salvage: 2 },
  { id: 'epic', name: 'Epic', weight: 9, salvage: 4 },
  { id: 'unique', name: 'Unique', weight: 2.5, salvage: 9 },
  { id: 'legendary', name: 'Legendary', weight: 0.5, salvage: 22 },
];

// Gear comes in level brackets, like MapleStory equipment sets: floors 1-9 drop level 1 gear,
// floors 10-19 level 10 gear, and so on. Its stats are worth floor ilvl + BRACKET_POWER_OFFSET.
export const BRACKET = 10;
export const BRACKET_POWER_OFFSET = 7;

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

export const STAR_STATS = ['atk', 'matk', 'hp', 'def', 'mres', 'eva'];
