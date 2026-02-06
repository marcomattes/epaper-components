# eink-ui

![eink-ui logo](assets/eink-ui-logo.svg)

CSS-first component library optimized for E-Ink displays (Kindle, Tolino, Kobo, reMarkable). Zero-motion, border-driven visuals, optional JS only for progressive enhancements (dialog polyfill, theme helper, Web Components).

## Install

```bash
npm install eink-ui
```

Use the bundled CSS (ships with sourcemaps and original SCSS):

```js
// bundler / Vite / Next
import "eink-ui/dist/eink-ui.css";
```

Or link directly from `node_modules`:

```html
<link rel="stylesheet" href="node_modules/eink-ui/dist/eink-ui.css" />
```

## Quick Start (contributing)

```bash
npm install
npm run build        # Compile SCSS → dist/eink-ui.css(+map) + dist/eink-ui.min.css(+map)
npm run dev          # Serve demo pages at http://localhost:8080
npm test             # Run Playwright tests (69 tests)
npm run storybook    # Launch Storybook at http://localhost:6006
```

## Usage

Link the bundled CSS file:

```html
<link rel="stylesheet" href="dist/eink-ui.css" />
```

Set a theme on `<html>` (or any ancestor element):

```html
<html data-theme="default"></html>
```

Available themes: `default`, `inverted`, `high-contrast`.
Demo pages also accept `?theme=default|inverted|high-contrast` (applied by `demo/theme.js`).

Sourcemaps: `dist/eink-ui.css.map` and `dist/eink-ui.min.css.map` map back to the SCSS sources included in the package.

### Web Components (optional)

Every CSS component has a matching light-DOM Web Component. Import and register them once:

```html
<script type="module">
  import { defineEinkElements } from "eink-ui/dist/wc/index.js";
  defineEinkElements();
</script>
```

Then use custom elements instead of (or alongside) CSS classes:

```html
<!-- CSS-only -->
<div class="eink-container">
  <div class="eink-stack">
    <div class="eink-card eink-card--raised">Raised card</div>
  </div>
</div>

<!-- Web Components (same styling, no classes needed) -->
<eink-container>
  <eink-stack>
    <eink-card raised>Raised card</eink-card>
  </eink-stack>
</eink-container>
```

Variants are set via attributes:

| CSS class               | Web Component equivalent          |
| ----------------------- | --------------------------------- |
| `.eink-container--wide` | `<eink-container width="wide">`   |
| `.eink-stack--sm`       | `<eink-stack gap="sm">`           |
| `.eink-card--raised`    | `<eink-card raised>`              |
| `.eink-alert--warning`  | `<eink-alert variant="warning">`  |
| `.eink-tag--filled`     | `<eink-tag variant="filled">`     |
| `.eink-btn--primary`    | `<eink-button variant="primary">` |
| `.eink-divider--strong` | `<eink-divider strong>`           |

Form components wrap native controls:

```html
<eink-input type="email" name="email" placeholder="you@example.com"></eink-input>
<eink-select name="country">
  <option value="de">Germany</option>
  <option value="us">United States</option>
</eink-select>
<eink-checkbox name="agree">I agree</eink-checkbox>
```

See [Web Component demos](demo-wc/index.html) for the full reference.

### Optional polyfill (dialog)

```html
<script src="dist/eink-ui.dialog.polyfill.js"></script>
<!-- Trigger -->
<button data-dialog-target="my-dialog">Open</button>
<dialog id="my-dialog" class="eink-dialog">
  <div class="eink-dialog__title">Title</div>
  <div class="eink-dialog__body">Body</div>
  <div class="eink-dialog__actions">
    <button data-dialog-close class="eink-btn eink-btn--secondary">Close</button>
  </div>
</dialog>
```

The polyfill wires `data-dialog-target` + `data-dialog-close` for browsers that lack native `<dialog>`.

## Design Principles

- **Zero JavaScript** in CSS layer (Web Components are an optional JS progressive enhancement)
- **No animations or transitions** — E-Ink refresh rates (120-450ms) make motion disruptive
- **No hover-only affordances** — most E-Ink devices are touch or D-pad only
- **System fonts only** — avoids FOUT/FOIT and full-page repaint on webfont loading
- **Borders over fills** — minimizes repaint area on partial E-Ink refreshes
- **Low specificity** — all component selectors use `:where()` (specificity 0-0-0)
- **`prefers-reduced-motion: reduce`** always declared

## Components

### Layout

`.eink-container` (`--narrow` `--wide`) · `.eink-stack` (`--sm` `--lg`) · `.eink-cluster` · `.eink-grid` · `.eink-divider` (`--strong`) · `.eink-page-header` `.eink-page-footer` `.eink-section` · `.eink-with-sidebar`

### Form Controls

`.eink-field` (`--inline`) · `.eink-label` (`--required`) · `.eink-input` `.eink-textarea` `.eink-select` · `.eink-checkbox` `.eink-radio` · `.eink-help` `.eink-error-message` `.eink-error-summary`

### Content & Feedback

`.eink-btn` (`--primary` `--secondary` `--ghost` `--sm` `--lg`) · `.eink-card` (`--raised`) · `.eink-picture` · `.eink-alert` (`--info` `--success` `--warning` `--error`) · `.eink-dialog` · `.eink-nav` · `.eink-breadcrumb` · `.eink-pagination` · `.eink-tabs`

### Data & Lists

`.eink-table` (`--striped` `--bordered` `--compact`) + `.eink-table-wrap` · `.eink-stat` (`--compact`) · `.eink-progress` (`--thick` `--labeled`) · `.eink-dl` (`--horizontal` `--bordered`) · `.eink-list-group` (`--flush`) · `.eink-timeline`

### Text & Utilities

`.eink-text-muted` `.eink-text-sm` `.eink-text-xs` `.eink-text-lg` `.eink-text-center` `.eink-text-mono` `.eink-text-serif` `.eink-text-bold` · `.eink-measure` (`--narrow` `--wide`) · `.eink-prose` · `.eink-badge` · `.eink-tag` (`--filled` `--muted`) · `.eink-note` · `.eink-sr-only`

## Accessibility

eink-ui follows WCAG 2.1 AA guidelines with E-Ink-specific adaptations. Key features:

- **ARIA roles**: Alerts (`role="status"` / `role="alert"`), progress bars (`role="progressbar"`), toolbars (`role="toolbar"`), dividers (`role="separator"`)
- **Error linking**: Invalid inputs linked to error messages via `aria-describedby`
- **Dialog labelling**: All dialogs use `aria-labelledby` pointing to title elements
- **Keyboard navigation**: `:focus-visible` styles, native `<dialog>` focus trapping, no hover-only affordances
- **WC ARIA forwarding**: Web Components automatically forward ARIA attributes to inner native controls

See [docs/accessibility.md](docs/accessibility.md) for the full guide.

## Documentation

- [Architecture](docs/architecture.md) — file layout, build pipeline, selector strategy
- [Components](docs/components.md) — all components with markup examples
- [Accessibility](docs/accessibility.md) — ARIA attributes, keyboard navigation, form patterns
- [Tokens & Themes](docs/tokens.md) — design tokens and theming system
- [Development](docs/development.md) — build, test, Storybook, contributing
- [Design Decisions](docs/design-decisions.md) — E-Ink constraints and technical trade-offs
- [Polyfills](docs/components.md#dialog) — dialog polyfill & triggers

## Browser Support

Targets browsers found on modern E-Ink devices:

- Chromium-based (Kindle experimental browser, Kobo browser)
- WebKit (older Kindle firmware)
- Any browser supporting CSS custom properties and `:where()`

## License

MIT
