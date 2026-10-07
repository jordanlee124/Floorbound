// A tab in the character panel. Subclasses set `id` and return their HTML from render().
import { Component } from '../Component.js';

export class Panel extends Component {
  static id = '';
  // Number or true to show a badge on the tab, falsy for none.
  get badge() { return null; }
  render() { return ''; }
}
