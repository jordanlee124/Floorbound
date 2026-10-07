// The player character: level, class, attributes, skills, gear and bag. Plain fields are the save format.
import { Item } from './Item.js';
import { CharacterClass } from './CharacterClass.js';
import { Skill } from './Skill.js';
import { expToLevel, POINTS_PER_LEVEL } from './curves.js';
import { clamp } from './util.js';
import { SLOTS, WEAPONS } from './data/items.js';
import './data/skills.js';

export const ATTRS = ['str', 'dex', 'int', 'vit', 'luk'];
export const ATTR_INFO = {
  str: 'Strength: +1.2% Attack per point',
  dex: 'Dexterity: +0.4% speed, +0.15% crit, accuracy and evasion',
  int: 'Intelligence: +1.4% Magic, +2 MP per point',
  vit: 'Vitality: +1.5% HP and +0.6 Defense per point',
  luk: 'Luck: +0.2% crit, +0.6% crit damage, +0.6% item rarity and gold',
};
export const BAG_SIZE = 60;
export const ROTATION_SIZE = 3;

// Every stat sum gear and passives can add to. Passive skills write into a copy of this.
const EMPTY_MODS = { atk: 0, matk: 0, hp: 0, def: 0, mres: 0, atkp: 0, matkp: 0, hpp: 0, mpp: 0, crit: 0, critdmg: 0, spd: 0,
  ls: 0, pen: 0, eva: 0, acc: 0, accp: 0, mp: 0, mf: 0, gf: 0, defp: 0, str: 0, dex: 0, int: 0, vit: 0, luk: 0,
  hpRegen: 0, frenzy: 0, reflect: 0, dodgeFlat: 0, execute: 0, ignite: 0, spellCrit: 0, manaShield: 0, vuln: 0, weaken: 0 };

export class Player {
  static create() {
    const p = new Player();
    p.equip.weapon = Item.generate(1, 0, 'weapon', 'Sword');
    p.equip.armor = Item.generate(1, 0, 'armor');
    p.skills.power_strike = 1;
    return p;
  }

  // Accepts any older save; missing fields fall back to defaults.
  static fromJSON(data) {
    const p = Object.assign(new Player(), data);
    p.alloc = { ...new Player().alloc, ...(data.alloc || {}) };
    p.stats = { ...new Player().stats, ...(data.stats || {}) };
    p.inv = (data.inv || []).map(Item.fromJSON);
    p.equip = {};
    for (const s of SLOTS) if (data.equip && data.equip[s]) p.equip[s] = Item.fromJSON(data.equip[s]);
    Item.reserveIds([...p.inv, ...Object.values(p.equip)]);
    if (!CharacterClass.get(p.cls)) p.cls = 'novice';
    return p;
  }

  constructor() {
    this.v = 1;
    this.name = 'Climber';
    this.cls = 'novice';
    this.lvl = 1;
    this.exp = 0;
    this.alloc = { str: 0, dex: 0, int: 0, vit: 0, luk: 0 };
    this.statPts = 0;
    this.skills = {};
    this.skillPts = 0;
    this.loadout = ['power_strike'];
    this.equip = {};
    this.inv = [];
    this.gold = 0;
    this.shards = 0;
    this.floor = 1;
    this.maxFloor = 1;
    this.floorKills = 0;
    this.autoClimb = false; // only the balance sim turns this on; players move floors by hand
    this.autoSalvage = 0; // salvage drops below this rarity index (0 = off)
    this.lootPopupMin = 1; // show the drop popup for this rarity index and above (5 = never)
    this.stats = { kills: 0, deaths: 0, bosses: 0, best: 0 };
  }

  toJSON() { return { ...this }; }

  // ---- Class & attributes ----
  get characterClass() { return CharacterClass.get(this.cls); }
  get expToNext() { return expToLevel(this.lvl); }

