// A piece of equipment. Plain fields (id, slot, ilvl, rar, enh, base, aff, lock, wtype, name) are the save format.
import { gearPower } from './curves.js';
import { rand, pick } from './util.js';
import { SLOTS, RARITIES, WEAPONS, ITEM_NAMES, MATERIALS, AFFIXES, ENHANCE_MAX, ENHANCE_RATES, ENHANCE_DROP_FROM, ENHANCED_STATS } from './data/items.js';

const AFFIX_KEYS = Object.keys(AFFIXES);

export class Item {
  static #nextId = Date.now() % 100000;

  // Keep new ids clear of ids already in a loaded save.
  static reserveIds(items) { for (const it of items) if (it && it.id >= Item.#nextId) Item.#nextId = it.id; }

  static fromJSON(data) { return data instanceof Item ? data : Object.assign(new Item(), data); }

  // Weighted rarity roll. mf is % item rarity; boost multiplies every non-common weight (elites, bosses).
  static rollRarity(mf, boost) {
    const m = 1 + mf / 100;
    const weights = RARITIES.map((r, i) => r.weight * (i === 0 ? 1 : Math.pow(m, i)) * (i ? boost : 1));
    let t = rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) { t -= weights[i]; if (t <= 0) return i; }
    return 0;
  }

  static generate(ilvl, rarityIdx, slot, weaponType) {
    slot = slot || pick(SLOTS);
    const r = RARITIES[rarityIdx];
    const it = Object.assign(new Item(), { id: ++Item.#nextId, slot, ilvl, rar: rarityIdx, enh: 0, base: {}, aff: {}, lock: false });
    const s = gearPower(ilvl) * r.mul;
    const lin = (3 + 1.5 * ilvl) * r.mul;
    const material = MATERIALS[Math.min(MATERIALS.length - 1, Math.floor((ilvl - 1) / 8))];
    const b = it.base;
    if (slot === 'weapon') {
      const type = weaponType || pick(Object.keys(WEAPONS)); const w = WEAPONS[type];
      it.wtype = type;
      if (w.atk) b.atk = 12 * s * w.atk;
      if (w.matk) b.matk = 12 * s * w.matk;
      if (w.crit) b.crit = w.crit;
      if (w.critdmg) b.critdmg = w.critdmg;
      if (w.mp) b.mp = w.mp + ilvl;
      if (w.acc) b.acc = w.acc + ilvl;
      it.name = `${material} ${type}`;
    } else {
      if (slot === 'helm') { b.hp = 25 * s; b.mres = lin * 1.2; }
      if (slot === 'armor') { b.hp = 45 * s; b.def = lin * 1.6; b.mres = lin * 0.4; }
      if (slot === 'gloves') { b.atk = 3 * s; b.matk = 3 * s; b.def = lin * 0.4; }
      if (slot === 'boots') { b.spd = 4; b.def = lin * 0.6; b.eva = lin; }
      if (slot === 'ring') { if (rand() < 0.5) b.crit = 3; else b.critdmg = 12; b.hp = 10 * s; }
      if (slot === 'amulet') { b.hp = 20 * s; b.mp = 10 + ilvl; b.mres = lin * 0.5; }
      it.name = `${material} ${pick(ITEM_NAMES[slot])}`;
    }
    const keys = AFFIX_KEYS.slice();
    for (let i = 0; i < r.affixes; i++) {
      const k = keys.splice(Math.floor(rand() * keys.length), 1)[0];
      it.aff[k] = AFFIXES[k].value(ilvl, rand());
    }
    return it;
  }

  get rarity() { return RARITIES[this.rar]; }
  get weapon() { return this.wtype ? WEAPONS[this.wtype] : null; }
  get displayName() { return this.enh ? `${this.name} +${this.enh}` : this.name; }

  static enhanceMultiplier(n) { return 1 + 0.08 * n + 0.006 * n * n; }

  // Stats this item gives. Enhancement scales base stats only, never affixes.
  get stats() {
    const out = {}; const m = Item.enhanceMultiplier(this.enh);
    for (const k in this.base) out[k] = (out[k] || 0) + this.base[k] * (ENHANCED_STATS.includes(k) ? m : 1);
    for (const k in this.aff) out[k] = (out[k] || 0) + this.aff[k];
    return out;
  }

  get sellValue() { return Math.round(6 * gearPower(this.ilvl) * this.rarity.mul * (1 + this.rar)); }
  get salvageValue() { return this.rarity.salvage + Math.floor(this.enh * this.enh / 3); }

  get canEnhance() { return this.enh < ENHANCE_MAX; }
  get enhanceChance() { return this.canEnhance ? ENHANCE_RATES[this.enh] : 0; }
  get enhanceCost() {
    const n = this.enh;
    return { gold: Math.round(25 * gearPower(this.ilvl) * Math.pow(n + 1, 1.35)), shards: n + 1 + Math.floor(n * n / 6) };
  }
  get enhanceRisky() { return this.enh >= ENHANCE_DROP_FROM; }

  // Roll one enhancement attempt (cost already paid). Returns 'up' | 'down' | 'same'.
  rollEnhance() {
    if (rand() < ENHANCE_RATES[this.enh]) { this.enh++; return 'up'; }
    if (this.enhanceRisky) { this.enh--; return 'down'; }
    return 'same';
  }

  toJSON() { return { ...this }; }
}
