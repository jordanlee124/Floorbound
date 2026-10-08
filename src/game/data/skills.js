// Every skill in the game. Importing this file registers them with Skill.get().
// Max ranks follow the job (MAX_RANK): Novice 10, 1st job 20, 2nd to 4th job 30.
import { Skill, ActiveSkill, PassiveSkill } from '../Skill.js';
import { MAX_RANK } from './classes.js';

const pct = v => Math.round(v * 100) + '%';
const n1 = v => +v.toFixed(1); // one decimal, trailing zero dropped
let max = 0; // max rank for the job section being defined below
const active = (id, def) => Skill.register(new ActiveSkill(id, { max, ...def }));
const passive = (id, def) => Skill.register(new PassiveSkill(id, { max, ...def }));

// ---- Novice ----
max = MAX_RANK[0];
active('power_strike', { name: 'Power Strike', cooldown: 5, mpCost: r => 4,
  describe: r => `Hit for ${pct(1.5 + 0.05 * r)} Attack.`,
  cast: (c, r) => c.hit(1.5 + 0.05 * r, 'phys') });

// ---- 1st job ----
max = MAX_RANK[1];
// Warrior
active('cleave', { name: 'Cleave', cooldown: 5, mpCost: r => 8 + Math.round(r / 2),
  describe: r => `Hit for ${pct(1.8 + 0.075 * r)} Attack.`,
  cast: (c, r) => c.hit(1.8 + 0.075 * r, 'phys') });
active('war_cry', { name: 'War Cry', cooldown: 20, mpCost: r => 12,
  describe: r => `+${pct(0.2 + 0.015 * r)} Attack for 8s.`,
  cast: (c, r) => c.buff('war_cry', 8, { atkMul: 1.2 + 0.015 * r }) });
passive('iron_skin', { name: 'Iron Skin',
  describe: r => `+${n1(2.5 * r)}% Defense, +${n1(1.5 * r)}% HP.`,
  apply: (s, r) => { s.defp += 2.5 * r; s.hpp += 1.5 * r; } });
passive('second_wind', { name: 'Second Wind',
  describe: r => `Regenerate ${(0.15 * r).toFixed(2)}% max HP per second.`,
  apply: (s, r) => { s.hpRegen += 0.0015 * r; } });
// Rogue
active('twin_strike', { name: 'Twin Strike', cooldown: 4, mpCost: r => 6 + Math.round(r / 2),
  describe: r => `2 hits of ${pct(0.85 + 0.035 * r)} Attack.`,
  cast: (c, r) => { c.hit(0.85 + 0.035 * r, 'phys'); c.hit(0.85 + 0.035 * r, 'phys'); } });
active('poison_blade', { name: 'Poison Blade', cooldown: 8, mpCost: r => 10,
  describe: r => `Poison for ${pct(0.3 + 0.02 * r)} Attack per second for 6s. Ignores armor.`,
  cast: (c, r) => c.dot('Poison', c.stats.atk * (0.3 + 0.02 * r), 6, 'true') });
passive('evasion', { name: 'Evasion',
  describe: r => `+${n1(0.75 * r)}% chance to dodge.`,
  apply: (s, r) => { s.dodgeFlat += 0.0075 * r; } });
passive('lethality', { name: 'Lethality',
  describe: r => `+${n1(0.5 * r)}% crit chance, +${3 * r}% crit damage.`,
  apply: (s, r) => { s.crit += 0.5 * r; s.critdmg += 3 * r; } });
// Mage
active('fireball', { name: 'Fireball', cooldown: 3, mpCost: r => 10 + Math.round(r / 2),
  describe: r => `Magic hit for ${pct(2 + 0.1 * r)} Magic.`,
  cast: (c, r) => c.hit(2 + 0.1 * r, 'magic', { fire: true }) });
active('frost_nova', { name: 'Frost Nova', cooldown: 10, mpCost: r => 14,
  describe: r => `Magic hit for ${pct(1.2 + 0.05 * r)} Magic and slow the enemy 35% for 4s.`,
  cast: (c, r) => { c.hit(1.2 + 0.05 * r, 'magic'); c.slow(0.35, 4); } });
passive('arcane_mind', { name: 'Arcane Mind',
  describe: r => `+${2 * r}% Magic, +${n1(2.5 * r)}% MP.`,
  apply: (s, r) => { s.matkp += 2 * r; s.mpp += 2.5 * r; } });
passive('mana_shield', { name: 'Mana Shield',
  describe: r => `${2 * r}% of damage taken drains MP instead of HP.`,
  apply: (s, r) => { s.manaShield += 0.02 * r; } });

