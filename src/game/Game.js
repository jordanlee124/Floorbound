// Game session: one player, the current fight, rewards and floor progress.
import { Player } from './Player.js';
import { Battle } from './Battle.js';
import { Item } from './Item.js';
import { Enemy, Zone } from './Enemy.js';
import { CUBES } from './data/potentials.js';
import { KILLS_PER_FLOOR, POINTS_PER_LEVEL, isBossFloor } from './curves.js';
import { SET_CHANCE } from './data/sets.js';
import { BOSSES, BOSS_BY_ID, DIFFICULTIES } from './data/bosses.js';
import { rand, randInt, fmt } from './util.js';

export class Game {
  // log(kind, message, rarity?) receives everything that happens; the UI shows it, the sim ignores it.
  constructor(player = Player.create(), log = () => {}) {
    this.player = player;
    this.log = log;
    this.battle = null;
    this.now = () => Date.now(); // clock for boss resets; the sim replaces it
  }

  get zone() { return Zone.forFloor(this.player.floor); }
  get onBossFloor() { return isBossFloor(this.player.floor); }
  // The current floor is done and a higher one is open.
  get floorCleared() {
    const p = this.player;
    return p.floor < p.maxFloor && (this.onBossFloor || p.floorKills >= KILLS_PER_FLOOR);
  }

  // Put a fresh enemy in front of the player. The fight starts when ticks begin.
  newBattle() {
    this.battle = new Battle(this.player, this.log);
    const e = this.battle.enemy;
    this.log('enc', `Floor ${this.player.floor}: ${e.name} blocks the way${e.tag ? ` (${e.tag})` : ''}.`);
    return this.battle;
  }

  // Apply the outcome of a finished battle.
  finishBattle(battle = this.battle) {
    const raid = battle.enemy.raid;
    if (battle.result === 'win') raid ? this.#raidReward(battle) : this.#reward(battle);
    else if (battle.result === 'lose') this.#defeat(battle);
  }

  // ---- Boss raids ----
  // Start of the current reset period: local midnight (daily) or the last Thursday midnight (weekly), as in MapleStory.
  static resetStart(type, now) {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    if (type === 'weekly') d.setDate(d.getDate() - ((d.getDay() + 3) % 7));
    return d.getTime();
  }
  static nextReset(type, now) {
    const d = new Date(Game.resetStart(type, now));
    d.setDate(d.getDate() + (type === 'weekly' ? 7 : 1));
    return d.getTime();
  }

  // { unlocked, cleared, resetsAt } for one boss difficulty.
  bossStatus(id, diff) {
    const def = BOSS_BY_ID[id], mode = def && def.modes[diff];
    if (!mode) return null;
    const now = this.now(), last = this.player.bossClears[`${id}:${diff}`] || 0;
    return { unlocked: this.player.lvl >= def.level, cleared: last >= Game.resetStart(mode.reset, now), resetsAt: Game.nextReset(mode.reset, now) };
  }
  get bossesAvailable() {
    return BOSSES.some(b => Object.keys(b.modes).some(d => { const s = this.bossStatus(b.id, d); return s.unlocked && !s.cleared; }));
  }

  // Put a raid boss in front of the player instead of a floor enemy. Returns the battle, or null if not allowed.
  newBossBattle(id, diff) {
    const s = this.bossStatus(id, diff);
    if (!s || !s.unlocked || s.cleared) return null;
    this.battle = new Battle(this.player, this.log, Enemy.raid(BOSS_BY_ID[id], diff));
    this.log('enc', `${BOSS_BY_ID[id].name} (${DIFFICULTIES[diff].name}) awaits.`);
    return this.battle;
  }

