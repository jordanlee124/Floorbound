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

// Every weapon belongs to one job, as in MapleStory.
export const WEAPONS = {
  Sword: { atk: 1.0, spd: 1.0, kind: 'phys', job: 'warrior' },
  Axe: { atk: 1.35, spd: 0.82, kind: 'phys', critdmg: 20, job: 'warrior' },
  Dagger: { atk: 0.72, spd: 1.25, kind: 'phys', crit: 6, job: 'rogue' },
  Bow: { atk: 0.9, spd: 1.1, kind: 'phys', acc: 10, job: 'rogue' },
  Staff: { matk: 1.15, spd: 0.9, kind: 'magic', mp: 20, job: 'mage' },
  Wand: { matk: 0.85, spd: 1.15, kind: 'magic', crit: 3, job: 'mage' },
};

// Class gear, MapleStory-style: an item with a job can only be worn by that job's branch (the 1st job you chose).
// Class armor adds flat main and secondary stats on top of its base stats. Rings and amulets are always common.
// Novices can wear class gear only below item level 10.
export const JOBS = {
  warrior: { name: 'Warrior', main: 'str', sub: 'vit', names: { helm: 'Helm', armor: 'Plate', gloves: 'Gauntlets', boots: 'Greaves' } },
  rogue: { name: 'Rogue', main: 'dex', sub: 'luk', names: { helm: 'Hood', armor: 'Leathers', gloves: 'Wraps', boots: 'Treads' } },
  mage: { name: 'Mage', main: 'int', sub: 'vit', names: { helm: 'Circlet', armor: 'Robe', gloves: 'Gloves', boots: 'Sandals' } },
};
export const JOB_ARMOR_SLOTS = ['helm', 'armor', 'gloves', 'boots'];
export const CLASS_ARMOR_CHANCE = 0.7; // share of armor drops that are class armor (weapons always are)
export const OWN_JOB_CHANCE = 0.6;     // share of class drops that are for your own job; the rest are any job

export const ITEM_NAMES = {
  helm: ['Cap', 'Helm', 'Hood', 'Circlet'], armor: ['Vest', 'Mail', 'Robe', 'Plate'],
  gloves: ['Gloves', 'Gauntlets', 'Wraps'], boots: ['Boots', 'Greaves', 'Sandals'],
  ring: ['Ring', 'Band', 'Signet'], amulet: ['Amulet', 'Pendant', 'Talisman'],
};
export const MATERIALS = ['Rusted', 'Iron', 'Bronze', 'Steel', 'Silvered', 'Runed', 'Obsidian', 'Starforged', 'Abyssal', 'Godwrought'];

export const STAR_STATS = ['atk', 'matk', 'hp', 'def', 'mres', 'eva'];
