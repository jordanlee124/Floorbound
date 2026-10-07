// Save code export/import, lifetime record, and starting over.
import { Panel } from './Panel.js';
import { SaveStore } from '../SaveStore.js';
import { $, esc } from '../dom.js';
import { fmt } from '../../game/index.js';

export class SavePanel extends Panel {
  static id = 'save';

  get actions() {
    return {
      'copy-save': () => {
        const box = $('#exportbox'), msg = $('#copymsg');
        navigator.clipboard.writeText(box.value).then(() => { msg.textContent = 'Copied.'; }, () => { box.select(); msg.textContent = 'Select and copy the text above.'; });
        return false; // nothing changed; skip the re-render so the message stays
      },
      'import-save': () => {
        try { this.app.loadPlayer(SaveStore.decode($('#importbox').value)); this.game.log('floor', 'Save loaded.'); }
        catch (e) { $('#importmsg').textContent = 'That code is not a valid save. Copy the whole code and try again.'; return false; }
      },
      'start-over': () => this.app.startOver(),
    };
  }

  render() {
    const p = this.player;
    return `<div><h2>Save</h2><p class="muted">Progress saves on this device after every fight. Copy the save code to move your character to another device.</p>
      <label for="exportbox">Save code</label><textarea id="exportbox" rows="4" readonly>${esc(SaveStore.encode(p))}</textarea>
      <div class="row"><button data-act="copy-save">Copy save code</button><span id="copymsg" class="muted"></span></div>
      <label for="importbox">Load a save code</label><textarea id="importbox" rows="3" placeholder="Paste a save code"></textarea>
      <div class="row"><button data-act="import-save">Load</button><span id="importmsg" class="muted"></span></div>
      <h2>Record</h2><ul class="kv"><li><span>Kills</span><b>${fmt(p.stats.kills)}</b></li><li><span>Deaths</span><b>${fmt(p.stats.deaths)}</b></li><li><span>Bosses</span><b>${p.stats.bosses}</b></li><li><span>Highest floor</span><b>${p.maxFloor}</b></li></ul>
      <div class="row">${this.confirmButton('start-over', { label: 'Start over', confirmLabel: 'Erase everything', action: 'start-over' })}</div></div>`;
  }
}
