import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// README.md, OVERVIEW.md, THEMING.md, CONTRIBUTING.md, CHANGELOG.md and
// LICENSE live at the repo root — that is the single source of truth, kept
// there (rather than inside this package) so GitHub renders them as the
// repo's landing page and search engines index real content there instead
// of a stub. npm's `files` field can only ship files that physically live
// inside the package directory, so this `prepack` step copies them in right
// before `npm pack`/`npm publish` collects `files`. The copies are
// git-ignored (see .gitignore in this directory) — they are a build
// artifact, not a second source of truth.

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const docs = [
  'README.md',
  'OVERVIEW.md',
  'THEMING.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md',
  'LICENSE',
];

for (const doc of docs) {
  copyFileSync(`${repoRoot}/${doc}`, `${packageRoot}/${doc}`);
}

console.log(`copy-root-docs: copied ${docs.length} file(s) from the repo root into the package.`);
