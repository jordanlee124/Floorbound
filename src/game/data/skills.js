// Every skill in the game. Importing this file registers them with Skill.get().
import { Skill, ActiveSkill, PassiveSkill } from '../Skill.js';

const pct = v => Math.round(v * 100) + '%';
const active = (id, def) => Skill.register(new ActiveSkill(id, def));
const passive = (id, def) => Skill.register(new PassiveSkill(id, def));

// Novice
active('power_strike', { name: 'Power Strike', max: 5, cooldown: 5, mpCost: r => 4,
  describe: r => `Hit for ${pct(1.5 + 0.1 * r)} Attack.`,
  cast: (c, r) => c.hit(1.5 + 0.1 * r, 'phys') });

// Warrior
active('cleave', { name: 'Cleave', cooldown: 5, mpCost: r => 8 + r,
  describe: r => `Hit for ${pct(1.8 + 0.15 * r)} Attack.`,
  cast: (c, r) => c.hit(1.8 + 0.15 * r, 'phys') });
active('war_cry', { name: 'War Cry', cooldown: 20, mpCost: r => 12,
  describe: r => `+${pct(0.2 + 0.03 * r)} Attack for 8s.`,
  cast: (c, r) => c.buff('war_cry', 8, { atkMul: 1.2 + 0.03 * r }) });
passive('iron_skin', { name: 'Iron Skin',
  describe: r => `+${5 * r}% Defense, +${3 * r}% HP.`,
  apply: (s, r) => { s.defp += 5 * r; s.hpp += 3 * r; } });
passive('second_wind', { name: 'Second Wind',
  describe: r => `Regenerate ${(0.3 * r).toFixed(1)}% max HP per second.`,
  apply: (s, r) => { s.hpRegen += 0.003 * r; } });

// Berserker
active('rampage', { name: 'Rampage', cooldown: 8, mpCost: r => 15 + r,
  describe: r => `3 hits of ${pct(0.8 + 0.08 * r)} Attack.`,
  cast: (c, r) => { for (let i = 0; i < 3; i++) c.hit(0.8 + 0.08 * r, 'phys'); } });
passive('blood_frenzy', { name: 'Blood Frenzy',
  describe: r => `+${(0.5 * r).toFixed(1)}% damage for every 10% HP missing.`,
  apply: (s, r) => { s.frenzy += 0.005 * r; } });
passive('bloodthirst', { name: 'Bloodthirst',
  describe: r => `+${(0.6 * r).toFixed(1)}% lifesteal, +${1.5 * r}% Attack.`,
  apply: (s, r) => { s.ls += 0.6 * r; s.atkp += 1.5 * r; } });

// Paladin
active('holy_strike', { name: 'Holy Strike', cooldown: 6, mpCost: r => 12 + r,
  describe: r => `Magic hit for ${pct(1.4 + 0.12 * r)} Attack + ${(4 + 0.5 * r).toFixed(1)}% max HP.`,
  cast: (c, r) => c.hitRaw(c.stats.atk * (1.4 + 0.12 * r) + c.stats.hp * (0.04 + 0.005 * r), 'magic') });
active('divine_shield', { name: 'Divine Shield', cooldown: 16, mpCost: r => 15,
  describe: r => `Shield for ${(12 + 1.5 * r).toFixed(1)}% max HP for 10s.`,
  cast: (c, r) => c.shield(c.stats.hp * (0.12 + 0.015 * r), 10) });
passive('retribution', { name: 'Retribution',
  describe: r => `Reflect ${6 * r}% of damage taken. +${3 * r}% Defense.`,
  apply: (s, r) => { s.reflect += 0.06 * r; s.defp += 3 * r; } });

// Rogue
active('twin_strike', { name: 'Twin Strike', cooldown: 4, mpCost: r => 6 + r,
  describe: r => `2 hits of ${pct(0.85 + 0.07 * r)} Attack.`,
  cast: (c, r) => { c.hit(0.85 + 0.07 * r, 'phys'); c.hit(0.85 + 0.07 * r, 'phys'); } });
active('poison_blade', { name: 'Poison Blade', cooldown: 8, mpCost: r => 10,
  describe: r => `Poison for ${pct(0.3 + 0.04 * r)} Attack per second for 6s. Ignores armor.`,
  cast: (c, r) => c.dot('Poison', c.stats.atk * (0.3 + 0.04 * r), 6, 'true') });
passive('evasion', { name: 'Evasion',
  describe: r => `+${(1.5 * r).toFixed(1)}% chance to dodge.`,
  apply: (s, r) => { s.dodgeFlat += 0.015 * r; } });
