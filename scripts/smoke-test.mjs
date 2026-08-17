import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// Post-publish smoke test. Runs against the package as installed from the
// registry, not against the working tree, so it catches the failures that only
// exist in the published artifact: a missing entry in `files`, an `exports`
// subpath pointing at a file that was never built, or a broken barrel.
//
// Usage: node smoke-test.mjs [package-spec]   (default: the bare package name)

const pkg = process.argv[2] ?? '@marcomattes/epaper-components';

// The components are custom elements, so they need a DOM to register into.
const dom = new JSDOM('<!doctype html><html><body class="ink-page"></body></html>', {
  pretendToBeVisual: true,
});

const globals = [
  'window',
  'document',
  'HTMLElement',
  'customElements',
  'CustomEvent',
  'Element',
  'Node',
  'DocumentFragment',
  'SVGElement',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'FormData',
  'File',
  'HTMLFormElement',
  'HTMLInputElement',
  'Event',
  'KeyboardEvent',
  'MouseEvent',
  'DOMParser',
];
for (const key of globals) {
  if (dom.window[key] !== undefined) globalThis[key] = dom.window[key];
}

// Not implemented by jsdom; a few components observe size or visibility.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopObserver;
globalThis.IntersectionObserver ??= NoopObserver;

const checks = [];
const check = (name, fn) => checks.push({ name, fn });

check('barrel import registers custom elements', async () => {
  await import(pkg);
  const expected = ['e-button', 'e-input', 'e-form', 'e-select', 'e-table', 'e-date-picker'];
  const missing = expected.filter((tag) => !customElements.get(tag));
  if (missing.length) throw new Error(`not registered: ${missing.join(', ')}`);
});

check('a component renders into the light DOM', () => {
  const el = document.createElement('e-button');
  el.textContent = 'Save';
  document.body.append(el);
  const button = el.querySelector('button');
  if (!button) throw new Error('<e-button> rendered no <button>');
  if (el.shadowRoot) throw new Error('<e-button> opened a shadow root');
});

check('component subpath exports the class', async () => {
  const mod = await import(`${pkg}/button`);
  if (typeof mod.EButton !== 'function') throw new Error('EButton is not exported');
});

check('public asset subpaths resolve to real files', () => {
  const subpaths = [
    '/styles.min.css',
    '/tokens.css',
    '/base.css',
    '/components.css',
    '/themes/mono-high-contrast.css',
    '/themes/kaleido.css',
    '/custom-elements.json',
    '/core/dom',
  ];
  for (const subpath of subpaths) {
    const resolved = import.meta.resolve(pkg + subpath);
    readFileSync(fileURLToPath(resolved));
  }
});

check('type declarations ship alongside the JS', () => {
  const entry = fileURLToPath(import.meta.resolve(pkg));
  for (const dts of [
    entry.replace(/\.js$/, '.d.ts'),
    entry.replace(/index\.js$/, 'elements.d.ts'),
  ]) {
    readFileSync(dts);
  }
});

let failed = 0;
for (const { name, fn } of checks) {
  try {
    await fn();
    console.log(`ok    ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${checks.length} smoke checks failed for ${pkg}`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} smoke checks passed for ${pkg}`);