// ---- 2nd job ----
max = MAX_RANK[2];
// Berserker
active('rampage', { name: 'Rampage', cooldown: 8, mpCost: r => 15 + Math.round(r / 3),
  describe: r => `3 hits of ${pct(0.8 + 0.08 / 3 * r)} Attack.`,
  cast: (c, r) => { for (let i = 0; i < 3; i++) c.hit(0.8 + 0.08 / 3 * r, 'phys'); } });
passive('blood_frenzy', { name: 'Blood Frenzy',
  describe: r => `+${n1(0.5 / 3 * r)}% damage for every 10% HP missing.`,
  apply: (s, r) => { s.frenzy += 0.005 / 3 * r; } });
passive('bloodthirst', { name: 'Bloodthirst',
  describe: r => `+${n1(0.2 * r)}% lifesteal, +${n1(0.5 * r)}% Attack.`,
  apply: (s, r) => { s.ls += 0.2 * r; s.atkp += 0.5 * r; } });
// Paladin
active('holy_strike', { name: 'Holy Strike', cooldown: 6, mpCost: r => 12 + Math.round(r / 3),
  describe: r => `Magic hit for ${pct(1.4 + 0.04 * r)} Attack + ${n1(4 + r / 6)}% max HP.`,
  cast: (c, r) => c.hitRaw(c.stats.atk * (1.4 + 0.04 * r) + c.stats.hp * (0.04 + 0.005 / 3 * r), 'magic') });
active('divine_shield', { name: 'Divine Shield', cooldown: 16, mpCost: r => 15,
  describe: r => `Shield for ${n1(12 + 0.5 * r)}% max HP for 10s.`,
  cast: (c, r) => c.shield(c.stats.hp * (0.12 + 0.005 * r), 10) });
passive('retribution', { name: 'Retribution',
  describe: r => `Reflect ${2 * r}% of damage taken. +${r}% Defense.`,
  apply: (s, r) => { s.reflect += 0.02 * r; s.defp += r; } });
// Assassin
active('assassinate', { name: 'Assassinate', cooldown: 12, mpCost: r => 20,
  describe: r => `Guaranteed crit for ${pct(3 + 0.25 / 3 * r)} Attack.`,
  cast: (c, r) => c.hit(3 + 0.25 / 3 * r, 'phys', { crit: true }) });
passive('exploit', { name: 'Exploit Weakness',
  describe: r => `+${n1(3.5 / 3 * r)}% armor penetration.`,
  apply: (s, r) => { s.pen += 3.5 / 3 * r; } });
passive('execute', { name: 'Execute',
  describe: r => `+${2 * r}% damage to enemies below 35% HP.`,
  apply: (s, r) => { s.execute += 0.02 * r; } });
// Ranger
active('volley', { name: 'Volley', cooldown: 7, mpCost: r => 14,
  describe: r => `4 hits of ${pct(0.55 + 0.05 / 3 * r)} Attack.`,
  cast: (c, r) => { for (let i = 0; i < 4; i++) c.hit(0.55 + 0.05 / 3 * r, 'phys'); } });
active('snare', { name: 'Snare Trap', cooldown: 12, mpCost: r => 10,
  describe: r => `Stun for ${n1(1 + r / 30)}s and hit for ${pct(1 + r / 30)} Attack.`,
  cast: (c, r) => { c.stun(1 + r / 30); c.hit(1 + r / 30, 'phys'); } });
passive('quick_draw', { name: 'Quick Draw',
  describe: r => `+${n1(2.5 / 3 * r)}% attack speed, +${n1(r / 3)}% accuracy.`,
  apply: (s, r) => { s.spd += 2.5 / 3 * r; s.accp += r / 3; } });
// Pyromancer
active('meteor', { name: 'Meteor', cooldown: 15, mpCost: r => 35 + Math.round(2 / 3 * r),
  describe: r => `Magic hit for ${pct(4.5 + 0.4 / 3 * r)} Magic.`,
  cast: (c, r) => c.hit(4.5 + 0.4 / 3 * r, 'magic', { fire: true }) });
passive('ignite', { name: 'Ignite',
  describe: r => `Fire spells burn for ${n1(8 / 3 * r)}% Magic per second for 4s.`,
  apply: (s, r) => { s.ignite += 0.08 / 3 * r; } });
passive('combustion', { name: 'Combustion',
  describe: r => `Spells get +${n1(2 / 3 * r)}% crit chance. +${n1(4 / 3 * r)}% crit damage.`,
  apply: (s, r) => { s.spellCrit += 2 / 3 * r; s.critdmg += 4 / 3 * r; } });
