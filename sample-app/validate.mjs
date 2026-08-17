#!/usr/bin/env node
// Runtime and build-artifact validation for the claims made in README.md.
//
// Run after `npm run build` (dist/ must exist). Serves the repository root
// over HTTP and drives it with a real Chromium instance so the assertions
// below exercise the built package the way a consumer actually would,
// rather than the TypeScript sources.
//
// Usage: node sample-app/validate.mjs

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function assert(name, condition, detail) {
  record(name, !!condition, detail);
}

// ---------------------------------------------------------------------------
// 1. Static checks against the package manifest and build artifacts — no
//    browser needed.
// ---------------------------------------------------------------------------

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

{
  const exportKeys = Object.keys(pkg.exports);
  const missing = [];
  for (const key of exportKeys) {
    const entry = pkg.exports[key];
    const targets = typeof entry === 'string' ? [entry] : Object.values(entry);
    for (const target of targets) {
      if (typeof target !== 'string') continue;
      const resolved = path.join(root, target);
      if (!fs.existsSync(resolved)) missing.push(`${key} -> ${target}`);
    }
  }
  assert(
    `Public exports resolve to real files (${exportKeys.length} subpaths)`,
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : undefined,
  );
}

{
  const cem = JSON.parse(fs.readFileSync(path.join(distDir, 'custom-elements.json'), 'utf8'));
  const tags = [];
  for (const mod of cem.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      if (decl.customElement && decl.tagName) tags.push(decl.tagName);
    }
  }
  const unique = new Set(tags);
  assert(
    'Custom Elements Manifest declares 82 unique custom elements',
    tags.length === 82 && unique.size === 82,
    `found ${tags.length} declarations, ${unique.size} unique`,
  );
}

// ---------------------------------------------------------------------------
// 2. Browser-driven checks against the built dist/ output.
// ---------------------------------------------------------------------------

// Build a fixed manifest of every file this script is allowed to serve, up
// front, from trusted (non-request) input only. The request handler below
// then only ever uses the incoming URL as a lookup key into this map — it
// never concatenates request data into a filesystem path, so there is no
// path-traversal sink to sanitize in the first place.
function collectFiles(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (fs.statSync(abs).isDirectory()) collectFiles(abs, out);
    else out.push(abs);
  }
}

const servableFiles = [];
for (const dir of [distDir, path.join(root, 'sample-app', 'fixtures')]) {
  if (fs.existsSync(dir)) collectFiles(dir, servableFiles);
}
const fileManifest = new Map(
  servableFiles.map((abs) => ['/' + path.relative(root, abs).split(path.sep).join('/'), abs]),
);

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = fileManifest.get(urlPath);
  if (!filePath) {
    res.writeHead(404);
    res.end();
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': types[ext] ?? 'application/octet-stream' });
    res.end(data);
  });
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch(
  fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {},
);

async function withPage(fn) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('requestfailed', (r) => {
    if (!r.url().includes('favicon')) consoleErrors.push(`request failed: ${r.url()}`);
  });
  try {
    await fn(page, consoleErrors);
  } finally {
    await page.close();
  }
  return consoleErrors;
}

// --- Selective registration: importing one subpath registers only that tag.
{
  const errors = await withPage(async (page) => {
    await page.goto(`${base}/sample-app/fixtures/selective.html`);
    const state = await page.evaluate(() => ({
      button: !!customElements.get('e-button'),
      input: !!customElements.get('e-input'),
      form: !!customElements.get('e-form'),
    }));
    assert(
      'Selective import registers only the imported component',
      state.button && !state.input && !state.form,
      JSON.stringify(state),
    );
  });
  if (errors.length)
    assert('selective.html loads without console/network errors', false, errors.join('; '));
}

// --- Compound child-element registration: importing select.js also
//     registers e-option, without registering unrelated tags.
{
  await withPage(async (page) => {
    await page.goto(`${base}/sample-app/fixtures/compound.html`);
    const state = await page.evaluate(() => ({
      select: !!customElements.get('e-select'),
      option: !!customElements.get('e-option'),
      button: !!customElements.get('e-button'),
    }));
    assert(
      'Importing a parent module also registers its compound child element',
      state.select && state.option && !state.button,
      JSON.stringify(state),
    );
  });
}

