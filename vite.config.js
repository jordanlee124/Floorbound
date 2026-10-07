import { defineConfig } from 'vite';

// Relative base so the same build works on any web host and inside the Android WebView.
export default defineConfig({
  base: './',
  server: { host: true },
});
