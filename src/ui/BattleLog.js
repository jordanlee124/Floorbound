// Scrolling text log of the fight and everything else that happens.
import { esc, rarityClass } from './dom.js';

export class BattleLog {
  constructor(el, limit = 80) { this.el = el; this.limit = limit; this.lines = []; this.onImportant = () => {}; }

  // Arrow function so it can be handed to Game as its logger.
  add = (kind, msg, rarity) => {
    this.lines.push({ kind, msg, rarity });
    if (this.lines.length > this.limit) this.lines.shift();
    if (['level', 'loot', 'floor', 'death', 'salv'].includes(kind)) this.onImportant();
  };

  clear() { this.lines = []; }

  render() {
    const html = this.lines.slice(-40).map(l =>
      `<li class="k-${l.kind} ${l.rarity !== undefined ? rarityClass(l.rarity) : ''}">${esc(l.msg)}</li>`).join('');
    if (this.el._html === html) return;
    this.el.innerHTML = html; this.el._html = html; this.el.scrollTop = this.el.scrollHeight;
  }
}
