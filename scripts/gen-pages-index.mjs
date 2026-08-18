// Generates the landing page for GitHub Pages.
// Usage: node scripts/gen-pages-index.mjs <out-file>
// Env:   BASE_URL (e.g. "/epaper-components/")

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const outArg = process.argv[2] ?? '_site/index.html';
const outRoot = resolve(process.cwd());
const out = resolve(outRoot, outArg);
// Containment check on the canonicalised path: the argument is maintainer-supplied
// in CI, but resolving it first and then requiring the repository root as a literal
// prefix keeps a stray `../` from writing outside the checkout. Comparing against
// `outRoot + sep` also rules out a sibling directory that merely shares the prefix
// (`/repo-backup` vs `/repo`), and the root itself, which is a directory.
if (!out.startsWith(outRoot + sep)) {
  console.error(`[gen-pages-index] refusing to write outside ${outRoot}: ${out}`);
  process.exit(1);
}
const base = (process.env.BASE_URL ?? '/').replace(/\/?$/, '/');

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const version = pkg.version;
const name = pkg.name;
const description = pkg.description;

let coveragePct = null;
const summaryPath = resolve('reports/coverage/coverage-summary.json');
if (existsSync(summaryPath)) {
  try {
    const s = JSON.parse(readFileSync(summaryPath, 'utf8'));
    coveragePct = s.total?.lines?.pct ?? null;
  } catch {
    /* ignore */
  }
}

const cards = [
  {
    href: `${base}storybook/`,
    title: '📚 Storybook',
    desc: 'Interactive component catalogue with live controls, a11y checks and source code.',
  },
  {
    href: `${base}demo/`,
    title: '🎨 Demo',
    desc: 'Standalone demo page wiring the components together.',
  },
  {
    href: `${base}coverage/`,
    title: '📊 Coverage report',
    desc:
      coveragePct != null
        ? `Detailed line/branch/function coverage — currently <strong>${coveragePct}%</strong>.`
        : 'Detailed line, branch and function coverage from the latest CI run.',
  },
  {
    href: `${base}tests/`,
    title: '✅ Test report',
    desc: 'Vitest HTML reporter — every unit and Storybook play test from the latest run.',
  },
];

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${name} · ${version}</title>
    <meta name="description" content="${description}" />
    <style>
      :root {
        color-scheme: light;
        --ink: #111;
        --paper: #fafafa;
        --rule: #111;
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        line-height: 1.5;
      }
      main { max-width: 880px; margin: 0 auto; padding: 64px 24px 96px; }
      header { border-bottom: 2px solid var(--rule); padding-bottom: 24px; margin-bottom: 48px; }
      h1 { font-size: 2.5rem; margin: 0 0 8px; letter-spacing: -0.02em; }
      .meta { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.875rem; opacity: 0.7; }
      p.lead { font-size: 1.125rem; max-width: 60ch; margin: 16px 0 0; }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
        margin-top: 32px;
      }
      a.card {
        display: block;
        border: 2px solid var(--rule);
        padding: 24px;
        color: inherit;
        text-decoration: none;
        background: white;
      }
      a.card:focus-visible { outline: 4px solid var(--ink); outline-offset: 2px; }
      a.card h2 { margin: 0 0 8px; font-size: 1.25rem; }
      a.card p { margin: 0; font-size: 0.9375rem; opacity: 0.85; }
      footer {
        margin-top: 64px;
        padding-top: 24px;
        border-top: 2px solid var(--rule);
        font-size: 0.875rem;
        opacity: 0.7;
      }
      footer a { color: inherit; }
      .badges { margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px; }
      .badges img { height: 20px; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>EPaper</h1>
        <div class="meta">${name} · v${version}</div>
        <p class="lead">${description}</p>
        <div class="badges">
          <a href="https://www.npmjs.com/package/${name}"><img alt="npm" src="https://img.shields.io/npm/v/${name}.svg?style=flat-square" /></a>
          <a href="https://github.com/marcomattes/epaper-components/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/marcomattes/epaper-components/ci.yml?branch=main&style=flat-square&label=CI" /></a>
          <a href="https://github.com/marcomattes/epaper-components/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/${name}.svg?style=flat-square" /></a>
        </div>
      </header>

      <section class="grid">
        ${cards
          .map(
            (c) => `<a class="card" href="${c.href}">
          <h2>${c.title}</h2>
          <p>${c.desc}</p>
        </a>`,
          )
          .join('\n        ')}
      </section>

      <footer>
        <p>
          Source: <a href="https://github.com/marcomattes/epaper-components">github.com/marcomattes/epaper-components</a> ·
          Install: <code>npm install ${name}</code>
        </p>
      </footer>
    </main>
  </body>
</html>
`;

writeFileSync(out, html, 'utf8');
console.log(`Wrote ${out} (base=${base})`);
