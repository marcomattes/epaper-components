import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

const input = process.argv[2];
if (!input) {
  console.error(
    'Usage: npm run bump-version -- <patch|minor|major|prepatch|preminor|premajor|prerelease|x.y.z>',
  );
  process.exit(1);
}

const allowedRanges = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'];
const isExactVersion = /^v?\d+\.\d+\.\d+(?:[-+].*)?$/.test(input);
if (!allowedRanges.includes(input) && !isExactVersion) {
  console.error(`Invalid version argument: ${input}`);
  console.error(
    'Use patch|minor|major|prepatch|preminor|premajor|prerelease or an exact semver version.',
  );
  process.exit(1);
}

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

run(`npm version ${input} --no-git-tag-version`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const commitMessage = `chore(release): bump version to v${version}`;

run('npm run build');
run('git add --all');
run(`git commit -m "${commitMessage}"`);
run(`git tag -a v${version} -m "Release v${version}"`);

console.log(`✅ Released version v${version} and created git tag v${version}`);
