// Item sets. A set piece is a normal drop with a set name instead of a material. Wearing several pieces of
// the same set turns on its bonuses; pieces count whatever their item level, so an old set piece can be
// worth keeping over a newer plain one. Bonuses are percent stats, written into the same sums as passives.
// bonus[n]: what n equipped pieces add (each tier stacks on the ones below it). weapons: weapon types it drops as.

export const SETS = {
  bloodforged: { name: 'Bloodforged', slots: ['weapon', 'helm', 'armor', 'gloves', 'boots'], weapons: ['Sword', 'Axe'],
    bonus: { 2: { atkp: 10 }, 3: { hpp: 10, ls: 3 }, 4: { boss: 15 }, 5: { dmg: 15 } } },
  shadowweave: { name: 'Shadowweave', slots: ['weapon', 'gloves', 'boots', 'ring', 'amulet'], weapons: ['Dagger', 'Bow'],
    bonus: { 2: { crit: 5 }, 3: { critdmg: 20 }, 4: { pen: 10 }, 5: { dmg: 15 } } },
  archon: { name: 'Archon', slots: ['weapon', 'helm', 'armor', 'ring', 'amulet'], weapons: ['Staff', 'Wand'],
    bonus: { 2: { matkp: 10 }, 3: { mpp: 20, hpp: 5 }, 4: { spellCrit: 8 }, 5: { dmg: 15 } } },
  bulwark: { name: 'Bulwark', slots: ['helm', 'armor', 'gloves', 'boots'],
    bonus: { 2: { hpp: 10 }, 3: { defp: 20 }, 4: { weaken: 0.08 } } },
  fortune: { name: 'Fortune', slots: ['boots', 'ring', 'amulet'],
    bonus: { 2: { mf: 20, gf: 20 }, 3: { crit: 4, boss: 10 } } },
};

// Chance a drop is a set piece.
export const SET_CHANCE = { normal: 0.05, elite: 0.15, boss: 0.3 };