  // Base attributes: 5 each, plus class growth for the levels spent in each class of the lineage, plus spent points.
  get attributes() {
    const a = { str: 5, dex: 5, int: 5, vit: 5, luk: 5 };
    const lineage = this.characterClass.lineage;
    lineage.forEach((c, i) => {
      const next = lineage[i + 1];
      const to = next ? next.unlockLevel : this.lvl;
      const levels = Math.max(0, Math.min(this.lvl, to) - c.unlockLevel);
      for (const k in c.growth) a[k] += c.growth[k] * levels;
    });
    for (const k of ATTRS) a[k] += this.alloc[k];
    return a;
  }

  // Returns how many levels were gained.
  gainExp(amount) {
    this.exp += amount;
    let ups = 0;
    while (this.exp >= expToLevel(this.lvl)) {
      this.exp -= expToLevel(this.lvl); this.lvl++; ups++;
      this.statPts += POINTS_PER_LEVEL; this.skillPts += 1;
    }
    return ups;
  }

  allocate(attr, n) {
    n = Math.min(n, this.statPts);
    if (!ATTRS.includes(attr) || n <= 0) return false;
    this.alloc[attr] += n; this.statPts -= n;
    return true;
  }

  get respecCost() { return this.lvl < 10 ? 0 : Math.round(25 * this.lvl * this.lvl); }
  #payRespec() { const c = this.respecCost; if (this.gold < c) return false; this.gold -= c; return true; }
  resetAttributes() {
    if (!this.#payRespec()) return false;
    for (const k of ATTRS) { this.statPts += this.alloc[k]; this.alloc[k] = 0; }
    return true;
  }

  // { level, ready, options: CharacterClass[] } or null at the end of the tree.
  get advancement() {
    const c = this.characterClass;
    if (!c.advanceLevel) return null;
    return { level: c.advanceLevel, ready: this.lvl >= c.advanceLevel, options: c.next };
  }
  advanceTo(classId) {
    const a = this.advancement;
    if (!a || !a.ready || !a.options.some(c => c.id === classId)) return false;
    this.cls = classId;
    return true;
  }

  // ---- Skills ----
  get knownSkillIds() { return this.characterClass.allSkillIds; }
  skillRank(id) { return this.skills[id] || 0; }

  learnSkill(id) {
    const sk = Skill.get(id);
    if (!sk || !this.knownSkillIds.includes(id)) return false;
    const r = this.skillRank(id);
    if (r >= sk.maxRank || this.skillPts < 1) return false;
    this.skills[id] = r + 1; this.skillPts--;
    if (sk.isActive && r === 0) this.addToRotation(id);
    return true;
  }
  resetSkills() {
    if (!this.#payRespec()) return false;
    for (const k in this.skills) this.skillPts += this.skills[k];
    this.skills = {}; this.loadout = [];
    return true;
  }

  addToRotation(id) {
    if (this.loadout.length >= ROTATION_SIZE || this.loadout.includes(id) || !this.skillRank(id)) return false;
    this.loadout.push(id); return true;
  }
  removeFromRotation(id) { this.loadout = this.loadout.filter(x => x !== id); }
  moveUpInRotation(id) {
    const i = this.loadout.indexOf(id);
    if (i > 0) [this.loadout[i - 1], this.loadout[i]] = [this.loadout[i], this.loadout[i - 1]];
  }

  // ---- Gear & bag ----
  get bagFull() { return this.inv.length >= BAG_SIZE; }
  findItem(id) { return this.inv.find(x => x.id === id) || SLOTS.map(s => this.equip[s]).find(x => x && x.id === id); }
  isEquipped(item) { return this.equip[item.slot] === item; }

  equipItem(id) {
    const i = this.inv.findIndex(x => x.id === id); if (i < 0) return null;
    const it = this.inv[i]; this.inv.splice(i, 1);
    if (this.equip[it.slot]) this.inv.push(this.equip[it.slot]);
    this.equip[it.slot] = it;
    return it;
  }
  unequip(slot) {
    if (!this.equip[slot] || this.bagFull) return false;
    this.inv.push(this.equip[slot]); delete this.equip[slot];
    return true;
  }
  #takeFromBag(id) {
    const i = this.inv.findIndex(x => x.id === id);
    if (i < 0 || this.inv[i].lock) return null;
    return this.inv.splice(i, 1)[0];
  }
  // Returns shards gained (0 if nothing happened).
  salvage(id) { const it = this.#takeFromBag(id); if (!it) return 0; this.shards += it.salvageValue; return it.salvageValue; }
  sell(id) { const it = this.#takeFromBag(id); if (!it) return 0; this.gold += it.sellValue; return it.sellValue; }
  salvageAll() {
    let count = 0, shards = 0;
    for (const it of this.inv.slice()) { const v = this.salvage(it.id); if (v) { count++; shards += v; } }
    return { count, shards };
  }
  toggleLock(id) { const it = this.findItem(id); if (it) it.lock = !it.lock; }

  // Pay for and roll one enhancement. Returns { ok, outcome?, item?, reason? }.
  enhance(id) {
    const it = this.findItem(id);
    if (!it || !it.canEnhance) return { ok: false, reason: 'Already at max.' };
    const c = it.enhanceCost;
    if (this.gold < c.gold || this.shards < c.shards) return { ok: false, reason: 'Not enough gold or shards.' };
    this.gold -= c.gold; this.shards -= c.shards;
    return { ok: true, outcome: it.rollEnhance(), item: it };
  }

  // ---- Combat stats ----
  // floor: defense and evasion are measured against the floor you fight on.
  // equipOverride: preview stats with different gear without changing anything.
  combatStats(floor = this.floor, equipOverride = null) {
    const eq = equipOverride || this.equip;
    const g = { ...EMPTY_MODS };
    for (const sl of SLOTS) { const it = eq[sl]; if (!it) continue; const is = it.stats; for (const k in is) g[k] = (g[k] || 0) + is[k]; }
    for (const id of this.knownSkillIds) {
      const r = this.skillRank(id); const sk = Skill.get(id);
      if (r && !sk.isActive) sk.apply(g, r);
    }
    const a = this.attributes;
    for (const k of ATTRS) a[k] += g[k];
    const c = this.characterClass;
    const w = eq.weapon ? WEAPONS[eq.weapon.wtype] : null;
    const st = { attrs: a };
    st.atk = (8 + g.atk) * (1 + a.str * 0.012 + g.atkp / 100);
    st.matk = (8 + g.matk) * (1 + a.int * 0.014 + g.matkp / 100);
    st.hp = (100 + 12 * this.lvl + g.hp) * (1 + a.vit * 0.015 + g.hpp / 100) * c.hpMul;
    st.mp = (40 + 3 * this.lvl + g.mp + a.int * 2) * (1 + g.mpp / 100) * c.mpMul;
    st.mpRegen = 1.5 + st.mp * 0.025;
    st.def = (g.def + a.vit * 0.6) * (1 + g.defp / 100);
    st.mres = g.mres + a.vit * 0.3 + a.int * 0.3;
    const K = 60 + 12 * floor;
    st.physRed = clamp(st.def / (st.def + K), 0, 0.8);
    st.magRed = clamp(st.mres / (st.mres + K), 0, 0.8);
    st.spd = Math.min(300, 100 * (1 + a.dex * 0.004 + g.spd / 100) * (w ? w.spd : 1));
    st.crit = clamp(5 + a.dex * 0.15 + a.luk * 0.2 + g.crit, 0, 80);
    st.spellCrit = g.spellCrit;
    st.critdmg = 150 + a.luk * 0.6 + g.critdmg;
    st.acc = (a.dex * 2 + g.acc + this.lvl * 2) * (1 + g.accp / 100);
    const eva = a.dex * 1 + g.eva;
    st.dodge = clamp(eva / (eva + 150 + 10 * floor), 0, 0.35) + g.dodgeFlat;
    st.ls = g.ls; st.pen = Math.min(80, g.pen);
    st.mf = a.luk * 0.6 + g.mf; st.gf = a.luk * 0.6 + g.gf;
    st.hpRegen = g.hpRegen; st.frenzy = g.frenzy; st.reflect = g.reflect; st.execute = g.execute;
    st.ignite = g.ignite; st.manaShield = Math.min(0.5, g.manaShield); st.vuln = g.vuln; st.weaken = Math.min(0.5, g.weaken);
    st.basic = w && w.kind === 'magic' ? 'magic' : 'phys';
    return st;
  }
}
