# Design Decisions

## E-Ink Constraints

E-Ink displays have fundamentally different characteristics from LCD/OLED. Every design decision in this library traces back to these physical constraints:

| Constraint                 | Impact                                                        | Our approach                                                                 |
| -------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Slow refresh (120-450ms)   | Animations are jarring, partial updates leave ghost artifacts | No `transition`, no `animation`, `prefers-reduced-motion: reduce` always set |
| Binary-ish rendering       | Only ~16 gray levels, no true color                           | Grayscale-only palette, high contrast ratios                                 |
| No backlight (most models) | Poor visibility in low light                                  | High-contrast theme option, thick borders for visibility                     |
| Touch + D-pad input        | No hover state, imprecise taps                                | No hover-only affordances, large tap targets, focus-visible rings            |
| Limited CPU/memory         | Complex CSS causes slow rendering                             | Flat selectors, no nesting, minimal calc()                                   |
| Ghosting on full refreshes | Webfont loading triggers full-page redraw                     | System fonts only, no webfont loading                                        |

## Technical Trade-offs

### `:where()` for Zero Specificity

All component selectors are wrapped in `:where()`, giving them specificity 0-0-0. This means any user stylesheet rule (even a single class) overrides epaper-components without `!important`.

**Trade-off:** Older browsers (pre-2021) don't support `:where()`. This is acceptable because E-Ink device browsers are Chromium 90+ or recent WebKit.

### No Pseudo-elements on Inputs

Checkboxes and radios use direct property changes instead of `::before`/`::after`:

- **Checkbox checked:** `background-color` fill (filled square)
- **Radio checked:** `border-width: 0.35em` (thick border = dot effect)

**Why:** `<input>` elements don't reliably render pseudo-elements across browsers, even with `appearance: none`. Direct styling is the only cross-browser solution.

### Optional JS Polyfills Only

The core library ships CSS only; however, an optional `epaper-components.dialog.polyfill.js` is provided for environments lacking native `<dialog>`. The polyfill uses semantic data attributes (`data-dialog-target`, `data-dialog-close`) and avoids animations to stay E-Ink friendly.

### Plain ESM Build Script

`build.ts` is ESM TypeScript. It uses dynamic imports for optional toolchains (`sass`, `typescript`) and falls back to existing CSS/polyfill sources when they are absent.

### Two Breakpoints Maximum

Only two responsive breakpoints: `≤37.5em` (small) and `≥56.25em` (large).

**Why:** E-Ink devices have a narrow range of screen sizes (6-10 inches typically). More breakpoints add CSS weight without benefit. Most E-Ink layouts should work with a single-column small and two-column large.

### Tables: Horizontal Scroll, Never Reflow

Tables use `.eink-table-wrap` with `overflow-x: auto` instead of responsive table patterns that reflow cells into stacked blocks.

**Why:** Reflowed tables cause multiple full-page refreshes on E-Ink as the layout recalculates. Horizontal scrolling is a single interaction.

### Hyphenation OFF

CSS `hyphens` is not enabled by default.

**Why:** Hyphenation causes text reflow during pagination/scrolling, which triggers E-Ink ghosting artifacts. Users can enable it for static long-form content where scrolling is minimal.

## Selector Strategy Rationale

### Class-based with `.eink-*` prefix

Every component uses a class selector rather than element selectors. The `eink-` prefix avoids collisions with other CSS frameworks.

### BEM-like naming

```
.eink-btn            Base
.eink-btn--primary   Modifier
.eink-btn__icon      Child element
```

We use BEM-like conventions (not strict BEM) because:

- Easy to grep across files
- Self-documenting HTML
- Flat specificity (no nested selectors needed)

### State via native attributes

Instead of `.is-checked` or `.is-disabled` modifier classes, we use native HTML:

- `:checked`, `:disabled`, `:focus-visible`
- `[aria-invalid="true"]`, `[aria-current="page"]`

This keeps HTML semantic and reduces the chance of state classes getting out of sync with actual DOM state.

## Theme Architecture

Themes work via CSS custom property overrides on `[data-theme]` selectors. This allows:

1. **Page-level theming** — set on `<html>`
2. **Scoped theming** — set on any ancestor element
3. **Nesting** — a child `[data-theme]` overrides the parent
4. **No JS required** — themes are pure CSS

The three themes cover the main E-Ink use cases:

- **default:** Standard reading (dark on light)
- **inverted:** Night/dark mode (light on dark, reduces E-Ink flash)
- **high-contrast:** Maximum readability on degraded panels