  #raidReward(battle) {
    const p = this.player, e = battle.enemy, { id, diff } = e.raid, def = BOSS_BY_ID[id], D = DIFFICULTIES[diff];
    p.bossClears[`${id}:${diff}`] = this.now();
    p.stats.kills++; p.stats.raids = (p.stats.raids || 0) + 1;
    const gap = p.lvl - e.f;
    const exp = Math.round(e.exp * (gap > 5 ? Math.max(0.2, 1 - (gap - 5) * 0.1) : 1));
    p.gold += e.gold; p.shards += D.shards;
    for (const k in D.cubes) p.cubes[k] += D.cubes[k];
    this.log('win', `${def.name} (${D.name}) is defeated! +${fmt(exp)} exp, a boss crystal worth ${fmt(e.gold)} gold, +${D.shards} shards, ${Object.entries(D.cubes).map(([k, n]) => `+${n} ${CUBES[k].name}${n > 1 ? "s" : ""}`).join(', ')}.`);
    this.#gainExp(exp);
    const st = battle.stats, ilvl = Item.levelFor(e.f), rar = () => Math.max(D.minRar, Item.rollRarity(st.mf, 3));
    const drops = [];
    for (let i = 0; i < D.items; i++) drops.push(Item.generate(ilvl, rar()));
    if (rand() < D.setChance) drops.push(Item.generateSetPiece(ilvl, rar(), def.set));
    for (const it of drops) this.#stash(it, battle);
  }

  // Change floor by hand. Returns false if that floor is locked.
  moveTo(floor) {
    const p = this.player;
    if (floor < 1 || floor > p.maxFloor || floor === p.floor) return false;
    p.floor = floor; p.floorKills = 0;
    this.log('floor', `Moved to floor ${floor}.`);
    return true;
  }

  #gainExp(amount) {
    const p = this.player;
    const spBefore = p.spEarnedTotal;
    const ups = p.gainExp(amount);
    if (!ups) return;
    this.log('level', `Level up! You are now level ${p.lvl}. +${POINTS_PER_LEVEL * ups} AP, +${p.spEarnedTotal - spBefore} SP.`);
    const adv = p.advancement;
    if (adv && adv.ready && p.lvl - ups < adv.level) this.log('level', `Your ${adv.options[0].jobName} advancement is ready in the Class tab.`);
  }

  #reward(battle) {
    const p = this.player, e = battle.enemy, st = battle.stats;
    p.stats.kills++;
    const gold = Math.round(e.gold * (0.8 + rand() * 0.4) * (1 + st.gf / 100));
    p.gold += gold;
    // Over-leveled players get less exp, so low floors stop being the best grind.
    const gap = p.lvl - e.f;
    const expMul = gap > 5 ? Math.max(0.2, 1 - (gap - 5) * 0.1) : 1;
    const exp = Math.round(e.exp * expMul);
    this.log('win', `${e.name} falls. +${fmt(exp)} exp, +${fmt(gold)} gold.`);
    this.#gainExp(exp);

    const drops = [];
    for (let i = 0; i < e.dropCount; i++) if (rand() < e.dropChance) {
      const rar = Item.rollRarity(st.mf, e.rarityBoost);
      const r = e.boss ? Math.max(2, rar) : rar;
      const isSet = rand() < SET_CHANCE[e.boss ? 'boss' : e.elite ? 'elite' : 'normal'];
      drops.push(isSet ? Item.generateSetPiece(Item.levelFor(e.f), r) : Item.generate(Item.levelFor(e.f), r));
    }
    if (rand() < (e.boss ? 1 : 0.12)) {
      const sh = e.boss ? randInt(5, 10) : 1;
      p.shards += sh;
      this.log('loot', `+${sh} shard${sh > 1 ? 's' : ''}.`);
    }
    // Bosses and elites drop cubes, as MapleStory bosses do.
    const cube = e.boss ? (rand() < 0.3 ? 'black' : 'red') : e.elite && rand() < 0.25 ? 'red' : null;
    if (cube) { p.cubes[cube]++; this.log('loot', `+1 ${CUBES[cube].name}.`, cube === 'black' ? 3 : 2); }
    for (const it of drops) this.#stash(it, battle);

    if (e.boss) {
      p.stats.bosses++;
      if (p.floor === p.maxFloor) { p.maxFloor++; this.log('floor', `Boss defeated. Floor ${p.maxFloor} unlocked.`); }
      if (p.autoClimb && p.floor < p.maxFloor) { p.floor++; p.floorKills = 0; }
    } else {
      p.floorKills++;
      if (p.floorKills >= KILLS_PER_FLOOR) {
        if (p.floor === p.maxFloor) { p.maxFloor++; this.log('floor', `Floor ${p.floor} cleared. Floor ${p.maxFloor} unlocked.`); }
        if (p.autoClimb && p.floor < p.maxFloor) { p.floor++; p.floorKills = 0; this.log('floor', `Climbing to floor ${p.floor}.`); }
      }
    }
    p.stats.best = Math.max(p.stats.best, p.maxFloor);
  }

  // Auto-salvage (never a set piece), sell if the bag is full, or put the item in the bag.
  #stash(it, battle) {
    const p = this.player;
    if (p.autoSalvage && it.rar < p.autoSalvage && !it.set) {
      p.shards += it.salvageValue;
      this.log('salv', `Auto-salvaged ${it.name} (+${it.salvageValue} shards).`);
    } else if (p.bagFull) {
      p.gold += it.sellValue;
      this.log('salv', `Bag full. Sold ${it.name} for ${fmt(it.sellValue)}.`);
    } else {
      p.inv.push(it); battle.loot.push(it);
      this.log('loot', `Looted [${it.rarity.name}] ${it.name} (Lv ${it.ilvl}).`, it.rar);
    }
  }

  #defeat(battle) {
    const p = this.player;
    p.stats.deaths++;
    this.log('death', `You were defeated by ${battle.enemy.name}.`);
    if (battle.enemy.raid) return; // a failed raid can be tried again until it is cleared
    if (p.autoClimb && p.floor > 1) { p.floor--; p.floorKills = 0; this.log('floor', `Retreating to floor ${p.floor}.`); }
  }
}
