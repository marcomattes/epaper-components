# Architecture

## File Layout

```
eink-ui/
├── src/
│   ├── scss/
│   │   ├── _mixins.scss                 5 shared mixins
│   │   ├── eink-ui.tokens.scss          Primitives + 3 theme overrides
│   │   ├── eink-ui.base.scss            Reset + tag-level styles (:where wrapped)
│   │   ├── eink-ui.components.scss      Manifest — imports all partials
│   │   └── components/
│   │       ├── _layout.scss             Container, Stack, Cluster, Grid, Divider, Page Header/Footer
│   │       ├── _nav.scss                Navigation bar
│   │       ├── _card.scss               Card, Card--raised
│   │       ├── _buttons.scss            Btn: primary/secondary/ghost, sm/lg, disabled
│   │       ├── _form-shell.scss         Field, Label, Help, Error-message
│   │       ├── _input-text.scss         Input + Textarea (uses @include control-base)
│   │       ├── _select.scss             Native select with CSS arrow
│   │       ├── _choice.scss             Checkbox + Radio (appearance:none, no pseudo-elements)
│   │       ├── _picture.scss            Figure + figcaption frame
│   │       ├── _table.scss              Table, --striped/--bordered/--compact, Table-wrap
│   │       ├── _dialog.scss             Native <dialog>, ::backdrop, title/body/actions
│   │       ├── _errors.scss             Error-summary block
│   │       ├── _utilities.scss          Text utils, badge, sr-only, note, prose
│   │       ├── _responsive.scss         2 breakpoints: ≤37.5em, ≥56.25em
│   │       └── _wc-defaults.scss        display defaults for WC form/button elements
│   ├── wc/                              Web Component source (TypeScript)
│   │   ├── index.ts                     Entry: defineEinkElements() registers all
│   │   ├── component-factory.ts         Factory: attribute → class mapping
│   │   ├── base.ts                      Shared utilities
│   │   ├── button.ts                    <eink-button> (wraps native <button>)
│   │   ├── primitives.ts               Layout + UI primitives (container, card, alert, …)
│   │   └── forms.ts                     Form wrappers (input, select, checkbox, radio)
│   ├── polyfills/                       Optional JS polyfills (dialog)
│   └── stories/                         13 Storybook story files (HTML string render)
├── demo/                                10 HTML demo pages + 3 compiled CSS files
├── demo-wc/                             4 Web Component demo pages
├── tests/                               3 Playwright spec files + visual snapshots
├── dist/                                Built output (eink-ui.css + eink-ui.min.css)
├── .storybook/                          Storybook config (main.ts, preview.ts)
├── assets/                              Logo and artwork
├── build.ts                             Build pipeline (SCSS → CSS → bundle → minify + polyfills)
├── playwright.config.ts                 Playwright test configuration
├── tsconfig.json                        TypeScript config (noEmit, strict)
└── package.json                         Scripts, dependencies
```

## Build Pipeline

```
src/scss/*.scss
  ↓  sass.compile() with loadPaths:[src/scss]
demo/*.css           (3 individual files, also used as Storybook fallback)
  ↓  concatenate
dist/eink-ui.css     (full bundle, ~26 KB)
  ↓  clean-css level:2
dist/eink-ui.min.css (~20 KB)
  ↓  transpile
dist/eink-ui.dialog.polyfill.js (ESM, optional)

src/wc/*.ts
  ↓  esbuild bundle
dist/wc/index.js (ESM bundle, ~4 KB)

src/templates/wc-pages/*.eta
  ↓  Eta render (via build.ts)
demo-wc/*.html (4 pages)
```

**`build.ts`** is plain ESM TypeScript. It dynamically imports `sass` and `typescript` (for polyfills). If either is missing, it falls back to existing CSS in `demo/` and copies polyfill sources verbatim.

## Selector Strategy

