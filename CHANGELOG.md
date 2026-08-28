# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `<e-status-pill>`: the single-value counterpart to `<e-status-board>`, for
  the "free / busy", "in stock / sold out", "running / stopped" marker a door
  sign, shelf label or machine tile leads with. Its status vocabulary is open
  — `statuses` declares whatever keys a deployment needs — because the five
  built-in ones could only be bent into shape, which is why the project's own
  room-sign demo hand-built this pill instead of using the library.
- `core/format.ts` and `core/i18n.ts`: `formatNumber`, `formatDate`,
  `formatRelativeTime`, `weekdayLabels` and `monthLabel` wrap `Intl` with one
  locale resolution (`locale` attribute → nearest `lang` → document), and
  `setLocaleStrings()` overrides the words `Intl` cannot supply. German ships
  alongside English.
- `registerIcon()` opens the icon registry, which was closed, so a project
  needing a domain glyph had to fork the library. The built-in set gains
  status, industrial, retail and wayfinding symbols.
- `<e-table>`: `row-key`, per-column `format` (number/currency/date), a
  `status` column type, `caption`, `sticky-header` and `max-height`.
- `disabled` on the ten form controls that ignored it, plus option-level
  `disabled` on `<e-select>`, `<e-radio-group>` and `<e-checkbox-group>`, and
  `capture` on `<e-upload>` so a kiosk can reach the camera.
- `<e-form>` fires `e-invalid` and moves focus to the first failing control;
  `<e-form-item>` links its hint and error to the control with
  `aria-describedby` and can surface the control's own `validationMessage`.
