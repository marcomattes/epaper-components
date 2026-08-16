# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- The site is responsive below 1024px. The header nav moves to its own
  full-width scroll strip instead of widening the document (every page used to
  scroll sideways to 964px), section heads no longer land under the sticky
  header, feature cards, key/value pairs and the install stepper stack on
  narrow viewports, and the tab list, category filter, data table and calendar
  scroll inside their own box.
- The cover no longer claims 1.2k GitHub stars. The count is fetched from the
  GitHub API at build time (`scripts/github-stars.mjs`) and baked into the
  static HTML, with a committed fallback when the API is unreachable. The
  component count and the colophon version are likewise generated from
  `data.ts` and `package.json` rather than typed by hand.

### Changed

- The tag release path is now staged as `guard → checks → release → update`.
  `checks` calls `ci.yml` as a reusable workflow instead of repeating its steps,
  and `update` installs the published version from the registry, registers the
  elements in jsdom (`scripts/smoke-test.mjs`), verifies the provenance
  attestation and redeploys the site and Storybook from the tagged source.
- `npm run bump-version` no longer creates the tag when run off `main`, since
  `main` requires a pull request and a squash or rebase merge would strand a
  tag created on the branch. It prints the post-merge tagging steps instead.

## [1.0.1] — 2026-08-12

### Changed

- Releases are now published by `.github/workflows/release.yml`. Every green
  CI run on `main` publishes a `<next-patch>-dev.<build>` version under the
  npm `dev` dist-tag (`npm i @marcomattes/epaper-components@dev`), and pushing
  a `v*` tag publishes `latest` — or `next` for prerelease tags — together
  with a GitHub Release built from this changelog. Replaces `publish.yml`.
- Storybook now opens on a new **Introduction** page (`src/stories/Introduction.mdx`)
  covering the e-paper constraints, install, conventions and the component
  inventory. `storySort` lists `Introduction` and `Foundations` ahead of the
  component groups so a cold load lands there.
