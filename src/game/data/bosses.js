// Boss raids, modelled on MapleStory bosses: each boss has an entry level and difficulties. A difficulty is
// fought at the power of `floor`, can be cleared once per daily or weekly reset, and pays far more than a
// floor boss: a gold crystal, cubes, shards, guaranteed gear and a chance at a boss-only set piece.
// phases: when the boss drops below `at` of its HP, its attack and speed are multiplied.

export const BOSS_HP = 18;     // HP multiplier over a normal enemy of the same floor (floor bosses are 9)
export const BOSS_ATK = 0.9;   // attack multiplier (floor bosses 1.5): raids are long fights, so they hit softer and phases ramp them up
export const BOSS_ENRAGE = 90; // seconds before a raid boss enrages (floor bosses: 40)

// Rewards by difficulty. minRar: lowest potential tier of the guaranteed items. setChance: boss set piece.
export const DIFFICULTIES = {
  normal: { name: 'Normal', items: 2, minRar: 2, cubes: { black: 1 }, shards: 10, crystal: 60, exp: 15, setChance: 0.25 },
  hard: { name: 'Hard', items: 3, minRar: 2, cubes: { black: 2 }, shards: 25, crystal: 120, exp: 25, setChance: 0.5 },
  chaos: { name: 'Chaos', items: 3, minRar: 3, cubes: { black: 4 }, shards: 50, crystal: 250, exp: 40, setChance: 1 },
};

export const BOSSES = [
  { id: 'grubnak', name: 'Grubnak, Goblin Warlord', arch: 'brute', level: 30, set: 'dread_regalia',
    desc: 'The warlord the Chieftain answers to. Swings harder once he is bleeding.',
    phases: [{ at: 0.5, atk: 1.3, spd: 1.1, text: 'Grubnak roars and swings wildly' }],
    modes: { normal: { floor: 28, reset: 'daily' }, hard: { floor: 40, reset: 'daily' } } },
  { id: 'rot_queen', name: 'The Rotting Queen', arch: 'caster', level: 60, set: 'dread_regalia',
    desc: 'Mother Mycelia\'s mother. Her spores turn the air to poison as she weakens.',
    phases: [{ at: 0.6, atk: 1.2, spd: 1.1, text: 'Spores fill the hollow' }, { at: 0.25, atk: 1.3, spd: 1.2, text: 'The Queen blooms' }],
    modes: { normal: { floor: 55, reset: 'daily' }, hard: { floor: 72, reset: 'daily' } } },
  { id: 'vul', name: 'Vul the Unquenched', arch: 'armored', level: 100, set: 'dread_regalia',
    desc: 'The forge god Forgemaster Vul served. Heavy plate; bring magic or armor pen.',
    phases: [{ at: 0.5, atk: 1.35, spd: 1.15, text: 'Vul\'s armor glows white-hot' }],
    modes: { normal: { floor: 95, reset: 'daily' }, hard: { floor: 115, reset: 'weekly' }, chaos: { floor: 135, reset: 'weekly' } } },
  { id: 'leviathan', name: 'The Leviathan', arch: 'brute', level: 140, set: 'eclipse_arcana',
    desc: 'What the Maw was a mouth of. Enormous HP and a tide that speeds it up.',
    phases: [{ at: 0.66, atk: 1.15, spd: 1.2, text: 'The tide rises' }, { at: 0.33, atk: 1.25, spd: 1.2, text: 'The Leviathan breaches' }],
    modes: { normal: { floor: 135, reset: 'daily' }, hard: { floor: 160, reset: 'weekly' }, chaos: { floor: 180, reset: 'weekly' } } },
  { id: 'watcher', name: 'The Eye Beyond', arch: 'spirit', level: 180, set: 'eclipse_arcana',
    desc: 'The thing the Watcher Above was watching for. Warded against magic.',
    phases: [{ at: 0.5, atk: 1.4, spd: 1.2, text: 'The Eye opens fully' }],
    modes: { normal: { floor: 175, reset: 'daily' }, hard: { floor: 200, reset: 'weekly' }, chaos: { floor: 225, reset: 'weekly' } } },
  { id: 'eclipse', name: 'Eclipse, the Last Light', arch: 'caster', level: 220, set: 'eclipse_arcana',
    desc: 'The top of the tower. Three phases, each worse than the last.',
    phases: [{ at: 0.7, atk: 1.2, spd: 1.1, text: 'The light dims' }, { at: 0.4, atk: 1.25, spd: 1.15, text: 'Eclipse' }, { at: 0.15, atk: 1.3, spd: 1.2, text: 'The Last Light burns' }],
    modes: { hard: { floor: 235, reset: 'weekly' }, chaos: { floor: 260, reset: 'weekly' } } },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map(b => [b.id, b]));
