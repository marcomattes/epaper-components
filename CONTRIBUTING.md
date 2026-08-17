# Contributing to EPaper

Thanks for the interest. EPaper is a small, opinionated component library —
contributions are welcome but the bar for adding surface area is high.

## Development setup

```sh
git clone <repo>
cd epaper-components
npm install
npm run dev          # local Vite demo at http://localhost:8085
npm run storybook    # Storybook at http://localhost:6006
npm test             # Vitest browser-mode interaction tests
npm run type-check   # tsc --noEmit, must be clean
npm run lint         # ESLint, must be clean
npm run build        # Build dist/, CEM, web-types, vscode-data
```

## Project layout

```
src/
  core/        # Cross-cutting helpers (dom, icons, base-form-control, types).
  components/  # One web component per file. Each ends with `define(...)`.
  styles/      # tokens.css, base.css, components.css. Public CSS surface.
  stories/     # Storybook documentation. Not shipped.
  demo/        # Demo HTML wiring. Not shipped.
scripts/
  gen-tag-map.mjs    # Emits dist/elements.d.ts (HTMLElementTagNameMap).
```

## Component conventions

Every component file follows this shape:

```ts
import { define, esc } from '../core/dom';
import { BaseFormControl } from '../core/base-form-control'; // for form inputs

/**
 * @summary One-line description.
 *
 * @attr {string} [foo] - Attribute description.
 * @fires {CustomEvent<{value: string}>} e-change - Event description.
 * @slot trigger - Slot description.
 *
 * @example
 * <e-foo></e-foo>
 */
export class EFoo extends HTMLElement {
  static observedAttributes = ['foo'];

  private _wired = false;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    // Render once. Use `esc()` for any user-supplied string.
  }

  attributeChangedCallback(_n: string, _o: string | null, _v: string | null) {
    // Surgical updates. Never re-render the whole subtree.
  }

  disconnectedCallback() {
    // If you attached document/window listeners, call runCleanups(this).
  }
}

define('e-foo', EFoo);
```

### Required for every component

1. **JSDoc** with `@summary`, `@attr`, `@fires`, `@slot`, `@example` where
   applicable. The CEM analyzer reads this to produce IDE integrations. No
   JSDoc → no autocomplete in VS Code or WebStorm.
2. **Use `esc()`** from `core/dom.ts` for every interpolated user value.
   Skipping it is an XSS vector.
3. **Form controls** must extend `BaseFormControl` and call
   `internals.setFormValue(...)` on every change.
4. **Global listeners** (`document`/`window`) must be registered with
   `onGlobal(this, ...)` and torn down via `runCleanups(this)` in
   `disconnectedCallback`.
5. **No transitions, no `:hover`.** Use `:focus-visible` and
   `[aria-selected]`/`[data-active]` for state cues.
6. **Light DOM only.** No `attachShadow`. Style via `components.css` and
   tokens.
7. **Add a Storybook story** under `src/stories/<group>/`. Stories are also
   the a11y test bed.

### Public API stability

Once a component has shipped a story and a test, its attributes, events,
slots, and exported class are part of the public API. Renames or removals
require a major version bump.

## Tests

Vitest runs in browser mode (Playwright). Add a `*.test.ts` next to the
component or under `src/components/__tests__/` covering at minimum:

- Rendering with default attributes.
- Attribute reactivity via `attributeChangedCallback`.
- Event emission with the documented detail shape.
- For form controls: `FormData` round-trip from a `<form>` parent.
- For interactive components: keyboard activation paths.

## Coverage and SonarQube

`npm run test:coverage:ci` writes everything the analysis needs:

```
reports/coverage/lcov.info   coverage, read by sonar.javascript.lcov.reportPaths
reports/test/sonar.xml       test results, read by sonar.testExecutionReportPaths
reports/coverage/index.html  the report to actually look at while writing tests
```

Both Vitest projects — `unit` and `storybook` — run in one invocation and V8
merges their coverage before writing, so a line exercised only by a story counts
as covered.

The thresholds in `vitest.config.ts` are a **regression floor, not a target**.
They sit at or just below the measured numbers (currently 87.7% lines, 87.7%
functions, 84.9% statements, 65.5% branches) so that a drop fails the run, and
they are deliberately not set to where coverage ought to be. The ratchet is
Sonar's quality gate on _new_ code, which holds every line a pull request
touches to a high bar without blocking on the legacy tree. Branch coverage is
the one with real room — raise the floor as you close the gap.

