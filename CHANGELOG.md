# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A 404 page on the website, built from the same shell as every other page and
  listing all of them as real links. It is written to `dist-site/404.html`,
  stays out of the sitemap, `llms.txt` and the markdown alternates, and carries
  `noindex,follow` with no canonical and no structured data.
- The site build now emits an `.htaccess` next to `_headers`, pointing the host
  at `/404.html` and declaring `text/markdown` for the `.md` alternates. The
  existing `_headers` file is the Netlify/Cloudflare Pages format and has no
  effect on the FTP host the site is deployed to.

## [1.1.0] — 2026-08-18

### Added

- A long-form section on the website: eight new pages under `/guides/` — four
  guides (e-paper partial refresh and waveforms, web components without Shadow
  DOM, form-associated custom elements with `ElementInternals`, and e-ink
  interface design) and four recipes (status dashboard, electronic shelf label,
  meeting room display, weather station) — plus a `/faq/` page carrying 25
  questions as `FAQPage` structured data. Roughly 11,700 words, all present as
  real text in the served HTML.
- Article bodies are authored as typed blocks (`src/site/blocks.ts`) and
  rendered to HTML and markdown from that single source, so each page's `.md`
  alternate and its entry in `llms-full.txt` cannot drift from the HTML.
- Per-article `TechArticle` structured data with publication and modification
  dates, `og:type=article` metadata, three-level breadcrumbs, and sitemap
  entries whose `lastmod` reflects the article's own update date rather than
  the build date. `llms.txt` now indexes the guides, the recipes and the FAQ,
  and links the markdown alternate for each.
- Six e-paper data-display components: `<e-meter>` for discrete bounded
  measurements, `<e-sparkline>` for monochrome mini-charts,
  `<e-status-board>` for keyed KPI matrices, `<e-change-marker>` for persistent
  change cues, `<e-last-updated>` for host-scheduled freshness states and
  `<e-diff>` for visible previous/current comparisons. All six encode state
  with text, geometry and patterns rather than animation or color alone.
- High-contrast monochrome and Kaleido panel themes, shipped as readable and
  minified CSS subpath exports. Semantic accent/status tokens collapse to black
  in the base theme and map to flat Kaleido colors without removing icon,
  border-weight or hatch cues.
- An automated e-paper refresh-budget suite for representative progress,
  time-picker, table, select and tabs interactions. It fails on host-subtree
  replacement and enforces per-scenario mutation, element-churn and
  approximated dirty-area limits.
- SonarQube Cloud analysis on every pull request and every push to `main`.
  `sonar-project.properties` carries the configuration; the `sonar` job in
  `ci.yml` consumes the coverage and test reports the test job produced rather
  than re-running the suite, and a failing quality gate fails CI. The job skips
  itself with a notice when `SONAR_TOKEN` is unset, so pull requests from forks
  stay green.
- Coverage is now measured on every CI run (`npm run test:coverage:ci` replaces
  `npm run test:ci` in the workflow) and uploaded as a build artifact together
  with the JUnit, JSON and HTML test reports.
- `vitest-sonar-reporter` emits `reports/test/sonar.xml` in Sonar's Generic Test
  Execution format, which is what Sonar reads for JavaScript and TypeScript —
  it cannot import the JUnit XML the suite already wrote.
- `sample-app/`: a Playwright-driven runtime check plus a strict-TypeScript
  compile, both run in CI, that hold `README.md`'s claims to the built
  `dist/` output — selective vs. barrel registration, compound child-element
  registration, the 95-tag Custom Elements Manifest, light DOM, token
  overrides, disabled animations, `ElementInternals`, required validation,
  the nine typed custom events, native submit/reset, and repeated `FormData`
  entries from `<e-checkbox-group>`.
- `<e-dialog>` — modal dialog on the native `<dialog>` element. Opens via
  `showModal()`, so focus trapping, `Escape`, the top layer and inertness of
  the page behind it come from the browser. The backdrop is a flat
  `--ink-hatch-cover` fill rather than a translucent wash, which would dither
  unpredictably between refreshes. Supports `size`, `no-close` and `static`,
  a `footer` slot, `data-close` on any descendant, and reports what dismissed
  it through `e-close`'s `reason`.
- `<e-alert>` — inline status banner in four severities. The static
  counterpart to a toast: nothing appears or disappears on a timer, because a
  message that auto-dismisses can be missed between two panel refreshes.
  Severity is carried by an icon, a border weight and a hatch fill, never by
  color alone.
- `<e-collapse>` / `<e-collapse-panel>` — disclosure stack on native
  `<details>`/`<summary>`, with an `accordion` mode and `default-open`.
  Expanding mutates one attribute, so only the section that changed repaints.