passive('lethality', { name: 'Lethality',
  describe: r => `+${r}% crit chance, +${6 * r}% crit damage.`,
  apply: (s, r) => { s.crit += r; s.critdmg += 6 * r; } });

// Assassin
active('assassinate', { name: 'Assassinate', cooldown: 12, mpCost: r => 20,
  describe: r => `Guaranteed crit for ${pct(3 + 0.25 * r)} Attack.`,
  cast: (c, r) => c.hit(3 + 0.25 * r, 'phys', { crit: true }) });
passive('exploit', { name: 'Exploit Weakness',
  describe: r => `+${(3.5 * r).toFixed(1)}% armor penetration.`,
  apply: (s, r) => { s.pen += 3.5 * r; } });
passive('execute', { name: 'Execute',
  describe: r => `+${6 * r}% damage to enemies below 35% HP.`,
  apply: (s, r) => { s.execute += 0.06 * r; } });

// Ranger
active('volley', { name: 'Volley', cooldown: 7, mpCost: r => 14,
  describe: r => `4 hits of ${pct(0.55 + 0.05 * r)} Attack.`,
  cast: (c, r) => { for (let i = 0; i < 4; i++) c.hit(0.55 + 0.05 * r, 'phys'); } });
active('snare', { name: 'Snare Trap', cooldown: 12, mpCost: r => 10,
  describe: r => `Stun for ${(1 + 0.1 * r).toFixed(1)}s and hit for ${pct(1 + 0.1 * r)} Attack.`,
  cast: (c, r) => { c.stun(1 + 0.1 * r); c.hit(1 + 0.1 * r, 'phys'); } });
passive('quick_draw', { name: 'Quick Draw',
  describe: r => `+${(2.5 * r).toFixed(1)}% attack speed, +${r}% accuracy.`,
  apply: (s, r) => { s.spd += 2.5 * r; s.accp += r; } });

// Mage
active('fireball', { name: 'Fireball', cooldown: 3, mpCost: r => 10 + r,
  describe: r => `Magic hit for ${pct(2 + 0.2 * r)} Magic.`,
  cast: (c, r) => c.hit(2 + 0.2 * r, 'magic', { fire: true }) });
active('frost_nova', { name: 'Frost Nova', cooldown: 10, mpCost: r => 14,
  describe: r => `Magic hit for ${pct(1.2 + 0.1 * r)} Magic and slow the enemy 35% for 4s.`,
  cast: (c, r) => { c.hit(1.2 + 0.1 * r, 'magic'); c.slow(0.35, 4); } });
passive('arcane_mind', { name: 'Arcane Mind',
  describe: r => `+${4 * r}% Magic, +${5 * r}% MP.`,
  apply: (s, r) => { s.matkp += 4 * r; s.mpp += 5 * r; } });
passive('mana_shield', { name: 'Mana Shield',
  describe: r => `${4 * r}% of damage taken drains MP instead of HP.`,
  apply: (s, r) => { s.manaShield += 0.04 * r; } });

// Pyromancer
active('meteor', { name: 'Meteor', cooldown: 15, mpCost: r => 35 + 2 * r,
  describe: r => `Magic hit for ${pct(4.5 + 0.4 * r)} Magic.`,
  cast: (c, r) => c.hit(4.5 + 0.4 * r, 'magic', { fire: true }) });
passive('ignite', { name: 'Ignite',
  describe: r => `Fire spells burn for ${8 * r}% Magic per second for 4s.`,
  apply: (s, r) => { s.ignite += 0.08 * r; } });
passive('combustion', { name: 'Combustion',
  describe: r => `Spells get +${2 * r}% crit chance. +${4 * r}% crit damage.`,
  apply: (s, r) => { s.spellCrit += 2 * r; s.critdmg += 4 * r; } });

// Necromancer
active('raise_skeleton', { name: 'Raise Skeleton', cooldown: 18, mpCost: r => 25,
  describe: r => `Summon a skeleton for 15s that hits for ${pct(0.5 + 0.06 * r)} Magic each second.`,
  cast: (c, r) => c.minion(c.stats.matk * (0.5 + 0.06 * r), 15) });
active('life_drain', { name: 'Life Drain', cooldown: 6, mpCost: r => 12 + r,
  describe: r => `Magic hit for ${pct(1.5 + 0.12 * r)} Magic. Heal 50% of damage dealt.`,
  cast: (c, r) => { const d = c.hit(1.5 + 0.12 * r, 'magic'); c.heal(d * 0.5); } });
passive('curse', { name: 'Curse of Frailty',
  describe: r => `Enemies take +${(2.5 * r).toFixed(1)}% damage and deal ${(1.5 * r).toFixed(1)}% less.`,
  apply: (s, r) => { s.vuln += 0.025 * r; s.weaken += 0.015 * r; } });
