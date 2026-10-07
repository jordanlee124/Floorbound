// Current class, the next class choice, and a guide to enemy types.
import { Panel } from './Panel.js';
import { Skill, POINTS_PER_LEVEL } from '../../game/index.js';
import { plural } from '../dom.js';

const growthText = g => Object.entries(g).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ');

export class ClassPanel extends Panel {
  static id = 'class';
  get badge() { const a = this.player.advancement; return !!(a && a.ready); }

  get actions() {
    return {
      'advance-class': ({ id }) => {
        if (!this.player.advanceTo(id)) return;
        this.game.log('level', `You are now a ${this.player.characterClass.name}. New skills are waiting in the Skills tab.`);
      },
    };
  }

  #option(c, ready) {
    const button = ready
      ? this.confirmButton(`advance-${c.id}`, { label: `Become ${c.name}`, confirmLabel: `Confirm: become ${c.name}`, action: 'advance-class', id: c.id })
      : `<button disabled>Become ${c.name}</button>`;
    return `<div class="cls"><h3>${c.name}</h3><p>${c.desc}</p>
      <ul class="kv"><li><span>Growth per level</span><b>${growthText(c.growth)}</b></li><li><span>HP</span><b>×${c.hpMul}</b></li><li><span>MP</span><b>×${c.mpMul}</b></li></ul>
      <p class="muted">Skills: ${c.skillIds.map(s => Skill.get(s).name).join(', ')}</p>
      <div class="row">${button}</div></div>`;
  }

  render() {
    const p = this.player, c = p.characterClass, adv = p.advancement;
    let next = '<p class="muted">You have reached your final class.</p>';
    if (adv) {
      const togo = adv.level - p.lvl;
      next = `<h2>${adv.ready ? 'Choose your path' : `Class change at level ${adv.level}`}</h2>
        ${adv.ready ? '' : `<p class="muted">${plural(togo, 'more level')} to go. Preview your options below.</p>`}
        <div class="classes">${adv.options.map(o => this.#option(o, adv.ready)).join('')}</div>
        <p class="muted">Class choice is permanent. Growth applies to every level gained since that class unlocks.</p>`;
    }
    return `<div><h2>${c.name}</h2><p>${c.desc}</p>
      <ul class="kv"><li><span>Growth per level</span><b>${growthText(c.growth)}</b></li><li><span>Free points per level</span><b>${POINTS_PER_LEVEL}</b></li></ul>${next}
      <h2>Enemy types</h2><ul class="kv arch">
      <li><span>Armored</span><b>55% physical reduction. Use magic, poison or armor pen.</b></li>
      <li><span>Warded</span><b>55% magic reduction, magic attacks. Physical damage and Resist.</b></li>
      <li><span>Evasive</span><b>Dodges physical hits. DEX accuracy or spells.</b></li>
      <li><span>Caster</span><b>Heavy magic attacks. Bring Resist (VIT, INT, helms).</b></li>
      <li><span>Tough</span><b>Big HP and hits. Sustain helps.</b></li>
      <li><span>Bosses</span><b>Every 10th floor. Heavy blow every 4th attack, enrage after 40s.</b></li></ul></div>`;
  }
}