- All components use class selectors with the `.eink-*` prefix
- Every selector is wrapped in `:where()` for zero specificity (0-0-0)
- **Dual selectors** include both class and element names: `:where(.eink-card, eink-card)` — the same rule block styles both CSS-only and Web Component usage with zero duplication
- Modifier variants use attribute selectors for WC equivalents: `:where(.eink-card--raised, eink-card[raised])`
- States use native pseudo-classes: `:checked`, `:disabled`, `:focus-visible`, `[aria-invalid]`
- Themes apply via `[data-theme="default|inverted|high-contrast"]` on any ancestor
- Dialog polyfill hooks only on data attributes: `data-dialog-target` (open by id) and `data-dialog-close` (close current dialog)

## Naming Convention (BEM-like)

```
.eink-{component}              Base class
.eink-{component}--{variant}   Variant modifier
.eink-{component}__{child}     Child element
.eink-{component}--{size}      Size modifier (sm, lg)
```

Examples: `.eink-btn--primary`, `.eink-card__footer`, `.eink-table--striped`

## Shared Mixins (`_mixins.scss`)

| Mixin                 | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `focus-ring`          | Consistent outline for `:focus-visible`    |
| `control-base`        | Shared base for inputs, selects, textareas |
| `control-disabled`    | Disabled state (color, bg, cursor)         |
| `control-invalid`     | Invalid state (thick border)               |
| `control-placeholder` | Placeholder text color                     |

## Web Components

### Overview

Web Components are an **optional progressive enhancement** layer. The CSS works standalone — WCs simply provide a nicer HTML authoring experience with attribute-driven configuration instead of BEM classes.

All custom elements use **light DOM** (no Shadow DOM), so the same CSS rules style both approaches.

### Component Factory

`src/wc/component-factory.ts` exports `defineClassComponent()`, a generic factory that:

1. Accepts a `ComponentConfig` (tag name, base CSS class, list of modifiers and style vars)
2. Creates a custom element class that observes the specified attributes
3. On connect and attribute change, syncs attributes → CSS classes on the host element
4. Preserves any non-eink classes already on the element

**Modifier types:**

| Type      | Example attribute                | CSS result                 |
| --------- | -------------------------------- | -------------------------- |
| `boolean` | `<eink-card raised>`             | Adds `eink-card--raised`   |
| `enum`    | `<eink-alert variant="warning">` | Adds `eink-alert--warning` |

**Style vars:** Map an attribute directly to a CSS custom property (e.g., `gap` → `--eink-cluster-gap`).

### Component Categories

| Category          | Elements                                                                                                                            | Source          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Layout primitives | `eink-container`, `eink-stack`, `eink-cluster`, `eink-grid`, `eink-divider`, `eink-section`, `eink-page-header`, `eink-page-footer` | `primitives.ts` |
| UI components     | `eink-card`, `eink-alert`, `eink-tag`, `eink-badge`                                                                                 | `primitives.ts` |
| Button            | `eink-button`                                                                                                                       | `button.ts`     |
| Form wrappers     | `eink-input`, `eink-textarea`, `eink-select`, `eink-checkbox`, `eink-radio`                                                         | `forms.ts`      |

### CSS Integration (Dual Selectors)

To avoid duplicating styles, SCSS partials include both class and element selectors in a single rule:

```scss
// One rule block — two selectors — zero duplication
:where(.eink-container, eink-container) {
  display: block;
  width: 100%;
  max-width: 52rem;
  margin-inline: auto;
  padding-inline: var(--eink-space-4);
}

// Modifier variants use attribute selectors for WC
:where(.eink-container--wide, eink-container[width="wide"]) {
  max-width: 72rem;
}
```

The `_wc-defaults.scss` partial only handles `display` properties for custom elements that need explicit display values (form wrappers → `display: block`, button → `display: contents`).

### Demo Pages

4 WC demo pages live in `demo-wc/`, built from `src/templates/wc-pages/*.eta`:

| Page              | Content                                                  |
| ----------------- | -------------------------------------------------------- |
| `index.html`      | Overview, setup, component reference table               |
| `layout.html`     | Container, stack, cluster, grid, divider, page structure |
| `components.html` | Card, button, alert, tag, badge                          |
| `forms.html`      | Input, textarea, select, checkbox, radio, complete form  |

Each CSS demo page has a "Switch to Web Component demos" link and vice versa.