Two settings have to move together. `coverage.include` in `vitest.config.ts`
decides which files are measured; `sonar.coverage.exclusions` in
`sonar-project.properties` has to exclude everything outside that set, because
Sonar scores a file with no coverage data as 0% rather than as unmeasured. If
you add a directory of production code, add it to both.

To reproduce the analysis locally against SonarQube Cloud, with a token from
**My Account → Security**:

```sh
npm run test:coverage:ci
SONAR_TOKEN=<token> npx sonarqube-scanner
```

CI does the same in the `sonar` job of `ci.yml`, which downloads the reports
from the test job rather than re-running the suite. The quality gate is
blocking. Analysis is skipped, not failed, when `SONAR_TOKEN` is absent — that
is the case for pull requests from forks.

## Style

- TypeScript is strict. No `any` outside escape hatches.
- Run `npm run format` before committing.
- One concern per commit. Reformat-only commits should be separate from logic
  changes.

## Documentation changes

- `README.md` — getting started, install, top-level API, framework integration.
- `OVERVIEW.md` — architecture, API conventions, event-detail contract, known
  limitations. Update when changing cross-cutting patterns or the public event
  contract.
- `THEMING.md` — CSS custom properties and class names.
- `CONTRIBUTING.md` — author conventions (this file).
- `CHANGELOG.md` — every user-visible change. Add an entry in the same PR
  under the appropriate `[Unreleased]` section. Follow
  [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- `CLAUDE.md` — only update if you change patterns that AI agents should
  follow (hard rules, file conventions). Day-to-day docs go in OVERVIEW.md.

## Releasing

Publishing is automated in `.github/workflows/release.yml`. Never run
`npm publish` from a laptop — npm authenticates the workflow via Trusted
Publishing (OIDC), and a local publish would ship without provenance.

**`dev` channel.** Every push to `main` publishes once CI is green, as
`<next-patch>-dev.<run number>` under the `dev` dist-tag:

```sh
npm i @marcomattes/epaper-components@dev
```

The version is stamped inside the job and never committed, so `main` always
carries the last stable version in `package.json`.

**`latest` channel.** `main` is protected by a ruleset that requires a pull
request, so the version bump goes through one like any other change. The tag
is created afterwards, on the merged commit:

1. Move the `[Unreleased]` entries in `CHANGELOG.md` into a
   `## [x.y.z] — YYYY-MM-DD` section. Those lines become the GitHub Release
   notes verbatim; without a matching section the notes fall back to a link.
2. On a release branch, run `npm run bump-version -- patch|minor|major`. It
   bumps `package.json`, builds, and commits. Off `main` it deliberately does
   not tag, and prints the remaining steps.
3. Open the pull request and merge it **with a merge commit**. A squash or
   rebase merge rewrites the bump commit, which would leave the tag pointing
   at an object that never reaches `main`.
4. `git checkout main && git pull`, then tag the merged commit and push it:

   ```sh
   git tag -a vx.y.z -m "Release vx.y.z"
   git push origin vx.y.z
   ```

The tag run is staged: it first refuses any tag whose name is not
`v<package.json version>`, then re-runs the full quality gate by calling
`ci.yml` as a reusable workflow, then publishes and creates the GitHub Release,
and finally installs the published version from the registry to smoke-test it
and redeploys the site from the tagged source. A tag with a prerelease part
(`v1.1.0-rc.1`) is published under `next` rather than `latest`.

If the smoke test fails, the package is already on npm — it verifies the
published artifact rather than gating it. Fix forward with a patch release
rather than unpublishing.

## Event detail contract

Use `{ value: T }` as the default shape for `e-change`. The following shapes
are intentional exceptions matching native HTML semantic types — keep using
them rather than coercing to `value`:

- Boolean state (checkbox, toggle): `{ checked: boolean }`
- File payloads (upload): `{ files: File[] }`
- Pure-positional pickers (dropdown): `{ index: number }` on `e-select`
- Wrapper events (button click, link click): `{ originalEvent: Event }`

If you introduce a new component, prefer `{ value: T }` unless one of the
exceptions clearly applies.
