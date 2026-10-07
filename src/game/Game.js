// Game session: one player, the current fight, rewards and floor progress.
import { Player } from './Player.js';
import { Battle } from './Battle.js';
import { Item } from './Item.js';
import { Zone } from './Enemy.js';
import { KILLS_PER_FLOOR, POINTS_PER_LEVEL, isBossFloor } from './curves.js';
import { rand, randInt, fmt } from './util.js';

export class Game {
  // log(kind, message, rarity?) receives everything that happens; the UI shows it, the sim ignores it.
  constructor(player = Player.create(), log = () => {}) {
    this.player = player;
    this.log = log;
    this.battle = null;
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
    if (battle.result === 'win') this.#reward(battle);
    else if (battle.result === 'lose') this.#defeat(battle);
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
    const ups = p.gainExp(amount);
    if (ups) this.log('level', `Level up! You are now level ${p.lvl}. +${POINTS_PER_LEVEL * ups} stat points, +${ups} skill point${ups > 1 ? 's' : ''}.`);
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
      const ilvl = Math.max(1, e.f - (rand() < 0.5 ? 0 : randInt(0, 2)));
      drops.push(Item.generate(ilvl, e.boss ? Math.max(2, rar) : rar));
    }
    if (rand() < (e.boss ? 1 : 0.12)) {
      const sh = e.boss ? randInt(5, 10) : 1;
      p.shards += sh;
      this.log('loot', `+${sh} enhancement shard${sh > 1 ? 's' : ''}.`);
    }
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

  // Auto-salvage, sell if the bag is full, or put the item in the bag.
  #stash(it, battle) {
    const p = this.player;
    if (p.autoSalvage && it.rar < p.autoSalvage) {
      p.shards += it.salvageValue;
      this.log('salv', `Auto-salvaged ${it.name} (+${it.salvageValue} shards).`);
    } else if (p.bagFull) {
      p.gold += it.sellValue;
      this.log('salv', `Bag full. Sold ${it.name} for ${fmt(it.sellValue)}.`);
    } else {
      p.inv.push(it); battle.loot.push(it);
      this.log('loot', `Looted [${it.rarity.name}] ${it.name} +0 (iLvl ${it.ilvl}).`, it.rar);
    }
  }

  #defeat(battle) {
    const p = this.player;
    p.stats.deaths++;
    this.log('death', `You were defeated by ${battle.enemy.name}.`);
    if (p.autoClimb && p.floor > 1) { p.floor--; p.floorKills = 0; this.log('floor', `Retreating to floor ${p.floor}.`); }
  }
}
