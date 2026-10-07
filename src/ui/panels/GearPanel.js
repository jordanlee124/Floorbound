// Equipped gear, the selected item's details and enhancement, and the bag.
import { Panel } from './Panel.js';
import { ItemView } from '../ItemView.js';
import { SLOTS, SLOT_NAME, RARITIES, BAG_SIZE, fmt } from '../../game/index.js';

const AUTO_SALVAGE = ['Off', 'Common', 'Uncommon and below', 'Rare and below'];
// Index = minimum rarity shown; RARITIES.length = never.
const POPUP_OPTIONS = ['Every drop', 'Uncommon and better', 'Rare and better', 'Epic and better', 'Legendary only', 'Never'];

export class GearPanel extends Panel {
  static id = 'gear';
  selectedId = null;

  get actions() {
    const p = this.player, log = this.game.log;
    return {
      select: ({ id }) => { this.selectedId = id; },
      equip: ({ id }) => p.equipItem(id),
      unequip: ({ slot }) => p.unequip(slot),
      salvage: ({ id }) => { const v = p.salvage(id); if (v) { log('salv', `Salvaged for ${v} shards.`); this.selectedId = null; } },
      sell: ({ id }) => { const v = p.sell(id); if (v) { log('salv', `Sold for ${fmt(v)} gold.`); this.selectedId = null; } },
      lock: ({ id }) => p.toggleLock(id),
      enhance: ({ id }) => this.#enhance(id),
      'salvage-all': () => { const r = p.salvageAll(); log('salv', `Salvaged ${r.count} items for ${r.shards} shards.`); this.selectedId = null; },
    };
  }

  #enhance(id) {
    const r = this.player.enhance(id);
    if (!r.ok) return;
    const it = r.item;
    if (r.outcome === 'up') this.game.log('level', `Success! ${it.name} is now +${it.enh}.`);
    else if (r.outcome === 'down') this.game.log('death', `Failed. ${it.name} dropped to +${it.enh}.`);
    else this.game.log('death', `Failed. ${it.name} stays at +${it.enh}.`);
  }

  render() {
    const p = this.player;
    const sel = this.selectedId ? p.findItem(this.selectedId) : null;
    const slots = SLOTS.map(s => {
      const it = p.equip[s];
      return `<button class="slot ${it && it === sel ? 'sel' : ''}" data-act="select" data-id="${it ? it.id : ''}" ${it ? '' : 'disabled'}>
        <small>${SLOT_NAME[s]}</small>${it ? ItemView.title(it, true) : '<span class="muted">Empty</span>'}</button>`;
    }).join('');
    const bag = p.inv.slice().sort((a, b) => b.rar - a.rar || b.ilvl - a.ilvl).map(it => {
      const cur = p.equip[it.slot];
      return `<button class="inv ${it === sel ? 'sel' : ''}" data-act="select" data-id="${it.id}">${it.lock ? '<i class="lock" title="Locked">L</i>' : ''}
        ${ItemView.title(it, true)}<small>${SLOT_NAME[it.slot]} · iLvl ${it.ilvl}${cur && it.ilvl > cur.ilvl + 2 ? ' · <b class="up">newer</b>' : ''}</small></button>`;
    }).join('');
    const options = (labels, value) => labels.map((n, i) => `<option value="${i}" ${value === i ? 'selected' : ''}>${n}</option>`).join('');
    return `<div class="gear"><section><h2>Equipped</h2><div class="slots">${slots}</div></section>
      <section class="det">${sel ? this.#detail(sel) : '<p class="muted">Select an item to see its stats, compare it, or enhance it.</p>'}</section>
      <section><div class="inv-head"><h2>Bag <small>${p.inv.length} / ${BAG_SIZE}</small></h2>
        <div class="row">${this.confirmButton('salvage-all', { label: 'Salvage all unlocked', confirmLabel: 'Confirm salvage', action: 'salvage-all' })}</div></div>
        <div class="settings">
          <span><label for="autosalv">Auto-salvage</label><select id="autosalv" data-setting="autoSalvage">${options(AUTO_SALVAGE, p.autoSalvage)}</select></span>
          <span><label for="lootpopmin">Item popups</label><select id="lootpopmin" data-setting="lootPopupMin">${options(POPUP_OPTIONS, Math.min(p.lootPopupMin, RARITIES.length))}</select></span>
        </div>
        <div class="invgrid">${bag || '<p class="muted">Empty. Kill things.</p>'}</div></section></div>`;
  }

  #detail(it) {
    const p = this.player;
    const actions = p.isEquipped(it)
      ? `<button data-act="unequip" data-slot="${it.slot}">Unequip</button>`
      : `<button class="pri" data-act="equip" data-id="${it.id}">Equip</button>
         <button data-act="salvage" data-id="${it.id}" ${it.lock ? 'disabled' : ''}>Salvage (+${it.salvageValue} shards)</button>
         <button data-act="sell" data-id="${it.id}" ${it.lock ? 'disabled' : ''}>Sell (${fmt(it.sellValue)} gold)</button>`;
    return `<div class="detail"><h3>${ItemView.title(it)}</h3>
      ${ItemView.weaponNote(it)}
      ${ItemView.properties(it)}
      ${ItemView.comparison(p, it)}
      ${ItemView.enhancePanel(p, it)}
      <div class="row">${actions}<button data-act="lock" data-id="${it.id}">${it.lock ? 'Unlock' : 'Lock'}</button></div></div>`;
  }
}
