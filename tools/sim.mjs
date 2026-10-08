// Balance sim: bots with fixed builds fight, climb and gear up for N hours of game time.
// Usage: npm run sim -- [hours] [build,build] [--seed=N]
// With a seed the run is deterministic, which makes it a regression check for refactors.
const args = process.argv.slice(2);
const seedArg = args.find(a => a.startsWith('--seed='));
if (seedArg) {
  let seed = Number(seedArg.slice(7)) | 0;
  Math.random = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const { Game, Player, Skill, SLOTS, TICK } = await import('../src/game/index.js');
const [hoursArg, buildsArg] = args.filter(a => !a.startsWith('--'));

const BUILDS = {
  berserker: { path: ['warrior', 'berserker', 'reaver', 'warlord', 'doombringer'], ratio: { str: 3, vit: 1, dex: 1 }, skills: ['power_strike', 'cleave', 'bloodthirst', 'rampage', 'blood_frenzy', 'war_cry', 'iron_skin', 'second_wind', 'brutal_swing', 'enrage', 'blood_pact', 'savage_blows', 'raging_blow', 'berserk_mastery', 'unbreakable', 'raging_blow_boost', 'endless_wrath', 'rampage_boost', 'titans_will'], kind: 'phys' },
  paladin: { path: ['warrior', 'paladin', 'templar', 'lightbringer', 'seraph'], ratio: { str: 2, vit: 2 }, skills: ['power_strike', 'cleave', 'holy_strike', 'iron_skin', 'retribution', 'divine_shield', 'second_wind', 'war_cry', 'blessed_hammer', 'zeal', 'sanctuary', 'aegis', 'judgment', 'divine_aura', 'guardian', 'judgment_boost', 'radiance', 'holy_bastion', 'holy_strike_boost'], kind: 'phys' },
  assassin: { path: ['rogue', 'assassin', 'nightblade', 'shadowlord', 'wraith'], ratio: { dex: 3, luk: 1, str: 1 }, skills: ['power_strike', 'twin_strike', 'assassinate', 'exploit', 'lethality', 'poison_blade', 'execute', 'evasion', 'shadow_flurry', 'vital_strike', 'venom', 'smoke_veil', 'death_mark', 'killing_spree', 'phantom_step', 'death_mark_boost', 'shadow_sovereign', 'assassinate_boost', 'umbral_veil'], kind: 'phys' },
  ranger: { path: ['rogue', 'ranger', 'sharpshooter', 'stormbow', 'tempest'], ratio: { dex: 2, luk: 1, str: 1, vit: 1 }, skills: ['power_strike', 'twin_strike', 'volley', 'quick_draw', 'lethality', 'poison_blade', 'snare', 'evasion', 'piercing_arrow', 'focus', 'eagle_eye', 'hunters_mark', 'arrow_storm', 'wind_mastery', 'deadeye', 'arrow_storm_boost', 'storms_eye', 'volley_boost', 'gale_force'], kind: 'phys' },
  pyro: { path: ['mage', 'pyromancer', 'infernalist', 'archmage', 'pyrarch'], ratio: { int: 3, vit: 1 }, skills: ['power_strike', 'fireball', 'meteor', 'ignite', 'arcane_mind', 'combustion', 'frost_nova', 'mana_shield', 'flame_pillar', 'fire_mastery', 'inferno', 'spell_amp', 'cataclysm', 'elemental_mastery', 'arcane_overload', 'cataclysm_boost', 'sunfire', 'meteor_boost', 'ember_ward'], kind: 'magic' },
  necro: { path: ['mage', 'necromancer', 'deathcaller', 'lich', 'deathlord'], ratio: { int: 2, vit: 2 }, skills: ['power_strike', 'fireball', 'life_drain', 'raise_skeleton', 'curse', 'arcane_mind', 'mana_shield', 'frost_nova', 'bone_spear', 'dark_pact', 'soul_siphon', 'plague', 'army_of_dead', 'death_mastery', 'phylactery', 'army_boost', 'soul_harvest', 'drain_boost', 'bone_armor'], kind: 'magic' },
  // Deliberately one-dimensional builds, to check that dumping one stat is not the best plan.
  allstr_warrior: { path: ['warrior', 'berserker', 'reaver', 'warlord', 'doombringer'], ratio: { str: 1 }, skills: ['power_strike', 'cleave', 'rampage', 'bloodthirst', 'blood_frenzy', 'war_cry', 'brutal_swing', 'enrage', 'blood_pact', 'raging_blow', 'berserk_mastery', 'raging_blow_boost', 'endless_wrath', 'rampage_boost'], kind: 'phys' },
  allvit_paladin: { path: ['warrior', 'paladin', 'templar', 'lightbringer', 'seraph'], ratio: { vit: 1 }, skills: ['power_strike', 'cleave', 'holy_strike', 'iron_skin', 'retribution', 'divine_shield', 'blessed_hammer', 'zeal', 'aegis', 'judgment', 'guardian', 'judgment_boost', 'holy_bastion', 'radiance'], kind: 'phys' },
};

const STAR_TARGET = 22; // bots stop here; 22 to 25 costs far more than it gives

class Bot {
  constructor(build) { this.build = build; }

  score(p, equip) {
    const st = p.combatStats(p.floor, equip), kind = this.build.kind;
    const off = (kind === 'magic' ? st.matk : st.atk) * (st.spd / 100) * (1 + st.crit / 100 * (st.critdmg - 100) / 100) * ((kind === 'magic') === (st.basic === 'magic') ? 1 : 0.6);
    const def = st.hp / (1 - (st.physRed + st.magRed) / 2);
    return off * Math.sqrt(def);
  }

  manage(p) {
    const B = this.build;
    const adv = p.advancement;
    if (adv && adv.ready) p.advanceTo(B.path[p.characterClass.tier]);
    const total = Object.values(B.ratio).reduce((x, y) => x + y, 0);
    while (p.statPts > 0) {
      const spent = Object.keys(B.ratio).reduce((s, k) => s + p.alloc[k], 0) + 1;
      let best = null, bd = -1;
      for (const k in B.ratio) { const d = B.ratio[k] / total - p.alloc[k] / spent; if (d > bd) { bd = d; best = k; } }
      p.allocate(best, 1);
    }
    for (let guard = 0; guard < 500; guard++) {
      const id = B.skills.find(id => p.canLearn(id));
      if (!id) break;
      p.learnSkill(id);
    }
    // Rotation: newest job's actives first, Power Strike only as filler.
    const tier = id => p.skillClass(id).tier;
    const actives = B.skills.filter(id => Skill.get(id).isActive && p.skillRank(id)).sort((a, b) => tier(b) - tier(a));
    const classActives = actives.filter(x => x !== 'power_strike');
    p.loadout = (classActives.length >= 2 ? classActives : actives).slice(0, p.rotationSize);
    for (const it of p.inv.slice()) {
      const eq = { ...p.equip, [it.slot]: it };
      if (this.score(p, eq) > this.score(p, p.equip) * 1.001) p.equipItem(it.id);
    }
    for (const it of p.inv.slice()) p.salvage(it.id);
    const equipped = () => SLOTS.map(s => p.equip[s]).filter(Boolean);
    // Cubes: shards buy Red Cubes. Cube the lowest-tier item (weapon first); keep a Black Cube result only if it scores higher.
    while (p.buyCube('red')) {}
    for (const type of ['black', 'red']) {
      for (let k = 0; k < 200 && p.cubes[type] > 0; k++) {
        const it = equipped().sort((x, y) => (x.rar - (x.slot === 'weapon' ? 0.5 : 0)) - (y.rar - (y.slot === 'weapon' ? 0.5 : 0)))[0];
        if (!it) break;
        const before = this.score(p, p.equip);
        p.useCube(it.id, type);
        if (it.pending) { const keep = { ...p.equip, [it.slot]: Object.assign(Object.create(Object.getPrototypeOf(it)), it, { rar: it.pending.rar, pot: it.pending.pot, pending: undefined }) }; it.resolvePending(this.score(p, keep) > before || it.pending.rar > it.rar); }
      }
    }
    // Star Force: repair, then push the lowest-star item (weapon first), keeping a gold reserve and safeguarding 12-16.
    for (const it of equipped()) if (it.broken) p.repair(it.id);
    for (let k = 0; k < 60; k++) {
      const it = equipped().filter(x => x.canStar && x.stars < STAR_TARGET).sort((x, y) => (x.stars - (x.slot === 'weapon' ? 2 : 0)) - (y.stars - (y.slot === 'weapon' ? 2 : 0)))[0];
      if (!it) break;
      const guard = it.canSafeguard && p.gold >= it.starCost(true) * 3;
      if (p.gold < it.starCost(guard) * 3 || !p.starForce(it.id, guard).ok) break;
    }
  }
}

function run(name, hours) {
  const bot = new Bot(BUILDS[name]);
  const p = Player.create(); p.autoClimb = true;
  const game = new Game(p);
  const byArch = {}, checkpoints = [];
  let t = 0, rest = 0, lastManaged = 0, nextCheckpoint = 3600, battle = game.newBattle();
  while (t < hours * 3600) {
    if (rest > 0) { rest -= TICK; t += TICK; continue; }
    const r = battle.tick(); t += TICK;
    if (r) {
      const e = battle.enemy;
      if (!e.boss) { const A = (byArch[e.arch] ||= { t: 0, n: 0, d: 0 }); A.t += battle.time; A.n++; if (r === 'lose') A.d++; }
      game.finishBattle(battle);
      rest = (r === 'lose' ? 3 : rest) + 0.5; // pause between fights; longer after a death
      if (t - lastManaged > 30) { bot.manage(p); lastManaged = t; }
      battle = game.newBattle();
    }
    if (t >= nextCheckpoint) { checkpoints.push(`${nextCheckpoint / 3600}h L${p.lvl} F${p.maxFloor} d${p.stats.deaths}`); if (process.env.SIMDBG) console.log('  ', checkpoints.at(-1), SLOTS.map(s => p.equip[s] ? `${s[0]}${p.equip[s].ilvl}★${p.equip[s].stars}r${p.equip[s].rar}${p.equip[s].broken ? 'X' : ''}` : '-').join(' '), 'gold', Math.round(p.gold), 'cubes', p.cubes.red, p.cubes.black); nextCheckpoint += 3600; }
  }
  if (checkpoints.length < hours) checkpoints.push(`${hours}h L${p.lvl} F${p.maxFloor} d${p.stats.deaths}`); // float drift can skip the last one
  const arch = Object.entries(byArch).map(([k, v]) => `${k}:${(v.t / v.n).toFixed(1)}s/${(100 * v.d / v.n).toFixed(1)}%`).join(' ');
  console.log(name.padEnd(15), checkpoints.slice(-1).join(''), arch);
}

const hours = Number(hoursArg) || 4;
for (const n of buildsArg ? buildsArg.split(',') : Object.keys(BUILDS)) run(n, hours);
