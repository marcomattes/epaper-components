// Standalone Vite config for the marketing site under src/site/.
// Kept separate from vite.config.ts so the library build (lib mode) stays
// untouched. The site is *not* part of the npm package — this config only
// produces the static bundle served at https://epaper-components.dev.
import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatStars, resolveStars } from './scripts/github-stars.mjs';
import { COMPONENTS } from './src/site/data';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string;
};

/**
 * Rewrites the pre-rendered cover stats in index.html.
 *
 * The cover is served as static HTML so the hero paints before any script
 * runs, which means its numbers cannot come from the runtime. Each value
 * carries a `data-site-stat` key; the committed markup holds a fallback so
 * the file is still meaningful on its own, and this hook overwrites it with
 * the real figure at build time.
 */
function siteStatsPlugin(stats: Record<string, string>): Plugin {
  return {
    name: 'epaper-site-stats',
    transformIndexHtml(html) {
      let out = html;
      for (const [key, value] of Object.entries(stats)) {
        const re = new RegExp(`(data-site-stat="${key}"[^>]*>)[^<]*(<)`, 'g');
        out = out.replace(re, `$1${value}$2`);
      }
      return out;
    },
  };
}

export default defineConfig(async () => {
  // One network call per build (and per dev-server start). Never fatal:
  // resolveStars() falls back to a committed count when GitHub is
  // unreachable or rate-limits the runner.
  const stars = await resolveStars();
  const starsText = formatStars(stars.count);
  if (stars.source === 'fallback') {
    console.warn(
      `[site] GitHub stars: using committed fallback ${starsText} (${stars.reason ?? 'unknown reason'})`,
    );
  } else {
    console.log(`[site] GitHub stars: ${starsText} (${stars.count}, source: ${stars.source})`);
  }

  return {
    root: resolve(__dirname, 'src/site'),
    // Relative by default so the bundle works from any sub-path. The deploy
    // workflow serves it from the domain root and sets VITE_SITE_BASE=/.
    base: process.env['VITE_SITE_BASE'] || './',
    define: {
      // Formatted here rather than in the browser so the page ships one
      // string and no formatting code.
      __GITHUB_STARS__: JSON.stringify(starsText),
      // The colophon used to name a version by hand; it had already drifted.
      __SITE_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      siteStatsPlugin({
        stars: starsText,
        components: String(COMPONENTS.length),
      }),
    ],
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
  };
});