// Necromancer
active('raise_skeleton', { name: 'Raise Skeleton', cooldown: 18, mpCost: r => 25,
  describe: r => `Summon a skeleton for 15s that hits for ${pct(0.5 + 0.02 * r)} Magic each second.`,
  cast: (c, r) => c.minion(c.stats.matk * (0.5 + 0.02 * r), 15, 'a skeleton rises') });
active('life_drain', { name: 'Life Drain', cooldown: 6, mpCost: r => 12 + Math.round(r / 3),
  describe: r => `Magic hit for ${pct(1.5 + 0.04 * r)} Magic. Heal 50% of damage dealt.`,
  cast: (c, r) => { const d = c.hit(1.5 + 0.04 * r, 'magic'); c.heal(d * 0.5); } });
passive('curse', { name: 'Curse of Frailty',
  describe: r => `Enemies take +${n1(2.5 / 3 * r)}% damage and deal ${n1(0.5 * r)}% less.`,
  apply: (s, r) => { s.vuln += 0.025 / 3 * r; s.weaken += 0.005 * r; } });

// ---- 3rd job ----
max = MAX_RANK[3];
// Reaver
active('brutal_swing', { name: 'Brutal Swing', cooldown: 7, mpCost: r => 20 + Math.round(r / 2),
  describe: r => `2 hits of ${pct(1.6 + 0.06 * r)} Attack.`,
  cast: (c, r) => { c.hit(1.6 + 0.06 * r, 'phys'); c.hit(1.6 + 0.06 * r, 'phys'); } });
active('enrage', { name: 'Enrage', cooldown: 25, mpCost: r => 20,
  describe: r => `+${15 + r}% damage for 10s.`,
  cast: (c, r) => c.buff('enrage', 10, { dmgMul: 1.15 + 0.01 * r }) });
passive('savage_blows', { name: 'Savage Blows',
  describe: r => `+${n1(0.3 * r)}% crit chance, +${r}% crit damage.`,
  apply: (s, r) => { s.crit += 0.3 * r; s.critdmg += r; } });
passive('blood_pact', { name: 'Blood Pact',
  describe: r => `+${r}% Attack, +${n1(0.5 * r)}% HP.`,
  apply: (s, r) => { s.atkp += r; s.hpp += 0.5 * r; } });
// Templar
active('blessed_hammer', { name: 'Blessed Hammer', cooldown: 7, mpCost: r => 18 + Math.round(r / 2),
  describe: r => `Magic hit for ${pct(1.8 + 0.05 * r)} Attack + ${n1(5 + 0.15 * r)}% max HP.`,
  cast: (c, r) => c.hitRaw(c.stats.atk * (1.8 + 0.05 * r) + c.stats.hp * (0.05 + 0.0015 * r), 'magic') });
active('sanctuary', { name: 'Sanctuary', cooldown: 20, mpCost: r => 25,
  describe: r => `Heal ${n1(10 + 0.5 * r)}% max HP and gain +${n1(10 + 0.5 * r)}% damage for 8s.`,
  cast: (c, r) => { c.heal(c.stats.hp * (0.1 + 0.005 * r)); c.buff('sanctuary', 8, { dmgMul: 1.1 + 0.005 * r }); } });
passive('aegis', { name: 'Aegis',
  describe: r => `+${2 * r}% Defense. Reflect +${r}% of damage taken.`,
  apply: (s, r) => { s.defp += 2 * r; s.reflect += 0.01 * r; } });
passive('zeal', { name: 'Zeal',
  describe: r => `+${r}% Attack, +${n1(0.5 * r)}% HP.`,
  apply: (s, r) => { s.atkp += r; s.hpp += 0.5 * r; } });
// Nightblade
active('shadow_flurry', { name: 'Shadow Flurry', cooldown: 6, mpCost: r => 18 + Math.round(r / 2),
  describe: r => `4 hits of ${pct(0.7 + 0.03 * r)} Attack.`,
  cast: (c, r) => { for (let i = 0; i < 4; i++) c.hit(0.7 + 0.03 * r, 'phys'); } });
active('smoke_veil', { name: 'Smoke Veil', cooldown: 22, mpCost: r => 18,
  describe: r => `+${n1(10 + 0.5 * r)}% crit chance for 8s.`,
  cast: (c, r) => c.buff('smoke_veil', 8, { critAdd: 10 + 0.5 * r }) });
passive('vital_strike', { name: 'Vital Strike',
  describe: r => `+${n1(1.5 * r)}% crit damage.`,
  apply: (s, r) => { s.critdmg += 1.5 * r; } });
