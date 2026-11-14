import { defineConfig } from 'vite';

// GitHub Pages serves the site from /Ranojoy_VideoEditor/; local dev uses /
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Ranojoy_VideoEditor/' : '/',
  server: { port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
}));
