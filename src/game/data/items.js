// Item data: slots, rarities, level brackets, weapon types and names. Potentials and Star Force have their own files.

// An item's `slot` is its type. Equip slots are where items go: four ring slots take rings, every other slot its own type.
export const ITEM_TYPES = ['weapon', 'subweapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
export const TYPE_NAME = { weapon: 'Weapon', subweapon: 'Sub weapon', helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', amulet: 'Amulet' };
export const SLOTS = ['weapon', 'subweapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'ring2', 'ring3', 'ring4', 'amulet'];
export const SLOT_TYPE = Object.fromEntries(SLOTS.map(s => [s, s.startsWith('ring') ? 'ring' : s]));
export const SLOT_NAME = { ...TYPE_NAME, ring: 'Ring 1', ring2: 'Ring 2', ring3: 'Ring 3', ring4: 'Ring 4' };
// Drop odds by type: rings twice as often, since there are four ring slots.
export const DROP_TYPES = [...ITEM_TYPES, 'ring'];

// Ring kinds. Each kind has its own base stat, and only one ring of each kind can be worn at a time.
export const RINGS = {
  band: { name: 'Band', desc: 'crit' },
  signet: { name: 'Signet', desc: 'crit damage' },
  loop: { name: 'Loop', desc: 'Attack and Magic' },
  seal: { name: 'Seal', desc: 'Defense and Magic Resist' },
  coil: { name: 'Coil', desc: 'speed' },
  ring: { name: 'Ring', desc: 'evasion' },
};

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
export const BRACKET_POWER_OFFSET = 2; // was 7 with 7 gear slots; 11 slots (sub weapon, 4 rings) need less per item for the same early pace

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
// Class armor adds flat main and secondary stats on top of its base stats. Sub weapons are always class gear:
// Warriors use a Shield, Rogues a Quiver and Mages an Orb. Rings and amulets are always common.
// Novices can wear class gear only below item level 10.
export const JOBS = {
  warrior: { name: 'Warrior', main: 'str', sub: 'vit', subweapon: 'Shield', names: { helm: 'Helm', armor: 'Plate', gloves: 'Gauntlets', boots: 'Greaves' } },
  rogue: { name: 'Rogue', main: 'dex', sub: 'luk', subweapon: 'Quiver', names: { helm: 'Hood', armor: 'Leathers', gloves: 'Wraps', boots: 'Treads' } },
  mage: { name: 'Mage', main: 'int', sub: 'vit', subweapon: 'Orb', names: { helm: 'Circlet', armor: 'Robe', gloves: 'Gloves', boots: 'Sandals' } },
};
export const JOB_ARMOR_SLOTS = ['helm', 'armor', 'gloves', 'boots'];
export const CLASS_ARMOR_CHANCE = 0.7; // share of armor drops that are class armor (weapons always are)
export const OWN_JOB_CHANCE = 0.6;     // share of class drops that are for your own job; the rest are any job

export const ITEM_NAMES = {
  helm: ['Cap', 'Helm', 'Hood', 'Circlet'], armor: ['Vest', 'Mail', 'Robe', 'Plate'],
  gloves: ['Gloves', 'Gauntlets', 'Wraps'], boots: ['Boots', 'Greaves', 'Sandals'],
  amulet: ['Amulet', 'Pendant', 'Talisman'],
};
export const MATERIALS = ['Rusted', 'Iron', 'Bronze', 'Steel', 'Silvered', 'Runed', 'Obsidian', 'Starforged', 'Abyssal', 'Godwrought'];

export const STAR_STATS = ['atk', 'matk', 'hp', 'def', 'mres', 'eva'];
