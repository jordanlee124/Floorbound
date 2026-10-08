// How items and stat comparisons are shown. Used by the Gear panel and the loot popup.
import { POTENTIALS, RARITIES, SLOT_NAME, STAR_STATS, CUBES, LEGENDARY, SAFEGUARD_COST_MUL, Item, fmt } from '../game/index.js';
import { esc, rarityClass } from './dom.js';

const STAT_LABEL = { str: 'STR', dex: 'DEX', int: 'INT', vit: 'VIT', luk: 'LUK', atk: 'Attack', matk: 'Magic', hp: 'HP', def: 'Defense', mres: 'Magic Resist', crit: '% Crit', critdmg: '% Crit Damage', spd: '% Speed', mp: 'MP', acc: 'Accuracy', eva: 'Evasion' };
const PERCENT_BASE = ['crit', 'critdmg', 'spd'];
const pct = x => `${Math.round(x * 1000) / 10}%`;
const SET_LABEL = { atkp: '% Attack', matkp: '% Magic', hpp: '% HP', mpp: '% MP', defp: '% Defense', ls: '% Lifesteal', crit: '% Crit',
  critdmg: '% Crit damage', spellCrit: '% Spell crit', pen: '% Armor pen', dmg: '% Damage', boss: '% Boss damage', mf: '% Item rarity', gf: '% Gold find', allstat: '% All stats' };
const setBonusText = b => Object.entries(b).map(([k, v]) => k === 'weaken' ? `Enemies deal ${Math.round(v * 100)}% less damage` : `+${v}${SET_LABEL[k] || ' ' + k}`).join(', ');

// [label, read value from combat stats, shown as percent points?]
const COMPARE_ROWS = [
  ['Attack', s => s.atk], ['Magic', s => s.matk], ['HP', s => s.hp],
  ['Phys reduction', s => s.physRed * 100, true], ['Magic reduction', s => s.magRed * 100, true],
  ['Speed', s => s.spd, true], ['Crit %', s => s.crit, true], ['Crit dmg %', s => s.critdmg, true],
  ['Dodge %', s => s.dodge * 100, true], ['Damage %', s => s.dmg, true], ['Boss damage %', s => s.boss, true], ['Lifesteal %', s => s.ls, true], ['Armor pen %', s => s.pen, true], ['Item rarity %', s => s.mf, true],
];

export class ItemView {
  static statLine(key, value) {
    const affix = POTENTIALS[key];
    const name = STAT_LABEL[key] || (affix && affix.name) || key;
    const isPercent = (affix && affix.percent) || PERCENT_BASE.includes(key);
    return isPercent ? `+${value.toFixed(1)}${name.startsWith('%') ? name : ' ' + name}` : `+${fmt(value)} ${name}`;
  }

  // Name in potential-tier colour; the long form adds tier, slot and item level.
  static title(it, short = false) {
    const meta = short ? '' : `<small>${RARITIES[it.rar].name} ${SLOT_NAME[it.slot]} · Lv ${it.ilvl} · ${it.jobDef ? it.jobDef.name : 'Any class'}</small>`;
    return `<span class="iname ${rarityClass(it.rar)}">${esc(it.displayName)}</span>${meta}`;
  }

  static weaponNote(it) {
    const w = it.weapon;
    if (!w) return '';
    return `<p class="muted">${it.wtype}: ${w.kind === 'magic' ? 'magic' : 'physical'} basic attacks, ${Math.round(w.spd * 100)}% attack speed</p>`;
  }

  // Filled and empty stars in groups of five, like MapleStory's star row.
  static stars(it) {
    let out = '';
    for (let i = 0; i < it.maxStars; i++) out += (i && i % 5 === 0 ? ' ' : '') + (i < it.stars ? '★' : '<i>★</i>');
    return `<p class="stars" aria-label="${it.stars} of ${it.maxStars} stars">${out}</p>`;
  }

  static lines(lines) {
    return lines.map(l => `<li class="r${l.t}">${ItemView.statLine(l.k, l.value)}</li>`).join('');
  }

  static properties(it) {
    const st = it.stats;
    const base = Object.keys(it.base).map(k =>
      `<li>${ItemView.statLine(k, it.broken ? 0 : st[k] - it.lines.filter(l => l.k === k).reduce((a, l) => a + l.value, 0))}${it.stars && STAR_STATS.includes(k) ? ' <small class="muted">(★)</small>' : ''}</li>`);
    const pot = it.rar ? `<li class="pot-head">Potential: <span class="r${it.rar}">${RARITIES[it.rar].name}</span></li>${ItemView.lines(it.lines)}` : '<li class="pot-head">No potential. A cube reveals Rare lines.</li>';
    const broken = it.broken ? '<li class="broken">Destroyed by Star Force: gives no stats until repaired.</li>' : '';
    return `${ItemView.stars(it)}<ul class="props">${broken}${base.join('')}${pot}</ul>`;
  }

  // Set name, how many pieces you would wear with this item on, and every bonus tier (lit when active).
  static setInfo(player, it) {
    const set = it.setDef;
    if (!set) return '';
    const worn = player.activeSets({ ...player.equip, [it.slot]: it }).find(s => s.id === it.set);
    const count = worn ? worn.count : 0;
    const tiers = Object.entries(set.bonus).map(([n, b]) =>
      `<li class="${count >= n ? 'on' : 'muted'}">(${n}) ${setBonusText(b)}</li>`).join('');
    return `<div class="setinfo"><b>${set.name} set</b> <small class="muted">${count} / ${set.slots.length} worn${player.isEquipped(it) ? '' : ' with this item'}</small>
      <ul class="props">${tiers}</ul></div>`;
  }

