// One fight between the player and one enemy, simulated in fixed 0.1s ticks.
import { Enemy } from './Enemy.js';
import { Skill } from './Skill.js';
import { BOSS_ENRAGE_AT } from './data/enemies.js';
import { rand, fmt } from './util.js';

export const TICK = 0.1; // seconds
const STALEMATE_AT = 180; // seconds; a fight this long counts as a loss

// What a skill can do when it fires. Passed to ActiveSkill.cast().
class SkillContext {
  constructor(battle, skillName) { this.battle = battle; this.label = skillName; }
  get stats() { return this.battle.stats; }
  hit(mult, type, opts) {
    const b = this.battle;
    const base = type === 'magic' ? b.stats.matk : b.stats.atk * b.attackMultiplier;
    return b.playerHit(base * mult, type, { label: this.label, ...opts });
  }
  hitRaw(raw, type, opts) { return this.battle.playerHit(raw * this.battle.attackMultiplier, type, { label: this.label, ...opts }); }
  buff(id, duration, mods) { this.battle.buffs[id] = { t: duration, name: this.label, ...mods }; this.battle.log('skill', `${this.label}!`); }
  dot(name, dps, duration, type) {
    const b = this.battle;
    b.addDot(name, dps * b.damageMultiplier, duration, type);
    b.log('skill', `${this.label}: ${b.enemy.name} is afflicted.`);
  }
  shield(amount, duration) { const b = this.battle; b.shield = amount; b.shieldT = duration; b.log('skill', `${this.label}: shield ${fmt(amount)}.`); }
  stun(duration) { this.battle.stun = Math.max(this.battle.stun, duration); }
  slow(fraction, duration) { this.battle.slow = fraction; this.battle.slowT = duration; }
  heal(amount) { const b = this.battle; b.hp = Math.min(b.stats.hp, b.hp + amount); }
  minion(dmg, duration) { this.battle.minion = { dmg, t: duration, acc: 0 }; this.battle.log('skill', `${this.label}: a skeleton rises.`); }
}

export class Battle {
  // log(kind, message) receives the fight's play-by-play.
  constructor(player, log = () => {}) {
    this.player = player;
    this.log = log;
    this.stats = player.combatStats(player.floor);
    this.enemy = Enemy.spawn(player.floor);
    this.hp = this.stats.hp;
    this.mp = this.stats.mp;
    this.gauge = 0;        // player action gauge; acts at 1
    this.enemyGauge = 0;
    this.shield = 0; this.shieldT = 0;
    this.buffs = {};       // id -> { t, name, atkMul? }
    this.dots = [];        // damage over time on the enemy
    this.cooldowns = {};   // skill id -> seconds left
    this.stun = 0;         // enemy stunned seconds
    this.slow = 0; this.slowT = 0;
    this.minion = null;
    this.time = 0;
    this.enemyActions = 0;
    this.result = null;    // 'win' | 'lose' once over
    this.loot = [];        // items that went into the bag after a win
  }

  get over() { return this.result !== null; }
  get enraged() { return this.enemy.boss && this.time > BOSS_ENRAGE_AT; }
  get enrageMultiplier() { return this.enraged ? 1 + 0.25 * Math.floor((this.time - BOSS_ENRAGE_AT) / 5 + 1) : 1; }

  // Refresh stats after a gear or point change, keeping the current HP and MP fractions.
  refreshStats() {
    const hpR = this.hp / this.stats.hp, mpR = this.mp / this.stats.mp;
    this.stats = this.player.combatStats(this.player.floor);
    this.hp = Math.min(this.stats.hp, hpR * this.stats.hp);
    this.mp = Math.min(this.stats.mp, mpR * this.stats.mp);
  }
  // Full HP and MP with current stats; used when a fight starts.
  readyUp() { this.stats = this.player.combatStats(this.player.floor); this.hp = this.stats.hp; this.mp = this.stats.mp; }

  get attackMultiplier() {
    let m = 1;
    for (const k in this.buffs) if (this.buffs[k].atkMul) m *= this.buffs[k].atkMul;
    return m;
  }
  get damageMultiplier() {
    const st = this.stats, e = this.enemy;
    let m = 1 + st.vuln + st.dmg / 100 + (e.boss ? st.boss / 100 : 0);
    if (st.frenzy) m += st.frenzy * Math.floor((1 - this.hp / st.hp) * 10);
    if (st.execute && e.hpFraction < 0.35) m += st.execute;
    return m;
  }

  playerHit(raw, type, opts = {}) {
    const st = this.stats, e = this.enemy;
    if (type === 'phys' && !opts.noMiss) {
      const K = 150 + 8 * e.f;
      const miss = e.eva * K / (K + st.acc);
      if (rand() < miss) { this.log('miss', `${e.name} evades.`); return 0; }
    }
    let d = raw * this.damageMultiplier;
    const critChance = st.crit + (type === 'magic' ? st.spellCrit : 0);
    const crit = opts.crit || rand() * 100 < critChance;
    if (crit) d *= st.critdmg / 100;
    if (type === 'phys') d *= 1 - e.pr * (1 - st.pen / 100);
    else if (type === 'magic') d *= 1 - e.mr;
    d = Math.max(1, d);
    e.hp -= d;
    if (st.ls && type === 'phys') this.hp = Math.min(st.hp, this.hp + d * st.ls / 100);
    this.log(crit ? 'crit' : 'hit', `${opts.label || 'You hit'} ${e.name} for ${fmt(d)}${crit ? ' (crit)' : ''}${type === 'magic' ? ' magic' : ''}.`);
    if (opts.fire && st.ignite) this.addDot('Burn', st.matk * st.ignite, 4, 'magic');
    return d;
  }

