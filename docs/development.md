# Development

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
npx playwright install chromium   # For tests
```

## Scripts

| Command                         | Description                                                |
| ------------------------------- | ---------------------------------------------------------- |
| `npm run build`                 | Compile SCSS, concatenate, polyfill, and minify to `dist/` |
| `npm run dev`                   | Start local dev server at http://localhost:8080            |
| `npm test`                      | Run all 69 Playwright tests                                |
| `npm run test:ui`               | Open Playwright UI mode                                    |
| `npm run test:update-snapshots` | Regenerate visual snapshots                                |
| `npm run typecheck`             | Run TypeScript type checker                                |
| `npm run storybook`             | Start Storybook dev server at http://localhost:6006        |
| `npm run storybook:build`       | Build static Storybook to `storybook-static/`              |
| `npm run clean`                 | Remove `dist/`                                             |

## Build

```bash
npm run build
```

Runs `build.ts` (Node ESM via ts-node loader). Output:

- `demo/epaper-components.tokens.css`, `demo/epaper-components.base.css`, `demo/epaper-components.components.css` (individual files)
- `dist/epaper-components.css` (concatenated bundle, ~26 KB)
- `dist/epaper-components.min.css` (minified, ~20 KB)
- `dist/epaper-components.dialog.polyfill.js` (optional JS polyfill for `<dialog>`)
- `dist/wc/index.js` (Web Components ESM bundle)
- `demo-wc/*.html` (4 Web Component demo pages)

If `sass` is not installed, the build falls back to reading existing CSS from `demo/`. If `typescript` is missing, the polyfill is copied without transpilation.

## Testing

### Test Suite (69 tests)

| File                 | Tests | Coverage                                                                                  |
| -------------------- | ----- | ----------------------------------------------------------------------------------------- |
| `smoke.spec.ts`      | 60    | Page loads, CSS 200s, header/footer, nav links, aria-current, visual snapshots (10 pages) |
| `components.spec.ts` | 22    | Buttons, checkbox, radio, input, select, dialog, table interactions                       |
| `themes.spec.ts`     | 5     | Default/inverted/high-contrast colors, scoped themes, preview cards                       |
| `wc-demo.spec.ts`    | 34    | WC demo page smoke tests + element rendering (display, classes, inner controls)           |
| `wc.spec.ts`         | 14    | Unit-level WC tests (attribute sync, class mapping, form control creation)                |

### Running Tests

```bash
npm test                        # Run all tests
npm run test:ui                 # Interactive UI mode
npx playwright test --grep "Button"  # Filter by name
```

### Visual Snapshots

Stored in `tests/smoke.spec.ts-snapshots/` (7 PNG files, one per demo page). After any CSS change:

```bash
npm run test:update-snapshots
```

### Playwright Configuration

- **Browser:** Chromium only (matching E-Ink device browsers)
- **Web server:** Builds first, then serves project root on port 8081
- **Base URL:** `http://127.0.0.1:8081` (test paths start with `/demo/` or `/demo-wc/`)

## Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) runs on pushes and PRs:

1. `npm ci`
2. `npm run format:check`
3. `npm run typecheck`
4. `npm run build`
5. `npx playwright install --with-deps chromium` + `npm test`

## Storybook

### Setup

- Framework: `@storybook/html-vite` (Storybook 10)
- SCSS imported directly in `preview.ts` (Vite compiles via `sass`)
- Addon: `@storybook/addon-a11y` for accessibility checks
- 13 story files in `src/stories/`, each rendering HTML strings

### Theme Switcher

A toolbar dropdown lets you switch between `default`, `inverted`, and `high-contrast` themes. The decorator wraps each story in a `<div data-theme="...">`.

### Story Files

| Story                   | Component(s)                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `Button.stories.ts`     | Buttons: primary, secondary, ghost, sizes, disabled                  |
| `Card.stories.ts`       | Card, Card--raised                                                   |
| `Input.stories.ts`      | Text input, textarea, states                                         |
| `Select.stories.ts`     | Native select, disabled                                              |
| `Checkbox.stories.ts`   | Checkbox states                                                      |
| `Radio.stories.ts`      | Radio group, disabled                                                |
| `Table.stories.ts`      | Table variants (striped, bordered, compact)                          |
| `Dialog.stories.ts`     | Dialog with title, body, actions                                     |
| `Picture.stories.ts`    | Figure + figcaption                                                  |
| `Form.stories.ts`       | Complete form with field, label, help, error                         |
| `Typography.stories.ts` | Headings, body text, utilities                                       |
| `Layout.stories.ts`     | Container, stack, cluster, grid                                      |
| `Additional.stories.ts` | Alerts, breadcrumb, pagination, tabs, stats, tags, toolbar, timeline |

## Demo Pages

### CSS-Only Demos

10 HTML pages in `demo/`, all referencing `../dist/epaper-components.css`:

| Page              | Content                                  |
| ----------------- | ---------------------------------------- |
| `index.html`      | Overview, theme previews                 |
| `typography.html` | Headings, body, text utilities           |
| `layout.html`     | Container, stack, cluster, grid, divider |
| `components.html` | Buttons, cards, badges, nav              |
| `forms.html`      | All form controls                        |
| `dialog.html`     | Dialog examples (open by default)        |
| `tables.html`     | Table variants                           |
| `newsreader.html` | Newsreader layout example                |
| `blog.html`       | Blog layout example                      |
| `dashboard.html`  | Dashboard layout example                 |

### Web Component Demos

4 HTML pages in `demo-wc/`, referencing `../dist/epaper-components.css` + `../dist/wc/index.js`:

| Page              | Content                                            |
| ----------------- | -------------------------------------------------- |
| `index.html`      | Overview, setup, component reference               |
| `layout.html`     | Layout primitives as custom elements               |
| `components.html` | Card, button, alert, tag, badge as custom elements |
| `forms.html`      | Form controls as custom elements                   |

Each set of demo pages links to the other via "Switch to..." links in the header.

Start the dev server and open http://localhost:8080/demo/ or http://localhost:8080/demo-wc/:

```bash
npm run dev
```

## Adding a New Component

### CSS-only component

1. Create `src/scss/components/_newcomponent.scss`
2. Add `@use "components/newcomponent"` to `epaper-components.components.scss`
3. Use dual selectors: `:where(.eink-newcomponent, eink-newcomponent)` so styles apply to both CSS classes and WC element names
4. Create `src/stories/NewComponent.stories.ts`
5. Add examples to the appropriate demo page
6. Add tests to `tests/components.spec.ts`
7. Run `npm run build && npm test`

### Web Component

1. Add the component definition in `src/wc/` (use `defineClassComponent()` for simple attribute→class mappings, or extend `HTMLElement` for complex behavior like `button.ts`)
2. Register it in `src/wc/index.ts` (both in `defineEinkElements()` and as a named export if needed)
3. Ensure the SCSS partial includes the element name in its selectors (step 3 above)
4. Add demos in the appropriate `src/templates/wc-pages/*.eta` template
5. Add tests in `tests/wc-demo.spec.ts` and/or `tests/wc.spec.ts`
6. Run `npm run build && npm test`
