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

// A 5th job upgrade to attacks you already have: more damage and a shorter cooldown for each target skill.
// It writes into mods.skillDmg / mods.skillCd (skill id -> percent), which Battle reads when a skill fires.
export class BoostSkill extends PassiveSkill {
  constructor(id, { targets, dmg, cd, ...rest }) {
    super(id, {
      ...rest,
      describe: r => `${targets.map(t => Skill.get(t).name).join(', ')}: +${dmg * r}% damage, ${+(cd * r).toFixed(1)}% shorter cooldown.`,
      apply: (s, r) => { for (const t of targets) { s.skillDmg[t] = (s.skillDmg[t] || 0) + dmg * r; s.skillCd[t] = (s.skillCd[t] || 0) + cd * r; } },
    });
    this.targets = targets;
  }

  get type() { return 'boost'; }
}
