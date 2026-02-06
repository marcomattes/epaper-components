## AI Component Overview (LLM-friendly)

Cheat sheet for the CSS-only E-Ink library. Use selectors as-is; no JavaScript required (demo-only `demo/theme.js` reads URL parameters for theme).

### Architecture & Files

- Selector strategy: class-based `.eink-*` (specificity 0 via `:where()` in CSS).
- Tokens: `demo/eink-ui.tokens.css` (themes: `default`, `inverted`, `high-contrast`).
- Base/reset: `demo/eink-ui.base.css` (typography, focus, selection, tables, code).
- Components: `demo/eink-ui.components.css` (all UI patterns below).
- Apply theme on `<html data-theme="...">`; demos also accept `?theme=...`.

### Layout

- `eink-container` (`--wide`, `--narrow`) center width-limited content.
- `eink-stack` (`--sm`, `--lg`) vertical gap utility.
- `eink-cluster` horizontal wrap cluster.
- `eink-grid` responsive auto-fit grid (`--eink-grid-min` custom min width).
- `eink-divider` (`--strong`) section rules; `eink-section` block padding.
- `eink-page-header` / `eink-page-footer` structural rails.
- `eink-with-sidebar` (`--left`) main + aside split; wraps on small screens.
- `eink-toolbar` grouped controls, separators, spacer.

### Navigation

- `eink-nav` inline list; `aria-current="page"` thickens underline.
- `eink-breadcrumb` ordered list with slash separators; `aria-current` on last item.
- `eink-pagination` list of page links; supports `aria-current` and `aria-disabled`.
- `eink-tabs` radio-driven tabs: inputs + labels + panels in sibling order; `--eink-tabs-count` defines grid columns.

### Forms

- Shell: `eink-field` (`--inline`) + `eink-label` (`--required`), `eink-help`, `eink-error-message`.
- Inputs: `eink-input`, `eink-textarea` (states: focus-visible ring, disabled colors, invalid border via `aria-invalid` or native `:invalid`).
- Select: `eink-select` with CSS arrow; same states as input.
- Choices: `eink-checkbox`, `eink-radio` (`appearance: none`); disabled styles and focus ring; radio uses thick border for dot.
- Error summary: `eink-error-summary` title + list links for form-level errors.

### Content & Feedback

- Buttons: `eink-btn` (`--primary`, `--secondary`, `--ghost`, `--sm`, `--lg`, disabled + `aria-disabled`).
- Card: `eink-card` (`--raised`) with title/body/footer slots.
- Picture: `eink-picture` figure + caption rule.
- Alerts: `eink-alert` variants `--info|--success|--warning|--error` (left border emphasis).
- Dialog: `dialog.eink-dialog` + `::backdrop`; `.eink-dialog__title|__body|__actions`; fallback `.eink-dialog-backdrop` helper.
- Details/Accordion: `eink-details` + `eink-details__summary|__body`; group with `eink-details-group`.
- List Group: `eink-list-group` items (`--active`, `--flush` container variant).
- Timeline: `eink-timeline` items (`--active` fills dot), timestamp/title/body slots.
- Blockquote: `eink-blockquote` (pull variant `--pull`), cite with `__cite`.
- Tag/Badge: `eink-tag` (`--filled`, `--muted`) + `eink-tag-group`; `eink-badge` small label.
- Avatar: `eink-avatar` (`--sm`, `--lg`) with optional image or initials.
- Article: `eink-article` structure (`__header|__title|__meta|__body|__footer`), `eink-byline` inside meta.
- Toolbar/Note/Prose: `eink-toolbar`, `eink-note` (callout), `eink-prose` rhythm wrapper.

### Data Display

- Table: wrap in `eink-table-wrap`; table class `eink-table` with variants `--striped`, `--bordered`, `--compact`; caption top-aligned.
- Stat/KPI: `eink-stat` (`--compact`), value/label/delta.
- Progress: `eink-progress` (`--thick`, `--labeled`), track + bar + label.
- Description list: `eink-dl` (`--horizontal`, `--bordered`).
- Toolbar (data contexts): same as layout, use separators for controls.

### Utilities

- Typography helpers: `eink-text-{xs,sm,lg}`, `eink-text-bold`, `eink-text-center`, `eink-text-mono`, `eink-text-serif`, `eink-text-muted`.
- Measurement helpers: `eink-measure`, `eink-measure-narrow`, `eink-measure-wide`.
- Accessibility: `eink-sr-only`, global `:focus-visible` ring, no motion (`prefers-reduced-motion` respected).
- Notes & callouts: `eink-note`, `eink-badge`, `eink-tag-group`.

### Demos (zero-JS)

- Core: `demo/components.html`, `demo/forms.html`, `demo/tables.html`, `demo/dialog.html`, `demo/layout.html`, `demo/typography.html`, `demo/index.html`.
- Extended examples: `demo/blog.html`, `demo/dashboard.html`, `demo/newsreader.html`.
- Theme switching links: `?theme=default|inverted|high-contrast`; for static embeds set `data-theme` on `<html>`.

Use this file as a fast retrieval index for AI-assisted tooling; full markup examples live in `docs/components.md` and demo pages.
