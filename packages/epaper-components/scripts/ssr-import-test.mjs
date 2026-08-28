#!/usr/bin/env node
// Server-render import check for the built package.
//
// Run after `npm run build` (dist/ must exist). Deliberately runs in a bare
// Node process with no DOM emulation: that is what a Next.js, Nuxt or Astro
// server pass looks like, and what a `'use client'` module still gets during
// its SSR render. Every entry point has to import there without throwing, so
// that a framework can pull the library in and let the elements upgrade on the
// client.
//
// This does not claim the components *render* on a server — they do not, and
// cannot without a document. It claims the weaker, load-bearing thing: the
// import is a harmless no-op instead of a `ReferenceError` that takes the
// whole route down.
//
// Usage: node packages/epaper-components/scripts/ssr-import-test.mjs

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

// A DOM global that exists here would mean the environment is not the bare
// server this test is meant to represent, and every assertion below would pass
// for the wrong reason.
const DOM_GLOBALS = ['window', 'document', 'HTMLElement', 'customElements', 'MutationObserver'];
{
  const present = DOM_GLOBALS.filter((name) => globalThis[name] !== undefined);
  record(
    'the test process has no DOM globals',
    present.length === 0,
    present.length ? `unexpectedly defined: ${present.join(', ')}` : undefined,
  );
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

// Every JS entry point in the exports map, barrel first.
const entries = Object.entries(pkg.exports)
  .map(([subpath, entry]) => [subpath, typeof entry === 'string' ? entry : entry.import])
  .filter(([, target]) => typeof target === 'string' && target.endsWith('.js'));

const failures = [];
for (const [subpath, target] of entries) {
  try {
    await import(path.join(root, target));
  } catch (error) {
    failures.push(`${subpath}: ${error.message}`);
  }
}
record(
  `every entry point imports in a bare Node process (${entries.length} subpaths)`,
  failures.length === 0,
  failures.length ? failures.slice(0, 3).join(' | ') : undefined,
);

// Importing must stay a no-op rather than reaching for a global shim: a
// library that writes `globalThis.HTMLElement` breaks the next thing to
// install a real DOM, because the classes are already bound to the fake base.
{
  const leaked = DOM_GLOBALS.filter((name) => globalThis[name] !== undefined);
  record(
    'importing does not install DOM globals of its own',
    leaked.length === 0,
    leaked.length ? `leaked: ${leaked.join(', ')}` : undefined,
  );
}

// The parts that never needed a DOM stay usable on a server, which is what
// makes the import worth doing at all rather than merely survivable.
{
  const { esc } = await import(path.join(root, 'dist/core/dom.js'));
  const { iconSvg } = await import(path.join(root, 'dist/index.js'));
  const escaped = esc('<script>');
  const svg = iconSvg('check', 16);
  record(
    'DOM-free helpers still work server-side',
    escaped === '&lt;script&gt;' && svg.startsWith('<svg'),
    `esc(<script>) -> ${escaped}`,
  );
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) process.exit(1);
