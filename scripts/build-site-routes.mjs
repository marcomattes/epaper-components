// Writes every page but the home page, plus robots.txt, sitemap.xml and
// llms.txt. The page list comes from the manifest, so guides and recipes
// need no special handling here.
//
// Runs after scripts/inline-site-css.mjs so every page inherits the same
// inlined CSS and JS as the home page — one document, no extra requests.
//
// The per-route content is not computed here: vite.site.config.ts renders it
// from src/site/content.ts and src/site/seo.ts (TypeScript, which plain Node
// cannot import) and leaves it in dist-site/_site-routes.json for this step.
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { applyRouteBlocks } from './site-template.mjs';
import { buildMarkdownRoutes } from './build-markdown-routes.mjs';

const distDir = resolve(process.cwd(), 'dist-site');
const manifestPath = join(distDir, '_site-routes.json');
const shellPath = join(distDir, 'index.html');

let manifest;
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch {
  console.error(
    'build-site-routes: dist-site/_site-routes.json is missing — run `vite build --config vite.site.config.ts` first.',
  );
  process.exit(1);
}

const shell = await readFile(shellPath, 'utf8');

// The home page was already filled in by the build; the rest reuse it as the
// template, which is why the slot markers are left in place.
const written = [];
for (const route of manifest.routes) {
  if (!route.dir) continue;
  const html = applyRouteBlocks(shell, route.blocks);
  const dir = join(distDir, route.dir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf8');
  written.push(`${route.dir}/index.html`);
}

for (const [name, contents] of Object.entries(manifest.files)) {
  await writeFile(join(distDir, name), contents, 'utf8');
  written.push(name);
}

const markdown = await buildMarkdownRoutes(distDir, manifest.routes);
written.push(...markdown);

await unlink(manifestPath).catch(() => {});

console.log(`build-site-routes: wrote ${written.length} file(s): ${written.join(', ')}`);