passive('venom', { name: 'Venom',
  describe: r => `+${n1(0.5 * r)}% armor penetration, +${n1(0.2 * r)}% crit chance.`,
  apply: (s, r) => { s.pen += 0.5 * r; s.crit += 0.2 * r; } });
// Sharpshooter
active('piercing_arrow', { name: 'Piercing Arrow', cooldown: 6, mpCost: r => 18 + Math.round(r / 2),
  describe: r => `A shot that never misses for ${pct(2.4 + 0.08 * r)} Attack.`,
  cast: (c, r) => c.hit(2.4 + 0.08 * r, 'phys', { noMiss: true }) });
active('focus', { name: 'Focus', cooldown: 20, mpCost: r => 18,
  describe: r => `+${n1(15 + 0.5 * r)}% speed for 10s.`,
  cast: (c, r) => c.buff('focus', 10, { spdMul: 1.15 + 0.005 * r }) });
passive('eagle_eye', { name: 'Eagle Eye',
  describe: r => `+${r}% accuracy, +${n1(0.3 * r)}% crit chance.`,
  apply: (s, r) => { s.accp += r; s.crit += 0.3 * r; } });
passive('hunters_mark', { name: "Hunter's Mark",
  describe: r => `+${n1(0.5 * r)}% damage, +${r}% item rarity.`,
  apply: (s, r) => { s.dmg += 0.5 * r; s.mf += r; } });
// Infernalist
active('flame_pillar', { name: 'Flame Pillar', cooldown: 6, mpCost: r => 25 + r,
  describe: r => `Magic hit for ${pct(2.6 + 0.1 * r)} Magic.`,
  cast: (c, r) => c.hit(2.6 + 0.1 * r, 'magic', { fire: true }) });
active('inferno', { name: 'Inferno', cooldown: 14, mpCost: r => 30,
  describe: r => `Burn for ${pct(0.6 + 0.03 * r)} Magic per second for 6s.`,
  cast: (c, r) => c.dot('Inferno', c.stats.matk * (0.6 + 0.03 * r), 6, 'magic') });
passive('fire_mastery', { name: 'Fire Mastery',
  describe: r => `+${r}% Magic. Ignite burns +${n1(0.3 * r)}% Magic per second.`,
  apply: (s, r) => { s.matkp += r; s.ignite += 0.003 * r; } });
passive('spell_amp', { name: 'Spell Amplification',
  describe: r => `+${n1(0.5 * r)}% damage, spells get +${n1(0.3 * r)}% crit chance.`,
  apply: (s, r) => { s.dmg += 0.5 * r; s.spellCrit += 0.3 * r; } });
// Deathcaller
active('bone_spear', { name: 'Bone Spear', cooldown: 5, mpCost: r => 18 + Math.round(r / 2),
  describe: r => `Magic hit for ${pct(2 + 0.08 * r)} Magic.`,
  cast: (c, r) => c.hit(2 + 0.08 * r, 'magic') });
active('soul_siphon', { name: 'Soul Siphon', cooldown: 10, mpCost: r => 22,
  describe: r => `Magic hit for ${pct(1.5 + 0.05 * r)} Magic. Heal 60% of damage dealt.`,
  cast: (c, r) => { const d = c.hit(1.5 + 0.05 * r, 'magic'); c.heal(d * 0.6); } });
passive('dark_pact', { name: 'Dark Pact',
  describe: r => `+${r}% Magic, +${n1(0.5 * r)}% HP.`,
  apply: (s, r) => { s.matkp += r; s.hpp += 0.5 * r; } });
passive('plague', { name: 'Plague',
  describe: r => `Enemies take +${n1(0.4 * r)}% damage and deal ${n1(0.3 * r)}% less.`,
  apply: (s, r) => { s.vuln += 0.004 * r; s.weaken += 0.003 * r; } });

// ---- 4th job ----
max = MAX_RANK[4];
// Warlord
active('raging_blow', { name: 'Raging Blow', cooldown: 10, mpCost: r => 30 + r,
  describe: r => `4 hits of ${pct(1.2 + 0.05 * r)} Attack.`,
  cast: (c, r) => { for (let i = 0; i < 4; i++) c.hit(1.2 + 0.05 * r, 'phys'); } });
passive('unbreakable', { name: 'Unbreakable',
  describe: r => `+${r}% Defense, +${r}% HP.`,
  apply: (s, r) => { s.defp += r; s.hpp += r; } });
