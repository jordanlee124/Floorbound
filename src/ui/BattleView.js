// The fight: both combatants, floor controls, floor progress and the Fight button.
import { Component } from './Component.js';
import { $, esc } from './dom.js';
import { Skill, KILLS_PER_FLOOR, fmt } from '../game/index.js';

const bar = (cur, max, cls) => {
  const w = Math.max(0, Math.min(100, cur / max * 100));
  return `<div class="bar ${cls}"><i style="width:${w}%"></i><span>${fmt(Math.max(0, cur))} / ${fmt(max)}</span></div>`;
};

export class BattleView extends Component {
  get actions() {
    return {
      fight: () => this.app.fight(),
      skip: () => this.app.skip(),
      'floor-down': () => this.app.moveTo(this.player.floor - 1),
      'floor-up': () => this.app.moveTo(this.player.floor + 1),
      'floor-top': () => this.app.moveTo(this.player.maxFloor),
    };
  }

  render() {
    const p = this.player, b = this.game.battle, st = b.stats, e = b.enemy;
    $('#hdr-floor').textContent = `Floor ${p.floor}`;
    $('#hdr-zone').textContent = this.game.zone.name;
    $('#you').innerHTML = this.#playerCard(p, b, st);
    $('#foe').innerHTML = this.#enemyCard(b, e);
    $('#floor-prog').textContent = this.#progressText(p);
    $('#floor-max').textContent = `Highest floor unlocked: ${p.maxFloor}`;
    $('#rest').textContent = this.#statusText(b);
    this.renderControls();
  }

  renderControls() {
    const p = this.player, busy = this.app.busy;
    const fight = $('#fightbtn');
    fight.disabled = busy;
    fight.textContent = this.app.fighting ? 'Fighting…' : 'Fight';
    $('#skipbtn').disabled = !this.app.fighting;
    $('#fdown').disabled = busy || p.floor <= 1;
    $('#fup').disabled = busy || p.floor >= p.maxFloor;
    $('#ftop').disabled = busy || p.floor >= p.maxFloor;
  }

  #playerCard(p, b, st) {
    const chips = Object.values(b.buffs).map(x => `<em>${esc(x.name)} ${x.t.toFixed(0)}s</em>`);
    if (b.shield > 0) chips.push(`<em>Shield ${fmt(b.shield)}</em>`);
    if (b.minion) chips.push(`<em>${esc(b.minion.name)} ${b.minion.t.toFixed(0)}s</em>`);
    const cds = p.loadout.map(id => {
      const left = b.cooldowns[id] || 0;
      return `<span class="cd ${left > 0 ? 'wait' : ''}">${esc(Skill.get(id).name)}${left > 0 ? ' ' + left.toFixed(1) : ''}</span>`;
    }).join('');
    return `<div class="who"><b>${esc(p.name)}</b><small>Lv ${p.lvl} ${p.characterClass.name}</small></div>
      ${bar(b.hp, st.hp, 'hp')}${bar(b.mp, st.mp, 'mp')}
      <div class="gauge"><i style="width:${Math.min(100, b.gauge * 100)}%"></i></div>
      <div class="chips">${chips.join('')}</div><div class="cds">${cds || '<span class="cd wait">No skills in rotation</span>'}</div>`;
  }

  #enemyCard(b, e) {
    const chips = b.dots.map(d => `<em class="bad">${esc(d.name)} ${d.t.toFixed(0)}s</em>`);
    if (b.slow) chips.push('<em class="bad">Slowed</em>');
    if (b.stun > 0) chips.push('<em class="bad">Stunned</em>');
    if (b.enraged) chips.push('<em class="bad">Enraged</em>');
    const enrage = e.boss ? `<span>Enrage ${Math.max(0, 40 - b.time).toFixed(0)}s</span>` : '';
    return `<div class="who"><b class="${e.boss ? 'boss' : e.elite ? 'elite' : ''}">${esc(e.name)}</b><small>${e.boss ? 'Boss · ' : ''}${e.tag || 'Normal'} · ${e.dmg === 'magic' ? 'magic attacks' : 'physical attacks'}</small></div>
      ${bar(e.hp, e.maxhp, 'ehp')}
      <div class="foe-stats"><span>Armor ${Math.round(e.pr * 100)}%</span><span>Ward ${Math.round(e.mr * 100)}%</span><span>Evade ${Math.round(e.eva * 100)}%</span>${enrage}</div>
      <div class="gauge foe-g"><i style="width:${Math.min(100, b.enemyGauge * 100)}%"></i></div>
      <div class="chips">${chips.join('')}</div>`;
  }

  #progressText(p) {
    if (this.game.onBossFloor) return p.floor < p.maxFloor ? 'Boss defeated' : 'Boss floor: defeat the boss to unlock the next floor';
    return `${Math.min(p.floorKills, KILLS_PER_FLOOR)} / ${KILLS_PER_FLOOR} kills${p.floor < p.maxFloor ? ' (cleared)' : ''}`;
  }

  #statusText(b) {
    if (this.app.fighting) return '';
    if (b.result === 'lose') return 'Defeated';
    if (this.game.floorCleared) return 'Floor cleared. Go up with ▶';
    return b.result === 'win' ? 'Victory' : '';
  }
}
