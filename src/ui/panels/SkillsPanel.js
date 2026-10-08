// Spend each job's SP on its skills and choose which actives fire, in what order.
import { Panel } from './Panel.js';
import { Skill, fmt } from '../../game/index.js';

export class SkillsPanel extends Panel {
  static id = 'skills';
  get badge() { return this.player.skillPts; }

  get actions() {
    const p = this.player;
    return {
      learn: ({ id, n }) => p.learnSkill(id, n === 'max' ? Infinity : Number(n) || 1),
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
        : `<button data-act="rotation-add" data-id="${sk.id}" ${p.loadout.length < p.rotationSize ? '' : 'disabled'}>Add to rotation</button>`;
    }
    return `<li class="skill"><div><b>${sk.name}</b> <small class="tag ${sk.type}">${sk.type}</small> <span class="num">${r} / ${sk.maxRank}</span>
        <p>${r ? sk.describe(r) : '<span class="muted">Not learned.</span>'}</p>
        ${r < sk.maxRank ? `<p class="muted">Next: ${sk.describe(r + 1)}</p>` : ''}
        ${sk.isActive ? `<p class="muted">Cooldown ${sk.cooldown}s · ${sk.manaCost(Math.max(1, r))} MP</p>` : ''}</div>
      <div class="row">${this.#learnButtons(sk)}${rotation}</div></li>`;
  }

  #learnButtons(sk) {
    const can = this.player.canLearn(sk.id) ? '' : 'disabled';
    return `<button data-act="learn" data-id="${sk.id}" data-n="1" ${can}>+1</button><button data-act="learn" data-id="${sk.id}" data-n="5" ${can}>+5</button><button data-act="learn" data-id="${sk.id}" data-n="max" ${can}>Max</button>`;
  }

  render() {
    const p = this.player;
    // One skill book per job. SP from a job's levels only goes into that job's skills.
    const groups = p.characterClass.lineage.map(c => {
      const sp = p.spFor(c.tier);
      return `<h3>${c.name} <small class="muted">${c.tier ? `${c.jobName} · ` : ''}${sp} SP left</small></h3>
        <ul class="skills">${c.skillIds.map(id => this.#skillRow(Skill.get(id))).join('')}</ul>`;
    }).join('');
    const adv = p.advancement, waiting = adv ? p.spFor(p.characterClass.tier + 1) : 0;
    const cost = p.respecCost;
    const reset = this.confirmButton('reset-skills', {
      label: `Reset skills (${cost ? fmt(cost) + ' gold' : 'free before level 10'})`,
      confirmLabel: `Confirm reset (${fmt(cost)} gold)`, action: 'reset-skills', enabled: p.gold >= cost,
    });
    return `<div><h2>Skills <small>${p.skillPts} SP to spend</small></h2>
      <p class="muted">Each job has its own skill book. Levels in a job's range (Novice 1-9, 1st job 10-29, 2nd 30-59, 3rd 60-99, 4th 100-199, 5th 200+) give SP that can only go into that job's skills.</p>
      <p class="muted">Up to ${p.rotationSize} active skills fire automatically, in rotation order, whenever they are off cooldown and you have the MP. Otherwise you basic attack. Passives and boosts are always on; a boost upgrades attacks you already have. The rotation grows by one at 3rd, 4th and 5th job.</p>
      ${waiting > 0 ? `<p class="muted">${waiting} SP is waiting for your ${adv.options[0].jobName} skills. Advance in the Class tab to use it.</p>` : ''}
      ${groups}
      <div class="row">${reset}</div></div>`;
  }
}
