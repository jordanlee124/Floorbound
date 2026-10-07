// Attribute points and the derived combat stats they produce.
import { Panel } from './Panel.js';
import { ATTRS, ATTR_INFO, fmt } from '../../game/index.js';
import { plural } from '../dom.js';

export class StatsPanel extends Panel {
  static id = 'stats';
  get badge() { return this.player.statPts; }

  get actions() {
    return {
      allocate: ({ attr, n }) => this.player.allocate(attr, Number(n)),
      'reset-attributes': () => { if (this.player.resetAttributes()) this.game.log('level', 'Attribute points reset.'); },
    };
  }

  render() {
    const p = this.player, base = p.attributes, st = p.combatStats();
    const rows = ATTRS.map(k => `<li><div><b>${k.toUpperCase()}</b> <span class="num">${Math.round(st.attrs[k])}</span>
        <small class="muted">${p.alloc[k]} spent · ${Math.round(base[k] - p.alloc[k])} from class · ${Math.round(st.attrs[k] - base[k])} gear</small>
        <p class="muted">${ATTR_INFO[k]}</p></div>
        <div class="row"><button data-act="allocate" data-attr="${k}" data-n="1" ${p.statPts ? '' : 'disabled'}>+1</button><button data-act="allocate" data-attr="${k}" data-n="5" ${p.statPts >= 5 ? '' : 'disabled'}>+5</button></div></li>`).join('');
    const derived = [
      ['Attack', fmt(st.atk)], ['Magic', fmt(st.matk)], ['HP', fmt(st.hp)], ['MP', `${fmt(st.mp)} (+${st.mpRegen.toFixed(1)}/s)`],
      ['Speed', `${Math.round(st.spd)} (${(st.spd / 100).toFixed(2)} actions/s)`], ['Crit', `${st.crit.toFixed(1)}% × ${Math.round(st.critdmg)}%`],
      ['Phys reduction', `${(st.physRed * 100).toFixed(1)}% (Defense ${fmt(st.def)})`], ['Magic reduction', `${(st.magRed * 100).toFixed(1)}% (Resist ${fmt(st.mres)})`],
      ['Dodge', `${(st.dodge * 100).toFixed(1)}%`], ['Accuracy', fmt(st.acc)], ['Lifesteal', `${st.ls.toFixed(1)}%`], ['Armor pen', `${st.pen.toFixed(1)}%`],
      ['Item rarity', `+${st.mf.toFixed(0)}%`], ['Gold find', `+${st.gf.toFixed(0)}%`], ['Basic attack', st.basic === 'magic' ? 'Magic bolt' : 'Physical'],
    ].map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    const cost = p.respecCost;
    const reset = this.confirmButton('reset-attributes', {
      label: `Reset points (${cost ? fmt(cost) + ' gold' : 'free before level 10'})`,
      confirmLabel: `Confirm reset (${fmt(cost)} gold)`, action: 'reset-attributes', enabled: p.gold >= cost,
    });
    return `<div class="stats"><section><h2>Attributes <small>${plural(p.statPts, 'point')} to spend</small></h2><ul class="attrs">${rows}</ul>
      <div class="row">${reset}</div></section>
      <section><h2>Combat stats <small>on floor ${p.floor}</small></h2><ul class="derived">${derived}</ul>
      <p class="muted">Defense and resist are measured against your current floor, so the same gear blocks less as you climb.</p></section></div>`;
  }
}
