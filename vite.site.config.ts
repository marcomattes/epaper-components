// Standalone Vite config for the marketing site under src/site/.
// Kept separate from vite.config.ts so the library build (lib mode) stays
// untouched. The site is *not* part of the npm package — this config only
// produces the static bundle served at https://epaper-components.dev.
//
// The site is six real URLs, each shipped as a complete HTML document. Vite
// builds the home page; the shell it produces is then re-filled per route by
// scripts/build-site-routes.mjs. Page markup comes from src/site/content.ts
// and the <head> from src/site/seo.ts, both of which run here in Node.
import { defineConfig, type Plugin } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatStars, resolveStars } from './scripts/github-stars.mjs';
import { applyRouteBlocks } from './scripts/site-template.mjs';
import { mainHtml, navHtml, pagenavHtml, type ContentOptions } from './src/site/content';
import { headHtml, llmsTxt, robotsTxt, sitemapXml } from './src/site/seo';
import { routeByPath, ROUTES, type Route } from './src/site/routes';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string;
};

interface RouteBlocks {
  head: string;
  main: string;
  nav: string;
  pagenav: string;
  route: string;
}

function blocksFor(route: Route, opts: ContentOptions): RouteBlocks {
  return {
    head: `\n    ${headHtml(route, { version: opts.version, storybookBase: opts.storybookBase })}\n    `,
    main: mainHtml(route, opts),
    nav: navHtml(route, opts.storybookBase),
    pagenav: pagenavHtml(route),
    route: route.path,
  };
}

/**
 * Renders each route into the shell.
 *
 * In dev this also serves the sub-paths, so `npm run dev:site` browses the
 * same six URLs as production instead of only the cover.
 */
function sitePagesPlugin(opts: ContentOptions): Plugin {
  return {
    name: 'epaper-site-pages',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '/').split('?')[0] ?? '/';
        const route = routeByPath(url);
        // The home page goes through Vite's own index.html handling.
        if (!route || !route.dir) return next();
        void (async () => {
          try {
            const shell = readFileSync(resolve(__dirname, 'src/site/index.html'), 'utf8');
            const html = await server.transformIndexHtml(route.path, shell, req.originalUrl);
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
          } catch (err) {
            next(err);
          }
        })();
      });
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // Build: only the home page is an input. Dev: whatever was requested.
        const route = routeByPath(ctx.path ?? '/') ?? ROUTES[0]!;
        return applyRouteBlocks(html, blocksFor(route, opts));
      },
    },

    // The five sub-pages are written after the CSS/JS inlining step, so hand
    // their content over instead of writing HTML here.
    closeBundle() {
      const lastmod = new Date().toISOString().slice(0, 10);
      const manifest = {
        routes: ROUTES.map((r) => ({ path: r.path, dir: r.dir, blocks: blocksFor(r, opts) })),
        files: {
          'robots.txt': robotsTxt(),
          'sitemap.xml': sitemapXml(lastmod),
          'llms.txt': llmsTxt({ version: opts.version, stars: opts.stars }),
        },
      };
      writeFileSync(
        resolve(__dirname, 'dist-site/_site-routes.json'),
        JSON.stringify(manifest),
        'utf8',
      );
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

  const content: ContentOptions = {
    storybookBase: process.env['VITE_STORYBOOK_BASE'] || 'http://localhost:6006',
    stars: starsText,
    version: pkg.version,
  };

  return {
    root: resolve(__dirname, 'src/site'),
    // Root-absolute: the sub-pages live one directory deep and share the
    // home page's asset URLs, so a relative base would break them.
    base: process.env['VITE_SITE_BASE'] || '/',
    plugins: [sitePagesPlugin(content)],
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
