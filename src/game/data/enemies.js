// Enemy archetypes and zones. Each zone spans 10 floors; floor 10, 20, ... is the zone boss.
export const ARCHETYPES = {
  beast: { hp: 1.0, atk: 1.0, spd: 1.0, pr: 0.15, mr: 0.15, eva: 0.08, dmg: 'phys', tag: '' },
  brute: { hp: 1.35, atk: 1.2, spd: 0.8, pr: 0.1, mr: 0.1, eva: 0.03, dmg: 'phys', tag: 'Tough' },
  armored: { hp: 1.1, atk: 0.9, spd: 0.85, pr: 0.55, mr: 0.05, eva: 0, dmg: 'phys', tag: 'Armored' },
  spirit: { hp: 0.85, atk: 1.0, spd: 1.1, pr: 0.25, mr: 0.55, eva: 0.12, dmg: 'magic', tag: 'Warded' },
  swift: { hp: 0.75, atk: 0.85, spd: 1.5, pr: 0.1, mr: 0.15, eva: 0.32, dmg: 'phys', tag: 'Evasive' },
  caster: { hp: 0.8, atk: 1.3, spd: 0.9, pr: 0.15, mr: 0.3, eva: 0.05, dmg: 'magic', tag: 'Caster' },
};

export const ZONES = [
  { name: 'Damp Cellar', mobs: [['Giant Rat', 'beast'], ['Bloated Slime', 'brute'], ['Goblin Cutpurse', 'swift'], ['Rust Beetle', 'armored']],
    boss: ['Goblin Chieftain', 'brute'] },
  { name: 'Bone Crypt', mobs: [['Skeleton Warden', 'armored'], ['Wailing Shade', 'spirit'], ['Ghoul', 'brute'], ['Grave Acolyte', 'caster']],
    boss: ['The Bone Knight', 'armored'] },
  { name: 'Fungal Hollow', mobs: [['Sporeling', 'beast'], ['Myconid Brute', 'brute'], ['Cave Stalker', 'swift'], ['Spore Witch', 'caster']],
    boss: ['Mother Mycelia', 'caster'] },
  { name: 'Ember Forge', mobs: [['Iron Golem', 'armored'], ['Fire Imp', 'caster'], ['Forge Hound', 'swift'], ['Magma Wisp', 'spirit']],
    boss: ['Forgemaster Vul', 'armored'] },
  { name: 'Drowned Halls', mobs: [['Drowned Sailor', 'brute'], ['Siren', 'caster'], ['Eel Swarm', 'swift'], ['Tide Phantom', 'spirit']],
    boss: ['The Leviathan Maw', 'brute'] },
  { name: 'Astral Spire', mobs: [['Star Sentinel', 'armored'], ['Void Wisp', 'spirit'], ['Blink Stalker', 'swift'], ['Astral Seer', 'caster']],
    boss: ['The Watcher Above', 'spirit'] },
];

export const BOSS_ENRAGE_AT = 40; // seconds