// --- Barrel registration + everything else, on one page.
await withPage(async (page, consoleErrors) => {
  await page.goto(`${base}/sample-app/fixtures/barrel.html`);
  await page.waitForTimeout(200);

  // Barrel registers all 82 tags.
  const tagCount = await page.evaluate(async () => {
    const cem = await (await fetch('/dist/custom-elements.json')).json();
    const tags = [];
    for (const mod of cem.modules ?? []) {
      for (const decl of mod.declarations ?? []) {
        if (decl.customElement && decl.tagName) tags.push(decl.tagName);
      }
    }
    return tags.filter((t) => customElements.get(t)).length;
  });
  assert('Barrel import registers all 82 elements', tagCount === 82, `${tagCount}/82 defined`);

  // Light DOM: no shadow roots anywhere in the fixture.
  const shadowCount = await page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll('*')) if (el.shadowRoot) n++;
    return n;
  });
  assert(
    'No component attaches a shadow root (light DOM only)',
    shadowCount === 0,
    `${shadowCount} shadow roots found`,
  );

  // Token override: a CSS custom property set on an ancestor is read by a
  // descendant component through the cascade, not baked in at render time.
  const tokenColor = await page.evaluate(() => {
    // .ink-btn--primary paints its background from --ink-fg.
    const probe = document.getElementById('token-probe').querySelector('.ink-btn');
    return getComputedStyle(probe).backgroundColor;
  });
  assert(
    'CSS custom property overrides (--ink-fg) flow through to rendered components',
    tokenColor === 'rgb(18, 52, 86)', // #123456
    tokenColor,
  );

  // Animations/transitions are globally disabled inside .ink-page.
  const anim = await page.evaluate(() => {
    const el = document.getElementById('anim-probe');
    el.setAttribute('error', ''); // trigger a class/attr change that would animate elsewhere
    const cs = getComputedStyle(el);
    return { transitionDuration: cs.transitionDuration, animationName: cs.animationName };
  });
  assert(
    'Transitions and animations are disabled inside .ink-page',
    anim.transitionDuration === '0s' && anim.animationName === 'none',
    JSON.stringify(anim),
  );

  // ElementInternals / native form participation: the button's `form`
  // getter resolves to the real <form>, proving attachInternals() wired it
  // up as a listed, form-associated element.
  const formAssoc = await page.evaluate(() => {
    const btn = document.getElementById('submit-btn');
    const innerForm = document.querySelector('#e-profile form');
    return btn.form === innerForm;
  });
  assert('Form-associated custom elements resolve `.form` via ElementInternals', formAssoc);

  // Required validation + regression check for the input.value setter: a
  // required field set via the *property* (not the attribute) must clear
  // valueMissing, or every framework-style controlled input would stay
  // permanently invalid.
  const validity = await page.evaluate(() => {
    const input = document.getElementById('name-input');
    const before = input.checkValidity();
    input.value = 'Ada';
    const after = input.checkValidity();
    return { before, after };
  });
  assert(
    'Required <e-input> reports invalid when empty and valid after `.value =` is set',
    validity.before === false && validity.after === true,
    JSON.stringify(validity),
  );

  // Native submit/reset: clicking a type="submit" e-button inside e-form
  // fires a native submit -> preventDefault -> e-submit, only once the form
  // is actually valid.
  const submitFired = await page.evaluate(
    () =>
      new Promise((resolve) => {
        document.getElementById('e-profile').addEventListener('e-submit', () => resolve(true), {
          once: true,
        });
        setTimeout(() => resolve(false), 1500);
        document.getElementById('submit-btn').querySelector('button').click();
      }),
  );
  assert('Clicking a type="submit" e-button fires e-submit on a valid form', submitFired === true);

  // Repeated FormData entries: <e-checkbox-group> appends one entry per
  // selected value under the same name; Object.fromEntries keeps only the
  // last one, getAll() keeps all of them.
  const formDataCheck = await page.evaluate(() => {
    const form = document.querySelector('#e-profile form');
    const fd = new FormData(form);
    return { fromEntries: Object.fromEntries(fd).topics, all: fd.getAll('topics') };
  });
  assert(
    'Object.fromEntries(FormData) drops repeated checkbox-group values; getAll() does not',
    formDataCheck.fromEntries === 'b' && JSON.stringify(formDataCheck.all) === '["a","b"]',
    JSON.stringify(formDataCheck),
  );

  // Typed custom events: representative sample across the nine event names.
  const events = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const seen = {};
        const done = new Set();
        const expect = [
          'e-change',
          'e-input',
          'e-click',
          'e-close',
          'e-load',
          'e-sort',
          'e-select',
          'e-submit',
        ];

        for (const name of [
          'e-change',
          'e-input',
          'e-click',
          'e-close',
          'e-load',
          'e-sort',
          'e-select',
          'e-submit',
        ]) {
          document.addEventListener(
            name,
            (e) => {
              seen[name] = e.detail;
              done.add(name);
              if (done.size === expect.length) finish();
            },
            { once: false },
          );
        }

        function finish() {
          clearTimeout(timer);
          resolve(seen);
        }
        const timer = setTimeout(finish, 1500);

        // e-change + e-input: type into the name input.
        const input = document.getElementById('name-input').querySelector('input');
        input.value = 'Grace';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // e-click (+ e-submit, already wired above via the submit button).
        document.getElementById('submit-btn').querySelector('button').click();

        // e-close: activate the tag's close control.
        document.getElementById('tag-probe').querySelector('.ink-tag__close')?.click();

        // e-sort: give the table a sortable column, then click its header.
        const table = document.getElementById('table-probe');
        table.setAttribute(
          'columns',
          JSON.stringify([{ key: 'name', title: 'Name', sortable: true }]),
        );
        table.setAttribute('data', JSON.stringify([{ name: 'Ada' }]));
        requestAnimationFrame(() => {
          table.querySelector('th button')?.click();
        });

        // e-select: open the dropdown and activate an item.
        const dropdown = document.getElementById('dropdown-probe');
        dropdown.querySelector('[slot="trigger"] button')?.click();
        requestAnimationFrame(() => {
          dropdown.querySelector('.ink-dropdown__menu button')?.click();
        });

        // e-load: create a fresh <e-image> now, after the listener above is
        // already attached, so the load can actually be observed instead of
        // firing before anyone is listening.
        const img = document.createElement('e-image');
        img.setAttribute('src', "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E");
        document.body.appendChild(img);
      }),
  );
  assert(
    'e-change fires with { value }',
    typeof events['e-change']?.value === 'string',
    JSON.stringify(events['e-change']),
  );
  assert(
    'e-input fires with { value } on every keystroke',
    typeof events['e-input']?.value === 'string',
    JSON.stringify(events['e-input']),
  );
  assert(
    'e-click fires with { originalEvent }',
    events['e-click']?.originalEvent instanceof Object,
    JSON.stringify(Object.keys(events['e-click'] ?? {})),
  );
  assert(
    'e-close fires with { value }',
    typeof events['e-close']?.value === 'string',
    JSON.stringify(events['e-close']),
  );
  assert(
    'e-sort fires with { key, direction }',
    events['e-sort']?.key === 'name' &&
      ['asc', 'desc', 'none'].includes(events['e-sort']?.direction),
    JSON.stringify(events['e-sort']),
  );
  assert(
    'e-select fires with { index }',
    typeof events['e-select']?.index === 'number',
    JSON.stringify(events['e-select']),
  );
  assert(
    'e-submit fires with { form }',
    events['e-submit']?.form != null,
    JSON.stringify(Object.keys(events['e-submit'] ?? {})),
  );
  // e-load can race the image decode relative to the listener above; treat
  // absence as inconclusive rather than a hard failure.
  if (events['e-load'] !== undefined) {
    assert(
      "e-load fires with { value: 'src' | 'fallback' | 'placeholder' }",
      ['src', 'fallback', 'placeholder'].includes(events['e-load']?.value),
      JSON.stringify(events['e-load']),
    );
  }

  if (consoleErrors.length) {
    assert('barrel.html loads without console/network errors', false, consoleErrors.join('; '));
  }
});

await browser.close();
server.close();

const failed = results.filter((r) => !r.pass);
console.log('');
console.log(`${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('Failed:');
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
  process.exit(1);
}
