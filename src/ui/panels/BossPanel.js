// Boss raids: every boss, its difficulties, entry level, reset and what it pays. Enter starts the fight at once.
import { Panel } from './Panel.js';
import { BOSSES, DIFFICULTIES, SETS, CUBES, fmt } from '../../game/index.js';

const until = ms => {
  const m = Math.max(1, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m}m`;
};

export class BossPanel extends Panel {
  static id = 'bosses';
  get badge() { return this.game.bossesAvailable; }

  get actions() {
    return { 'boss-enter': ({ id, diff }) => this.app.startBoss(id, diff) };
  }

  #mode(b, diff, mode) {
    const s = this.game.bossStatus(b.id, diff), D = DIFFICULTIES[diff];
    let action;
    if (!s.unlocked) action = `<button disabled>Level ${b.level}</button>`;
    else if (s.cleared) action = `<button disabled>Cleared · resets in ${until(s.resetsAt - this.game.now())}</button>`;
    else action = `<button class="pri" data-act="boss-enter" data-id="${b.id}" data-diff="${diff}" ${this.app.busy ? 'disabled' : ''}>Enter</button>`;
    const power = mode.floor <= this.player.maxFloor ? '' : ' warn';
    return `<li><div><b>${D.name}</b> <small class="muted">${mode.reset}</small>
        <p class="muted"><span class="${power}">Floor ${mode.floor} power</span> · ${D.items} items (${['Normal', 'Rare', 'Epic', 'Unique'][D.minRar]}+),
        ${Math.round(D.setChance * 100)}% ${SETS[b.set].name} piece, ${Object.entries(D.cubes).map(([k, n]) => `${n} ${CUBES[k].name}${n > 1 ? "s" : ""}`).join(', ')}, ${D.shards} shards</p></div>
      <div class="row">${action}</div></li>`;
  }

  render() {
    const list = BOSSES.map(b => `<div class="cls"><h3>${b.name}</h3><p>${b.desc}</p>
      <p class="muted">Level ${b.level}+ · ${b.phases.length} phase change${b.phases.length > 1 ? 's' : ''} · enrages after 90s</p>
      <ul class="skills">${Object.entries(b.modes).map(([d, m]) => this.#mode(b, d, m)).join('')}</ul></div>`).join('');
    return `<div><h2>Boss raids <small>${fmt(this.player.stats.raids || 0)} cleared</small></h2>
      <p class="muted">Each difficulty can be cleared once per reset: daily resets at midnight, weekly on Thursday at midnight.
      Losing costs nothing, so try again until it falls. Raid bosses drop the only pieces of the Dread Regalia and Eclipse Arcana sets.</p>
      <div class="classes">${list}</div></div>`;
  }
}
