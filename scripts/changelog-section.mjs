import { readFileSync } from 'node:fs';
import process from 'node:process';

// Prints the CHANGELOG.md body for one version — everything between its
// `## [x.y.z]` heading and the next `## ` heading. Used as the GitHub Release
// notes by .github/workflows/release.yml. Exits 1 when the version has no
// section yet so the workflow can fall back to generated notes.

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/changelog-section.mjs <version>');
  process.exit(1);
}

const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n');
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`No CHANGELOG.md section found for version ${version}`);
  process.exit(1);
}

let end = lines.length;
for (let i = start + 1; i < lines.length; i += 1) {
  if (lines[i].startsWith('## ')) {
    end = i;
    break;
  }
}

const body = lines
  .slice(start + 1, end)
  .join('\n')
  .trim();
if (!body) {
  console.error(`CHANGELOG.md section for version ${version} is empty`);
  process.exit(1);
}

console.log(body);
