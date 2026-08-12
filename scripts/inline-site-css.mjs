// Post-build step for the marketing site: inline the single bundled CSS
// and JS module into index.html to eliminate render-blocking and chained
// network requests. The bundle is small (~14 KB gzipped total) so inlining
// is a net win for FCP/LCP.
import { readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist-site');
const htmlPath = join(distDir, 'index.html');
const assetsDir = join(distDir, 'assets');

const html = await readFile(htmlPath, 'utf8');
let out = html;
const toDelete = new Set();

/* ------------------------------------------------------------------ *
 * Inline <link rel="stylesheet"> tags
 * ------------------------------------------------------------------ */
const linkRe = /<link\s+rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g;
let cssCount = 0;
for (const m of html.matchAll(linkRe)) {
  const fileName = m[1].split('/').pop();
  const cssPath = join(assetsDir, fileName);
  const css = await readFile(cssPath, 'utf8');
  out = out.replace(m[0], () => `<style>${css}</style>`);
  toDelete.add(cssPath);
  cssCount++;
}

/* ------------------------------------------------------------------ *
 * Inline <script type="module" src="..."> tags.
 * Only safe when the bundle is a single chunk with no static/dynamic
 * imports — bail out if the chunk references other /assets/ files.
 * ------------------------------------------------------------------ */
const scriptRe = /<script\s+type="module"(?:\s+crossorigin)?\s+src="([^"]+\.js)"[^>]*><\/script>/g;
let jsCount = 0;
for (const m of html.matchAll(scriptRe)) {
  const fileName = m[1].split('/').pop();
  const jsPath = join(assetsDir, fileName);
  const js = await readFile(jsPath, 'utf8');

  if (/(?:from\s*["']|import\s*\(\s*["'])(?:\.\/|\/assets\/)/.test(js)) {
    console.warn(
      `inline-site-css: ${fileName} references other chunks; leaving as external script`,
    );
    continue;
  }

  // Strip sourcemap comment — the .map URL would no longer resolve.
  let stripped = js.replace(/\/\/[#@]\s*sourceMappingURL=.*$/m, '').trimEnd();
  // The script is being moved from /assets/ to the document root, so any
  // relative chunk references inside (dynamic imports, modulepreload URLs)
  // must be rewritten to point back into /assets/.
  stripped = stripped
    .replace(/(["'`])\.\/((?:[A-Za-z0-9_-]+)\.(?:js|css|map))\1/g, '$1./assets/$2$1')
    .replace(/(["'`])\/((?:[A-Za-z0-9_-]+)\.(?:js|css|map))\1/g, '$1/assets/$2$1');
  out = out.replace(m[0], () => `<script type="module">${stripped}</script>`);
  // NOTE: do NOT add jsPath to toDelete — lazy-loaded chunks may still
  // import from this file by name for shared modules. Keep it on disk.
  jsCount++;
}

await writeFile(htmlPath, out, 'utf8');

// Remove orphaned asset files (and their .map siblings).
for (const filePath of toDelete) {
  await unlink(filePath).catch(() => {});
  await unlink(`${filePath}.map`).catch(() => {});
}

console.log(
  `inline-site-css: inlined ${cssCount} stylesheet(s) and ${jsCount} module script(s) into index.html`,
);

const remaining = (await readdir(assetsDir)).filter((f) => f.endsWith('.css') || f.endsWith('.js'));
if (remaining.length) {
  console.warn(`inline-site-css: ${remaining.length} asset(s) left untouched:`, remaining);
}
