# E‑Ink UI Library — Agents Guide

Follow these instructions when acting in this repository. Do **not** modify user files unless explicitly asked.

## Role

- Operate as an agentic senior design-system engineer for E‑Ink (Kindle/Tolino class).
- Produce a no-JS HTML/CSS component library with demos and README, using the mandated architecture.

## Required Execution Steps

1. Propose final architecture (tokens, layers, components, pages) — keep minimal.
2. Create `epaper-components.tokens.css` for tokens.
3. Create `epaper-components.base.css` for reset/base primitives.
4. Create `epaper-components.components.css` for all components.
5. Generate demo pages:
   - `demo/index.html`
   - `demo/typography.html`
   - `demo/layout.html`
   - `demo/components.html`
   - `demo/forms.html`
   - `demo/dialog.html`
   - `demo/tables.html`
     All must import CSS files and show all required states.
6. Provide a copy-paste bundle: full CSS files, full demo pages, short `README.md` (no build steps).

## Hard Constraints

- No JavaScript anywhere; no animations/transitions/parallax; no hover-only affordances.
- E‑Ink optimization: minimize large repaints; prefer borders/rules/whitespace over fills.
- Semantic HTML; selector-based components only (no Web Components).
- CSS variables required for all tokens and component parameters.
- Accessibility: focus-visible, keyboard navigation, visible monochrome states, proper labels/errors.
- Keep specificity low; only base primitives may be styled by tag selectors.

## Selector Strategy

- Choose exactly one: class-based `.epaper-components-*` or attribute-based `[data-ui="button"]`. Stay consistent. Justify choice briefly in docs.

## Tokens & Themes

- All colors/contrasts via variables.
- Themes: `[data-theme="default"]`, `[data-theme="inverted"]`, `[data-theme="high-contrast"]`; theme differences via variable overrides only.
- Prefer borders over shadows; emulate elevation with border + offset if needed.

## Design Scope

- Typography: h1–h4, body, small, caption, code; line-length control; hyphenation/word-break guidance.
- Layout: Container, Stack, Cluster, Grid, Divider, page header/section/footer patterns.
- Components: Card; Buttons (primary/secondary/ghost); Inputs (text, textarea); native select; checkbox; radio; Picture; Table (no-JS responsive strategy); Modal using native `<dialog>` (style `dialog` + `::backdrop`, demo uses `open`).

## Demo Requirements

- Consistent header/nav; active theme display.
- Theme switching links: `?theme=default`, `?theme=inverted`, `?theme=high-contrast`; also document `data-theme="..."` on `<html>` as no-JS option.
- Show states: default, focus, disabled, invalid/error for each component.
- Add brief E‑Ink rationale notes per component in demos (not code comments).

## Responsive & Stability

- Avoid layout shift; stable spacing; system font stack; max two breakpoints.
- Respect `prefers-reduced-motion: reduce` (even with no motion). Avoid large filled backgrounds.

## Forms & Tables

- Provide error summary pattern; include help text, disabled, required, invalid states.
- Tables: implement/document a no-JS responsive strategy.

## Output Formatting (for final answer)

1. Show file tree.
2. Then each file with heading `--- FILE: path ---` followed by full content; no extra commentary.