- `<e-tree>` — standalone hierarchical tree for navigation and display, with
  optional `selectable` rows and `checkable` rows whose checks cascade through
  the subtree and report partially checked parents as `aria-checked="mixed"`.
- `<e-popover>` and `<e-popconfirm>` — click-triggered overlays, the
  counterpart to hover-driven tooltips on hardware whose digitizer reports
  contact rather than proximity. Both are non-modal and position through CSS,
  mirroring `<e-dropdown>`; the Popover API and CSS anchor positioning both
  sit above this library's browser floor.
- The site is six real URLs — `/`, `/features/`, `/components/`, `/showcase/`,
  `/install/`, `/community/` — instead of one hash-routed scroll page. Every page
  is a complete static document with its own `<title>`, description, canonical
  link, Open Graph and Twitter card, and a single `<h1>`. `src/site/routes.ts` is
  the one source of truth for routing, navigation, `<head>` and the sitemap;
  `scripts/build-site-routes.mjs` writes the sub-pages after the inlining step.
- Page content is generated at build time from `src/site/content.ts`, so all of
  it is in the served HTML. Previously only the cover was; pages 2-6 were
  rendered by JavaScript after first paint, which meant a crawler that does not
  execute JS — most AI crawlers — saw a hero and nothing else. Presentational
  components are emitted as the markup they would produce, because `e-card`,
  `e-steps`, `e-timeline` and `e-description-list` take their headings from
  attributes, which text extractors ignore.
- `robots.txt`, `sitemap.xml` and `llms.txt`, plus JSON-LD per page
  (`SoftwareSourceCode`, `WebSite`/`WebPage`, `BreadcrumbList`, an `ItemList`
  of the components and design principles, and a `HowTo` for installation).
  AI crawlers are explicitly allowed in `robots.txt`.
- LLM/agent discovery signals now ship as first-class site artifacts: every
  page advertises a Markdown alternate (`<link rel="alternate"
type="text/markdown">`), static `.md` route companions are generated
  (`/index.md`, `/features.md`, `/components.md`, `/showcase.md`,
  `/install.md`, `/community.md`), `/llms-full.txt` provides a one-fetch
  complete docs dump, `robots.txt` includes
  `Content-Signal: search=yes, ai-input=yes, ai-train=yes`, and `_headers`
  includes HTTP `Link` alternates for HTML↔Markdown responses on hosts that
  support static header manifests.
- A favicon, an apple-touch icon and a 1200×630 Open Graph card
  (`src/site/public/`).
- Per-pull-request preview deployments
  (`.github/workflows/preview.yml`). Every PR from a branch in this repository
  publishes the site and Storybook to
  `https://epaper-components.dev/preview/pr-<number>/` and gets a sticky
  comment with the links; closing the PR deletes the directory again. Pull
  requests from forks are skipped, because they never receive the FTP
  credentials. Preview pages are stamped `noindex,nofollow` and `/preview/` is
  disallowed in `robots.txt`, so a throwaway copy cannot compete with the live
  site in search results.
- `.github/workflows/visual-baselines.yml`, a manually dispatched job that
  regenerates the `screenshots.test.ts` PNG baselines inside the same pinned
  Playwright container CI compares against, and pushes them to a branch. Font
  rasterisation differs between Chromium builds, so a baseline produced on any
  other machine fails CI by one to four pixels.

### Changed

- Cleared the open SonarQube Cloud findings on `main`. `observedAttributes`,
  `formAssociated` and the bound event-handler fields are now declared
  `readonly`, `<e-form-item>`'s renderer and `<e-empty>`'s attribute callback
  are split into one sync method per slot to come back under the
  cognitive-complexity budget, and the `data-*` writes that had a `dataset`
  equivalent use it. None of this changes rendered output or the public
  attribute, event and slot contract.
- `scripts/inline-site-css.mjs` normalises `VITE_SITE_BASE` by splitting on
  `/` instead of trimming with `/\/+$/`, which backtracked super-linearly on a
  run of slashes. A base with interior double slashes now collapses to a single
  separator rather than producing a broken `/a//b/` prefix.
- `eslint.config.mjs` builds its config with `defineConfig`/`globalIgnores`
  from `eslint/config`; typescript-eslint deprecated the `tseslint.config()`
  wrapper it used before.

- All thirteen `BaseFormControl` subclasses now participate in native
  constraint validation. Composite controls implement a shared `required`
  contract through `ElementInternals`; text and number controls mirror their
  inner native control's validity flags and use its focusable validation
  anchor.
