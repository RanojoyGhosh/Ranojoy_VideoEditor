import { defineConfig } from 'vite';

// GitHub Pages serves the site from /Ranojoy_VideoEditor/; local dev uses /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Ranojoy_VideoEditor/' : '/',
  // allowedHosts: lets the Claude app's preview pane (and phones on your Wi-Fi) open the dev server
  server: { port: 5173, host: true, allowedHosts: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
}));
