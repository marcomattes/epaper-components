// Standalone Vite config for the marketing site under src/site/.
// Kept separate from vite.config.ts so the library build (lib mode) stays
// untouched. The site is *not* part of the npm package — this config only
// produces the static bundle served at https://epaper-components.dev.
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'src/site'),
  // Relative by default so the bundle works from any sub-path. The deploy
  // workflow serves it from the domain root and sets VITE_SITE_BASE=/.
  base: process.env['VITE_SITE_BASE'] || './',
  server: {
    port: 8086,
    open: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist-site'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      input: resolve(__dirname, 'src/site/index.html'),
    },
  },
});
