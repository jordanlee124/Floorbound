// UI: renders the game and handles input. All rules live in core.js.
import Core from './core.js';

(function () {
  const C = Core, F = C.fmt;
  const $ = s => document.querySelector(s);
  const SAVE_KEY = 'floorbound.save.v1';
  // fighting: a battle is playing out. cooldown: short pause after a fight so the last hit stays readable.
  let P, B, fighting = false, cooldown = 0, lootQueue = [], tab = 'gear', selId = null, logLines = [], dirty = true, confirmKey = null;

  const RCOL = ['r0', 'r1', 'r2', 'r3', 'r4'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function log(kind, msg, rar) {
    logLines.push({ kind, msg, rar });
    if (logLines.length > 80) logLines.shift();
    if (['level', 'loot', 'floor', 'death', 'salv'].includes(kind)) dirty = true;
  }
  function save() {
    if (!P) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) {}
  }
  function load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (s) return JSON.parse(s); } catch (e) {}
    return null;
  }
  function start() {
    P = load() || C.newPlayer();
    const fresh = C.newPlayer();
    for (const k in fresh) if (P[k] === undefined) P[k] = fresh[k];
    P.autoClimb = false;
    log('floor', P.stats.kills ? 'Welcome back. The climb continues.' : 'You enter the first floor. Press Fight to take on the enemy in front of you.');
    nextEnemy();
    bind();
    renderAll();
    setInterval(loop, 100);
    setInterval(save, 10000);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  }
  // Show the next enemy without starting the fight.
  function nextEnemy() { B = C.Battle(P, log); log('enc', `Floor ${P.floor}: ${B.e.name} blocks the way${B.e.tag ? ` (${B.e.tag})` : ''}.`); }
  function fight() {
    if (fighting || cooldown > 0) return;
    if (B.over) nextEnemy();
    B.st = C.computeStats(P, P.floor); B.hp = B.st.hp; B.mp = B.st.mp; // enter every fight at full health
    fighting = true; renderControls();
  }
  function skip() {
    if (!fighting) return;
    let guard = 0;
    while (fighting && guard++ < 5000) step();
  }

  function loop() {
    if (cooldown > 0) { cooldown -= 0.1; if (cooldown <= 0) { cooldown = 0; nextEnemy(); renderControls(); } }
    if (fighting) step();
    renderBattle();
    if (dirty) { renderPanels(); dirty = false; }
  }
  function step() {
    const r = C.tick(B, P);
    if (!r) return;
    if (r === 'win') { C.onWin(P, B, log); if (B.loot) { lootQueue.push(...B.loot.map(it => it.id)); renderLoot(); } }
    else { C.onLose(P, B, log); log('floor', 'Adjust your build, or drop a floor and grind.'); }
    fighting = false; cooldown = 0.6; dirty = true;
    save(); renderControls();
  }
  function renderControls() {
    const fb = $('#fightbtn');
    fb.disabled = fighting || cooldown > 0;
    fb.textContent = fighting ? 'Fighting…' : 'Fight';
    $('#skipbtn').disabled = !fighting;
    const lock = fighting || cooldown > 0;
    $('#fdown').disabled = lock || P.floor <= 1;
    $('#fup').disabled = lock || P.floor >= P.maxFloor;
    $('#ftop').disabled = lock || P.floor >= P.maxFloor;
  }

  // ---------- Header & battle ----------
  function bar(cur, max, cls) {
    const w = Math.max(0, Math.min(100, cur / max * 100));
    return `<div class="bar ${cls}"><i style="width:${w}%"></i><span>${F(Math.max(0, cur))} / ${F(max)}</span></div>`;
  }
  function renderBattle() {
    const st = B.st, e = B.e, z = C.zoneOf(P.floor);
    $('#hdr-floor').textContent = `Floor ${P.floor}`;
    $('#hdr-zone').textContent = z.name;
    $('#hdr-gold').textContent = F(P.gold);
    $('#hdr-shards').textContent = F(P.shards);
    $('#hdr-lvl').textContent = `Lv ${P.lvl} ${C.CLASSES[P.cls].name}`;
    const need = C.expNeed(P.lvl);
    $('#hdr-exp').style.width = Math.min(100, P.exp / need * 100) + '%';
    $('#hdr-exp-t').textContent = `${F(P.exp)} / ${F(need)} exp`;
    const buffs = Object.values(B.buffs).map(b => `<em>${esc(b.name)} ${b.t.toFixed(0)}s</em>`)
      .concat(B.shield > 0 ? [`<em>Shield ${F(B.shield)}</em>`] : [])
      .concat(B.minion ? [`<em>Skeleton ${B.minion.t.toFixed(0)}s</em>`] : []);
    const cds = P.loadout.map(id => { const c = B.cds[id] || 0; const sk = C.SKILLS[id]; return `<span class="cd ${c > 0 ? 'wait' : ''}">${esc(sk.name)}${c > 0 ? ' ' + c.toFixed(1) : ''}</span>`; }).join('');
    $('#you').innerHTML = `<div class="who"><b>${esc(P.name)}</b><small>Lv ${P.lvl} ${C.CLASSES[P.cls].name}</small></div>
      ${bar(B.hp, st.hp, 'hp')}${bar(B.mp, st.mp, 'mp')}
      <div class="gauge"><i style="width:${Math.min(100, B.g * 100)}%"></i></div>
      <div class="chips">${buffs.join('')}</div><div class="cds">${cds || '<span class="cd wait">No skills in rotation</span>'}</div>`;
    const dots = B.dots.map(d => `<em class="bad">${esc(d.name)} ${d.t.toFixed(0)}s</em>`).concat(B.slow ? ['<em class="bad">Slowed</em>'] : []).concat(B.stun > 0 ? ['<em class="bad">Stunned</em>'] : []);
    const enr = e.boss && B.t > 40 ? '<em class="bad">Enraged</em>' : '';
    $('#foe').innerHTML = `<div class="who"><b class="${e.boss ? 'boss' : e.elite ? 'elite' : ''}">${esc(e.name)}</b><small>${e.boss ? 'Boss · ' : ''}${e.tag || 'Normal'} · ${e.dmg === 'magic' ? 'magic attacks' : 'physical attacks'}</small></div>
      ${bar(e.hp, e.maxhp, 'ehp')}
      <div class="foe-stats"><span>Armor ${Math.round(e.pr * 100)}%</span><span>Ward ${Math.round(e.mr * 100)}%</span><span>Evade ${Math.round(e.eva * 100)}%</span>${e.boss ? `<span>Enrage ${Math.max(0, 40 - B.t).toFixed(0)}s</span>` : ''}</div>
      <div class="gauge foe-g"><i style="width:${Math.min(100, B.eg * 100)}%"></i></div>
      <div class="chips">${dots.join('')}${enr}</div>`;
    const prog = C.isBossFloor(P.floor) ? (P.floor < P.maxFloor ? 'Boss defeated' : 'Boss floor: defeat the boss to unlock the next floor') : `${Math.min(P.floorKills, C.KILLS_PER_FLOOR)} / ${C.KILLS_PER_FLOOR} kills${P.floor < P.maxFloor ? ' (cleared)' : ''}`;
    $('#floor-prog').textContent = prog;
    $('#floor-max').textContent = `Highest floor unlocked: ${P.maxFloor}`;
    const cleared = P.floor < P.maxFloor && (C.isBossFloor(P.floor) || P.floorKills >= C.KILLS_PER_FLOOR);
    $('#rest').textContent = fighting ? '' : B.over === 'lose' ? 'Defeated' : cleared ? 'Floor cleared. Go up with ▶' : B.over === 'win' ? 'Victory' : '';
    const L = $('#log');
    const html = logLines.slice(-40).map(l => `<li class="k-${l.kind} ${l.rar !== undefined ? RCOL[l.rar] : ''}">${esc(l.msg)}</li>`).join('');
    if (L._h !== html) { L.innerHTML = html; L._h = html; L.scrollTop = L.scrollHeight; }
  }

  // ---------- Panels ----------
  function renderAll() { renderBattle(); renderPanels(); }
  function renderPanels() {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const pts = $('#tab-stats-pts'); pts.textContent = P.statPts ? P.statPts : ''; pts.hidden = !P.statPts;
    const sp = $('#tab-skills-pts'); sp.textContent = P.skillPts ? P.skillPts : ''; sp.hidden = !P.skillPts;
    const adv = C.canAdvance(P); $('#tab-class-pts').hidden = !(adv && adv.ready);
    renderControls();
    const body = $('#panel');
    const keepScroll = body.scrollTop;
    body.innerHTML = ({ gear: gearPanel, stats: statsPanel, skills: skillsPanel, class: classPanel, save: savePanel })[tab]();
    body.scrollTop = keepScroll;
  }

  const STAT_LABEL = { atk: 'Attack', matk: 'Magic', hp: 'HP', def: 'Defense', mres: 'Magic Resist', crit: '% Crit', critdmg: '% Crit Damage', spd: '% Speed', mp: 'MP', acc: 'Accuracy', eva: 'Evasion' };
  function statLine(k, v) {
    const a = C.AFFIXES[k];
    const name = STAT_LABEL[k] || (a && a.name) || k;
    const isP = (a && a.p) || ['crit', 'critdmg', 'spd'].includes(k);
    return isP ? `+${v.toFixed(1)}${name.startsWith('%') ? name : ' ' + name}` : `+${F(v)} ${name}`;
  }
  function itemCard(it, small) {
    const r = C.RARITIES[it.rar];
    return `<span class="iname ${RCOL[it.rar]}">${esc(it.name)}${it.enh ? ` +${it.enh}` : ''}</span>${small ? '' : `<small>${r.name} ${C.SLOT_NAME[it.slot]} · iLvl ${it.ilvl}</small>`}`;
  }
  const CMP = [
    ['atk', 'Attack', s => s.atk], ['matk', 'Magic', s => s.matk], ['hp', 'HP', s => s.hp],
    ['pr', 'Phys reduction', s => s.physRed * 100, 1], ['mr', 'Magic reduction', s => s.magRed * 100, 1],
    ['spd', 'Speed', s => s.spd, 1], ['crit', 'Crit %', s => s.crit, 1], ['cd', 'Crit dmg %', s => s.critdmg, 1],
    ['dodge', 'Dodge %', s => s.dodge * 100, 1], ['ls', 'Lifesteal %', s => s.ls, 1], ['pen', 'Armor pen %', s => s.pen, 1], ['mf', 'Item rarity %', s => s.mf, 1],
  ];
  function compareHtml(it) {
    const cur = C.computeStats(P, P.floor);
    const eq = Object.assign({}, P.equip); eq[it.slot] = it;
    const isEquipped = P.equip[it.slot] && P.equip[it.slot].id === it.id;
    if (isEquipped) return '<p class="muted">Equipped.</p>';
    const nx = C.computeStats(P, P.floor, eq);
    const rows = CMP.map(([k, n, f, p]) => {
      const d = f(nx) - f(cur); if (Math.abs(d) < (p ? 0.05 : 0.5)) return '';
      const pc = !p && f(cur) ? ` (${d > 0 ? '+' : ''}${(d / f(cur) * 100).toFixed(0)}%)` : '';
      return `<li class="${d > 0 ? 'up' : 'down'}"><span>${n}</span><b>${d > 0 ? '+' : ''}${p ? d.toFixed(1) : F(d)}${pc}</b></li>`;
    }).join('');
    const basicNow = cur.basic, basicNew = nx.basic;
    const warn = basicNow !== basicNew ? `<p class="warn">Basic attacks become ${basicNew === 'magic' ? 'magic (scale with Magic)' : 'physical (scale with Attack)'}.</p>` : '';
    return `<p class="muted">If equipped, vs. ${P.equip[it.slot] ? 'current ' + C.SLOT_NAME[it.slot].toLowerCase() : 'empty slot'}:</p><ul class="cmp">${rows || '<li><span>No change</span></li>'}</ul>${warn}`;
  }
  function propsHtml(it) {
    const st = C.itemStats(it);
    return `<ul class="props">${Object.keys(it.base).map(k => `<li>${statLine(k, st[k] - (it.aff[k] || 0))}${it.enh && ['atk', 'matk', 'hp', 'def', 'mres', 'eva'].includes(k) ? ' <small class="muted">(enhanced)</small>' : ''}</li>`).join('')}
      ${Object.keys(it.aff).map(k => `<li class="aff">${statLine(k, it.aff[k])}</li>`).join('')}</ul>`;
  }
  // Popup for the oldest unseen drop. Items already equipped, salvaged or sold elsewhere are skipped.
  function renderLoot() {
    const box = $('#lootpop');
    while (lootQueue.length && !P.inv.some(x => x.id === lootQueue[0])) lootQueue.shift();
    if (!lootQueue.length) { box.hidden = true; box.innerHTML = ''; return; }
    const it = P.inv.find(x => x.id === lootQueue[0]);
    box.innerHTML = `<div class="lp-head"><span>Item found${lootQueue.length > 1 ? ` <small class="muted">1 of ${lootQueue.length}</small>` : ''}</span>
        <button class="lp-x" data-act="loot-close" aria-label="Keep in bag and close">×</button></div>
      <h3>${itemCard(it)}</h3>
      ${it.wtype ? `<p class="muted">${it.wtype}: ${C.WEAPONS[it.wtype].kind === 'magic' ? 'magic' : 'physical'} basic attacks, ${Math.round(C.WEAPONS[it.wtype].spd * 100)}% attack speed</p>` : ''}
      ${propsHtml(it)}
      ${compareHtml(it)}
      <div class="row"><button class="pri" data-act="loot-eq" data-id="${it.id}">Equip</button>
        <button data-act="loot-close">Keep in bag</button>
        <button data-act="loot-salv" data-id="${it.id}">Salvage (+${C.salvageValue(it)})</button></div>`;
    box.hidden = false;
  }
  function gearPanel() {
    const sel = selId && C.findItem(P, selId);
    const slots = C.SLOTS.map(s => {
      const it = P.equip[s];
      return `<button class="slot ${it && sel && it.id === sel.id ? 'sel' : ''}" data-act="sel" data-id="${it ? it.id : ''}" ${it ? '' : 'disabled'}>
        <small>${C.SLOT_NAME[s]}</small>${it ? itemCard(it, true) : '<span class="muted">Empty</span>'}</button>`;
    }).join('');
    const inv = P.inv.slice().sort((a, b) => b.rar - a.rar || b.ilvl - a.ilvl).map(it => {
      const cur = P.equip[it.slot];
      return `<button class="inv ${sel && sel.id === it.id ? 'sel' : ''}" data-act="sel" data-id="${it.id}">${it.lock ? '<i class="lock" title="Locked">L</i>' : ''}
        ${itemCard(it, true)}<small>${C.SLOT_NAME[it.slot]} · iLvl ${it.ilvl}${cur && it.ilvl > cur.ilvl + 2 ? ' · <b class="up">newer</b>' : ''}</small></button>`;
    }).join('');
    let detail = '<p class="muted">Select an item to see its stats, compare it, or enhance it.</p>';
    if (sel) {
      const isEq = P.equip[sel.slot] && P.equip[sel.slot].id === sel.id;
      const cost = C.enhCost(sel);
      const rate = sel.enh < C.ENH_MAX ? Math.round(C.ENH_RATE[sel.enh] * 100) : 0;
      const canE = sel.enh < C.ENH_MAX && P.gold >= cost.gold && P.shards >= cost.shards;
      detail = `<div class="detail"><h3>${itemCard(sel)}</h3>
        ${sel.wtype ? `<p class="muted">${sel.wtype}: ${C.WEAPONS[sel.wtype].kind === 'magic' ? 'magic basic attacks' : 'physical basic attacks'}, ${Math.round(C.WEAPONS[sel.wtype].spd * 100)}% attack speed</p>` : ''}
        ${propsHtml(sel)}
        ${compareHtml(sel)}
        <div class="enh"><div><b>Enhance to +${sel.enh + 1}</b>${sel.enh >= C.ENH_MAX ? '<p class="muted">Max enhancement.</p>' : `
          <p>${rate}% success · ${F(cost.gold)} gold · ${cost.shards} shards</p>
          <p class="muted">Base stats ×${C.enhMul(sel.enh).toFixed(2)} → ×${C.enhMul(sel.enh + 1).toFixed(2)}.${sel.enh >= 7 ? ' <b class="down">Failure drops one level.</b>' : ''}</p>`}</div>
          <button data-act="enh" data-id="${sel.id}" ${canE ? '' : 'disabled'}>Enhance</button></div>
        <div class="row">${isEq ? `<button data-act="uneq" data-slot="${sel.slot}">Unequip</button>` : `<button class="pri" data-act="eq" data-id="${sel.id}">Equip</button>
          <button data-act="salv" data-id="${sel.id}" ${sel.lock ? 'disabled' : ''}>Salvage (+${C.salvageValue(sel)} shards)</button>
          <button data-act="sell" data-id="${sel.id}" ${sel.lock ? 'disabled' : ''}>Sell (${F(C.itemValue(sel))} gold)</button>`}
          <button data-act="lock" data-id="${sel.id}">${sel.lock ? 'Unlock' : 'Lock'}</button></div></div>`;
    }
    const as = ['Off', 'Common', 'Uncommon and below', 'Rare and below'];
    return `<div class="gear"><section><h2>Equipped</h2><div class="slots">${slots}</div></section>
      <section class="det">${detail}</section>
      <section><div class="inv-head"><h2>Bag <small>${P.inv.length} / 60</small></h2>
        <div class="row"><label for="autosalv">Auto-salvage</label><select id="autosalv" data-act="autosalv">${as.map((n, i) => `<option value="${i}" ${P.autoSalvage === i ? 'selected' : ''}>${n}</option>`).join('')}</select>
        ${confirmKey === 'salvall' ? '<button class="danger" data-act="salvall2">Confirm salvage</button>' : '<button data-act="salvall">Salvage all unlocked</button>'}</div></div>
        <div class="invgrid">${inv || '<p class="muted">Empty. Kill things.</p>'}</div></section></div>`;
  }

  function statsPanel() {
    const a = C.attrsOf(P), st = C.computeStats(P, P.floor);
    const rows = C.ATTRS.map(k => `<li><div><b>${k.toUpperCase()}</b> <span class="num">${Math.round(st.attrs[k])}</span>
        <small class="muted">${P.alloc[k]} spent · ${Math.round(a[k] - P.alloc[k])} from class · ${Math.round(st.attrs[k] - a[k])} gear</small>
        <p class="muted">${C.ATTR_INFO[k]}</p></div>
        <div class="row"><button data-act="pt" data-k="${k}" data-n="1" ${P.statPts ? '' : 'disabled'}>+1</button><button data-act="pt" data-k="${k}" data-n="5" ${P.statPts >= 5 ? '' : 'disabled'}>+5</button></div></li>`).join('');
    const d = [
      ['Attack', F(st.atk)], ['Magic', F(st.matk)], ['HP', F(st.hp)], ['MP', `${F(st.mp)} (+${st.mpRegen.toFixed(1)}/s)`],
      ['Speed', `${Math.round(st.spd)} (${(st.spd / 100).toFixed(2)} actions/s)`], ['Crit', `${st.crit.toFixed(1)}% × ${Math.round(st.critdmg)}%`],
      ['Phys reduction', `${(st.physRed * 100).toFixed(1)}% (Defense ${F(st.def)})`], ['Magic reduction', `${(st.magRed * 100).toFixed(1)}% (Resist ${F(st.mres)})`],
      ['Dodge', `${(st.dodge * 100).toFixed(1)}%`], ['Accuracy', F(st.acc)], ['Lifesteal', `${st.ls.toFixed(1)}%`], ['Armor pen', `${st.pen.toFixed(1)}%`],
      ['Item rarity', `+${st.mf.toFixed(0)}%`], ['Gold find', `+${st.gf.toFixed(0)}%`], ['Basic attack', st.basic === 'magic' ? 'Magic bolt' : 'Physical'],
    ].map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    const rc = C.respecCost(P);
    return `<div class="stats"><section><h2>Attributes <small>${P.statPts} point${P.statPts === 1 ? '' : 's'} to spend</small></h2><ul class="attrs">${rows}</ul>
      <div class="row">${confirmKey === 'respec' ? `<button class="danger" data-act="respec2">Confirm reset (${F(rc)} gold)</button><button data-act="cancel">Cancel</button>` : `<button data-act="respec" ${P.gold >= rc ? '' : 'disabled'}>Reset points (${rc ? F(rc) + ' gold' : 'free before level 10'})</button>`}</div></section>
      <section><h2>Combat stats <small>on floor ${P.floor}</small></h2><ul class="derived">${d}</ul>
      <p class="muted">Defense and resist are measured against your current floor, so the same gear blocks less as you climb.</p></section></div>`;
  }

  function skillsPanel() {
    const chain = C.classChain(P.cls);
    const groups = chain.map(cid => {
      const c = C.CLASSES[cid];
      const items = c.skills.map(id => {
        const sk = C.SKILLS[id], r = P.skills[id] || 0;
        const inRot = P.loadout.indexOf(id);
        return `<li class="skill"><div><b>${sk.name}</b> <small class="tag ${sk.type}">${sk.type}</small> <span class="num">${r} / ${sk.max}</span>
          <p>${r ? sk.desc(r) : '<span class="muted">Not learned.</span>'}</p>
          ${r < sk.max ? `<p class="muted">Next: ${sk.desc(r + 1)}</p>` : ''}
          ${sk.type === 'active' ? `<p class="muted">Cooldown ${sk.cd}s · ${sk.mp(Math.max(1, r))} MP</p>` : ''}</div>
          <div class="row"><button data-act="learn" data-id="${id}" ${P.skillPts && r < sk.max ? '' : 'disabled'}>Learn</button>
          ${sk.type === 'active' && r ? (inRot >= 0 ? `<button data-act="rot-off" data-id="${id}">In rotation #${inRot + 1}</button>${inRot > 0 ? `<button data-act="rot-up" data-id="${id}" aria-label="Move up">↑</button>` : ''}` : `<button data-act="rot-on" data-id="${id}" ${P.loadout.length < 3 ? '' : 'disabled'}>Add to rotation</button>`) : ''}</div></li>`;
      }).join('');
      return `<h3>${c.name}</h3><ul class="skills">${items}</ul>`;
    }).join('');
    const rc = C.respecCost(P);
    return `<div><h2>Skills <small>${P.skillPts} point${P.skillPts === 1 ? '' : 's'} to spend</small></h2>
      <p class="muted">Up to 3 active skills fire automatically, in rotation order, whenever they are off cooldown and you have the MP. Otherwise you basic attack. Passives are always on.</p>
      ${groups}
      <div class="row">${confirmKey === 'skreset' ? `<button class="danger" data-act="skreset2">Confirm reset (${F(rc)} gold)</button><button data-act="cancel">Cancel</button>` : `<button data-act="skreset" ${P.gold >= rc ? '' : 'disabled'}>Reset skills (${F(rc)} gold)</button>`}</div></div>`;
  }

  function classPanel() {
    const c = C.CLASSES[P.cls], adv = C.canAdvance(P);
    const growth = g => Object.entries(g).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ');
    let next = '<p class="muted">You have reached your final class.</p>';
    if (adv) next = `<h2>${adv.ready ? 'Choose your path' : `Class change at level ${adv.need}`}</h2>
      ${adv.ready ? '' : `<p class="muted">${adv.need - P.lvl} more level${adv.need - P.lvl === 1 ? '' : 's'} to go. Preview your options below.</p>`}
      <div class="classes">${adv.options.map(id => { const o = C.CLASSES[id]; return `<div class="cls"><h3>${o.name}</h3><p>${o.desc}</p>
        <ul class="kv"><li><span>Growth per level</span><b>${growth(o.growth)}</b></li><li><span>HP</span><b>×${o.hpMul}</b></li><li><span>MP</span><b>×${o.mpMul}</b></li></ul>
        <p class="muted">Skills: ${o.skills.map(s => C.SKILLS[s].name).join(', ')}</p>
        ${confirmKey === 'adv-' + id ? `<button class="danger" data-act="adv2" data-id="${id}">Confirm: become ${o.name}</button>` : `<button class="pri" data-act="adv" data-id="${id}" ${adv.ready ? '' : 'disabled'}>Become ${o.name}</button>`}</div>`; }).join('')}</div>
      <p class="muted">Class choice is permanent. Growth applies to every level gained since that class unlocks.</p>`;
    return `<div><h2>${c.name}</h2><p>${c.desc}</p><ul class="kv"><li><span>Growth per level</span><b>${growth(c.growth)}</b></li><li><span>Free points per level</span><b>${C.POINTS_PER_LEVEL}</b></li></ul>${next}
      <h2>Enemy types</h2><ul class="kv arch">
      <li><span>Armored</span><b>55% physical reduction. Use magic, poison or armor pen.</b></li>
      <li><span>Warded</span><b>55% magic reduction, magic attacks. Physical damage and Resist.</b></li>
      <li><span>Evasive</span><b>Dodges physical hits. DEX accuracy or spells.</b></li>
      <li><span>Caster</span><b>Heavy magic attacks. Bring Resist (VIT, INT, helms).</b></li>
      <li><span>Tough</span><b>Big HP and hits. Sustain helps.</b></li>
      <li><span>Bosses</span><b>Every 10th floor. Heavy blow every 4th attack, enrage after 40s.</b></li></ul></div>`;
  }

  function savePanel() {
    return `<div><h2>Save</h2><p class="muted">Progress saves on this device after every fight. Copy the save code to move your character to another device.</p>
      <label for="exportbox">Save code</label><textarea id="exportbox" rows="4" readonly>${esc(btoa(unescape(encodeURIComponent(JSON.stringify(P)))))}</textarea>
      <div class="row"><button data-act="copy">Copy save code</button><span id="copymsg" class="muted"></span></div>
      <label for="importbox">Load a save code</label><textarea id="importbox" rows="3" placeholder="Paste a save code"></textarea>
      <div class="row"><button data-act="import">Load</button><span id="importmsg" class="muted"></span></div>
      <h2>Record</h2><ul class="kv"><li><span>Kills</span><b>${F(P.stats.kills)}</b></li><li><span>Deaths</span><b>${F(P.stats.deaths)}</b></li><li><span>Bosses</span><b>${P.stats.bosses}</b></li><li><span>Highest floor</span><b>${P.maxFloor}</b></li></ul>
      <div class="row">${confirmKey === 'wipe' ? '<button class="danger" data-act="wipe2">Erase everything</button><button data-act="cancel">Cancel</button>' : '<button data-act="wipe">Start over</button>'}</div></div>`;
  }

  // ---------- Events ----------
  function bind() {
    document.addEventListener('click', ev => {
      const t = ev.target.closest('[data-act],[data-tab]'); if (!t || t.disabled) return;
      if (t.dataset.tab) { tab = t.dataset.tab; confirmKey = null; renderPanels(); return; }
      act(t.dataset.act, t.dataset);
    });
    document.addEventListener('keydown', ev => {
      if (ev.target.closest('input, textarea, select, button')) return;
      if (ev.code === 'Space' || ev.code === 'Enter') { ev.preventDefault(); if (fighting) skip(); else fight(); }
    });
    document.addEventListener('change', ev => {
      const t = ev.target;
      if (t.id === 'autosalv') { P.autoSalvage = +t.value; save(); }
    });
  }
  function act(a, d) {
    const id = d.id && !isNaN(d.id) ? +d.id : d.id;
    const k = a;
    if (k !== 'salvall' && k !== 'respec' && k !== 'skreset' && k !== 'wipe' && k !== 'adv') confirmKey = null;
    switch (k) {
      case 'loot-close': lootQueue.shift(); renderLoot(); return;
      case 'loot-eq': lootQueue.shift(); C.equip(P, id); log('loot', `Equipped ${C.findItem(P, id).name}.`); renderLoot(); break;
      case 'loot-salv': { lootQueue.shift(); const v = C.salvage(P, id); if (v) log('salv', `Salvaged for ${v} shards.`); renderLoot(); break; }
      case 'fight': fight(); return;
      case 'skip': skip(); return;
      case 'fdown': case 'fup': case 'ftop': {
        if (fighting || cooldown > 0) return;
        const to = k === 'fdown' ? P.floor - 1 : k === 'fup' ? P.floor + 1 : P.maxFloor;
        if (to < 1 || to > P.maxFloor || to === P.floor) return;
        P.floor = to; P.floorKills = 0; log('floor', `Moved to floor ${P.floor}.`); nextEnemy(); break;
      }
      case 'sel': selId = id; break;
      case 'eq': C.equip(P, id); break;
      case 'uneq': C.unequip(P, d.slot); break;
      case 'salv': { const v = C.salvage(P, id); if (v) { log('salv', `Salvaged for ${v} shards.`); selId = null; } break; }
      case 'sell': { const i = P.inv.findIndex(x => x.id === id); if (i >= 0 && !P.inv[i].lock) { const v = C.itemValue(P.inv[i]); P.gold += v; P.inv.splice(i, 1); log('salv', `Sold for ${F(v)} gold.`); selId = null; } break; }
      case 'lock': { const it = C.findItem(P, id); if (it) it.lock = !it.lock; break; }
      case 'enh': { const r = C.enhance(P, id); if (r.ok) log(r.success ? 'level' : 'death', r.msg); break; }
      case 'salvall': confirmKey = 'salvall'; break;
      case 'salvall2': { let n = 0, v = 0; for (const it of P.inv.slice()) { const s = C.salvage(P, it.id); if (s) { n++; v += s; } } log('salv', `Salvaged ${n} items for ${v} shards.`); confirmKey = null; selId = null; break; }
      case 'pt': { const n = Math.min(+d.n, P.statPts); P.alloc[d.k] += n; P.statPts -= n; break; }
      case 'respec': confirmKey = 'respec'; break;
      case 'respec2': if (C.respecStats(P)) log('level', 'Attribute points reset.'); confirmKey = null; break;
      case 'learn': C.learn(P, id); break;
      case 'rot-on': if (P.loadout.length < 3 && !P.loadout.includes(id)) P.loadout.push(id); break;
      case 'rot-off': P.loadout = P.loadout.filter(x => x !== id); break;
      case 'rot-up': { const i = P.loadout.indexOf(id); if (i > 0) { [P.loadout[i - 1], P.loadout[i]] = [P.loadout[i], P.loadout[i - 1]]; } break; }
      case 'skreset': confirmKey = 'skreset'; break;
      case 'skreset2': if (C.respecSkills(P)) log('level', 'Skill points reset.'); confirmKey = null; break;
      case 'adv': confirmKey = 'adv-' + id; break;
      case 'adv2': if (C.advance(P, id)) { log('level', `You are now a ${C.CLASSES[id].name}. New skills are waiting in the Skills tab.`); B.st = C.computeStats(P, P.floor); } confirmKey = null; break;
      case 'cancel': confirmKey = null; break;
      case 'copy': {
        const box = $('#exportbox'), msg = $('#copymsg');
        navigator.clipboard.writeText(box.value).then(() => { msg.textContent = 'Copied.'; }, () => { box.select(); msg.textContent = 'Select and copy the text above.'; });
        return;
      }
      case 'import': {
        const msg = $('#importmsg');
        try { const np = JSON.parse(decodeURIComponent(escape(atob($('#importbox').value.trim())))); if (!np || !np.alloc || !np.equip) throw 0; P = Object.assign(C.newPlayer(), np, { autoClimb: false }); fighting = false; nextEnemy(); log('floor', 'Save loaded.'); save(); }
        catch (e) { msg.textContent = 'That code is not a valid save. Copy the whole code and try again.'; return; }
        break;
      }
      case 'wipe': confirmKey = 'wipe'; break;
      case 'wipe2': P = C.newPlayer(); logLines = []; lootQueue = []; renderLoot(); fighting = false; confirmKey = null; selId = null; log('floor', 'A new climber enters floor 1.'); nextEnemy(); save(); break;
    }
    // Between fights, show the new numbers at full health. Mid-fight changes apply at the current HP ratio.
    const hpR = fighting ? B.hp / B.st.hp : 1, mpR = fighting ? B.mp / B.st.mp : 1;
    if (!B.over) { B.st = C.computeStats(P, P.floor); B.hp = Math.min(B.st.hp, hpR * B.st.hp); B.mp = Math.min(B.st.mp, mpR * B.st.mp); }
    save(); renderAll();
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start); else start();
})();
