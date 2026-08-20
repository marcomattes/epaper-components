// `tsc -p tsconfig.build.json` mirrors the source tree into dist/, so with
// each component living in its own `src/components/<name>/<name>.ts`
// folder, it emits `dist/components/<name>/<name>.d.ts` — nested, with
// import specifiers to match (`../../core/dom`, `../button/button`, and
// `dist/index.d.ts`'s barrel re-exports pointing at `./components/<name>/<name>`).
// The rest of the build (vite's `dist/components/<name>.js` entries) and the
// package's `exports` map both expect the flat pre-restructure shape, so
// this step moves each declaration file up a level, rewrites the import
// specifiers that assumed the nested location, and removes the now-empty
// folder.
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const componentsDir = resolve(distDir, 'components');

if (existsSync(componentsDir)) {
  const names = readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(resolve(componentsDir, name, `${name}.d.ts`)));

  for (const name of names) {
    const from = resolve(componentsDir, name, `${name}.d.ts`);
    const to = resolve(componentsDir, `${name}.d.ts`);
    let content = readFileSync(from, 'utf8');
    // `../../core/x` -> `../core/x` (one level shallower once flattened).
    content = content.replaceAll('../../core/', '../core/');
    // `import '../other/other';` / `from '../other/other'` -> `./other`
    // (a same-folder sibling once flattened), for cross-component imports
    // like dropdown.ts's `import '../button/button'`.
    content = content.replace(/(['"])\.\.\/([a-zA-Z0-9-]+)\/\2\1/g, '$1./$2$1');
    writeFileSync(to, content, 'utf8');
    rmSync(resolve(componentsDir, name), { recursive: true });
  }

  const indexDtsPath = resolve(distDir, 'index.d.ts');
  if (existsSync(indexDtsPath)) {
    let indexContent = readFileSync(indexDtsPath, 'utf8');
    indexContent = indexContent.replace(
      /from '\.\/components\/([a-zA-Z0-9-]+)\/\1'/g,
      "from './components/$1'",
    );
    writeFileSync(indexDtsPath, indexContent, 'utf8');
  }

  console.log(`[flatten-dts] Flattened ${names.length} component declaration file(s).`);
}
