# E‑Paper Components Library — Claude Brief

Use this repo to generate a no-JS component library and demo pages optimized for E‑Ink readers (Kindle/Tolino class). Follow the steps and constraints exactly.

## Persona & Goal

- Act as a senior design-system engineer for E‑Paper Componentss.
- Deliver working HTML/CSS only: tokens, base, components, demos, README. No JavaScript anywhere.

## Execution Plan (must follow in order)

1. Propose the final architecture (tokens, layers, components, pages). Keep it minimal.
2. Define tokens in `epaper-components.tokens.css`.
3. Define reset/base in `epaper-components.base.css`.
4. Implement components in `epaper-components.components.css`.
5. Generate demo pages:
   - `demo/index.html` (overview + navigation)
   - `demo/typography.html`
   - `demo/layout.html`
   - `demo/components.html` (Cards, Buttons, Inputs, Select, Checkbox/Radio, Table, Picture)
   - `demo/forms.html` (validation states, help text, disabled, required, error summary pattern)
   - `demo/dialog.html` (native `<dialog>` patterns and fallback notes)
   - `demo/tables.html` (table patterns + responsive strategy without JS)
     Each page must import the CSS files and show all states.
6. Provide a “copy-paste bundle”: all CSS, all demo HTML, and a short `README.md` with usage instructions. No build steps.

## Core Constraints (non‑negotiable)

- No JavaScript in CSS output (no inline scripts, no JS files in the CSS layer).
- No animations, transitions, parallax; avoid hover-only affordances.
- Optimize for E‑Ink: minimize large repaints; prefer borders/rules/whitespace over filled surfaces.
- Semantic HTML first; CSS components are selector-based.
- CSS variables mandatory for all tokens and component parameters.
- Accessibility: focus-visible, keyboard navigation, monochrome-visible states, proper labels/errors.
- Keep specificity low; avoid styling by tag except for essential base primitives.

## Selector Strategy

- Class-based `.epaper-*` prefix with `:where()` for zero specificity.
- CSS selectors include **dual targets**: `:where(.epaper-card, epaper-card)` — the class for CSS-only usage, the element name for Web Components. One rule block, zero duplication.
- Modifier variants use attribute selectors for WC: `:where(.epaper-card--raised, epaper-card[raised])`.
- Stick to one strategy and keep specificity low (consider `:where()`). Briefly justify the choice in docs.

## Tokens & Themes

- Every color/contrast value is a CSS variable.
- Themes via `[data-theme="default"]`, `[data-theme="inverted"]`, `[data-theme="high-contrast"]`, implemented only through variable overrides.
- Prefer borders over shadows; if “elevation” is needed, emulate with border + subtle offset.

## Design System Scope

### Typography

- Scale: h1–h4, body, small, caption, code.
- Manage line length (max width) and include hyphenation/word-break guidance for E‑Ink stability.

### Layout Components

- Container, Stack (vertical rhythm), Cluster (row wrap), Grid (simple), Divider, Page header/section/footer patterns.

### Core Components

- Card; Buttons (primary/secondary/ghost);
- Inputs: text, textarea; native select;
- Checkbox, radio;
- Picture (image + caption);
- Table (with no-JS responsive strategy);
- Modal: native `<dialog>` only (style `dialog` and `::backdrop`); demo shows `open` attribute.

## Demo Requirements

- Consistent header/nav on every page; show which theme is active.
- Theme switching: provide links to `?theme=default`, `?theme=inverted`, `?theme=high-contrast`; also explain `data-theme="..."` on `<html>` as a no-JS option.
- Show states for every component: default, focus, disabled, invalid/error.
- Include 1–2 line notes per component on E‑Ink rationale (in demos, not code comments).

## Responsive & E‑Ink Stability

- Avoid layout shift; stable spacing; no dynamic font loading assumptions; system font stack.
- Simple breakpoints (max two). Respect `prefers-reduced-motion: reduce` even though motion is off.
- Avoid large filled backgrounds; use outlines and separators.

## Accessibility & Forms

- Focus-visible styles required; tabbable examples in demos.
- Error summary pattern in forms; include help text, disabled, required, invalid states.
- Tables: document and implement a no-JS responsive strategy.

## Web Components (optional progressive enhancement)

Every CSS component has a matching **light-DOM Web Component** in `src/wc/`. WCs are optional — the CSS works standalone.

### Architecture

- **Factory pattern:** `src/wc/component-factory.ts` — `defineClassComponent()` maps attributes → CSS classes automatically.
- **Form wrappers:** `src/wc/forms.ts` — `<epaper-input>`, `<epaper-select>`, etc. wrap native controls (no Shadow DOM).
- **Button:** `src/wc/button.ts` — wraps native `<button>` with variant/size/disabled attributes.
- **Entry point:** `src/wc/index.ts` — `defineEpaperElements()` registers all custom elements.

### Demo Pages

- **Location:** `demo-wc/` (4 pages: index, layout, components, forms)
- **Templates:** `src/templates/wc-pages/*.eta` using `src/templates/_wc-layout.eta`
- **Switcher links:** Each CSS demo page links to its WC counterpart and vice versa.

### CSS Dual Selectors

SCSS partials use dual selectors so styles apply to both CSS classes and custom element tag names:

```scss
// _layout.scss
:where(.epaper-container, epaper-container) {
  /* ... */
}
:where(.epaper-container--wide, epaper-container[width="wide"]) {
  /* ... */
}
```

This avoids style duplication. The `_wc-defaults.scss` partial only handles `display` properties for elements that need them (form wrappers → `display: block`, button → `display: contents`).

### Adding a New Web Component

1. Create the component in `src/wc/` (use `defineClassComponent()` for simple attribute→class mappings).
2. Register it in `src/wc/index.ts`.
3. Extend the SCSS selectors in the component's partial to include the element name.
4. Add demos in the appropriate `src/templates/wc-pages/*.eta` template.
5. Add tests in `tests/wc-demo.spec.ts`.

## Output Format (for final response)

1. A file tree.
2. Each file, in order, headed `--- FILE: path ---` followed by full content. No extra commentary.
