// Level, exp bar, gold and shards at the top of the screen.
import { Component } from './Component.js';
import { $ } from './dom.js';
import { fmt } from '../game/index.js';

export class HeaderView extends Component {
  render() {
    const p = this.player, need = p.expToNext;
    $('#hdr-lvl').textContent = `Lv ${p.lvl} ${p.characterClass.name}`;
    $('#hdr-exp').style.width = Math.min(100, p.exp / need * 100) + '%';
    $('#hdr-exp-t').textContent = `${fmt(p.exp)} / ${fmt(need)} exp`;
    $('#hdr-gold').textContent = fmt(p.gold);
    $('#hdr-shards').textContent = fmt(p.shards);
  }
}
