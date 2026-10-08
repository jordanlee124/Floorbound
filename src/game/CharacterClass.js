// A playable class. Classes form a tree: novice -> 1st job -> 2nd job -> 3rd job -> 4th job.
import { CLASS_DEFS, CLASS_UNLOCK_LEVEL, JOB_NAMES } from './data/classes.js';

export class CharacterClass {
  static #all = new Map(Object.entries(CLASS_DEFS).map(([id, d]) => [id, new CharacterClass(id, d)]));
  static get(id) { return CharacterClass.#all.get(id); }

  constructor(id, def) {
    this.id = id;
    this.name = def.name;
    this.tier = def.tier;
    this.parentId = def.parent || null;
    this.growth = def.growth;
    this.hpMul = def.hpMul;
    this.mpMul = def.mpMul;
    this.skillIds = def.skills;
    this.nextIds = def.next;
    this.desc = def.desc;
  }

  get jobName() { return JOB_NAMES[this.tier]; }
  get parent() { return this.parentId ? CharacterClass.get(this.parentId) : null; }
  get next() { return this.nextIds.map(id => CharacterClass.get(id)); }
  // Level at which this class becomes available.
  get unlockLevel() { return CharacterClass.unlockLevel(this.tier); }
  static unlockLevel(tier) { return tier === 0 ? 1 : CLASS_UNLOCK_LEVEL[tier]; }
  // Level at which the next tier can be chosen, or null at the end of the tree.
  get advanceLevel() { return this.nextIds.length ? CLASS_UNLOCK_LEVEL[this.tier + 1] : null; }

  // This class and all its ancestors, root first.
  get lineage() {
    const out = [];
    for (let c = this; c; c = c.parent) out.unshift(c);
    return out;
  }
  // Every skill this class can learn, including inherited ones.
  get allSkillIds() { return this.lineage.flatMap(c => c.skillIds); }
}
