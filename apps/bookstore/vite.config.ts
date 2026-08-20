// Vite config for the Inkbound Books demo (apps/bookstore), a separate
// workspace from the library build (packages/epaper-components/vite.config.ts)
// and from the marketing site (apps/site/vite.config.ts).
//
// The demo consumes the library from source through relative imports, the same
// way apps/site does, so editing a component shows up here without a build
// step. It is never published to npm.
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'src'),
  // Relative: the whole shop is one document addressed by hash routes, so it
  // works from any sub-path a preview host puts it on.
  base: './',
  server: {
    port: 8087,
    open: true,
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
  },
});