- Threshold semantics on `<e-statistic>` (`low`/`high`/`status`), a band-change
  `e-change` on `<e-meter>`, `e-month-change` on `<e-calendar>` (without which
  a host cannot load the new month's events), `show-summary` and arrow-key
  navigation on `<e-pagination>`, `week-start` on `<e-calendar>`.
- Maturity additions across the display and typography set: image covers on
  `<e-card-image>`, `label`/`hint`/`rows`/counter on `<e-textarea>`, a settable
  `value` on `<e-tabs>`, per-step status on `<e-steps>`, automatic heading ids
  and self-links on `<e-title>`, `caption`/`strike`/`align` on `<e-text>`,
  `target`/`rel`/`external` on `<e-link>`, `ordered` on `<e-list>`, a
  configurable `threshold` on `<e-sparkline>`, and `variant`/`size` on
  `<e-badge>`, `placement`/`inverted` on `<e-ribbon>`.
- `<e-prose>`, `<e-redline>` and `<e-toc>` round out the publishing core.
  `<e-prose>` is a pure class carrier — it styles slotted `<h2>`/`<p>`/
  `<ul>`/`<ol>`/`<blockquote>`/`<figure>`/`<table>` markup through
  `components.css`, so a document body needs no JS renderer of its own.
  `<e-redline>` renders a word-level diff between two text versions with
  `<ins>`/`<del>`, a changed-paragraph summary and a "changes only" view.
  `<e-toc>` scans a document's headings, assigns them the same auto-id
  `<e-title>` derives (now shared as `core/slug.ts`), and mirrors them into
  an `<e-anchor>` it builds and keeps reactive to headings added, removed or
  retitled after mount.

### Changed

- **Breaking for DOM queries:** components that read their entries from child
  data carriers — `<e-timeline>`, `<e-description-list>`, `<e-breadcrumb>`,
  `<e-avatar-group>`, `<e-segmented>`, `<e-anchor>` — no longer destroy those
  children at connect. The carriers stay in the light DOM (hidden) as the
  component's source of truth, and the rendered output is a sibling of them.
  That is what makes the components reactive: an item appended or edited after
  mount now renders, where before it was silently ignored and the host had to
  re-mount the whole element — the full repaint the library exists to avoid.
  Code that relied on `host.firstElementChild` being the rendered node, on
  `host.children` having length 1, or on the carriers being gone should query
  by tag or `.ink-*` class instead. Item bodies are cloned rather than moved,
  with `id`s dropped from the copy so none appears twice in the document.
- `<e-table>` patches rows in place instead of rebuilding. A `data` change
  used to run `replaceChildren` on the host, so a table polled every ten
  seconds threw away its whole DOM each tick — a GC16 full refresh instead of
  a bounded dirty rectangle, on the one component that carries live tabular
  overviews. Measured on a three-row table with one changed cell: root
  replacements 1 → 0, retained node ratio 0 → 1.
- Locale-dependent output is no longer hard-coded. English rendering is
  byte-identical, so existing pages do not shift.
- `<e-alert>` uses the `info`, `warning` and `error` glyphs instead of
  borrowing `doc`, `bell` and `close`, which meant something else.
- `<e-qrcode>` paints with `currentColor` on a `--ink-bg` quiet zone instead of
  hard-coded `#000`/`#fff`, so it follows both theme packs; `<e-watermark>`
  resolves its ink from the theme the same way.

- The nine components above render every locale-dependent value through
  `core/format.ts` and take every word they invent from `core/i18n.ts`, the
  way the rest of the library now does: `<e-price>` splits its amount with
  `formatMoneyParts`, `<e-agenda>` and `<e-event-log>` date and time through
  `formatDate`, and the labels — "Free until", "All day", "Now", the event
  severities, the acknowledgement chip, "Was" — are string-table entries with
  the same per-instance attribute overrides as before. English defaults are
  unchanged; German ships with them.
- Hard rule 13, applied to the kiosk controls: `<e-rating>`, `<e-pin-input>`,
  `<e-keypad>` and `<e-signature>` each mark an anchor of their own — a
  radiogroup, a box row, a key grid, a canvas — so the shared composite
  `aria-invalid` rule now names them too. Until this they reported a
  violation that rendered nothing at all on a greyscale panel.
- `core/format.ts` gained `formatMoneyParts` and `formatUnitPrice`.
  `formatNumber(el, value, { currency })` already produced a formatted string;
  a price display needs the pieces separately — the major unit large, the
  minor unit small and raised, the symbol wherever the locale puts it — and
  `Intl.formatToParts` is the documented way to get them.
- The barrel's size budget moved to 60 KB brotli. The nine components above
  add 9.6 KB to it (48.42 KB → 58.03 KB), most of it the self-contained
  barcode encoder's symbology tables. Nothing changes for a consumer
  importing a single sub-path: `<e-button>` is still 1.6 KB and `<e-input>`
  2.05 KB.
- The website's cover page (`/`) now carries the site's subject in prose
  instead of only in a masthead. It was roughly sixty words — a headline, a
  lede and three statistics — which left the FAQ as the only page that spelled
  "e-ink" next to "web components" in body text, and search results reflected
  that. The cover keeps the same first screen and continues below the fold
  with what EPaper is, the four constraints that make a component e-ink-ready,
  the install snippets, the component categories, the guides and four question
  teasers, each block linking to the page that covers it in full rather than
  restating it. Title, `<h1>` and description now name e-ink as well as
  e-paper.
- The cover's structured data gained a `SoftwareApplication` node (what to
  install, and that it is free) and an `ItemList` of the site's sections,
  alongside the `SoftwareSourceCode` node every page already carried.
- `/index.md` and `llms.txt` mirror the expanded cover copy, so the markdown
  alternate an answer engine reads is no longer thinner than the HTML page.

### Fixed

- Composite form controls reported `aria-invalid` on their own anchor — a
  select trigger, a radiogroup, a drop zone — and no CSS rule targeted any of
  them. On a greyscale panel with no colour and no animation, a rejected
  required field looked exactly like an untouched one. Both the invalid and
  the disabled state now have a rule, carried by border weight and texture.
- `<e-input-number>` painted `aria-invalid` directly instead of going through
  `_markInvalid`, making it the one control that bypassed the deferred
  validation gate and flagged an untouched required field on first paint.
- `<e-card-image>`'s `cover` accepts an image URL. It previously rendered any
  value as a hatch pattern or as literal text, so the component its name
  promises could not show a picture.
- `<e-qrcode>` applied a changed `label` even when the geometry was unchanged;
  the update was previously swallowed by the cached-SVG guard.

