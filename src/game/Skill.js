// Skills. Actives fire in combat when off cooldown; passives modify stat sums while learned.

export class Skill {
  static #registry = new Map();

  static register(skill) { Skill.#registry.set(skill.id, skill); return skill; }
  static get(id) { return Skill.#registry.get(id); }

  constructor(id, { name, max = 10, describe }) {
    this.id = id;
    this.name = name;
    this.maxRank = max;
    this.describeRank = describe;
  }

  get type() { return 'skill'; }
  get isActive() { return false; }
  describe(rank) { return this.describeRank(rank); }
}

export class ActiveSkill extends Skill {
  constructor(id, { cooldown, mpCost, cast, ...rest }) {
    super(id, rest);
    this.cooldown = cooldown;
    this.mpCostFn = mpCost;
    this.castFn = cast;
  }

  get type() { return 'active'; }
  get isActive() { return true; }
  manaCost(rank) { return this.mpCostFn(rank); }
  // ctx is a SkillContext from Battle.js
  cast(ctx, rank) { return this.castFn(ctx, rank); }
}

export class PassiveSkill extends Skill {
  constructor(id, { apply, ...rest }) {
    super(id, rest);
    this.applyFn = apply;
  }

  get type() { return 'passive'; }
  // mods is the stat-sum object built in Player.combatStats()
  apply(mods, rank) { this.applyFn(mods, rank); }
}
