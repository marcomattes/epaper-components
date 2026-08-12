import { readFileSync } from 'node:fs';
import process from 'node:process';

// Prints the version a `dev` channel publish should carry, e.g. `1.0.1-dev.42`.
// Used by .github/workflows/release.yml, which stamps it into package.json
// before publishing under the `dev` dist-tag.

const build = process.argv[2];
if (!build || !/^\d+$/.test(build)) {
  console.error('Usage: node scripts/dev-version.mjs <build-number>');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const match = /^(\d+)\.(\d+)\.(\d+)(?:-([^+]+))?(?:\+.+)?$/.exec(version);
if (!match) {
  console.error(`package.json version is not valid semver: ${version}`);
  process.exit(1);
}

const [, major, minor, patch, prerelease] = match;

// A plain release version means `latest` already holds it, so the dev channel
// is heading for the next patch. An existing prerelease means that core version
// is still unpublished — dev builds sort underneath it rather than ahead of it.
const core = prerelease ? `${major}.${minor}.${patch}` : `${major}.${minor}.${Number(patch) + 1}`;

console.log(`${core}-dev.${build}`);