- `<e-agenda>`: day and week agenda on a real time axis. Entries are drawn as
  blocks whose height is their actual duration, and the free time between two
  of them is labelled ("Free until 14:00") instead of left blank, so a glance
  at a panel answers "what is next and when am I free" without counting grid
  lines. An entry without a `start` time is listed as an all-day entry above
  the axis. Like `<e-last-updated>`, the component owns no timer: the "now"
  marker is drawn only when the `now` attribute is set, and moves only when
  the host rewrites it from an existing refresh cycle.
- `CalendarEvent` gained optional `start`, `end` and `status` fields. The
  addition is backwards compatible — `date` and `title` stay required, and
  `<e-calendar>` ignores the new fields — so one dataset now feeds both the
  month grid and the agenda.
- `<e-calendar>` fires `e-month-change` (`{value: 'YYYY-MM', year, month}`)
  when the displayed month moves, by the header steppers or by keyboard
  navigation crossing a month boundary. Hosts that hold one month of data at a
  time can load the next one and write it back to `events`.
- `<e-event-log>`: data-driven, keyed event and alarm list. Rows are identified
  by `id`, so a new event is inserted as a single node and an existing row is
  patched in place rather than the whole list being re-rendered — the
  difference between a partial refresh of one row and a full-page GC16 flash.
  `max-items` bounds what is rendered without discarding what was handed in;
  `appendEntries()`, `acknowledge(id)` and `clear()` drive it from script. It
  replaces the `<e-timeline>` / `<e-list>` / `<e-table>` improvisations that
  live logs used before.
- `<e-price>`: retail price with the major unit set large and the minor unit
  small and raised. Formatting goes through `Intl`, so the currency symbol
  lands where the locale puts it; `original` renders a struck-through previous
  price, `unit-price`/`unit` a base price, and `size` scales the block from a
  1.5" shelf label to a 10" panel.
- `<e-barcode>`: EAN-13, EAN-8, UPC-A and Code 128 rendered as inline SVG by a
  self-contained encoder, built the same way as `<e-qrcode>` — zero runtime
  dependencies, one white rect plus one dark path, `shape-rendering="crispEdges"`.
  A missing check digit is computed, a wrong one is reported instead of printed.
- `<e-rating>`: star or smiley rating, form-associated, with 48px touch targets
  and full keyboard control (arrows, `Home`/`End`, digit keys). An unrated
  control submits an empty value, so `required` behaves as it does natively.
- `<e-slider>`: range slider with a 28×36 grip, a printed value readout and
  optional tick marks. The first component to style `input[type='range']`, and
  the readout is not decoration: a thumb position alone is unreadable on a
  panel without sub-pixel rendering.
- `<e-pin-input>`: fixed-length code entry as separate digit boxes with
  auto-advance, `inputmode="numeric"`, a `masked` option and paste support.
- `<e-signature>`: signature pad on a canvas. The result is submitted as a PNG
  `File` and a restored file is drawn back onto the canvas; `clear()` wipes it
  and `fallback-text` covers a browser without a 2D context.
- `<e-keypad>`: on-screen numeric keypad for kiosk browsers with no operating
  system keyboard. It is a form control in its own right and mirrors every key
  into the control named by `for`.
- `core/format.ts`: `formatMoney()` and `formatUnitPrice()`, which return the
  formatted amount together with the parts a price display sets separately
  (major, minor, decimal separator, symbol and which side it belongs on).
- `core/date.ts`: `parseHM()` and `hm()` for `HH:MM` times.

- `<e-calendar>`: on narrow containers the week grid lost its column
  alignment — a bare `1fr` column floors at the content's min-content
  width, so a long `white-space: nowrap` event label widened its column
  and, because every week row is its own grid, rows stopped lining up.
  Columns now use `minmax(0, 1fr)`, keeping all seven equal at every
  width; long event labels truncate with an ellipsis instead.

## [1.2.0] — 2026-08-25

### Added

- `<e-select>` supports listbox type-ahead: pressing a printable character
  while the trigger or an option is focused jumps to the next option whose
  label starts with that letter, cycling through matches on repeat presses
  — matching plain native `<select>` behavior.
- `<e-input>` and `<e-textarea>` forward the native `autocomplete`,
  `inputmode`, `enterkeyhint` and `spellcheck` attributes to their inner
  control, so autofill and virtual-keyboard behavior match a plain
  `<input>`/`<textarea>` instead of being silently dropped.