- The site credits Marco Mattes ([mattes.dev](https://mattes.dev)) in the
  persistent footer bar, in the page 6 colophon and via `<meta name="author">`.
- Strengthened CI with browser tests, Storybook accessibility enforcement,
  visual-regression assertions, coverage thresholds and bundle checks.

### Fixed

- Hardened the component library across reconnect lifecycles, form state,
  input parsing, keyboard navigation, ARIA state, DOM preservation and
  subpath-import dependencies.
- Corrected component-specific behavior in navigation, pickers, data display,
  upload, layout and feedback elements, including strict date/time and JSON
  validation.

### Added

- **Data-display group** (8 new custom elements):
  - `<e-table>` — DataGrid with column headers, static sort buttons
    (cycles `none → asc → desc → none` and emits `e-sort`), row
    selection via header / row checkboxes (emits `e-select`), and an
    empty-state row.
  - `<e-list>` / `<e-list-item>` — structured list with optional
    header / footer slots and per-row `leading` / `trailing` slots.
  - `<e-tag>` — small inline label, optionally removable via a close
    button (emits `e-close`).
  - `<e-chip>` — selectable label for filters; toggles `selected` and
    emits `e-change` on click.
  - `<e-empty>` — empty-state placeholder (icon + title + description +
    action slot).
  - `<e-skeleton>` — static loading placeholder. Pure outline, no
    shimmer or animation. `shape="block"|"text"|"circle"`.
  - `<e-progress>` — static progress bar in `linear` or discrete `steps`
    variant. No animation; updates as a single dirty rectangle.
  - `<e-result>` — status page (success / error / 404 / info / warning)
    with icon, large title, description and action slot.
- New CSS sections in `components.css` for each of the above
  (`.ink-tag`, `.ink-chip`, `.ink-empty`, `.ink-skeleton`,
  `.ink-progress`, `.ink-result`, `.ink-list`, `.ink-table`).
- New Storybook stories under `Display/` (Tag, Empty, Skeleton,
  Progress, Result, List, Table) and `Inputs/` (Chip), plus 43 new
  Vitest cases in `src/components/__tests__/data-display.test.ts`
  covering rendering, reactivity, XSS escaping, event detail shapes
  and global-listener cleanup.
- New `package.json` `exports` sub-paths: `./tag`, `./chip`, `./empty`,
  `./skeleton`, `./progress`, `./result`, `./list`, `./table`.

## [1.0.0] — 2026-04-27

First stable release of the EPaper component library.

### Added

- 43 custom elements covering layout, typography, navigation, form controls,
  display, feedback and composite patterns. All registered under the `e-*`
  prefix (see `src/index.ts` for the full export list).
- `BaseFormControl<T>` abstract class with `serialize` / `parse` /
  `formResetCallback` / `formStateRestoreCallback` for form-associated
  custom elements.
- `core/dom.ts` cross-cutting helpers: `define`, `esc`, `boolAttr`, `numAttr`,
  `randId`, surgical `patchText` / `patchAttr` / `patchBoolAttr` /
  `patchClassModifier` for EPDC-friendly DOM mutations, and the
  `addCleanup` / `runCleanups` / `onGlobal` cleanup registry.
- Three CSS layers: `tokens.css`, `base.css`, `components.css`, plus a
  combined minified `epaper.min.css` bundle with source maps.
- `dist/elements.d.ts` augmenting `HTMLElementTagNameMap` for typed
  `document.createElement` and `querySelector` results.
- Custom Elements Manifest (`dist/custom-elements.json`), VS Code custom
  data (`dist/vscode.html-custom-data.json`) and JetBrains web-types
  (`dist/web-types.json`) for IDE autocompletion.
- `readonly` attribute on `<e-input>` and `<e-textarea>` for parity with
  native form controls.
- `peerDependencies: {}` declaration to make framework-agnosticism
  explicit (the library has zero runtime peers).
- Full keyboard navigation for compound pickers (`dropdown`, `select`,
  `menu`, `date-picker`, `time-picker`, `cascader`, `tree-select`):
  arrow-key traversal, `Home`/`End`, `PageUp`/`PageDown` for month
  navigation in `date-picker`, `Enter`/`Space` to activate and
  `Escape` to close — closing the WCAG 2.1 AA gap.
- `OVERVIEW.md` — high-level architecture guide with API conventions,
  event-detail contract and framework-integration snippets.
- `CLAUDE.md` — repository working guide for AI agents.

### Changed

- Library is now publicly framework-agnostic. Lit is no longer a documented
  keyword in `package.json` — Lit is only used for Storybook templating in
  the dev environment, never at runtime.
- `engines.node` raised to `>=20` (Node 18 LTS reaches end-of-life in 2025).
- Cascader placeholder default unified to `'Select…'` (was `'Choose…'`)
  for cross-component consistency.

### Fixed

- Removed dead `void esc;` reference in `<e-card>` left from an earlier
  refactor.

### Documentation

- Added "Framework integration" section to README with React 19, Vue 3,
  Angular 17+ and Svelte 5 snippets.
- Documented the event-detail contract explicitly: `{value: T}` is the
  default; `{checked: boolean}` (checkbox/toggle), `{files: File[]}`
  (upload), `{index: number}` (dropdown) and `{originalEvent: MouseEvent}`
  (button click) are intentional and follow native semantic conventions.
- README "Status" section updated from "Pre-1.0" to stable contract.

### Known limitations (V1.0)

These are intentional V1.0 trade-offs and slated for V1.1:

- **`tsconfig` is missing `noUncheckedIndexedAccess`.** Enabling it
  surfaces ~90 latent index-access cases (calendar grid cells,
  time-picker `split(':')` destructuring, story helpers). They are
  runtime-safe by construction but deserve precise typing rather than
  pauschal non-null assertions. Tracked for V1.1.
- **Test coverage is thematic**, not per-component. Cross-cutting suites
  cover form-association (14 controls), reactivity (7 components),
  cleanup (9 components) and security/XSS (12 components). Display-only
  components (`badge`, `card`, `divider`, …) rely on Storybook a11y
  scans (axe-core) for regression coverage.
- **Keyboard navigation** in compound pickers — implemented in V1.0
  (see "Added" above).
- **No built-in validation API unification.** `<e-input>` and
  `<e-textarea>` use the `error` attribute for visual state but do not
  call `internals.setValidity()`. `<e-upload>` uses the validation API.
  Consumers requiring form-level validation should add native HTML
  attributes (`required`, `pattern`, `minlength`) alongside `error`.
- **`<e-masonry>`** does not observe child mutations or container
  resizes; pages embedding it must trigger reflow manually after dynamic
  child changes.
- **`<e-kaleido>`** is a hardware-fingerprint visualisation tool kept in
  the public API for demo purposes; it is not a general-purpose layout
  primitive.

[unreleased]: https://github.com/marcomattes/epaper-components/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/marcomattes/epaper-components/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/marcomattes/epaper-components/releases/tag/v1.0.0
