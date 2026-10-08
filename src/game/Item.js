// A piece of equipment. Plain fields are the save format:
// id, slot, ilvl, rar (potential tier), stars, base, pot ([{ k, t }] lines), lock, wtype, name,
// broken (destroyed by Star Force, waiting for repair), boomStreak (failures in a row that lost a star),
// pity ({ red, black }: cubes used at the current tier), pending (a Black Cube result waiting for a choice),
// set (an item set id, for set pieces), job (warrior/rogue/mage for class gear, absent for common gear).
import { gearPower } from './curves.js';
import { rand, pick } from './util.js';
import { SLOTS, RARITIES, WEAPONS, ITEM_NAMES, MATERIALS, STAR_STATS, BRACKET, BRACKET_POWER_OFFSET, JOBS, JOB_ARMOR_SLOTS, CLASS_ARMOR_CHANCE, OWN_JOB_CHANCE } from './data/items.js';
import { POTENTIALS, POTENTIAL_LINES, CUBES } from './data/potentials.js';
import { SETS, DROP_SETS } from './data/sets.js';
import {
  STAR_SUCCESS, STAR_DESTROY, STAR_SAFE_FLOORS, STAR_DROP_FROM, CHANCE_TIME_AFTER, SAFEGUARD_FROM, SAFEGUARD_TO,
  SAFEGUARD_COST_MUL, DESTROYED_STARS, REPAIR_COST_MUL, MAX_STARS, starMultiplier, starCostFactor,
} from './data/starforce.js';

export const LEGENDARY = RARITIES.length - 1;

export class Item {
  static #nextId = Date.now() % 100000;

