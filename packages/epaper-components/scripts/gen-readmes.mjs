// Generates per-component READMEs at `src/components/<name>/README.md` from
// the Custom Elements Manifest produced by `cem analyze`.
//
// Why: gives each component a versioned, source-of-truth README that browsers
// like GitHub render directly next to the source. The README is fully derived
// from JSDoc — never edit it by hand.
//
// Inputs:
//   • dist/custom-elements.json (must exist; run `cem analyze` first)
//   • src/components/__tests__/__screenshots__/*.png (optional; produced by
//     `npx vitest run --project=unit src/components/__tests__/screenshots.test.ts`)
//
// Outputs:
//   • src/components/<basename>/README.md  (one per custom element)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cemPath = resolve(root, 'dist/custom-elements.json');
const componentsDir = resolve(root, 'src/components');
const screenshotsDir = resolve(componentsDir, '__tests__/__screenshots__');

if (!existsSync(cemPath)) {
  console.error(`[gen-readmes] ${cemPath} not found. Run "cem analyze" first.`);
  process.exit(1);
}

const cem = JSON.parse(readFileSync(cemPath, 'utf8'));

/** All PNG names available, e.g. "primitives-button--primary.png". */
const screenshotFiles = existsSync(screenshotsDir)
  ? readdirSync(screenshotsDir).filter((f) => f.endsWith('.png'))
  : [];

/**
 * Pick the screenshot whose middle segment (between category and `--story`)
 * matches the component's file basename with hyphens removed.
 *
 * These are the `--story.png` files, not the `-story-chromium-linux.png`
 * baselines beside them: only the former carry the double dash this pattern
 * needs. The two populations share a directory and nothing else — one is
 * documentation, the other is what `toMatchScreenshot` compares against — so
 * neither set can be removed on the strength of what the other is for.
 *
 * Component file `input-number.ts` → key `inputnumber`
 * Screenshot   `inputs-inputnumber--default.png` → middle `inputnumber`
 */
const SCREENSHOT_MIDDLE_RE = /^[a-z0-9]+-([a-z0-9]+)--/;

function findScreenshot(basenameNoExt) {
  const key = basenameNoExt.replaceAll('-', '');
  for (const f of screenshotFiles) {
    const m = SCREENSHOT_MIDDLE_RE.exec(f);
    if (m && m[1] === key) return f;
  }
  return null;
}

function escMd(s) {
  return String(s)
    .replaceAll('|', String.raw`\|`)
    .replaceAll(/\r?\n/g, ' ');
}

function attrsTable(attrs) {
  if (!attrs || attrs.length === 0) return '_None._\n';
  const rows = attrs.map((a) => {
    const name = `\`${a.name}\``;
    const type = a.type?.text ? `\`${escMd(a.type.text)}\`` : '—';
    const def = a.default ? `\`${escMd(a.default)}\`` : '—';
    const desc = a.description ? escMd(a.description) : '';
    return `| ${name} | ${type} | ${def} | ${desc} |`;
  });
  return (
    ['| Attribute | Type | Default | Description |', '| --- | --- | --- | --- |', ...rows].join(
      '\n',
    ) + '\n'
  );
}

function eventsTable(events) {
  if (!events || events.length === 0) return '_None._\n';
  const rows = events.map((e) => {
    const name = `\`${e.name}\``;
    const type = e.type?.text ? `\`${escMd(e.type.text)}\`` : '—';
    const desc = e.description ? escMd(e.description) : '';
    return `| ${name} | ${type} | ${desc} |`;
  });
  return ['| Event | Detail | Description |', '| --- | --- | --- |', ...rows].join('\n') + '\n';
}

function slotsTable(slots) {
  if (!slots || slots.length === 0) return '_None._\n';
  const rows = slots.map((s) => {
    const name = s.name ? `\`${s.name}\`` : '_(default)_';
    const desc = s.description ? escMd(s.description) : '';
    return `| ${name} | ${desc} |`;
  });
  return ['| Slot | Description |', '| --- | --- |', ...rows].join('\n') + '\n';
}

function membersTable(members) {
  const props = (members ?? []).filter(
    (m) => m.kind === 'field' && m.privacy !== 'private' && !m.static,
  );
  if (props.length === 0) return '';
  const rows = props.map((p) => {
    const name = `\`${p.name}\``;
    const type = p.type?.text ? `\`${escMd(p.type.text)}\`` : '—';
    const ro = p.readonly ? 'yes' : 'no';
    const desc = p.description ? escMd(p.description) : '';
    return `| ${name} | ${type} | ${ro} | ${desc} |`;
  });
  return (
    '\n## Properties\n\n' +
    ['| Property | Type | Read-only | Description |', '| --- | --- | --- | --- |', ...rows].join(
      '\n',
    ) +
    '\n'
  );
}

function buildReadme(decl, modulePath) {
  const baseNoExt = basename(modulePath).replace(/\.ts$/, '');
  const screenshot = findScreenshot(baseNoExt);
  const summary = (decl.summary || decl.description || '').trim();
  const tag = decl.tagName ?? '';
  const imageBlock = screenshot
    ? `<p><img alt="${tag} screenshot" src="../__tests__/__screenshots__/${screenshot}" width="480" /></p>\n\n`
    : '<!-- No screenshot found. Run the screenshots test to generate one. -->\n\n';

  return `<!-- AUTO-GENERATED by scripts/gen-readmes.mjs from JSDoc + Custom Elements Manifest. DO NOT EDIT. -->

# \`<${tag}>\`

${imageBlock}${summary ? summary + '\n\n' : ''}> Source: [${baseNoExt}.ts](./${baseNoExt}.ts)

## Attributes

${attrsTable(decl.attributes)}
## Events

${eventsTable(decl.events)}
## Slots

${slotsTable(decl.slots)}${membersTable(decl.members)}`;
}

let written = 0;
for (const mod of cem.modules ?? []) {
  if (!mod.path?.startsWith('src/components/')) continue;
  const decl = (mod.declarations ?? []).find((d) => d.kind === 'class' && d.customElement);
  if (!decl) continue;
  const baseNoExt = basename(mod.path).replace(/\.ts$/, '');
  const outPath = resolve(componentsDir, baseNoExt, 'README.md');
  writeFileSync(outPath, buildReadme(decl, mod.path), 'utf8');
  written++;
}

console.log(`[gen-readmes] Wrote ${written} README files to src/components/`);