passive('berserk_mastery', { name: 'Berserk Mastery',
  describe: r => `+${n1(0.1 * r)}% damage for every 10% HP missing. +${r}% boss damage.`,
  apply: (s, r) => { s.frenzy += 0.001 * r; s.boss += r; } });
// Lightbringer
active('judgment', { name: 'Judgment', cooldown: 12, mpCost: r => 35 + r,
  describe: r => `Magic hit for ${pct(3 + 0.1 * r)} Attack + ${n1(8 + 0.2 * r)}% max HP.`,
  cast: (c, r) => c.hitRaw(c.stats.atk * (3 + 0.1 * r) + c.stats.hp * (0.08 + 0.002 * r), 'magic') });
passive('divine_aura', { name: 'Divine Aura',
  describe: r => `+${r}% damage. Regenerate ${(0.02 * r).toFixed(2)}% max HP per second.`,
  apply: (s, r) => { s.dmg += r; s.hpRegen += 0.0002 * r; } });
passive('guardian', { name: 'Guardian',
  describe: r => `Enemies deal ${n1(0.5 * r)}% less damage. +${r}% HP.`,
  apply: (s, r) => { s.weaken += 0.005 * r; s.hpp += r; } });
// Shadowlord
active('death_mark', { name: 'Death Mark', cooldown: 15, mpCost: r => 40,
  describe: r => `Guaranteed crit for ${pct(5 + 0.2 * r)} Attack.`,
  cast: (c, r) => c.hit(5 + 0.2 * r, 'phys', { crit: true }) });
passive('phantom_step', { name: 'Phantom Step',
  describe: r => `+${n1(0.2 * r)}% chance to dodge, +${n1(0.5 * r)}% speed.`,
  apply: (s, r) => { s.dodgeFlat += 0.002 * r; s.spd += 0.5 * r; } });
passive('killing_spree', { name: 'Killing Spree',
  describe: r => `+${r}% damage to enemies below 35% HP. +${r}% boss damage.`,
  apply: (s, r) => { s.execute += 0.01 * r; s.boss += r; } });
// Stormbow
active('arrow_storm', { name: 'Arrow Storm', cooldown: 10, mpCost: r => 30 + r,
  describe: r => `8 hits of ${pct(0.5 + 0.02 * r)} Attack.`,
  cast: (c, r) => { for (let i = 0; i < 8; i++) c.hit(0.5 + 0.02 * r, 'phys'); } });
passive('wind_mastery', { name: 'Wind Mastery',
  describe: r => `+${n1(0.5 * r)}% speed, +${r}% crit damage.`,
  apply: (s, r) => { s.spd += 0.5 * r; s.critdmg += r; } });
passive('deadeye', { name: 'Deadeye',
  describe: r => `+${r}% boss damage, +${n1(0.5 * r)}% armor penetration.`,
  apply: (s, r) => { s.boss += r; s.pen += 0.5 * r; } });
// Archmage
active('cataclysm', { name: 'Cataclysm', cooldown: 18, mpCost: r => 60 + 2 * r,
  describe: r => `Magic hit for ${pct(7 + 0.25 * r)} Magic.`,
  cast: (c, r) => c.hit(7 + 0.25 * r, 'magic', { fire: true }) });
active('arcane_overload', { name: 'Arcane Overload', cooldown: 30, mpCost: r => 30,
  describe: r => `+${20 + r}% Magic for 10s.`,
  cast: (c, r) => c.buff('arcane_overload', 10, { matkMul: 1.2 + 0.01 * r }) });
passive('elemental_mastery', { name: 'Elemental Mastery',
  describe: r => `+${r}% Magic, +${r}% crit damage.`,
  apply: (s, r) => { s.matkp += r; s.critdmg += r; } });
// Lich
active('army_of_dead', { name: 'Army of the Dead', cooldown: 18, mpCost: r => 40,
  describe: r => `Summon the dead for 15s; they hit for ${pct(1 + 0.04 * r)} Magic each second. Replaces a skeleton.`,
  cast: (c, r) => c.minion(c.stats.matk * (1 + 0.04 * r), 15, 'the dead rise') });
passive('phylactery', { name: 'Phylactery',
  describe: r => `+${r}% HP. ${n1(0.5 * r)}% of damage taken drains MP instead of HP.`,
  apply: (s, r) => { s.hpp += r; s.manaShield += 0.005 * r; } });
passive('death_mastery', { name: 'Death Mastery',
  describe: r => `+${r}% Magic, +${n1(0.5 * r)}% damage.`,
  apply: (s, r) => { s.matkp += r; s.dmg += 0.5 * r; } });
