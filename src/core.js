// Core game logic. No DOM access, so it runs in the browser, the Android app and the Node balance sim.
const Core = (function () {
  const rnd = Math.random;
  const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
  const pick = a => a[Math.floor(rnd() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Power curve shared by enemies and loot, so gear found on floor N is "worth" floor N.
  const S = f => Math.pow(1.085, f - 1) * (1 + 0.03 * (f - 1));
  // Enemies outgrow gear a little each floor, plus a linear term that mirrors your stat-point growth.
  // The gap is what enhancement, rarity and smart builds have to cover.
  const E = f => Math.pow(1.105, f - 1) * (1 + 0.03 * (f - 1));

  const ATTRS = ['str', 'dex', 'int', 'vit', 'luk'];
  const ATTR_INFO = {
    str: 'Strength: +1.2% Attack per point',
    dex: 'Dexterity: +0.4% speed, +0.15% crit, accuracy and evasion',
    int: 'Intelligence: +1.4% Magic, +2 MP per point',
    vit: 'Vitality: +1.5% HP and +0.6 Defense per point',
    luk: 'Luck: +0.2% crit, +0.6% crit damage, +0.6% item rarity and gold',
  };
  const POINTS_PER_LEVEL = 4;

  // ---------- Classes ----------
  const CLASSES = {
    novice: { name: 'Novice', tier: 0, growth: { str: 1, dex: 1, int: 1, vit: 1 }, hpMul: 1, mpMul: 1,
      skills: ['power_strike'], next: ['warrior', 'rogue', 'mage'],
      desc: 'Everyone starts here. Choose a class at level 10.' },
    warrior: { name: 'Warrior', tier: 1, parent: 'novice', growth: { str: 2, vit: 1 }, hpMul: 1.15, mpMul: 0.9,
      skills: ['cleave', 'war_cry', 'iron_skin', 'second_wind'], next: ['berserker', 'paladin'],
      desc: 'Physical melee. Sturdy, steady damage. Struggles against heavily armored foes.' },
    rogue: { name: 'Rogue', tier: 1, parent: 'novice', growth: { dex: 2, luk: 1 }, hpMul: 0.95, mpMul: 1,
      skills: ['twin_strike', 'poison_blade', 'evasion', 'lethality'], next: ['assassin', 'ranger'],
      desc: 'Fast physical hits, crits and poison that ignores armor. Fragile.' },
    mage: { name: 'Mage', tier: 1, parent: 'novice', growth: { int: 2, vit: 1 }, hpMul: 0.9, mpMul: 1.3,
      skills: ['fireball', 'frost_nova', 'arcane_mind', 'mana_shield'], next: ['pyromancer', 'necromancer'],
      desc: 'Magic damage never misses and ignores armor, but spirits resist it and MP runs dry.' },
    berserker: { name: 'Berserker', tier: 2, parent: 'warrior', growth: { str: 3, vit: 1 }, hpMul: 1.15, mpMul: 0.9,
      skills: ['rampage', 'blood_frenzy', 'bloodthirst'], next: [],
      desc: 'Hits harder the closer to death. Heals by dealing damage.' },
    paladin: { name: 'Paladin', tier: 2, parent: 'warrior', growth: { str: 1, vit: 3 }, hpMul: 1.3, mpMul: 1,
      skills: ['holy_strike', 'divine_shield', 'retribution'], next: [],
      desc: 'Holy Strike deals magic damage scaled by HP. Slow killer, hard to kill.' },
    assassin: { name: 'Assassin', tier: 2, parent: 'rogue', growth: { dex: 3, luk: 1 }, hpMul: 0.95, mpMul: 1,
      skills: ['assassinate', 'exploit', 'execute'], next: [],
      desc: 'Burst and armor penetration. Shreds bosses, folds under sustained pressure.' },
    ranger: { name: 'Ranger', tier: 2, parent: 'rogue', growth: { dex: 2, luk: 2 }, hpMul: 1, mpMul: 1,
      skills: ['volley', 'snare', 'quick_draw'], next: [],
      desc: 'Attack speed and crowd control. Luck-heavy, so it finds more loot.' },
    pyromancer: { name: 'Pyromancer', tier: 2, parent: 'mage', growth: { int: 4 }, hpMul: 0.9, mpMul: 1.3,
      skills: ['meteor', 'ignite', 'combustion'], next: [],
      desc: 'Highest magic burst in the game. Thin HP and a hungry MP bar.' },
    necromancer: { name: 'Necromancer', tier: 2, parent: 'mage', growth: { int: 2, vit: 2 }, hpMul: 1.05, mpMul: 1.3,
      skills: ['raise_skeleton', 'life_drain', 'curse'], next: [],
      desc: 'Minion damage, life drain and curses. Durable, slower to kill.' },
  };
  const CLASS_LEVEL = { 1: 10, 2: 30 };
  function classChain(id) { const out = []; let c = id; while (c) { out.unshift(c); c = CLASSES[c].parent; } return out; }

  // ---------- Skills ----------
  // active: { cd, mp(r), use(ctx, r) }   passive: { mod(st, r) } applied to stat sums
  const pct = v => Math.round(v * 100) + '%';
  const SKILLS = {
    power_strike: { name: 'Power Strike', type: 'active', max: 5, cd: 5, mp: r => 4,
      desc: r => `Hit for ${pct(1.5 + 0.1 * r)} Attack.`,
      use: (c, r) => c.hit(1.5 + 0.1 * r, 'phys') },
    cleave: { name: 'Cleave', type: 'active', max: 10, cd: 5, mp: r => 8 + r,
      desc: r => `Hit for ${pct(1.8 + 0.15 * r)} Attack.`,
      use: (c, r) => c.hit(1.8 + 0.15 * r, 'phys') },
    war_cry: { name: 'War Cry', type: 'active', max: 10, cd: 20, mp: r => 12,
      desc: r => `+${pct(0.2 + 0.03 * r)} Attack for 8s.`,
      use: (c, r) => c.buff('war_cry', 8, { atkMul: 1.2 + 0.03 * r }) },
    iron_skin: { name: 'Iron Skin', type: 'passive', max: 10,
      desc: r => `+${5 * r}% Defense, +${3 * r}% HP.`,
      mod: (s, r) => { s.defp += 5 * r; s.hpp += 3 * r; } },
    second_wind: { name: 'Second Wind', type: 'passive', max: 10,
      desc: r => `Regenerate ${(0.3 * r).toFixed(1)}% max HP per second.`,
      mod: (s, r) => { s.hpRegen += 0.003 * r; } },
    rampage: { name: 'Rampage', type: 'active', max: 10, cd: 8, mp: r => 15 + r,
      desc: r => `3 hits of ${pct(0.8 + 0.08 * r)} Attack.`,
      use: (c, r) => { for (let i = 0; i < 3; i++) c.hit(0.8 + 0.08 * r, 'phys'); } },
    blood_frenzy: { name: 'Blood Frenzy', type: 'passive', max: 10,
      desc: r => `+${(0.5 * r).toFixed(1)}% damage for every 10% HP missing.`,
      mod: (s, r) => { s.frenzy += 0.005 * r; } },
    bloodthirst: { name: 'Bloodthirst', type: 'passive', max: 10,
      desc: r => `+${(0.6 * r).toFixed(1)}% lifesteal, +${1.5 * r}% Attack.`,
      mod: (s, r) => { s.ls += 0.6 * r; s.atkp += 1.5 * r; } },
    holy_strike: { name: 'Holy Strike', type: 'active', max: 10, cd: 6, mp: r => 12 + r,
      desc: r => `Magic hit for ${pct(1.4 + 0.12 * r)} Attack + ${(4 + 0.5 * r).toFixed(1)}% max HP.`,
      use: (c, r) => c.hitRaw(c.st.atk * (1.4 + 0.12 * r) + c.st.hp * (0.04 + 0.005 * r), 'magic') },
    divine_shield: { name: 'Divine Shield', type: 'active', max: 10, cd: 16, mp: r => 15,
      desc: r => `Shield for ${(12 + 1.5 * r).toFixed(1)}% max HP for 10s.`,
      use: (c, r) => c.shield(c.st.hp * (0.12 + 0.015 * r), 10) },
    retribution: { name: 'Retribution', type: 'passive', max: 10,
      desc: r => `Reflect ${6 * r}% of damage taken. +${3 * r}% Defense.`,
      mod: (s, r) => { s.reflect += 0.06 * r; s.defp += 3 * r; } },
    twin_strike: { name: 'Twin Strike', type: 'active', max: 10, cd: 4, mp: r => 6 + r,
      desc: r => `2 hits of ${pct(0.85 + 0.07 * r)} Attack.`,
      use: (c, r) => { c.hit(0.85 + 0.07 * r, 'phys'); c.hit(0.85 + 0.07 * r, 'phys'); } },
    poison_blade: { name: 'Poison Blade', type: 'active', max: 10, cd: 8, mp: r => 10,
      desc: r => `Poison for ${pct(0.3 + 0.04 * r)} Attack per second for 6s. Ignores armor.`,
      use: (c, r) => c.dot('Poison', c.st.atk * (0.3 + 0.04 * r), 6, 'true') },
    evasion: { name: 'Evasion', type: 'passive', max: 10,
      desc: r => `+${(1.5 * r).toFixed(1)}% chance to dodge.`,
      mod: (s, r) => { s.dodgeFlat += 0.015 * r; } },
    lethality: { name: 'Lethality', type: 'passive', max: 10,
      desc: r => `+${r}% crit chance, +${6 * r}% crit damage.`,
      mod: (s, r) => { s.crit += r; s.critdmg += 6 * r; } },
    assassinate: { name: 'Assassinate', type: 'active', max: 10, cd: 12, mp: r => 20,
      desc: r => `Guaranteed crit for ${pct(3 + 0.25 * r)} Attack.`,
      use: (c, r) => c.hit(3 + 0.25 * r, 'phys', { crit: true }) },
    exploit: { name: 'Exploit Weakness', type: 'passive', max: 10,
      desc: r => `+${(3.5 * r).toFixed(1)}% armor penetration.`,
      mod: (s, r) => { s.pen += 3.5 * r; } },
    execute: { name: 'Execute', type: 'passive', max: 10,
      desc: r => `+${6 * r}% damage to enemies below 35% HP.`,
      mod: (s, r) => { s.execute += 0.06 * r; } },
    volley: { name: 'Volley', type: 'active', max: 10, cd: 7, mp: r => 14,
      desc: r => `4 hits of ${pct(0.55 + 0.05 * r)} Attack.`,
      use: (c, r) => { for (let i = 0; i < 4; i++) c.hit(0.55 + 0.05 * r, 'phys'); } },
    snare: { name: 'Snare Trap', type: 'active', max: 10, cd: 12, mp: r => 10,
      desc: r => `Stun for ${(1 + 0.1 * r).toFixed(1)}s and hit for ${pct(1 + 0.1 * r)} Attack.`,
      use: (c, r) => { c.stun(1 + 0.1 * r); c.hit(1 + 0.1 * r, 'phys'); } },
    quick_draw: { name: 'Quick Draw', type: 'passive', max: 10,
      desc: r => `+${(2.5 * r).toFixed(1)}% attack speed, +${r}% accuracy.`,
      mod: (s, r) => { s.spd += 2.5 * r; s.accp += r; } },
    fireball: { name: 'Fireball', type: 'active', max: 10, cd: 3, mp: r => 10 + r,
      desc: r => `Magic hit for ${pct(2 + 0.2 * r)} Magic.`, fire: true,
      use: (c, r) => c.hit(2 + 0.2 * r, 'magic', { fire: true }) },
    frost_nova: { name: 'Frost Nova', type: 'active', max: 10, cd: 10, mp: r => 14,
      desc: r => `Magic hit for ${pct(1.2 + 0.1 * r)} Magic and slow the enemy 35% for 4s.`,
      use: (c, r) => { c.hit(1.2 + 0.1 * r, 'magic'); c.slow(0.35, 4); } },
    arcane_mind: { name: 'Arcane Mind', type: 'passive', max: 10,
      desc: r => `+${4 * r}% Magic, +${5 * r}% MP.`,
      mod: (s, r) => { s.matkp += 4 * r; s.mpp += 5 * r; } },
    mana_shield: { name: 'Mana Shield', type: 'passive', max: 10,
      desc: r => `${4 * r}% of damage taken drains MP instead of HP.`,
      mod: (s, r) => { s.manaShield += 0.04 * r; } },
    meteor: { name: 'Meteor', type: 'active', max: 10, cd: 15, mp: r => 35 + 2 * r,
      desc: r => `Magic hit for ${pct(4.5 + 0.4 * r)} Magic.`, fire: true,
      use: (c, r) => c.hit(4.5 + 0.4 * r, 'magic', { fire: true }) },
    ignite: { name: 'Ignite', type: 'passive', max: 10,
      desc: r => `Fire spells burn for ${8 * r}% Magic per second for 4s.`,
      mod: (s, r) => { s.ignite += 0.08 * r; } },
    combustion: { name: 'Combustion', type: 'passive', max: 10,
      desc: r => `Spells get +${2 * r}% crit chance. +${4 * r}% crit damage.`,
      mod: (s, r) => { s.spellCrit += 2 * r; s.critdmg += 4 * r; } },
    raise_skeleton: { name: 'Raise Skeleton', type: 'active', max: 10, cd: 18, mp: r => 25,
      desc: r => `Summon a skeleton for 15s that hits for ${pct(0.5 + 0.06 * r)} Magic each second.`,
      use: (c, r) => c.minion(c.st.matk * (0.5 + 0.06 * r), 15) },
    life_drain: { name: 'Life Drain', type: 'active', max: 10, cd: 6, mp: r => 12 + r,
      desc: r => `Magic hit for ${pct(1.5 + 0.12 * r)} Magic. Heal 50% of damage dealt.`,
      use: (c, r) => { const d = c.hit(1.5 + 0.12 * r, 'magic'); c.heal(d * 0.5); } },
    curse: { name: 'Curse of Frailty', type: 'passive', max: 10,
      desc: r => `Enemies take +${(2.5 * r).toFixed(1)}% damage and deal ${(1.5 * r).toFixed(1)}% less.`,
      mod: (s, r) => { s.vuln += 0.025 * r; s.weaken += 0.015 * r; } },
  };

  // ---------- Items ----------
  const SLOTS = ['weapon', 'helm', 'armor', 'gloves', 'boots', 'ring', 'amulet'];
  const SLOT_NAME = { weapon: 'Weapon', helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', ring: 'Ring', amulet: 'Amulet' };
  const RARITIES = [
    { id: 'common', name: 'Common', mul: 1.0, affixes: 0, w: 60, salvage: 1 },
    { id: 'uncommon', name: 'Uncommon', mul: 1.12, affixes: 1, w: 28, salvage: 2 },
    { id: 'rare', name: 'Rare', mul: 1.28, affixes: 2, w: 9, salvage: 4 },
    { id: 'epic', name: 'Epic', mul: 1.5, affixes: 3, w: 2.5, salvage: 9 },
    { id: 'legendary', name: 'Legendary', mul: 1.8, affixes: 4, w: 0.5, salvage: 22 },
  ];
  const WEAPONS = {
    Sword: { atk: 1.0, spd: 1.0, kind: 'phys' },
    Axe: { atk: 1.35, spd: 0.82, kind: 'phys', critdmg: 20 },
    Dagger: { atk: 0.72, spd: 1.25, kind: 'phys', crit: 6 },
    Bow: { atk: 0.9, spd: 1.1, kind: 'phys', acc: 10 },
    Staff: { matk: 1.15, spd: 0.9, kind: 'magic', mp: 20 },
    Wand: { matk: 0.85, spd: 1.15, kind: 'magic', crit: 3 },
  };
  const ITEM_NAMES = {
    weapon: null,
    helm: ['Cap', 'Helm', 'Hood', 'Circlet'], armor: ['Vest', 'Mail', 'Robe', 'Plate'],
    gloves: ['Gloves', 'Gauntlets', 'Wraps'], boots: ['Boots', 'Greaves', 'Sandals'],
    ring: ['Ring', 'Band', 'Signet'], amulet: ['Amulet', 'Pendant', 'Talisman'],
  };
  const MATERIAL = ['Rusted', 'Iron', 'Bronze', 'Steel', 'Silvered', 'Runed', 'Obsidian', 'Starforged', 'Abyssal', 'Godwrought'];
  // Affix value(ilvl, roll 0..1)
  const AFFIXES = {
    atk: { name: 'Attack', v: (l, q) => 4 * S(l) * (0.6 + 0.4 * q) },
    matk: { name: 'Magic', v: (l, q) => 4 * S(l) * (0.6 + 0.4 * q) },
    hp: { name: 'HP', v: (l, q) => 22 * S(l) * (0.6 + 0.4 * q) },
    def: { name: 'Defense', v: (l, q) => (3 + 1.5 * l) * (0.6 + 0.4 * q) },
    mres: { name: 'Magic Resist', v: (l, q) => (3 + 1.5 * l) * (0.6 + 0.4 * q) },
    atkp: { name: '% Attack', p: 1, v: (l, q) => 4 + 6 * q },
    matkp: { name: '% Magic', p: 1, v: (l, q) => 4 + 6 * q },
    hpp: { name: '% HP', p: 1, v: (l, q) => 4 + 6 * q },
    crit: { name: '% Crit', p: 1, v: (l, q) => 2 + 3 * q },
    critdmg: { name: '% Crit Damage', p: 1, v: (l, q) => 8 + 12 * q },
    spd: { name: '% Speed', p: 1, v: (l, q) => 3 + 5 * q },
    ls: { name: '% Lifesteal', p: 1, v: (l, q) => 1 + 2 * q },
    pen: { name: '% Armor Pen', p: 1, v: (l, q) => 3 + 5 * q },
    str: { name: 'STR', v: (l, q) => (2 + 0.4 * l) * (0.6 + 0.4 * q) },
    dex: { name: 'DEX', v: (l, q) => (2 + 0.4 * l) * (0.6 + 0.4 * q) },
    int: { name: 'INT', v: (l, q) => (2 + 0.4 * l) * (0.6 + 0.4 * q) },
    vit: { name: 'VIT', v: (l, q) => (2 + 0.4 * l) * (0.6 + 0.4 * q) },
    luk: { name: 'LUK', v: (l, q) => (2 + 0.4 * l) * (0.6 + 0.4 * q) },
    mf: { name: '% Item Rarity', p: 1, v: (l, q) => 5 + 10 * q },
    gf: { name: '% Gold Find', p: 1, v: (l, q) => 5 + 15 * q },
    mp: { name: 'MP', v: (l, q) => (8 + l) * (0.6 + 0.4 * q) },
    eva: { name: 'Evasion', v: (l, q) => (3 + 1.5 * l) * (0.6 + 0.4 * q) },
  };
  const AFFIX_KEYS = Object.keys(AFFIXES);

  function enhMul(n) { return 1 + 0.08 * n + 0.006 * n * n; }
  const ENH_RATE = [1, 1, 1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.3, 0.25, 0.2, 0.15];
  const ENH_MAX = 15;
  function enhCost(it) {
    const n = it.enh;
    return { gold: Math.round(25 * S(it.ilvl) * Math.pow(n + 1, 1.35)), shards: n + 1 + Math.floor(n * n / 6) };
  }

  let uid = Date.now() % 100000;
  function rollRarity(mf, boost) {
    const m = 1 + mf / 100;
    const ws = RARITIES.map((r, i) => r.w * (i === 0 ? 1 : Math.pow(m, i)) * (i ? boost : 1));
    let t = rnd() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ws.length; i++) { t -= ws[i]; if (t <= 0) return i; }
    return 0;
  }
  function makeItem(ilvl, rarityIdx, slot, wtype) {
    slot = slot || pick(SLOTS);
    const r = RARITIES[rarityIdx];
    const it = { id: ++uid, slot, ilvl, rar: rarityIdx, enh: 0, base: {}, aff: {}, lock: false };
    const s = S(ilvl) * r.mul;
    const lin = (3 + 1.5 * ilvl) * r.mul;
    const mat = MATERIAL[Math.min(MATERIAL.length - 1, Math.floor((ilvl - 1) / 8))];
    if (slot === 'weapon') {
      const t = wtype || pick(Object.keys(WEAPONS)); const w = WEAPONS[t];
      it.wtype = t;
      if (w.atk) it.base.atk = 12 * s * w.atk;
      if (w.matk) it.base.matk = 12 * s * w.matk;
      if (w.crit) it.base.crit = w.crit;
      if (w.critdmg) it.base.critdmg = w.critdmg;
      if (w.mp) it.base.mp = w.mp + ilvl;
      if (w.acc) it.base.acc = w.acc + ilvl;
      it.name = `${mat} ${t}`;
    } else {
      if (slot === 'helm') { it.base.hp = 25 * s; it.base.mres = lin * 1.2; }
      if (slot === 'armor') { it.base.hp = 45 * s; it.base.def = lin * 1.6; it.base.mres = lin * 0.4; }
      if (slot === 'gloves') { it.base.atk = 3 * s; it.base.matk = 3 * s; it.base.def = lin * 0.4; }
      if (slot === 'boots') { it.base.spd = 4; it.base.def = lin * 0.6; it.base.eva = lin; }
      if (slot === 'ring') { if (rnd() < 0.5) it.base.crit = 3; else it.base.critdmg = 12; it.base.hp = 10 * s; }
      if (slot === 'amulet') { it.base.hp = 20 * s; it.base.mp = 10 + ilvl; it.base.mres = lin * 0.5; }
      it.name = `${mat} ${pick(ITEM_NAMES[slot])}`;
    }
    const keys = AFFIX_KEYS.slice();
    for (let i = 0; i < r.affixes; i++) {
      const k = keys.splice(Math.floor(rnd() * keys.length), 1)[0];
      const q = rnd();
      it.aff[k] = AFFIXES[k].v(ilvl, q);
    }
    return it;
  }
  // stats an item gives, including enhancement (enhancement boosts base stats only)
  const ENH_SCALES = ['atk', 'matk', 'hp', 'def', 'mres', 'eva'];
  function itemStats(it) {
    const out = {}; const m = enhMul(it.enh);
    for (const k in it.base) out[k] = (out[k] || 0) + it.base[k] * (ENH_SCALES.includes(k) ? m : 1);
    for (const k in it.aff) out[k] = (out[k] || 0) + it.aff[k];
    return out;
  }
  function itemValue(it) { return Math.round(6 * S(it.ilvl) * RARITIES[it.rar].mul * (1 + it.rar)); }
  function salvageValue(it) { return RARITIES[it.rar].salvage + Math.floor(it.enh * it.enh / 3); }

  // ---------- Player ----------
  function newPlayer() {
    const p = {
      v: 1, name: 'Climber', cls: 'novice', lvl: 1, exp: 0,
      alloc: { str: 0, dex: 0, int: 0, vit: 0, luk: 0 }, statPts: 0,
      skills: {}, skillPts: 1, loadout: ['power_strike'],
      equip: {}, inv: [], gold: 0, shards: 0,
      floor: 1, maxFloor: 1, floorKills: 0,
      autoClimb: false, // only the balance sim turns this on; players move floors by hand
      autoSalvage: 0, // salvage drops at or below this rarity index-1 (0 = off)
      stats: { kills: 0, deaths: 0, bosses: 0, best: 0 },
    };
    p.equip.weapon = makeItem(1, 0, 'weapon', 'Sword');
    p.equip.armor = makeItem(1, 0, 'armor');
    p.skills.power_strike = 1; p.skillPts = 0;
    return p;
  }
  function expNeed(l) { return Math.round(30 * Math.pow(1.105, l - 1) * (1 + 0.04 * l)); }
  function attrsOf(p) {
    const a = { str: 5, dex: 5, int: 5, vit: 5, luk: 5 };
    // class growth: each class in the chain grants its growth for the levels spent at or above its unlock
    const chain = classChain(p.cls);
    for (const cid of chain) {
      const c = CLASSES[cid];
      const from = c.tier === 0 ? 1 : CLASS_LEVEL[c.tier];
      const nextTier = chain[chain.indexOf(cid) + 1];
      const to = nextTier ? CLASS_LEVEL[CLASSES[nextTier].tier] : p.lvl;
      const lv = Math.max(0, Math.min(p.lvl, to) - from);
      for (const k in c.growth) a[k] += c.growth[k] * lv;
    }
    for (const k of ATTRS) a[k] += p.alloc[k];
    return a;
  }
  function knownSkills(p) { return classChain(p.cls).flatMap(c => CLASSES[c].skills); }

  // floorRef: floor used for defense curves (your mitigation is relative to where you fight)
  function computeStats(p, floorRef, equipOverride) {
    const eq = equipOverride || p.equip;
    const g = { atk: 0, matk: 0, hp: 0, def: 0, mres: 0, atkp: 0, matkp: 0, hpp: 0, mpp: 0, crit: 0, critdmg: 0, spd: 0,
      ls: 0, pen: 0, eva: 0, acc: 0, accp: 0, mp: 0, mf: 0, gf: 0, defp: 0, str: 0, dex: 0, int: 0, vit: 0, luk: 0,
      hpRegen: 0, frenzy: 0, reflect: 0, dodgeFlat: 0, execute: 0, ignite: 0, spellCrit: 0, manaShield: 0, vuln: 0, weaken: 0 };
    for (const sl of SLOTS) { const it = eq[sl]; if (!it) continue; const is = itemStats(it); for (const k in is) g[k] = (g[k] || 0) + is[k]; }
    for (const id of knownSkills(p)) { const r = p.skills[id] || 0; const sk = SKILLS[id]; if (r && sk.type === 'passive') sk.mod(g, r); }
    const a = attrsOf(p);
    for (const k of ATTRS) a[k] += g[k];
    const c = CLASSES[p.cls];
    const f = floorRef || p.floor;
    const w = eq.weapon ? WEAPONS[eq.weapon.wtype] : null;
    const st = {};
    st.attrs = a;
    st.atk = (8 + g.atk) * (1 + a.str * 0.012 + g.atkp / 100);
    st.matk = (8 + g.matk) * (1 + a.int * 0.014 + g.matkp / 100);
    st.hp = (100 + 12 * p.lvl + g.hp) * (1 + a.vit * 0.015 + g.hpp / 100) * c.hpMul;
    st.mp = (40 + 3 * p.lvl + g.mp + a.int * 2) * (1 + g.mpp / 100) * c.mpMul;
    st.mpRegen = 1.5 + st.mp * 0.025;
    st.def = (g.def + a.vit * 0.6) * (1 + g.defp / 100);
    st.mres = g.mres + a.vit * 0.3 + a.int * 0.3;
    const K = 60 + 12 * f;
    st.physRed = clamp(st.def / (st.def + K), 0, 0.8);
    st.magRed = clamp(st.mres / (st.mres + K), 0, 0.8);
    st.spd = Math.min(300, 100 * (1 + a.dex * 0.004 + g.spd / 100) * (w ? w.spd : 1));
    st.crit = clamp(5 + a.dex * 0.15 + a.luk * 0.2 + g.crit, 0, 80);
    st.spellCrit = g.spellCrit;
    st.critdmg = 150 + a.luk * 0.6 + g.critdmg;
    st.acc = (a.dex * 2 + g.acc + p.lvl * 2) * (1 + g.accp / 100);
    const eva = a.dex * 1 + g.eva;
    st.dodge = clamp(eva / (eva + 150 + 10 * f), 0, 0.35) + g.dodgeFlat;
    st.ls = g.ls; st.pen = Math.min(80, g.pen);
    st.mf = a.luk * 0.6 + g.mf; st.gf = a.luk * 0.6 + g.gf;
    st.hpRegen = g.hpRegen; st.frenzy = g.frenzy; st.reflect = g.reflect; st.execute = g.execute;
    st.ignite = g.ignite; st.manaShield = Math.min(0.5, g.manaShield); st.vuln = g.vuln; st.weaken = Math.min(0.5, g.weaken);
    st.basic = w && w.kind === 'magic' ? 'magic' : 'phys';
    return st;
  }

  // ---------- Enemies ----------
  const ARCH = {
    beast: { hp: 1.0, atk: 1.0, spd: 1.0, pr: 0.15, mr: 0.15, eva: 0.08, dmg: 'phys', tag: '' },
    brute: { hp: 1.35, atk: 1.2, spd: 0.8, pr: 0.1, mr: 0.1, eva: 0.03, dmg: 'phys', tag: 'Tough' },
    armored: { hp: 1.1, atk: 0.9, spd: 0.85, pr: 0.55, mr: 0.05, eva: 0, dmg: 'phys', tag: 'Armored' },
    spirit: { hp: 0.85, atk: 1.0, spd: 1.1, pr: 0.25, mr: 0.55, eva: 0.12, dmg: 'magic', tag: 'Warded' },
    swift: { hp: 0.75, atk: 0.85, spd: 1.5, pr: 0.1, mr: 0.15, eva: 0.32, dmg: 'phys', tag: 'Evasive' },
    caster: { hp: 0.8, atk: 1.3, spd: 0.9, pr: 0.15, mr: 0.3, eva: 0.05, dmg: 'magic', tag: 'Caster' },
  };
  const ZONES = [
    { name: 'Damp Cellar', mobs: [['Giant Rat', 'beast'], ['Bloated Slime', 'brute'], ['Goblin Cutpurse', 'swift'], ['Rust Beetle', 'armored']],
      boss: ['Goblin Chieftain', 'brute'] },
    { name: 'Bone Crypt', mobs: [['Skeleton Warden', 'armored'], ['Wailing Shade', 'spirit'], ['Ghoul', 'brute'], ['Grave Acolyte', 'caster']],
      boss: ['The Bone Knight', 'armored'] },
    { name: 'Fungal Hollow', mobs: [['Sporeling', 'beast'], ['Myconid Brute', 'brute'], ['Cave Stalker', 'swift'], ['Spore Witch', 'caster']],
      boss: ['Mother Mycelia', 'caster'] },
    { name: 'Ember Forge', mobs: [['Iron Golem', 'armored'], ['Fire Imp', 'caster'], ['Forge Hound', 'swift'], ['Magma Wisp', 'spirit']],
      boss: ['Forgemaster Vul', 'armored'] },
    { name: 'Drowned Halls', mobs: [['Drowned Sailor', 'brute'], ['Siren', 'caster'], ['Eel Swarm', 'swift'], ['Tide Phantom', 'spirit']],
      boss: ['The Leviathan Maw', 'brute'] },
    { name: 'Astral Spire', mobs: [['Star Sentinel', 'armored'], ['Void Wisp', 'spirit'], ['Blink Stalker', 'swift'], ['Astral Seer', 'caster']],
      boss: ['The Watcher Above', 'spirit'] },
  ];
  function zoneOf(f) {
    const zi = Math.floor((f - 1) / 10);
    const z = ZONES[zi % ZONES.length];
    const cycle = Math.floor(zi / ZONES.length);
    return { name: (cycle ? `Abyssal ${z.name} ${'I'.repeat(Math.min(cycle, 3))}${cycle > 3 ? '+' : ''}` : z.name), z, cycle };
  }
  const isBossFloor = f => f % 10 === 0;
  const KILLS_PER_FLOOR = 10;
  function makeEnemy(f) {
    const { z, cycle } = zoneOf(f);
    const boss = isBossFloor(f);
    const [nm, arch] = boss ? z.boss : pick(z.mobs);
    const A = ARCH[arch];
    const elite = !boss && rnd() < 0.06;
    const s = E(f);
    const m = boss ? { hp: 9, atk: 1.5 } : elite ? { hp: 3, atk: 1.4 } : { hp: 1, atk: 1 };
    const early = f < 6 ? 0.5 + 0.1 * f : 1; // gentle first floors
    m.hp *= early; m.atk *= early;
    const red = Math.min(0.12, f * 0.0015 + cycle * 0.03);
    return {
      name: (elite ? 'Elite ' : '') + (cycle && !boss ? 'Abyssal ' : '') + nm, arch, tag: A.tag, boss, elite,
      maxhp: 90 * s * (1 + 0.06 * (f - 1)) * A.hp * m.hp, hp: 90 * s * (1 + 0.06 * (f - 1)) * A.hp * m.hp,
      atk: 10 * s * (1 + 0.045 * (f - 1)) * A.atk * m.atk, spd: 100 * A.spd * (boss ? 0.95 : 1),
      pr: Math.min(0.85, A.pr + red), mr: Math.min(0.85, A.mr + red), eva: A.eva, dmg: A.dmg,
      exp: Math.round(6 * Math.pow(1.105, f - 1) * (1 + 0.04 * f) * (boss ? 12 : elite ? 3 : 1)),
      gold: 3 * S(f) * (boss ? 15 : elite ? 4 : 1), f,
    };
  }

  // ---------- Battle ----------
  function Battle(p, log) {
    const st = computeStats(p, p.floor);
    const b = { st, e: makeEnemy(p.floor), hp: st.hp, mp: st.mp, g: 0, eg: 0, shield: 0, shieldT: 0,
      buffs: {}, dots: [], cds: {}, stun: 0, slow: 0, slowT: 0, minion: null, t: 0, eActs: 0, over: null, log: log || (() => {}) };
    return b;
  }
  function liveStats(b) {
    // stat multipliers from buffs and missing HP
    let atkMul = 1;
    for (const k in b.buffs) if (b.buffs[k].atkMul) atkMul *= b.buffs[k].atkMul;
    return atkMul;
  }
  function dmgMulVs(b) {
    const st = b.st, e = b.e;
    let m = 1 + st.vuln;
    if (st.frenzy) m += st.frenzy * Math.floor((1 - b.hp / st.hp) * 10);
    if (st.execute && e.hp / e.maxhp < 0.35) m += st.execute;
    return m;
  }
  function playerHit(b, raw, type, opts) {
    opts = opts || {};
    const st = b.st, e = b.e;
    if (type === 'phys' && !opts.noMiss) {
      const K = 150 + 8 * e.f;
      const miss = e.eva * K / (K + st.acc);
      if (rnd() < miss) { b.log('miss', `${e.name} evades.`); return 0; }
    }
    let d = raw * dmgMulVs(b);
    const cc = st.crit + (type === 'magic' ? st.spellCrit : 0);
    const crit = opts.crit || rnd() * 100 < cc;
    if (crit) d *= st.critdmg / 100;
    if (type === 'phys') d *= 1 - e.pr * (1 - st.pen / 100);
    else if (type === 'magic') d *= 1 - e.mr;
    d = Math.max(1, d);
    e.hp -= d;
    if (st.ls && type === 'phys') b.hp = Math.min(st.hp, b.hp + d * st.ls / 100);
    b.dealt = (b.dealt || 0) + d;
    if (opts.label !== false) b.log(crit ? 'crit' : 'hit', `${opts.label || 'You hit'} ${e.name} for ${fmt(d)}${crit ? ' (crit)' : ''}${type === 'magic' ? ' magic' : ''}.`);
    if (opts.fire && st.ignite) addDot(b, 'Burn', st.matk * st.ignite, 4, 'magic');
    return d;
  }
  function addDot(b, name, dps, dur, type) {
    const ex = b.dots.find(d => d.name === name);
    if (ex) { ex.dps = Math.max(ex.dps, dps); ex.t = dur; } else b.dots.push({ name, dps, t: dur, type, acc: 0 });
  }
  function skillCtx(b, name) {
    const c = {
      st: b.st,
      hit: (mult, type, o) => playerHit(b, (type === 'magic' ? b.st.matk : b.st.atk * liveStats(b)) * mult, type, Object.assign({ label: name }, o)),
      hitRaw: (raw, type, o) => playerHit(b, raw * liveStats(b), type, Object.assign({ label: name }, o)),
      buff: (id, dur, mods) => { b.buffs[id] = Object.assign({ t: dur, name }, mods); b.log('skill', `${name}!`); },
      dot: (nm, dps, dur, type) => { addDot(b, nm, dps * dmgMulVs(b), dur, type); b.log('skill', `${name}: ${b.e.name} is afflicted.`); },
      shield: (amt, dur) => { b.shield = amt; b.shieldT = dur; b.log('skill', `${name}: shield ${fmt(amt)}.`); },
      stun: d => { b.stun = Math.max(b.stun, d); },
      slow: (pc, d) => { b.slow = pc; b.slowT = d; },
      heal: amt => { b.hp = Math.min(b.st.hp, b.hp + amt); },
      minion: (dmg, dur) => { b.minion = { dmg, t: dur, acc: 0 }; b.log('skill', `${name}: a skeleton rises.`); },
    };
    return c;
  }
  function playerAct(b, p) {
    for (const id of p.loadout) {
      const sk = SKILLS[id]; const r = p.skills[id] || 0;
      if (!sk || !r || sk.type !== 'active') continue;
      if ((b.cds[id] || 0) > 0) continue;
      const cost = sk.mp(r);
      if (b.mp < cost) continue;
      b.mp -= cost; b.cds[id] = sk.cd;
      sk.use(skillCtx(b, sk.name), r);
      return;
    }
    if (b.st.basic === 'magic') playerHit(b, b.st.matk, 'magic', { label: 'Your bolt hits' });
    else playerHit(b, b.st.atk * liveStats(b), 'phys', { label: 'You hit' });
  }
  function enemyAct(b) {
    const e = b.e, st = b.st;
    b.eActs++;
    let mult = 1, label = `${e.name} hits you`;
    if (e.boss && b.eActs % 4 === 0) { mult = 2.5; label = `${e.name} unleashes a heavy blow`; }
    let enr = 1;
    if (e.boss && b.t > 40) enr = 1 + 0.25 * Math.floor((b.t - 40) / 5 + 1);
    if (e.dmg === 'phys' && rnd() < st.dodge) { b.log('dodge', `You dodge ${e.name}.`); return; }
    let d = e.atk * mult * enr * (1 - st.weaken) * (0.9 + rnd() * 0.2);
    const red = e.dmg === 'phys' ? st.physRed : st.magRed;
    const pre = d;
    d *= 1 - red;
    if (st.reflect) { const rf = pre * st.reflect; e.hp -= rf; b.dealt = (b.dealt || 0) + rf; }
    if (b.shield > 0) { const ab = Math.min(b.shield, d); b.shield -= ab; d -= ab; }
    if (st.manaShield && b.mp > 0) {
      const part = d * st.manaShield; const cost = part * st.mp / st.hp;
      if (b.mp >= cost) { b.mp -= cost; d -= part; }
    }
    b.hp -= d;
    b.taken = (b.taken || 0) + d;
    b.log(e.dmg === 'magic' ? 'ehit-m' : 'ehit', `${label} for ${fmt(d)}${e.dmg === 'magic' ? ' magic' : ''}.`);
  }
  const DT = 0.1;
  // advance one tick; returns 'win' | 'lose' | null
  function tick(b, p) {
    if (b.over) return b.over;
    const st = b.st, e = b.e;
    b.t += DT;
    b.mp = Math.min(st.mp, b.mp + st.mpRegen * DT);
    if (st.hpRegen) b.hp = Math.min(st.hp, b.hp + st.hp * st.hpRegen * DT);
    for (const k in b.cds) b.cds[k] = Math.max(0, b.cds[k] - DT);
    for (const k in b.buffs) { b.buffs[k].t -= DT; if (b.buffs[k].t <= 0) delete b.buffs[k]; }
    if (b.shieldT > 0) { b.shieldT -= DT; if (b.shieldT <= 0) b.shield = 0; }
    if (b.slowT > 0) { b.slowT -= DT; if (b.slowT <= 0) b.slow = 0; }
    for (const d of b.dots) {
      d.t -= DT; d.acc += DT;
      if (d.acc >= 1 - 1e-9) { d.acc -= 1; let dmg = d.dps * (d.type === 'magic' ? 1 - e.mr : 1); e.hp -= dmg; b.dealt = (b.dealt || 0) + dmg; b.log('dot', `${d.name} deals ${fmt(dmg)}.`); }
    }
    b.dots = b.dots.filter(d => d.t > 0);
    if (b.minion) {
      b.minion.t -= DT; b.minion.acc += DT;
      if (b.minion.acc >= 1) { b.minion.acc -= 1; const dmg = b.minion.dmg * dmgMulVs(b) * (1 - e.mr); e.hp -= dmg; b.dealt = (b.dealt || 0) + dmg; b.log('dot', `Skeleton claws for ${fmt(dmg)}.`); }
      if (b.minion.t <= 0) b.minion = null;
    }
    if (e.hp <= 0) return (b.over = 'win');
    b.g += st.spd / 100 * DT;
    while (b.g >= 1) { b.g -= 1; playerAct(b, p); if (e.hp <= 0) return (b.over = 'win'); }
    if (b.stun > 0) b.stun -= DT;
    else {
      let es = e.spd * (1 - b.slow);
      if (e.boss && b.t > 40) es *= 1 + 0.25 * Math.floor((b.t - 40) / 5 + 1);
      b.eg += es / 100 * DT;
      while (b.eg >= 1) { b.eg -= 1; enemyAct(b); if (b.hp <= 0) return (b.over = 'lose'); if (e.hp <= 0) return (b.over = 'win'); }
    }
    if (b.t > 180) return (b.over = 'lose'); // stalemate counts as a loss
    return null;
  }

  // ---------- Rewards & progression ----------
  function gainExp(p, x, log) {
    p.exp += x; let ups = 0;
    while (p.exp >= expNeed(p.lvl)) {
      p.exp -= expNeed(p.lvl); p.lvl++; ups++;
      p.statPts += POINTS_PER_LEVEL; p.skillPts += 1;
    }
    if (ups && log) log('level', `Level up! You are now level ${p.lvl}. +${POINTS_PER_LEVEL * ups} stat points, +${ups} skill point${ups > 1 ? 's' : ''}.`);
    return ups;
  }
  function onWin(p, b, log) {
    const e = b.e, st = b.st;
    p.stats.kills++;
    const gold = Math.round(e.gold * (0.8 + rnd() * 0.4) * (1 + st.gf / 100));
    p.gold += gold;
    // over-leveled players get less exp to keep floors relevant
    const gap = p.lvl - e.f;
    const expMul = gap > 5 ? Math.max(0.2, 1 - (gap - 5) * 0.1) : 1;
    const ex = Math.round(e.exp * expMul);
    log('win', `${e.name} falls. +${fmt(ex)} exp, +${fmt(gold)} gold.`);
    gainExp(p, ex, log);
    const drops = [];
    const dropChance = e.boss ? 1 : e.elite ? 0.8 : 0.22;
    const n = e.boss ? 2 : 1;
    for (let i = 0; i < n; i++) if (rnd() < dropChance) {
      const rar = rollRarity(st.mf, e.boss ? 3 : e.elite ? 2 : 1);
      const il = Math.max(1, e.f - (rnd() < 0.5 ? 0 : ri(0, 2)));
      drops.push(makeItem(il, e.boss ? Math.max(2, rar) : rar));
    }
    if (rnd() < (e.boss ? 1 : 0.12)) { const sh = e.boss ? ri(5, 10) : 1; p.shards += sh; log('loot', `+${sh} enhancement shard${sh > 1 ? 's' : ''}.`); }
    for (const it of drops) {
      if (!it.lock && p.autoSalvage && it.rar < p.autoSalvage) { p.shards += salvageValue(it); log('salv', `Auto-salvaged ${it.name} (+${salvageValue(it)} shards).`); continue; }
      if (p.inv.length >= 60) { p.gold += itemValue(it); log('salv', `Bag full. Sold ${it.name} for ${fmt(itemValue(it))}.`); continue; }
      p.inv.push(it); (b.loot = b.loot || []).push(it); log('loot', `Looted [${RARITIES[it.rar].name}] ${it.name} +0 (iLvl ${it.ilvl}).`, it.rar);
    }
    if (e.boss) {
      p.stats.bosses++;
      if (p.floor === p.maxFloor) { p.maxFloor++; log('floor', `Boss defeated. Floor ${p.maxFloor} unlocked.`); }
      if (p.autoClimb && p.floor < p.maxFloor) { p.floor++; p.floorKills = 0; }
      p.stats.best = Math.max(p.stats.best, p.maxFloor);
      return;
    }
    p.floorKills++;
    if (p.floorKills >= KILLS_PER_FLOOR) {
      if (p.floor === p.maxFloor) { p.maxFloor++; log('floor', `Floor ${p.floor} cleared. Floor ${p.maxFloor} unlocked.`); }
      if (p.autoClimb && p.floor < p.maxFloor) { p.floor++; p.floorKills = 0; log('floor', `Climbing to floor ${p.floor}.`); }
    }
    p.stats.best = Math.max(p.stats.best, p.maxFloor);
  }
  function onLose(p, b, log) {
    p.stats.deaths++;
    log('death', `You were defeated by ${b.e.name}.`);
    if (p.autoClimb && p.floor > 1) { p.floor--; p.floorKills = 0; log('floor', `Retreating to floor ${p.floor}.`); }
  }

  // ---------- Actions ----------
  function equip(p, id) {
    const i = p.inv.findIndex(x => x.id === id); if (i < 0) return;
    const it = p.inv[i]; p.inv.splice(i, 1);
    if (p.equip[it.slot]) p.inv.push(p.equip[it.slot]);
    p.equip[it.slot] = it;
  }
  function unequip(p, slot) { if (p.equip[slot] && p.inv.length < 60) { p.inv.push(p.equip[slot]); delete p.equip[slot]; } }
  function findItem(p, id) { return p.inv.find(x => x.id === id) || SLOTS.map(s => p.equip[s]).find(x => x && x.id === id); }
  function salvage(p, id) {
    const i = p.inv.findIndex(x => x.id === id); if (i < 0) return 0;
    const it = p.inv[i]; if (it.lock) return 0;
    p.inv.splice(i, 1); const v = salvageValue(it); p.shards += v; return v;
  }
  function enhance(p, id) {
    const it = findItem(p, id); if (!it || it.enh >= ENH_MAX) return { ok: false, msg: 'Already at max.' };
    const c = enhCost(it);
    if (p.gold < c.gold || p.shards < c.shards) return { ok: false, msg: 'Not enough gold or shards.' };
    p.gold -= c.gold; p.shards -= c.shards;
    if (rnd() < ENH_RATE[it.enh]) { it.enh++; return { ok: true, success: true, msg: `Success! ${it.name} is now +${it.enh}.` }; }
    if (it.enh >= 7) { it.enh--; return { ok: true, success: false, msg: `Failed. ${it.name} dropped to +${it.enh}.` }; }
    return { ok: true, success: false, msg: `Failed. ${it.name} stays at +${it.enh}.` };
  }
  function respecCost(p) { return p.lvl < 10 ? 0 : Math.round(25 * p.lvl * p.lvl); }
  function respecStats(p) { const c = respecCost(p); if (p.gold < c) return false; p.gold -= c; for (const k of ATTRS) { p.statPts += p.alloc[k]; p.alloc[k] = 0; } return true; }
  function respecSkills(p) {
    const c = respecCost(p); if (p.gold < c) return false; p.gold -= c;
    for (const k in p.skills) { p.skillPts += p.skills[k]; } p.skills = {}; p.loadout = []; return true;
  }
  function learn(p, id) {
    const sk = SKILLS[id]; if (!sk || !knownSkills(p).includes(id)) return false;
    const r = p.skills[id] || 0; if (r >= sk.max || p.skillPts < 1) return false;
    p.skills[id] = r + 1; p.skillPts--;
    if (sk.type === 'active' && !p.loadout.includes(id) && p.loadout.length < 3) p.loadout.push(id);
    return true;
  }
  function canAdvance(p) {
    const c = CLASSES[p.cls]; if (!c.next.length) return null;
    const need = CLASS_LEVEL[c.tier + 1];
    return { need, ready: p.lvl >= need, options: c.next };
  }
  function advance(p, cid) {
    const a = canAdvance(p); if (!a || !a.ready || !a.options.includes(cid)) return false;
    p.cls = cid; return true;
  }
  function fmt(n) {
    n = Math.round(n);
    const a = Math.abs(n);
    if (a < 10000) return String(n);
    const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
    let i = -1, v = a;
    while (v >= 1000 && i < u.length - 1) { v /= 1000; i++; }
    return (n < 0 ? '-' : '') + (v < 100 ? v.toFixed(1) : Math.round(v)) + u[i];
  }

  return { S, ATTRS, ATTR_INFO, POINTS_PER_LEVEL, CLASSES, CLASS_LEVEL, classChain, SKILLS, SLOTS, SLOT_NAME, RARITIES, WEAPONS,
    AFFIXES, ENH_RATE, ENH_MAX, enhMul, enhCost, makeItem, itemStats, itemValue, salvageValue, rollRarity,
    newPlayer, expNeed, attrsOf, knownSkills, computeStats, ARCH, ZONES, zoneOf, isBossFloor, KILLS_PER_FLOOR, makeEnemy,
    Battle, tick, onWin, onLose, gainExp, equip, unequip, findItem, salvage, enhance, respecCost, respecStats, respecSkills,
    learn, canAdvance, advance, fmt, DT };
})();
export default Core;
