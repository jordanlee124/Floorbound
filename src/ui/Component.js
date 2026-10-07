// Base for every view. A view renders HTML and may expose named actions;
// buttons trigger them with data-act="name", and App routes the click here.
export class Component {
  constructor(app) { this.app = app; }
  get game() { return this.app.game; }
  get player() { return this.app.game.player; }
  // { actionName: (data) => void }; data is the button's dataset with a numeric id.
  get actions() { return {}; }

  // A button that asks for confirmation first: one click arms it, the second runs `action`.
  confirmButton(key, { label, confirmLabel, action, enabled = true, id }) {
    if (this.app.confirmKey === key) {
      return `<button class="danger" data-act="${action}"${id !== undefined ? ` data-id="${id}"` : ''}>${confirmLabel}</button><button data-act="cancel">Cancel</button>`;
    }
    return `<button data-act="ask" data-key="${key}" ${enabled ? '' : 'disabled'}>${label}</button>`;
  }
}
