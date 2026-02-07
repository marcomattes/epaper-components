# epaper-components

![epaper-components logo](assets/epaper-components-logo.svg)

[![npm version](https://img.shields.io/npm/v/epaper-components?style=flat-square)](https://www.npmjs.com/package/epaper-components)
[![CI](https://github.com/marcomattes/eink-css-ui-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/marcomattes/eink-css-ui-framework/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/marcomattes/eink-css-ui-framework?style=flat-square)](LICENSE)

CSS-first component library optimized for E-Ink displays (Kindle, Tolino, Kobo, reMarkable). Zero-motion, border-driven visuals, optional JS only for progressive enhancements (dialog polyfill, theme helper, Web Components).

## Install

```bash
npm install epaper-components
```

Use the bundled CSS (ships with sourcemaps and original SCSS):

```js
// bundler / Vite / Next
import "epaper-components/dist/epaper-components.css";
```

Or link directly from `node_modules`:

```html
<link
  rel="stylesheet"
  href="node_modules/epaper-components/dist/epaper-components.css"
/>
```

## Quick Start (contributing)

```bash
npm install
npm run build        # Compile SCSS → dist/epaper-components.css(+map) + dist/epaper-components.min.css(+map)
npm run dev          # Serve demo pages at http://localhost:8080
npm test             # Run Playwright tests (69 tests)
npm run storybook    # Launch Storybook at http://localhost:6006
```

## Usage

Link the bundled CSS file:

```html
<link rel="stylesheet" href="dist/epaper-components.css" />
```

Set a theme on `<html>` (or any ancestor element):

```html
<html data-theme="default"></html>
```

Available themes: `default`, `inverted`, `high-contrast`.
Demo pages also accept `?theme=default|inverted|high-contrast` (applied by `demo/theme.js`).

Sourcemaps: `dist/epaper-components.css.map` and `dist/epaper-components.min.css.map` map back to the SCSS sources included in the package.

### Web Components (optional)

Every CSS component has a matching light-DOM Web Component. Import and register them once:

```html
<script type="module">
  import { defineEpaperElements } from "epaper-components/dist/wc/index.js";
  defineEpaperElements();
</script>
```

Then use custom elements instead of (or alongside) CSS classes:

```html
<!-- CSS-only -->
<div class="epaper-container">
  <div class="epaper-stack">
    <div class="epaper-card eink-card--raised">Raised card</div>
  </div>
</div>

<!-- Web Components (same styling, no classes needed) -->
<epaper-container>
  <epaper-stack>
    <epaper-card raised>Raised card</epaper-card>
  </epaper-stack>
</epaper-container>
```

Variants are set via attributes:

| CSS class                 | Web Component equivalent            |
| ------------------------- | ----------------------------------- |
| `.epaper-container--wide` | `<epaper-container width="wide">`   |
| `.epaper-stack--sm`       | `<epaper-stack gap="sm">`           |
| `.epaper-card--raised`    | `<epaper-card raised>`              |
| `.epaper-alert--warning`  | `<epaper-alert variant="warning">`  |
| `.epaper-tag--filled`     | `<epaper-tag variant="filled">`     |
| `.epaper-btn--primary`    | `<epaper-button variant="primary">` |
| `.epaper-divider--strong` | `<epaper-divider strong>`           |

Form components wrap native controls:

```html
<epaper-input type="email" name="email" placeholder="you@example.com"></epaper-input>
<epaper-select name="country">
  <option value="de">Germany</option>
  <option value="us">United States</option>
</epaper-select>
<epaper-checkbox name="agree">I agree</epaper-checkbox>
```

See [Web Component demos](demo-wc/index.html) for the full reference.

### Optional polyfill (dialog)

```html
<script src="dist/epaper-components.dialog.polyfill.js"></script>
<!-- Trigger -->
<button data-dialog-target="my-dialog">Open</button>
<dialog id="my-dialog" class="epaper-dialog">
  <div class="epaper-dialog__title">Title</div>
  <div class="epaper-dialog__body">Body</div>
  <div class="epaper-dialog__actions">
    <button data-dialog-close class="epaper-btn eink-btn--secondary">Close</button>
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

`.epaper-container` (`--narrow` `--wide`) · `.epaper-stack` (`--sm` `--lg`) · `.epaper-cluster` · `.epaper-grid` · `.epaper-divider` (`--strong`) · `.epaper-page-header` `.epaper-page-footer` `.epaper-section` · `.epaper-with-sidebar`

### Form Controls

`.epaper-field` (`--inline`) · `.epaper-label` (`--required`) · `.epaper-input` `.epaper-textarea` `.epaper-select` · `.epaper-checkbox` `.epaper-radio` · `.epaper-help` `.epaper-error-message` `.epaper-error-summary`

### Content & Feedback

`.epaper-btn` (`--primary` `--secondary` `--ghost` `--sm` `--lg`) · `.epaper-card` (`--raised`) · `.epaper-picture` · `.epaper-alert` (`--info` `--success` `--warning` `--error`) · `.epaper-dialog` · `.epaper-nav` · `.epaper-breadcrumb` · `.epaper-pagination` · `.epaper-tabs`

### Data & Lists

`.epaper-table` (`--striped` `--bordered` `--compact`) + `.epaper-table-wrap` · `.epaper-stat` (`--compact`) · `.epaper-progress` (`--thick` `--labeled`) · `.epaper-dl` (`--horizontal` `--bordered`) · `.epaper-list-group` (`--flush`) · `.epaper-timeline`

### Text & Utilities

`.epaper-text-muted` `.epaper-text-sm` `.epaper-text-xs` `.epaper-text-lg` `.epaper-text-center` `.epaper-text-mono` `.epaper-text-serif` `.epaper-text-bold` · `.epaper-measure` (`--narrow` `--wide`) · `.epaper-prose` · `.epaper-badge` · `.epaper-tag` (`--filled` `--muted`) · `.epaper-note` · `.epaper-sr-only`

## Accessibility

epaper-components follows WCAG 2.1 AA guidelines with E-Ink-specific adaptations. Key features:

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