  // Keep new ids clear of ids already in a loaded save.
  static reserveIds(items) { for (const it of items) if (it && it.id >= Item.#nextId) Item.#nextId = it.id; }

  // Loads current saves and saves from before Star Force (enh + aff), which get fresh potential lines.
  static fromJSON(data) {
    if (data instanceof Item) return data;
    const it = Object.assign(new Item(), data);
    if (it.stars === undefined) it.stars = Math.min(it.enh || 0, it.maxStars);
    if (!it.pot) it.pot = Item.rollLines(it.slot, it.rar, CUBES.red);
    if (!it.pity) it.pity = { red: 0, black: 0 };
    delete it.enh; delete it.aff;
    return it;
  }

  // Gear drops in level brackets: floors 1-9 give level 1 gear, floors 10-19 level 10, and so on.
  static levelFor(floor) { return Math.max(1, Math.floor(floor / BRACKET) * BRACKET); }

  // Weighted rarity roll. mf is % item rarity; boost multiplies every non-normal weight (elites, bosses).
  static rollRarity(mf, boost) {
    const m = 1 + mf / 100;
    const weights = RARITIES.map((r, i) => r.weight * (i === 0 ? 1 : Math.pow(m, i)) * (i ? boost : 1));
    let t = rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) { t -= weights[i]; if (t <= 0) return i; }
    return 0;
  }

  // Potential lines for a tier. The first line has the full tier; later lines only with the cube's prime chance.
  static rollLines(slot, tier, cube) {
    if (!tier) return [];
    const lines = [];
    for (let i = 0; i < POTENTIAL_LINES; i++) {
      const t = i === 0 || rand() < cube.prime[i] ? tier : tier - 1;
      const pool = Object.keys(POTENTIALS).filter(k => POTENTIALS[k].slots.includes(slot) && t >= (POTENTIALS[k].minTier || 0));
      lines.push({ k: pick(pool), t });
    }
    return lines;
  }

  // A random drop. Weapons and most armor are class gear, usually for playerJob (the dropper's job branch, or null).
  static generateDrop(ilvl, rarityIdx, playerJob) {
    const slot = pick(SLOTS);
    if (slot !== 'weapon' && !(JOB_ARMOR_SLOTS.includes(slot) && rand() < CLASS_ARMOR_CHANCE)) return Item.generate(ilvl, rarityIdx, slot);
    const job = playerJob && rand() < OWN_JOB_CHANCE ? playerJob : pick(Object.keys(JOBS));
    const wtype = slot === 'weapon' ? pick(Object.keys(WEAPONS).filter(w => WEAPONS[w].job === job)) : undefined;
    return Item.generate(ilvl, rarityIdx, slot, wtype, job);
  }

  // job: makes helm/armor/gloves/boots class armor. A weapon's job always comes from its type.
  static generate(ilvl, rarityIdx, slot, weaponType, job) {
    slot = slot || pick(SLOTS);
    const it = Object.assign(new Item(), {
      id: ++Item.#nextId, slot, ilvl, rar: rarityIdx, stars: 0, base: {}, pot: [], lock: false, pity: { red: 0, black: 0 },
    });
    const pl = it.powerLevel;
    const s = gearPower(pl);
    const lin = 3 + 1.5 * pl;
    const material = MATERIALS[Math.min(MATERIALS.length - 1, Math.floor(ilvl / BRACKET))];
    const b = it.base;
    if (slot === 'weapon') {
      const type = weaponType || pick(Object.keys(WEAPONS)); const w = WEAPONS[type];
      it.wtype = type;
      if (w.atk) b.atk = 12 * s * w.atk;
      if (w.matk) b.matk = 12 * s * w.matk;
      if (w.crit) b.crit = w.crit;
      if (w.critdmg) b.critdmg = w.critdmg;
      if (w.mp) b.mp = w.mp + pl;
      if (w.acc) b.acc = w.acc + pl;
      it.name = `${material} ${type}`;
      it.job = w.job;
    } else {
      if (slot === 'helm') { b.hp = 25 * s; b.mres = lin * 1.2; }
      if (slot === 'armor') { b.hp = 45 * s; b.def = lin * 1.6; b.mres = lin * 0.4; }
      if (slot === 'gloves') { b.atk = 3 * s; b.matk = 3 * s; b.def = lin * 0.4; }
      if (slot === 'boots') { b.spd = 4; b.def = lin * 0.6; b.eva = lin; }
      if (slot === 'ring') { if (rand() < 0.5) b.crit = 3; else b.critdmg = 12; b.hp = 10 * s; }
      if (slot === 'amulet') { b.hp = 20 * s; b.mp = 10 + pl; b.mres = lin * 0.5; }
      it.name = `${material} ${pick(ITEM_NAMES[slot])}`;
      if (job && JOB_ARMOR_SLOTS.includes(slot)) {
        const J = JOBS[job];
        it.job = job;
        b[J.main] = Math.round(2 + 0.2 * pl);
        b[J.sub] = Math.round(1 + 0.1 * pl);
        it.name = `${material} ${J.names[slot]}`;
      }
    }
    it.pot = Item.rollLines(slot, rarityIdx, CUBES.red);
    return it;
  }

  // A piece of a set (by default a random non-boss set): the slot and weapon type come from the set,
  // and the set name replaces the material.
  static generateSetPiece(ilvl, rarityIdx, setId = pick(DROP_SETS)) {
    const set = SETS[setId], slot = pick(set.slots);
    const it = Item.generate(ilvl, rarityIdx, slot, slot === 'weapon' ? pick(set.weapons) : undefined, set.job);
    it.set = setId;
    it.name = `${set.name} ${it.name.split(' ').slice(1).join(' ')}`;
    return it;
  }

  get rarity() { return RARITIES[this.rar]; }
  get setDef() { return this.set ? SETS[this.set] : null; }
  get weapon() { return this.wtype ? WEAPONS[this.wtype] : null; }
  get jobDef() { return this.job ? JOBS[this.job] : null; }
  get displayName() { return this.stars ? `${this.name} ★${this.stars}` : this.name; }
  // The floor this item's stats are worth.
  get powerLevel() { return this.ilvl + BRACKET_POWER_OFFSET; }

  // [{ k, t, value }] for display and stats.
  get lines() { return Item.#lineValues(this.pot, this.powerLevel); }
  get pendingLines() { return this.pending ? Item.#lineValues(this.pending.pot, this.powerLevel) : null; }
  static #lineValues(pot, pl) { return pot.map(l => ({ ...l, value: POTENTIALS[l.k].value(l.t, pl) })); }

  // Stats this item gives. Stars scale base stats only, never potential. A destroyed item gives nothing.
  get stats() {
    const out = {};
    if (this.broken) return out;
    const m = starMultiplier(this.stars);
    for (const k in this.base) out[k] = (out[k] || 0) + this.base[k] * (STAR_STATS.includes(k) ? m : 1);
    for (const l of this.lines) out[l.k] = (out[l.k] || 0) + l.value;
    return out;
  }

  get sellValue() { return Math.round(6 * gearPower(this.powerLevel) * (1 + this.rar) * (1 + this.stars / 5)); }
  get salvageValue() { return this.rarity.salvage + Math.floor(this.stars * this.stars / 3); }

  // ---- Star Force ----
  static starMultiplier(s) { return starMultiplier(s); }
  get maxStars() { return MAX_STARS.find(([lvl]) => this.ilvl >= lvl)[1]; }
  get canStar() { return !this.broken && this.stars < this.maxStars; }
  get chanceTime() { return this.boomStreak >= CHANCE_TIME_AFTER; }
  get canSafeguard() { return this.stars >= SAFEGUARD_FROM && this.stars <= SAFEGUARD_TO && STAR_DESTROY[this.stars] > 0 && !this.chanceTime; }
  // { success, destroy, drop } for the next attempt. drop: whether a failure loses a star.
  starOdds(safeguard = false) {
    const s = this.stars;
    if (this.chanceTime) return { success: 1, destroy: 0, drop: false };
    return {
      success: STAR_SUCCESS[s],
      destroy: safeguard && this.canSafeguard ? 0 : STAR_DESTROY[s],
      drop: s >= STAR_DROP_FROM && !STAR_SAFE_FLOORS.includes(s),
    };
  }
  starCost(safeguard = false) {
    const gold = Math.round(starCostFactor(this.stars) * gearPower(this.powerLevel));
    return safeguard && this.canSafeguard ? gold * SAFEGUARD_COST_MUL : gold;
  }
  get repairCost() { return Math.round(REPAIR_COST_MUL * starCostFactor(DESTROYED_STARS) * gearPower(this.powerLevel)); }

  // Roll one attempt (cost already paid). Returns 'up' | 'keep' | 'down' | 'destroy'.
  rollStar(safeguard = false) {
    const o = this.starOdds(safeguard);
    const r = rand();
    if (r < o.success) { this.stars++; this.boomStreak = 0; return 'up'; }
    if (r < o.success + o.destroy) { this.broken = true; this.stars = DESTROYED_STARS; this.boomStreak = 0; return 'destroy'; }
    if (o.drop) { this.stars--; this.boomStreak = (this.boomStreak || 0) + 1; return 'down'; }
    this.boomStreak = 0;
    return 'keep';
  }

  repair() { this.broken = false; }

  // ---- Cubes ----
  get canCube() { return !this.pending; }
  cubePity(type) { return this.pity[type] || 0; }
  // Chance this cube moves the item up a tier (1 once pity is reached).
  tierUpChance(type) {
    const c = CUBES[type];
    if (this.rar >= LEGENDARY) return 0;
    return this.cubePity(type) + 1 >= c.pity[this.rar] ? 1 : c.tierUp[this.rar];
  }

  // Roll a cube (already paid for). A Red Cube applies at once; a Black Cube stores the result in `pending`.
  // Returns { tierUp }.
  rollCube(type) {
    const c = CUBES[type];
    const up = rand() < this.tierUpChance(type);
    const result = { rar: up ? this.rar + 1 : this.rar, pot: [], type };
    result.pot = Item.rollLines(this.slot, result.rar, c);
    if (c.choose) this.pending = result;
    else this.#applyCube(result);
    if (!up) this.pity[type] = this.cubePity(type) + 1;
    return { tierUp: up };
  }

  // Keep or discard a Black Cube result. Discarding a tier-up loses it, as in MapleStory.
  resolvePending(keepNew) {
    const res = this.pending;
    if (!res) return false;
    delete this.pending;
    if (keepNew) this.#applyCube(res);
    else if (res.rar > this.rar) this.pity[res.type] = this.cubePity(res.type) + 1;
    return true;
  }

  #applyCube({ rar, pot }) {
    if (rar > this.rar) this.pity = { red: 0, black: 0 };
    this.rar = rar; this.pot = pot;
  }

  toJSON() { return { ...this }; }
}