- The public roadmap is outcome-based: V1.1 groups form reliability, panel
  themes and refresh budgets, while hardware adapters and SSR helpers remain
  demand-driven rather than carrying premature version promises.
- The coverage thresholds are now a regression floor rather than a target. CI
  previously ran without `--coverage`, so the branch threshold of 70% was never
  evaluated against the 65.5% the suite actually reaches; it is now 65%, which
  fails on a drop instead of blocking every build. The bar for new code is
  Sonar's quality gate, which applies to changed lines only.
- `src/core/types.ts` is excluded from coverage. It is type-only and compiles to
  an empty module, so it could only ever be reported as 0% covered.
- Tree traversal, expansion, roving tabindex and keyboard navigation moved
  into `src/core/tree.ts`, shared by `<e-tree-select>` and the new `<e-tree>`.
  `<e-tree-select>`'s public behaviour is unchanged.
- The site's internal links are base-aware. `VITE_SITE_BASE` now drives
  `SITE_BASE`/`withBase()` in `src/site/routes.ts`, which prefixes the header
  nav, the page-to-page pager, the in-page calls to action, the favicon and
  the apple-touch icon. Previously it only moved Vite's asset base, so a site
  served from a sub-directory linked back to the production root. Output at
  the root is byte-for-byte unchanged.
- The tag release path is now staged as `guard → checks → release → update`.
  `checks` calls `ci.yml` as a reusable workflow instead of repeating its steps,
  and `update` installs the published version from the registry, registers the
  elements in jsdom (`scripts/smoke-test.mjs`), verifies the provenance
  attestation and redeploys the site and Storybook from the tagged source.
- `npm run bump-version` no longer creates the tag when run off `main`, since
  `main` requires a pull request and a squash or rebase merge would strand a
  tag created on the branch. It prints the post-merge tagging steps instead.
- The build and release tooling no longer reaches a shell. `scripts/bump-version.mjs`
  and `scripts/gen-*.mjs` run through `scripts/lib/run-command.mjs`, which
  resolves an allowlisted executable and spawns it with an argv array, so no
  interpolated value — version argument, `package.json` version or branch name
  — can be interpreted as a command. Every `npm ci`/`npm install` step in CI
  passes `--ignore-scripts`, third-party actions are pinned to commit SHAs, and
  the `workflow_run` dev-publish job checks the head repository before running.
- `<e-card>` and `<e-card-image>` share one `syncEyebrowTitle()` helper in
  `src/core/dom.ts` instead of duplicating the eyebrow/title reconciliation.
  Rendered output is unchanged.

### Fixed

- Sixteen visual-regression baselines refreshed inside the pinned Playwright
  container (`mcr.microsoft.com/playwright:v1.59.1-noble`) that CI compares
  against, the environment `.github/workflows/visual-baselines.yml` exists to
  provide. They had been captured where font metrics differ, so
  `screenshots.test.ts` failed on `main` and on every branch cut from it, with
  dimension deltas (e.g. 296×70 vs. 296×73) that no pixel tolerance absorbs.
  Rendering itself is unchanged: regenerated from `main` and from this branch,
  all 67 baselines come out byte-identical.

- `README.md` and `OVERVIEW.md` corrected against the actual built package:
  the static-HTML quick start now resolves without a bundler (bare
  specifiers need an import map or a real file path — it had neither), the
  `<e-button>` submit example now sets `type="submit"` (the default is
  `type="button"`), the events table now lists all nine event names instead
  of five, the typed-listener example now compiles under `strict: true`,
  bundle size is corrected to its measured ~37 KB gzip / 31.6 KB brotli, the
  VS Code section no longer claims `contributes.html.customData` is
  auto-loaded from a dependency, and the "surgical updates", touch-target,
  gradient/opacity and skeleton/progress claims are scoped to what the
  library actually does rather than stated as absolutes.
- `<e-input>` and `<e-textarea>` now re-run constraint validation when `value`
  is set as a JavaScript property, not only on attribute changes and
  `form.reset()`. Previously a `required` field populated via `el.value = …`
  — the pattern every framework uses for a controlled input — stayed
  permanently `invalid`, silently blocking `form.requestSubmit()`.
- `claude.md` renamed to `CLAUDE.md`. Every doc in the repo linked to it as
  `CLAUDE.md`; on a case-sensitive filesystem the link never resolved, and
  Claude Code's own project-instructions discovery (which looks for
  `CLAUDE.md` specifically) never found the file.
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

[unreleased]: https://github.com/marcomattes/epaper-components/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/marcomattes/epaper-components/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/marcomattes/epaper-components/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/marcomattes/epaper-components/releases/tag/v1.0.0
