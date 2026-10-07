// Small popup for each item that drops, one at a time, filtered by the player's minimum rarity setting.
import { Component } from './Component.js';
import { $ } from './dom.js';
import { ItemView } from './ItemView.js';

export class LootPopup extends Component {
  queue = []; // item ids, oldest first

  get actions() {
    return {
      'loot-keep': () => this.#next(),
      'loot-equip': ({ id }) => { const it = this.player.equipItem(id); if (it) this.game.log('loot', `Equipped ${it.name}.`); this.#next(); },
      'loot-salvage': ({ id }) => { const v = this.player.salvage(id); if (v) this.game.log('salv', `Salvaged for ${v} shards.`); this.#next(); },
    };
  }

  // Queue the drops worth showing.
  offer(items) {
    const min = this.player.lootPopupMin;
    for (const it of items) if (it.rar >= min) this.queue.push(it.id);
    this.render();
  }

  clear() { this.queue = []; this.render(); }

  #next() { this.queue.shift(); this.render(); }

  render() {
    const box = $('#lootpop'), p = this.player;
    // Skip drops that already left the bag (equipped, salvaged or sold from the Gear tab).
    while (this.queue.length && !p.inv.some(x => x.id === this.queue[0])) this.queue.shift();
    if (!this.queue.length) { box.hidden = true; box.innerHTML = ''; return; }
    const it = p.inv.find(x => x.id === this.queue[0]);
    const count = this.queue.length > 1 ? ` <small class="muted">1 of ${this.queue.length}</small>` : '';
    box.innerHTML = `<div class="lp-head"><span>Item found${count}</span>
        <button class="lp-x" data-act="loot-keep" aria-label="Keep in bag and close">×</button></div>
      <h3>${ItemView.title(it)}</h3>
      ${ItemView.weaponNote(it)}
      ${ItemView.properties(it)}
      ${ItemView.comparison(p, it)}
      <div class="row"><button class="pri" data-act="loot-equip" data-id="${it.id}">Equip</button>
        <button data-act="loot-keep">Keep in bag</button>
        <button data-act="loot-salvage" data-id="${it.id}">Salvage (+${it.salvageValue})</button></div>`;
    box.hidden = false;
  }
}
