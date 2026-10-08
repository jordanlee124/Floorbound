// Ability points (AP) and the derived combat stats they produce.
import { Panel } from './Panel.js';
import { ATTRS, ATTR_INFO, POINTS_PER_LEVEL, fmt } from '../../game/index.js';

export class StatsPanel extends Panel {
  static id = 'stats';
  get badge() { return this.player.statPts; }

  get actions() {
    return {
      allocate: ({ attr, n }) => this.player.allocate(attr, Number(n)),
      'auto-assign': () => this.player.autoAssign(),
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
      ['Dodge', `${(st.dodge * 100).toFixed(1)}%`], ['Accuracy', fmt(st.acc)], ['Damage', `+${st.dmg.toFixed(0)}% (+${st.boss.toFixed(0)}% vs bosses)`], ['Lifesteal', `${st.ls.toFixed(1)}%`], ['Armor pen', `${st.pen.toFixed(1)}%`],
      ['Item sets', p.activeSets().map(s => `${s.set.name} ${s.count}/${s.set.slots.length}`).join(', ') || 'None'],
      ['Item rarity', `+${st.mf.toFixed(0)}%`], ['Gold find', `+${st.gf.toFixed(0)}%`], ['Basic attack', st.basic === 'magic' ? 'Magic bolt' : 'Physical'],
    ].map(([k, v]) => `<li><span>${k}</span><b>${v}</b></li>`).join('');
    const cost = p.respecCost;
    const growth = Object.keys(p.characterClass.growth).map(k => k.toUpperCase()).join('/');
    const reset = this.confirmButton('reset-attributes', {
      label: `Reset AP (${cost ? fmt(cost) + ' gold' : 'free before level 10'})`,
      confirmLabel: `Confirm reset (${fmt(cost)} gold)`, action: 'reset-attributes', enabled: p.gold >= cost,
    });
    return `<div class="stats"><section><h2>Attributes <small>${p.statPts} AP to spend</small></h2>
      <p class="muted">You get ${POINTS_PER_LEVEL} AP every level. Auto-assign spends it all in your class's ${growth} ratio.</p><ul class="attrs">${rows}</ul>
      <div class="row"><button data-act="auto-assign" ${p.statPts ? '' : 'disabled'}>Auto-assign</button>${reset}</div></section>
      <section><h2>Combat stats <small>on floor ${p.floor}</small></h2><ul class="derived">${derived}</ul>
      <p class="muted">Defense and resist are measured against your current floor, so the same gear blocks less as you climb.</p></section></div>`;
  }
}
