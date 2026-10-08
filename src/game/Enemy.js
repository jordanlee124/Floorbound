// A single enemy. Stats scale with the floor; archetype and boss/elite status shape them.
import { enemyPower, gearPower, isBossFloor } from './curves.js';
import { rand, pick } from './util.js';
import { ARCHETYPES, ZONES } from './data/enemies.js';
import { BOSS_HP, BOSS_ATK, BOSS_ENRAGE, DIFFICULTIES } from './data/bosses.js';

export class Zone {
  // The zone a floor belongs to. Zones repeat as "Abyssal" versions after the last one.
  static forFloor(f) {
    const zi = Math.floor((f - 1) / 10);
    const def = ZONES[zi % ZONES.length];
    const cycle = Math.floor(zi / ZONES.length);
    return new Zone(def, cycle);
  }

  constructor(def, cycle) {
    this.def = def;
    this.cycle = cycle;
    this.name = cycle ? `Abyssal ${def.name} ${'I'.repeat(Math.min(cycle, 3))}${cycle > 3 ? '+' : ''}` : def.name;
  }
}

export class Enemy {
  static spawn(floor) {
    const zone = Zone.forFloor(floor);
    const boss = isBossFloor(floor);
    const [name, arch] = boss ? zone.def.boss : pick(zone.def.mobs);
    const elite = !boss && rand() < 0.06;
    return new Enemy({ floor, name, arch, boss, elite, cycle: zone.cycle });
  }

  // A boss raid (see data/bosses.js): a boss fought at its difficulty's floor power, with phases and a later enrage.
  static raid(def, diff) {
    const f = def.modes[diff].floor, D = DIFFICULTIES[diff];
    const e = new Enemy({ floor: f, name: def.name, arch: def.arch, boss: true, elite: false, cycle: Zone.forFloor(f).cycle, mult: { hp: BOSS_HP, atk: BOSS_ATK } });
    e.raid = { id: def.id, diff };
    e.enrageAt = BOSS_ENRAGE;
    e.phases = def.phases.map(ph => ({ ...ph, done: false }));
    e.exp = Math.round(6 * Math.pow(1.105, f - 1) * (1 + 0.04 * f) * D.exp);
    e.gold = 3 * gearPower(f) * D.crystal;
    return e;
  }

  constructor({ floor, name, arch, boss, elite, cycle, mult }) {
    const A = ARCHETYPES[arch];
    const s = enemyPower(floor);
    const m = mult ? { ...mult } : boss ? { hp: 9, atk: 1.5 } : elite ? { hp: 3, atk: 1.4 } : { hp: 1, atk: 1 };
    const early = floor < 6 ? 0.5 + 0.1 * floor : 1; // gentle first floors
    m.hp *= early; m.atk *= early;
    const extraRes = Math.min(0.12, floor * 0.0015 + cycle * 0.03);

    this.f = floor;
    this.name = (elite ? 'Elite ' : '') + (cycle && !boss ? 'Abyssal ' : '') + name;
    this.arch = arch;
    this.tag = A.tag;
    this.boss = boss;
    this.elite = elite;
    this.maxhp = 90 * s * (1 + 0.06 * (floor - 1)) * A.hp * m.hp;
    this.hp = this.maxhp;
    this.atk = 10 * s * (1 + 0.045 * (floor - 1)) * A.atk * m.atk;
    this.spd = 100 * A.spd * (boss ? 0.95 : 1);
    this.pr = Math.min(0.85, A.pr + extraRes); // physical reduction
    this.mr = Math.min(0.85, A.mr + extraRes); // magic reduction
    this.eva = A.eva;
    this.dmg = A.dmg;
    this.exp = Math.round(6 * Math.pow(1.105, floor - 1) * (1 + 0.04 * floor) * (boss ? 12 : elite ? 3 : 1));
    this.gold = 3 * gearPower(floor) * (boss ? 15 : elite ? 4 : 1);
  }

  get alive() { return this.hp > 0; }
  get hpFraction() { return this.hp / this.maxhp; }
  get dropChance() { return this.boss ? 1 : this.elite ? 0.8 : 0.22; }
  get dropCount() { return this.boss ? 2 : 1; }
  get rarityBoost() { return this.boss ? 3 : this.elite ? 2 : 1; }
}