### Fixed

- `<e-input-number>`: an empty `min` or `max` attribute (e.g. `min=""`, as
  rendered by templating that always emits the attribute) was coerced by
  `Number('')` to `0` and treated as a real bound, silently clamping the
  value to `0` and blocking the increment/decrement buttons. Empty strings
  are now treated the same as an absent attribute (unbounded).
- `BaseFormControl`: `form.reset()` now clears the surfaced-validation flag
  before re-deriving validity from the restored value, so a control the user
  had already blurred (and which showed `aria-invalid`) returns to its
  untouched, first-paint state after a reset instead of keeping the stale
  violation visible. Subclasses implement the new `resetValue()` hook instead
  of overriding `formResetCallback()` directly.
- `<e-tabs>`: a `default-value` naming a tab that doesn't exist left the
  whole strip inert — every button `aria-selected="false"` _and_
  `tabIndex="-1"`, every panel hidden, so no panel was visible and the
  component had no tab stop at all. The fallback only fired for an absent or
  empty attribute; an unmatched key now falls back to the first tab as the
  documented contract always promised. Resolving the active tab by index also
  guarantees exactly one tab stop when two `<e-tab>` children share a `key`.
- `iconSvg()` / `<e-icon>`: the unknown-name guard tested `name in ICONS` and
  `ICONS[name]`, both of which reach `Object.prototype`. `name="toString"`
  (also `constructor`, `valueOf`, `hasOwnProperty`) passed the check and
  interpolated a function's source into `<path d="…">`. Both call sites now
  use a shared `hasIcon()` built on `Object.hasOwn()`. `<e-icon>` also clears
  its inline `display`/`line-height` when the name stops resolving, and
  clamps `size` to a minimum of 1 so a negative value can't emit an invalid
  `width`/`height`.
- `<e-kaleido>`: `cell="0"` made `Math.ceil(88 / cell)` evaluate to
  `Infinity`, and the dither loops never terminated — a hard browser hang.
  `cell` is now clamped to 1–88.
- `<e-select>`: an `<e-option>` with no `value` attribute fell back to `''`,
  which matched the select's own unset value, so it silently auto-selected —
  the trigger showed its label instead of the placeholder while `value` was
  still `''`. Presence of the `value` attribute is now tracked separately
  from its text, so an unset select shows its placeholder and `value=""`
  still selects an empty-valued option deliberately. `placeholder=""` also
  restores the `Select…` default after mount, matching first render.
- `<e-upload>`: `value` and the `e-change` detail handed out the live
  internal array, so a caller mutating it desynchronised the rendered list
  from the submitted `FormData` — both now return a copy. Single-file mode
  validated the whole incoming batch before slicing, rejecting a two-file
  assignment that would only ever keep one. Removing `multiple` truncated the
  held files without emitting `e-change`, leaving listeners with a stale list.
- `<e-text>`: changing `as` rebuilt the wrapper with a bare `createElement`
  and never re-applied `ink-text`, dropping all typography styling (with
  `kind="body"` the wrapper ended up with no class at all). An invalid tag
  name (`as="1x"`) also threw `InvalidCharacterError` out of
  `attributeChangedCallback`; it now keeps the current wrapper.
- `<e-title>`: `level` was read with `numAttr`, so `level="2.5"` survived
  clamping and reached `createElement('h2.5')` — a legal XML name, yielding
  an `HTMLUnknownElement` with no heading role and no matching CSS. Read with
  `intAttr` now, so non-integers fall back to level 1.
- `<e-divider>`: the `aria-label` for a labelled divider was passed through
  `esc()` before `setAttribute()`. Attribute APIs don't parse HTML, so the
  entities leaked into the accessible name (`label="A & B"` announced
  `A &amp; B`). The visible text was always correct.
- `<e-empty>`: `data-has-desc` was written only by the patch path, never by
  the initial render, so a mount-time `description` rendered without the
  marker until the attribute was next mutated and CSS keyed on it mis-styled
  on first paint.
