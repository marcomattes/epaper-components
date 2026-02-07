## AI Component Overview (LLM-friendly)

Cheat sheet for the CSS-only E-Ink library. Use selectors as-is; no JavaScript required (demo-only `demo/theme.js` reads URL parameters for theme).

### Architecture & Files

- Selector strategy: class-based `.epaper-*` (specificity 0 via `:where()` in CSS).
- Tokens: `demo/epaper-components.tokens.css` (themes: `default`, `inverted`, `high-contrast`).
- Base/reset: `demo/epaper-components.base.css` (typography, focus, selection, tables, code).
- Components: `demo/epaper-components.components.css` (all UI patterns below).
- Apply theme on `<html data-theme="...">`; demos also accept `?theme=...`.

### Layout

- `epaper-container` (`--wide`, `--narrow`) center width-limited content.
- `epaper-stack` (`--sm`, `--lg`) vertical gap utility.
- `epaper-cluster` horizontal wrap cluster.
- `epaper-grid` responsive auto-fit grid (`--epaper-grid-min` custom min width).
- `epaper-divider` (`--strong`) section rules; `epaper-section` block padding.
- `epaper-page-header` / `epaper-page-footer` structural rails.
- `epaper-with-sidebar` (`--left`) main + aside split; wraps on small screens.
- `epaper-toolbar` grouped controls, separators, spacer.

### Navigation

- `epaper-nav` inline list; `aria-current="page"` thickens underline.
- `epaper-breadcrumb` ordered list with slash separators; `aria-current` on last item.
- `epaper-pagination` list of page links; supports `aria-current` and `aria-disabled`.
- `epaper-tabs` radio-driven tabs: inputs + labels + panels in sibling order; `--epaper-tabs-count` defines grid columns.

### Forms

- Shell: `epaper-field` (`--inline`) + `epaper-label` (`--required`), `epaper-help`, `epaper-error-message`.
- Inputs: `epaper-input`, `epaper-textarea` (states: focus-visible ring, disabled colors, invalid border via `aria-invalid` or native `:invalid`).
- Select: `epaper-select` with CSS arrow; same states as input.
- Choices: `epaper-checkbox`, `epaper-radio` (`appearance: none`); disabled styles and focus ring; radio uses thick border for dot.
- Error summary: `epaper-error-summary` title + list links for form-level errors.

### Content & Feedback

- Buttons: `epaper-btn` (`--primary`, `--secondary`, `--ghost`, `--sm`, `--lg`, disabled + `aria-disabled`).
- Card: `epaper-card` (`--raised`) with title/body/footer slots.
- Picture: `epaper-picture` figure + caption rule.
- Alerts: `epaper-alert` variants `--info|--success|--warning|--error` (left border emphasis).
- Dialog: `dialog.epaper-dialog` + `::backdrop`; `.epaper-dialog__title|__body|__actions`; fallback `.epaper-dialog-backdrop` helper.
- Details/Accordion: `epaper-details` + `epaper-details__summary|__body`; group with `epaper-details-group`.
- List Group: `epaper-list-group` items (`--active`, `--flush` container variant).
- Timeline: `epaper-timeline` items (`--active` fills dot), timestamp/title/body slots.
- Blockquote: `epaper-blockquote` (pull variant `--pull`), cite with `__cite`.
- Tag/Badge: `epaper-tag` (`--filled`, `--muted`) + `epaper-tag-group`; `epaper-badge` small label.
- Avatar: `epaper-avatar` (`--sm`, `--lg`) with optional image or initials.
- Article: `epaper-article` structure (`__header|__title|__meta|__body|__footer`), `epaper-byline` inside meta.
- Toolbar/Note/Prose: `epaper-toolbar`, `epaper-note` (callout), `epaper-prose` rhythm wrapper.

### Data Display

- Table: wrap in `epaper-table-wrap`; table class `epaper-table` with variants `--striped`, `--bordered`, `--compact`; caption top-aligned.
- Stat/KPI: `epaper-stat` (`--compact`), value/label/delta.
- Progress: `epaper-progress` (`--thick`, `--labeled`), track + bar + label.
- Description list: `epaper-dl` (`--horizontal`, `--bordered`).
- Toolbar (data contexts): same as layout, use separators for controls.

### Utilities

- Typography helpers: `epaper-text-{xs,sm,lg}`, `epaper-text-bold`, `epaper-text-center`, `epaper-text-mono`, `epaper-text-serif`, `epaper-text-muted`.
- Measurement helpers: `epaper-measure`, `epaper-measure-narrow`, `epaper-measure-wide`.
- Accessibility: `epaper-sr-only`, global `:focus-visible` ring, no motion (`prefers-reduced-motion` respected).
- Notes & callouts: `epaper-note`, `epaper-badge`, `epaper-tag-group`.

### Demos (zero-JS)

- Core: `demo/components.html`, `demo/forms.html`, `demo/tables.html`, `demo/dialog.html`, `demo/layout.html`, `demo/typography.html`, `demo/index.html`.
- Extended examples: `demo/blog.html`, `demo/dashboard.html`, `demo/newsreader.html`.
- Theme switching links: `?theme=default|inverted|high-contrast`; for static embeds set `data-theme` on `<html>`.

Use this file as a fast retrieval index for AI-assisted tooling; full markup examples live in `docs/components.md` and demo pages.
