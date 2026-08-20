// Vite config for the marketing site (apps/site), a separate workspace from
// the library build (packages/epaper-components/vite.config.ts). The site is
// *not* part of the npm package — this config only produces the static
// bundle served at https://epaper-components.dev.
//
// Every route is a real URL shipped as a complete HTML document: the eight
// core pages plus one per guide and recipe under /guides/. Vite builds the
// home page; the shell it produces is then re-filled per route by
// scripts/build-site-routes.mjs. Page markup comes from src/content.ts
// and the <head> from src/seo.ts, both of which run here in Node.
import { defineConfig, type Plugin } from 'vite';
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { formatStars, resolveStars } from './scripts/github-stars.mjs';
import { applyRouteBlocks } from './scripts/site-template.mjs';
import { copyShots, readShots, SHOTS_SRC } from './scripts/site-shots.mjs';
import { mainHtml, navHtml, pagenavHtml, type ContentOptions } from './src/content';
import {
  headHtml,
  htaccessConfig,
  llmsFullTxt,
  llmsTxt,
  markdownAlternateHeaders,
  markdownRoutePath,
  robotsTxt,
  routeMarkdown,
  sitemapXml,
} from './src/seo';
import {
  ALL_ROUTES,
  NOT_FOUND_PATH,
  NOT_FOUND_ROUTE,
  routeByPath,
  ROUTES,
  type Route,
} from './src/routes';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../packages/epaper-components/package.json'), 'utf8'),
) as {
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
    head: `\n    ${headHtml(route, {
      version: opts.version,
      storybookBase: opts.storybookBase,
      shots: opts.shots,
    })}\n    `,
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
 * same URLs as production instead of only the cover.
 */
function sitePagesPlugin(opts: ContentOptions): Plugin {
  return {
    name: 'epaper-site-pages',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '/').split('?')[0] ?? '/';

        // Component previews. In a build these are copied into dist-site;
        // in dev they are streamed straight out of the screenshot baselines
        // so `npm run test:visual:update` shows up on the next reload.
        const shotSlug = /^\/shots\/([a-z0-9-]+)\.png$/.exec(url)?.[1];
        if (shotSlug) {
          const shot = opts.shots[shotSlug];
          if (!shot) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          res.setHeader('Content-Type', 'image/png');
          // An unhandled 'error' here (baseline deleted mid-session) would
          // take the dev server down with it.
          createReadStream(join(SHOTS_SRC, shot.file)).on('error', next).pipe(res);
          return;
        }

        const route = routeByPath(url);
        // The home page goes through Vite's own index.html handling.
        if (!route?.dir) return next();
        void (async () => {
          try {
            const shell = readFileSync(resolve(__dirname, 'src/index.html'), 'utf8');
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

    // Every page but the home page is written after the CSS/JS inlining
    // step, so hand their content over instead of writing HTML here.
    async closeBundle() {
      const outDir = resolve(__dirname, '../../dist-site');
      const copied = await copyShots(opts.shots, outDir);
      console.log(`[site] component previews: copied ${copied} PNG(s) to dist-site/shots/`);

      const lastmod = new Date().toISOString().slice(0, 10);
      const manifest = {
        // ALL_ROUTES, not ROUTES: the guides and recipes are real pages that
        // need their own directory, markdown alternate and sitemap entry.
        routes: ALL_ROUTES.map((r) => ({
          path: r.path,
          dir: r.dir,
          blocks: blocksFor(r, opts),
          markdownPath: markdownRoutePath(r.path),
          markdown: routeMarkdown(r, { version: opts.version, stars: opts.stars }),
        })),
        // Written through the shell like any other page, but to a file
        // rather than a directory: a host looks for /404.html.
        notFound: {
          file: NOT_FOUND_PATH.replace(/^\/+/, ''),
          blocks: blocksFor(NOT_FOUND_ROUTE, opts),
        },
        files: {
          'robots.txt': robotsTxt(),
          'sitemap.xml': sitemapXml(lastmod),
          'llms.txt': llmsTxt({ version: opts.version, stars: opts.stars }),
          'llms-full.txt': llmsFullTxt({ version: opts.version, stars: opts.stars }),
          _headers: markdownAlternateHeaders(),
          // Netlify reads _headers; this host reads .htaccess. Both ship.
          '.htaccess': htaccessConfig(),
        },
      };
      writeFileSync(join(outDir, '_site-routes.json'), JSON.stringify(manifest), 'utf8');
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

  // Component tile previews, reused from the visual-regression baselines.
  // Never fatal either: an empty index just means text-only tiles.
  const { shots, blank } = await readShots();
  const shotCount = Object.keys(shots).length;
  if (shotCount === 0) {
    console.warn(
      '[site] component previews: no screenshot baselines found — tiles render without images. ' +
        'Run `npm run test:visual` to generate them.',
    );
  } else {
    console.log(`[site] component previews: ${shotCount} baseline(s) indexed`);
  }
  if (blank.length > 0) {
    // Surfaced on every build rather than swallowed: a blank baseline means
    // the screenshot suite is asserting against an empty picture, so the
    // visual regression it exists to catch would pass silently.
    console.warn(
      `[site] component previews: skipped ${blank.length} blank baseline(s) — ${blank.join(', ')}. ` +
        'These stories render nothing under the screenshot harness; their tiles stay text-only.',
    );
  }

  const content: ContentOptions = {
    storybookBase: process.env['VITE_STORYBOOK_BASE'] || 'http://localhost:6006',
    stars: starsText,
    version: pkg.version,
    shots,
  };

  return {
    root: resolve(__dirname, 'src'),
    // Root-absolute: the sub-pages live one directory deep and share the
    // home page's asset URLs, so a relative base would break them.
    base: process.env['VITE_SITE_BASE'] || '/',
    plugins: [sitePagesPlugin(content)],
    server: {
      port: 8086,
      open: true,
    },
    build: {
      outDir: resolve(__dirname, '../../dist-site'),
      emptyOutDir: true,
      sourcemap: true,
      target: 'es2022',
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html'),
      },
    },
  };
});
