// Saves the player in local storage and converts saves to and from shareable codes.
import { Player } from '../game/index.js';

export class SaveStore {
  constructor(key = 'floorbound.save.v1') { this.key = key; }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? Player.fromJSON(JSON.parse(raw)) : null;
    } catch (e) { return null; }
  }

  save(player) {
    try { localStorage.setItem(this.key, JSON.stringify(player)); } catch (e) { /* storage full or blocked */ }
  }

  static encode(player) { return btoa(unescape(encodeURIComponent(JSON.stringify(player)))); }

  // Returns a Player, or throws if the code is not a save.
  static decode(code) {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!data || !data.alloc || !data.equip) throw new Error('Not a save code');
    return Player.fromJSON(data);
  }
}