  addDot(name, dps, duration, type) {
    const ex = this.dots.find(d => d.name === name);
    if (ex) { ex.dps = Math.max(ex.dps, dps); ex.t = duration; } else this.dots.push({ name, dps, t: duration, type, acc: 0 });
  }

  // First ready skill in rotation order, else a basic attack.
  #playerAct() {
    const p = this.player;
    for (const id of p.loadout) {
      const sk = Skill.get(id); const r = p.skillRank(id);
      if (!sk || !r || !sk.isActive) continue;
      if ((this.cooldowns[id] || 0) > 0) continue;
      const cost = sk.manaCost(r);
      if (this.mp < cost) continue;
      this.mp -= cost; this.cooldowns[id] = sk.cooldown;
      sk.cast(new SkillContext(this, sk.name), r);
      return;
    }
    if (this.stats.basic === 'magic') this.playerHit(this.stats.matk, 'magic', { label: 'Your bolt hits' });
    else this.playerHit(this.stats.atk * this.attackMultiplier, 'phys', { label: 'You hit' });
  }

  #enemyAct() {
    const e = this.enemy, st = this.stats;
    this.enemyActions++;
    let mult = 1, label = `${e.name} hits you`;
    if (e.boss && this.enemyActions % 4 === 0) { mult = 2.5; label = `${e.name} unleashes a heavy blow`; }
    if (e.dmg === 'phys' && rand() < st.dodge) { this.log('dodge', `You dodge ${e.name}.`); return; }
    let d = e.atk * mult * this.enrageMultiplier * (1 - st.weaken) * (0.9 + rand() * 0.2);
    const pre = d;
    d *= 1 - (e.dmg === 'phys' ? st.physRed : st.magRed);
    if (st.reflect) e.hp -= pre * st.reflect;
    if (this.shield > 0) { const ab = Math.min(this.shield, d); this.shield -= ab; d -= ab; }
    if (st.manaShield && this.mp > 0) {
      const part = d * st.manaShield; const cost = part * st.mp / st.hp;
      if (this.mp >= cost) { this.mp -= cost; d -= part; }
    }
    this.hp -= d;
    this.log(e.dmg === 'magic' ? 'ehit-m' : 'ehit', `${label} for ${fmt(d)}${e.dmg === 'magic' ? ' magic' : ''}.`);
  }

  #end(result) { this.result = result; return result; }

  // Advance one tick. Returns 'win' | 'lose' when the fight ends, otherwise null.
  tick() {
    if (this.over) return this.result;
    const st = this.stats, e = this.enemy, dt = TICK;
    this.time += dt;
    this.mp = Math.min(st.mp, this.mp + st.mpRegen * dt);
    if (st.hpRegen) this.hp = Math.min(st.hp, this.hp + st.hp * st.hpRegen * dt);
    for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    for (const k in this.buffs) { this.buffs[k].t -= dt; if (this.buffs[k].t <= 0) delete this.buffs[k]; }
    if (this.shieldT > 0) { this.shieldT -= dt; if (this.shieldT <= 0) this.shield = 0; }
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slow = 0; }
    for (const d of this.dots) {
      d.t -= dt; d.acc += dt;
      if (d.acc >= 1 - 1e-9) {
        d.acc -= 1;
        const dmg = d.dps * (d.type === 'magic' ? 1 - e.mr : 1);
        e.hp -= dmg; this.log('dot', `${d.name} deals ${fmt(dmg)}.`);
      }
    }
    this.dots = this.dots.filter(d => d.t > 0);
    if (this.minion) {
      this.minion.t -= dt; this.minion.acc += dt;
      if (this.minion.acc >= 1) {
        this.minion.acc -= 1;
        const dmg = this.minion.dmg * this.damageMultiplier * (1 - e.mr);
        e.hp -= dmg; this.log('dot', `Skeleton claws for ${fmt(dmg)}.`);
      }
      if (this.minion.t <= 0) this.minion = null;
    }
    if (!e.alive) return this.#end('win');

    this.gauge += st.spd / 100 * dt;
    while (this.gauge >= 1) { this.gauge -= 1; this.#playerAct(); if (!e.alive) return this.#end('win'); }

    if (this.stun > 0) this.stun -= dt;
    else {
      this.enemyGauge += e.spd * (1 - this.slow) * this.enrageMultiplier / 100 * dt;
      while (this.enemyGauge >= 1) {
        this.enemyGauge -= 1; this.#enemyAct();
        if (this.hp <= 0) return this.#end('lose');
        if (!e.alive) return this.#end('win');
      }
    }
    if (this.time > STALEMATE_AT) return this.#end('lose');
    return null;
  }

  // Run to the end at once.
  resolve() { let r = null, guard = 0; while (!r && guard++ < 100000) r = this.tick(); return r; }
}
