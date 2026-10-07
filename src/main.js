// Entry point: bundled fonts, styles, then the game.
import '@fontsource/grenze-gotisch/500.css';
import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './style.css';
import { App } from './ui/App.js';

const boot = () => new App().start();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
