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
const VERSION_ARG_RE = /^v?\d+\.\d+\.\d+(?:[-+][\w.-]*)?$/;
const isExactVersion = VERSION_ARG_RE.test(input);
if (!allowedRanges.includes(input) && !isExactVersion) {
  console.error(`Invalid version argument: ${input}`);
  console.error(
    'Use patch|minor|major|prepatch|preminor|premajor|prerelease or an exact semver version.',
  );
  process.exit(1);
}

// `input` is now provably one of `allowedRanges` or matches VERSION_ARG_RE — it is
// never passed to execFileSync unchecked beyond this point.
execFileSync('npm', ['version', input, '--no-git-tag-version'], { stdio: 'inherit' });

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/;
if (typeof pkg.version !== 'string' || !SEMVER_RE.test(pkg.version)) {
  console.error(`package.json version is not a valid semver string: ${pkg.version}`);
  process.exit(1);
}
const version = pkg.version;
const commitMessage = `chore(release): bump version to v${version}`;

execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
execFileSync('git', ['add', '--all'], { stdio: 'inherit' });
execFileSync('git', ['commit', '-m', commitMessage], { stdio: 'inherit' });

// `main` is protected by a ruleset that requires a pull request, so the bump
// lands through a PR. Tagging here would be wrong: a squash or rebase merge
// rewrites this commit, and the tag would point at an object that never
// reaches `main`. On a release branch the tag is therefore left to the
// maintainer, after the merge.
const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const BRANCH_RE = /^[\w./-]+$/;
if (!BRANCH_RE.test(branch)) {
  console.error(`Unexpected characters in current branch name: ${branch}`);
  process.exit(1);
}
const defaultBranch = 'main';

if (branch === defaultBranch) {
  execFileSync('git', ['tag', '-a', `v${version}`, '-m', `Release v${version}`], {
    stdio: 'inherit',
  });
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