  // How the player's combat stats would change if they equipped this item.
  static comparison(player, it) {
    if (player.isEquipped(it)) return '<p class="muted">Equipped.</p>';
    if (!player.canEquip(it)) return `<p class="warn">${it.jobDef.name} gear: your class can't equip it. Salvage or sell it.</p>`;
    const cur = player.combatStats();
    const next = player.combatStats(player.floor, { ...player.equip, [it.slot]: it });
    const rows = COMPARE_ROWS.map(([label, read, points]) => {
      const d = read(next) - read(cur);
      if (Math.abs(d) < (points ? 0.05 : 0.5)) return '';
      const rel = !points && read(cur) ? ` (${d > 0 ? '+' : ''}${(d / read(cur) * 100).toFixed(0)}%)` : '';
      return `<li class="${d > 0 ? 'up' : 'down'}"><span>${label}</span><b>${d > 0 ? '+' : ''}${points ? d.toFixed(1) : fmt(d)}${rel}</b></li>`;
    }).join('');
    const warn = cur.basic !== next.basic
      ? `<p class="warn">Basic attacks become ${next.basic === 'magic' ? 'magic (scale with Magic)' : 'physical (scale with Attack)'}.</p>` : '';
    const against = player.equip[it.slot] ? 'current ' + SLOT_NAME[it.slot].toLowerCase() : 'empty slot';
    return `<p class="muted">If equipped, vs. ${against}:</p><ul class="cmp">${rows || '<li><span>No change</span></li>'}</ul>${warn}`;
  }

  static starForcePanel(player, it, safeguard) {
    if (it.broken) {
      return `<div class="enh"><div><b class="down">Destroyed</b><p>Repair it back to ★${it.stars} for ${fmt(it.repairCost)} gold.</p></div>
        <button data-act="repair" data-id="${it.id}" ${player.gold >= it.repairCost ? '' : 'disabled'}>Repair</button></div>`;
    }
    if (!it.canStar) return `<div class="enh"><div><b>★${it.stars}</b><p class="muted">Max stars for a level ${it.ilvl} item.</p></div></div>`;
    const guard = safeguard && it.canSafeguard;
    const o = it.starOdds(guard), cost = it.starCost(guard);
    const fail = 1 - o.success - o.destroy;
    const odds = it.chanceTime ? '<span class="chance">Chance Time: 100% success</span>'
      : `${pct(o.success)} success · ${pct(fail)} ${o.drop ? '<span class="down">drop a star</span>' : 'keep'}${o.destroy ? ` · <b class="down">${pct(o.destroy)} destroy</b>` : ''}`;
    const sg = it.canSafeguard
      ? `<label><input type="checkbox" data-act="safeguard" ${guard ? 'checked' : ''}> Safeguard (no destroy, ${SAFEGUARD_COST_MUL}× cost)</label>` : '';
    return `<div class="enh"><div><b>Star Force ★${it.stars} → ★${it.stars + 1}</b>
        <p class="odds">${odds}</p>
        <p class="muted">${fmt(cost)} gold · base stats ×${Item.starMultiplier(it.stars).toFixed(2)} → ×${Item.starMultiplier(it.stars + 1).toFixed(2)}</p>${sg}</div>
      <button data-act="star" data-id="${it.id}" ${player.gold >= cost ? '' : 'disabled'}>Star</button></div>`;
  }

  static cubePanel(player, it) {
    if (it.pending) {
      const res = it.pendingLines;
      return `<div class="enh"><b>Black Cube result</b><div class="pending">
        <div><small class="muted">Current</small><span class="r${it.rar}">${RARITIES[it.rar].name}</span><ul class="props">${ItemView.lines(it.lines)}</ul>
          <button data-act="cube-keep" data-id="${it.id}" data-keep="0">Keep current</button></div>
        <div><small class="muted">New</small><span class="r${it.pending.rar}">${RARITIES[it.pending.rar].name}${it.pending.rar > it.rar ? ' (tier up!)' : ''}</span><ul class="props">${ItemView.lines(res)}</ul>
          <button class="pri" data-act="cube-keep" data-id="${it.id}" data-keep="1">Keep new</button></div></div></div>`;
    }
    const rows = Object.entries(CUBES).map(([type, c]) => {
      const up = it.tierUpChance(type);
      const next = it.rar < LEGENDARY ? `${pct(up)} to reach ${RARITIES[it.rar + 1].name}${it.rar ? ` · guaranteed in ${c.pity[it.rar] - it.cubePity(type)}` : ''}` : 'Rerolls lines';
      return `<div class="row"><button data-act="cube" data-type="${type}" data-id="${it.id}" ${player.cubes[type] ? '' : 'disabled'}>Use ${c.name} (${player.cubes[type]})</button>
        <small class="muted">${next}</small>
        <button data-act="buy-cube" data-type="${type}" ${player.shards >= c.shards ? '' : 'disabled'}>Buy for ${c.shards} shards</button></div>`;
    }).join('');
    return `<div class="enh"><div><b>Cubes</b><p class="muted">A Red Cube rerolls the lines at once. A Black Cube lets you keep the old lines instead.</p>${rows}</div></div>`;
  }
}