- `<e-form-item>`: an author-set `error`/`error-message` on a nested
  `<e-input>`/`<e-textarea>` was unconditionally stripped on any render where
  the form-item itself had no `error`. Error propagation now tracks ownership
  like `aria-label` and `required` do, clearing only what it set, and all
  three ownership flags reset when the resolved control changes identity.
- `<e-watermark>`: clearing `content` cleared `background-image` and returned
  early, leaving a stale `background-size` from the previous `gap-x`/`gap-y`.
- `<e-description-list>`: `bordered` was read with `hasAttribute()` instead of
  `boolAttr()`, so `bordered="false"` still applied the bordered modifier —
  the only boolean attribute in the library that ignored the convention.
- `<e-back-top>`: re-pointing `target` detached the old scroll listener but
  never pruned its entry from the element's cleanup registry, so the array
  grew on every rebind. A new `removeCleanup()` helper in `core/dom.ts` drops
  a single registered cleanup without running it.
- `<e-float-button>`: the `aria-label` refresh was reachable only when the
  glyph itself changed, because `icon` and `label` shared a mutually
  exclusive `if`/`else if` chain gated on `icon !== _icon`. The accessible
  name is now re-resolved on either attribute changing, while the SVG is
  still only re-rendered for a genuine glyph change.
- `BaseFormControl.applyRequiredValidity()` tested `hasAttribute('required')`
  while its callers set `_cb.required = boolAttr(this, 'required')` on the
  line above, so `required="false"` left the native control unconstrained but
  still reported `valueMissing` through `ElementInternals`. It now uses
  `boolAttr()`, as do the `aria-required` mirrors in `<e-checkbox-group>` and
  `<e-radio-group>`, so the whole library agrees that `x="false"` means false.
- `<e-input>` / `<e-textarea>`: the `required-message` path wrote
  `aria-invalid="true"` straight onto the inner control instead of routing
  through the base class, so `<e-input required required-message="…">`
  announced an error on first paint and lost its focus ring — exactly what
  the deferred-validation gate exists to prevent. `required-message` now
  changes only _what_ is reported, not _when_ it surfaces.
- `<e-checkbox>` / `<e-toggle>`: `formStateRestoreCallback(null)` computed
  `state === 'checked'`, which is `false` for `null`, so a BFCache restore
  with no stored state cleared a checked control instead of leaving it alone.
- `disabled` on `<e-input>`, `<e-textarea>`, `<e-checkbox>` and `<e-toggle>`
  was read with `boolAttr()`, but the HTML spec disables a form-associated
  custom element whenever the attribute is _present_, so the browser called
  `formDisabledCallback(true)` and re-disabled a control the component had
  just enabled. `disabled="false"` ended up disabled anyway, via two code
  paths that disagreed. All read sites now use `hasAttribute('disabled')` —
  deliberately the one place that departs from the boolean-attribute
  convention, and commented as such at each site.
- `parseTreeAttr()`: `?? '[]'` doesn't fall back on an empty string, so
  `<e-tree data="">` reached `JSON.parse('')` and fired `e-error` for what is
  the ordinary "no data yet" state of a framework binding. Absent, empty and
  whitespace-only now all yield an empty tree with no error; genuinely
  malformed JSON still reports one.
- `TreeView.toggleExpand()` recorded values with no matching node, leaking
  them into `expandedValues()` and into anything a host persists from it, and
  fired `onToggle` claiming a non-existent node had expanded.
- `TreeView.patchSelection()` returned early when `selectionAttr` was `null`,
  so for `<e-tree>`'s checkable and non-selectable modes the roving tab stop
  never followed a programmatic selection change. Only the marker write is
  skipped now; `_selected`, `_focus` and `normalizeTabStop()` always run.

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
- **`<e-masonry>`** does not observe child mutations or container
  resizes; pages embedding it must trigger reflow manually after dynamic
  child changes.
- **`<e-kaleido>`** is a hardware-fingerprint visualisation tool kept in
  the public API for demo purposes; it is not a general-purpose layout
  primitive.

[unreleased]: https://github.com/marcomattes/epaper-components/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/marcomattes/epaper-components/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/marcomattes/epaper-components/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/marcomattes/epaper-components/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/marcomattes/epaper-components/releases/tag/v1.0.0
