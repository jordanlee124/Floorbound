// Wires the game model to the page: the fight loop, input routing, saving and rendering.
import { Game, Player } from '../game/index.js';
import { $ } from './dom.js';
import { SaveStore } from './SaveStore.js';
import { BattleLog } from './BattleLog.js';
import { HeaderView } from './HeaderView.js';
import { BattleView } from './BattleView.js';
import { LootPopup } from './LootPopup.js';
import { GearPanel } from './panels/GearPanel.js';
import { StatsPanel } from './panels/StatsPanel.js';
import { SkillsPanel } from './panels/SkillsPanel.js';
import { ClassPanel } from './panels/ClassPanel.js';
import { BossPanel } from './panels/BossPanel.js';
import { SavePanel } from './panels/SavePanel.js';

const TICK_MS = 50;      // real ms between loop runs
const TICKS_PER_LOOP = 1; // Battle ticks (0.1s of game time each) per loop run, so fights play at 2x
const SAVE_EVERY_MS = 10000;

export class App {
  fighting = false;
  confirmKey = null; // which confirm button is armed
  tab = GearPanel.id;
  #dirty = true;     // panels need a re-render

  constructor() {
    this.store = new SaveStore();
    this.log = new BattleLog($('#log'));
    this.log.onImportant = () => { this.#dirty = true; };
    this.game = new Game(this.store.load() || Player.create(), this.log.add);
    this.game.player.autoClimb = false;
    this.header = new HeaderView(this);
    this.battleView = new BattleView(this);
    this.loot = new LootPopup(this);
    this.panels = [GearPanel, StatsPanel, SkillsPanel, ClassPanel, BossPanel, SavePanel].map(P => new P(this));
    this.components = [this.battleView, this.loot, ...this.panels];
  }

  get player() { return this.game.player; }
  get busy() { return this.fighting; }
  get currentPanel() { return this.panels.find(p => p.constructor.id === this.tab); }

  start() {
    this.log.add('floor', this.player.stats.kills ? 'Welcome back. The climb continues.' : 'You enter the first floor. Press Fight to take on the enemy in front of you.');
    this.game.newBattle();
    this.#bindInput();
    this.renderAll();
    setInterval(() => this.#loop(), TICK_MS);
    setInterval(() => this.save(), SAVE_EVERY_MS);
    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
  }

  save() { this.store.save(this.player); }

  // ---- Fight flow ----
  fight() {
    if (this.busy) return false;
    if (this.game.battle.over) this.game.newBattle();
    this.game.battle.readyUp(); // every fight starts at full health
    this.fighting = true;
    this.battleView.renderControls();
    return false;
  }

  skip() {
    for (let guard = 0; this.fighting && guard < 5000; guard++) this.#step();
    return false;
  }

  // Enter a boss raid and start fighting. The next Fight after it ends goes back to the floor.
  startBoss(id, diff) {
    if (this.busy || !this.game.newBossBattle(id, diff)) return false;
    this.fight();
  }

  moveTo(floor) {
    if (this.busy || !this.game.moveTo(floor)) return false;
    this.game.newBattle();
  }

  #step() {
    const battle = this.game.battle;
    const result = battle.tick();
    if (!result) return;
    this.game.finishBattle(battle);
    if (result === 'win') this.loot.offer(battle.loot);
    else this.log.add('floor', 'Adjust your build, or drop a floor and grind.');
    this.fighting = false; // the finished fight stays on screen until the next Fight press
    this.#dirty = true;
    this.save();
    this.battleView.renderControls();
  }

  #loop() {
    for (let i = 0; i < TICKS_PER_LOOP && this.fighting; i++) this.#step();
    this.renderBattle();
    if (this.#dirty) this.renderPanels();
  }

  // ---- Player swaps ----
  loadPlayer(player) {
    player.autoClimb = false;
    this.game = new Game(player, this.log.add);
    this.fighting = false;
    this.panels.forEach(p => { if ('selectedId' in p) p.selectedId = null; });
    this.loot.clear();
    this.game.newBattle();
    this.save();
  }

  startOver() {
    this.log.clear();
    this.loadPlayer(Player.create());
    this.log.add('floor', 'A new climber enters floor 1.');
  }

  // ---- Input ----
  #bindInput() {
    document.addEventListener('click', ev => {
      const t = ev.target.closest('[data-act],[data-tab]');
      if (!t || t.disabled) return;
      if (t.dataset.tab) { this.tab = t.dataset.tab; this.confirmKey = null; this.renderPanels(); return; }
      this.dispatch(t.dataset.act, t.dataset);
    });
    document.addEventListener('keydown', ev => {
      if (ev.target.closest('input, textarea, select, button')) return;
      if (ev.code === 'Space' || ev.code === 'Enter') { ev.preventDefault(); this.fighting ? this.skip() : this.fight(); }
    });
    document.addEventListener('change', ev => {
      const key = ev.target.dataset && ev.target.dataset.setting;
      if (!key) return;
      this.player[key] = Number(ev.target.value);
      this.save();
    });
  }

  // Run a named action from any component, then refresh. A handler returning false skips the refresh.
  dispatch(action, dataset) {
    if (action === 'ask') { this.confirmKey = dataset.key; this.renderPanels(); return; }
    this.confirmKey = null;
    if (action === 'cancel') { this.renderPanels(); return; }
    const data = { ...dataset, id: dataset.id && !isNaN(dataset.id) ? Number(dataset.id) : dataset.id };
    const owner = this.components.find(c => action in c.actions);
    if (!owner || owner.actions[action](data) === false) return;
    // Show changed stats right away: at full health between fights, at the same HP fraction mid-fight.
    const battle = this.game.battle;
    if (!battle.over) this.fighting ? battle.refreshStats() : battle.readyUp();
    this.save();
    this.renderAll();
  }

  // ---- Rendering ----
  renderAll() { this.renderBattle(); this.renderPanels(); this.loot.render(); }

  renderBattle() {
    this.header.render();
    this.battleView.render();
    this.log.render();
  }

  renderPanels() {
    this.#dirty = false;
    for (const panel of this.panels) {
      const id = panel.constructor.id;
      document.querySelector(`.tabs [data-tab="${id}"]`)?.classList.toggle('on', id === this.tab);
      const pip = document.getElementById(`tab-${id}-pts`);
      if (!pip) continue;
      const badge = panel.badge;
      pip.hidden = !badge;
      if (typeof badge === 'number') pip.textContent = badge || '';
    }
    const body = $('#panel'), scroll = body.scrollTop;
    body.innerHTML = this.currentPanel.render();
    body.scrollTop = scroll;
  }
}
