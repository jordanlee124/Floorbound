// Learn skills and choose which actives fire, in what order.
import { Panel } from './Panel.js';
import { Skill, ROTATION_SIZE, fmt } from '../../game/index.js';
import { plural } from '../dom.js';

export class SkillsPanel extends Panel {
  static id = 'skills';
  get badge() { return this.player.skillPts; }

  get actions() {
    const p = this.player;
    return {
      learn: ({ id }) => p.learnSkill(id),
      'rotation-add': ({ id }) => p.addToRotation(id),
      'rotation-remove': ({ id }) => p.removeFromRotation(id),
      'rotation-up': ({ id }) => p.moveUpInRotation(id),
      'reset-skills': () => { if (p.resetSkills()) this.game.log('level', 'Skill points reset.'); },
    };
  }

  #skillRow(sk) {
    const p = this.player, r = p.skillRank(sk.id), slot = p.loadout.indexOf(sk.id);
    let rotation = '';
    if (sk.isActive && r) {
      rotation = slot >= 0
        ? `<button data-act="rotation-remove" data-id="${sk.id}">In rotation #${slot + 1}</button>${slot > 0 ? `<button data-act="rotation-up" data-id="${sk.id}" aria-label="Move up">↑</button>` : ''}`
        : `<button data-act="rotation-add" data-id="${sk.id}" ${p.loadout.length < ROTATION_SIZE ? '' : 'disabled'}>Add to rotation</button>`;
    }
    return `<li class="skill"><div><b>${sk.name}</b> <small class="tag ${sk.type}">${sk.type}</small> <span class="num">${r} / ${sk.maxRank}</span>
        <p>${r ? sk.describe(r) : '<span class="muted">Not learned.</span>'}</p>
        ${r < sk.maxRank ? `<p class="muted">Next: ${sk.describe(r + 1)}</p>` : ''}
        ${sk.isActive ? `<p class="muted">Cooldown ${sk.cooldown}s · ${sk.manaCost(Math.max(1, r))} MP</p>` : ''}</div>
      <div class="row"><button data-act="learn" data-id="${sk.id}" ${p.skillPts && r < sk.maxRank ? '' : 'disabled'}>Learn</button>${rotation}</div></li>`;
  }

  render() {
    const p = this.player;
    const groups = p.characterClass.lineage.map(c =>
      `<h3>${c.name}</h3><ul class="skills">${c.skillIds.map(id => this.#skillRow(Skill.get(id))).join('')}</ul>`).join('');
    const cost = p.respecCost;
    const reset = this.confirmButton('reset-skills', {
      label: `Reset skills (${cost ? fmt(cost) + ' gold' : 'free before level 10'})`,
      confirmLabel: `Confirm reset (${fmt(cost)} gold)`, action: 'reset-skills', enabled: p.gold >= cost,
    });
    return `<div><h2>Skills <small>${plural(p.skillPts, 'point')} to spend</small></h2>
      <p class="muted">Up to ${ROTATION_SIZE} active skills fire automatically, in rotation order, whenever they are off cooldown and you have the MP. Otherwise you basic attack. Passives are always on.</p>
      ${groups}
      <div class="row">${reset}</div></div>`;
  }
}
