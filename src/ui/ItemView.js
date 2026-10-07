// How items and stat comparisons are shown. Used by the Gear panel and the loot popup.
import { AFFIXES, RARITIES, SLOT_NAME, Item, fmt } from '../game/index.js';
import { esc, rarityClass } from './dom.js';

const STAT_LABEL = { atk: 'Attack', matk: 'Magic', hp: 'HP', def: 'Defense', mres: 'Magic Resist', crit: '% Crit', critdmg: '% Crit Damage', spd: '% Speed', mp: 'MP', acc: 'Accuracy', eva: 'Evasion' };
const PERCENT_BASE = ['crit', 'critdmg', 'spd'];
const ENHANCED = ['atk', 'matk', 'hp', 'def', 'mres', 'eva'];

// [label, read value from combat stats, shown as percent points?]
const COMPARE_ROWS = [
  ['Attack', s => s.atk], ['Magic', s => s.matk], ['HP', s => s.hp],
  ['Phys reduction', s => s.physRed * 100, true], ['Magic reduction', s => s.magRed * 100, true],
  ['Speed', s => s.spd, true], ['Crit %', s => s.crit, true], ['Crit dmg %', s => s.critdmg, true],
  ['Dodge %', s => s.dodge * 100, true], ['Lifesteal %', s => s.ls, true], ['Armor pen %', s => s.pen, true], ['Item rarity %', s => s.mf, true],
];

export class ItemView {
  static statLine(key, value) {
    const affix = AFFIXES[key];
    const name = STAT_LABEL[key] || (affix && affix.name) || key;
    const isPercent = (affix && affix.percent) || PERCENT_BASE.includes(key);
    return isPercent ? `+${value.toFixed(1)}${name.startsWith('%') ? name : ' ' + name}` : `+${fmt(value)} ${name}`;
  }

  // Name in rarity colour; the long form adds rarity, slot and item level.
  static title(it, short = false) {
    const meta = short ? '' : `<small>${RARITIES[it.rar].name} ${SLOT_NAME[it.slot]} · iLvl ${it.ilvl}</small>`;
    return `<span class="iname ${rarityClass(it.rar)}">${esc(it.displayName)}</span>${meta}`;
  }

  static weaponNote(it) {
    const w = it.weapon;
    if (!w) return '';
    return `<p class="muted">${it.wtype}: ${w.kind === 'magic' ? 'magic' : 'physical'} basic attacks, ${Math.round(w.spd * 100)}% attack speed</p>`;
  }

  static properties(it) {
    const st = it.stats;
    const base = Object.keys(it.base).map(k =>
      `<li>${ItemView.statLine(k, st[k] - (it.aff[k] || 0))}${it.enh && ENHANCED.includes(k) ? ' <small class="muted">(enhanced)</small>' : ''}</li>`);
    const affixes = Object.keys(it.aff).map(k => `<li class="aff">${ItemView.statLine(k, it.aff[k])}</li>`);
    return `<ul class="props">${base.join('')}${affixes.join('')}</ul>`;
  }

  // How the player's combat stats would change if they equipped this item.
  static comparison(player, it) {
    if (player.isEquipped(it)) return '<p class="muted">Equipped.</p>';
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

  static enhancePanel(player, it) {
    if (!it.canEnhance) return `<div class="enh"><div><b>+${it.enh}</b><p class="muted">Max enhancement.</p></div></div>`;
    const cost = it.enhanceCost;
    const affordable = player.gold >= cost.gold && player.shards >= cost.shards;
    return `<div class="enh"><div><b>Enhance to +${it.enh + 1}</b>
        <p>${Math.round(it.enhanceChance * 100)}% success · ${fmt(cost.gold)} gold · ${cost.shards} shards</p>
        <p class="muted">Base stats ×${Item.enhanceMultiplier(it.enh).toFixed(2)} → ×${Item.enhanceMultiplier(it.enh + 1).toFixed(2)}.${it.enhanceRisky ? ' <b class="down">Failure drops one level.</b>' : ''}</p></div>
      <button data-act="enhance" data-id="${it.id}" ${affordable ? '' : 'disabled'}>Enhance</button></div>`;
  }
}
