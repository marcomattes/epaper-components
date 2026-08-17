import { execFileSync } from 'node:child_process';
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

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function capture(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

/** Validate a dynamic argument against an allowlist pattern before it reaches execFileSync. */
function assertSafeArg(value, pattern, label) {
  if (!pattern.test(value)) {
    console.error(`Refusing to run: ${label} "${value}" failed validation.`);
    process.exit(1);
  }
  return value;
}

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/;
const BRANCH_RE = /^[\w./-]+$/;

run('npm', [
  'version',
  assertSafeArg(input, /^[\w.+-]+$/, 'version argument'),
  '--no-git-tag-version',
]);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = assertSafeArg(pkg.version, SEMVER_RE, 'package.json version');
const commitMessage = `chore(release): bump version to v${version}`;

run('npm', ['run', 'build']);
run('git', ['add', '--all']);
run('git', ['commit', '-m', commitMessage]);

// `main` is protected by a ruleset that requires a pull request, so the bump
// lands through a PR. Tagging here would be wrong: a squash or rebase merge
// rewrites this commit, and the tag would point at an object that never
// reaches `main`. On a release branch the tag is therefore left to the
// maintainer, after the merge.
const branch = assertSafeArg(
  capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
  BRANCH_RE,
  'current branch name',
);
const defaultBranch = 'main';

if (branch === defaultBranch) {
  run('git', ['tag', '-a', `v${version}`, '-m', `Release v${version}`]);
  console.log(`\n✅ Bumped to v${version}, committed and tagged.`);
  console.log('   Push with: git push --follow-tags');
} else {
  console.log(`\n✅ Bumped to v${version} and committed on ${branch} (not tagged).`);
  console.log('   Next:');
  console.log(`     git push -u origin ${branch}`);
  console.log(`     gh pr create --base ${defaultBranch} --title "${commitMessage}"`);
  console.log('     gh pr merge <n> --merge      # a merge commit keeps this commit reachable');
  console.log(`     git checkout ${defaultBranch} && git pull`);
  console.log(
    `     git tag -a v${version} -m "Release v${version}" && git push origin v${version}`,
  );
}
