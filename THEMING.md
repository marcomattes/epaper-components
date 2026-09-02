# Theming EPaper

EPaper uses **CSS custom properties** as its theming surface. There is no
`::part`, no Shadow DOM. The components render into the light DOM with a
small set of stable class names (prefixed `ink-`).

This is intentional. On e-paper hardware:

- The theme rarely changes at runtime.
- Color-driven design fails — you have grayscale and dithering.
- Customization usually means **typography, spacing, and stroke weight**, all
  of which are token-driven.

## Token files

Three CSS files compose the public CSS surface. Import order matters:

```css
@import 'epaper/tokens.css'; /* design tokens (custom properties) */
@import 'epaper/base.css'; /* page reset + .ink-page scope */
@import 'epaper/components.css'; /* per-component styles */
```

- **`tokens.css`** — defines every `--ink-*` custom property on `:root`.
  Override here to change the look-and-feel app-wide.
- **`base.css`** — minimal reset. The aggressive "no transitions" rule is
  scoped to `.ink-page` so consumer code outside that wrapper is untouched.
- **`components.css`** — visual rules for `<e-*>` components. Uses tokens, so
  if you keep `tokens.css` overridden the components inherit your changes.

## Override pattern

```css
:root {
  --ink-bg: #f8f8f3;
  --ink-fg: #111;
  --ink-border-width: 3px;
  --ink-space-4: 20px;
  --ink-control-h-md: 48px;
}
```

For per-instance tweaks, set custom properties on the element:

```html
<e-button style="--ink-border-width: 3px">Save</e-button>
```

> **Note:** Most component-level sizing (padding, border-radius) is currently
> hardcoded in `components.css`, not token-driven. The tokens you can reliably
> override are listed in the reference table below. Per-component CSS variables
> are planned but not yet available.
>
> A scoped override — on a wrapper element or a single component — reaches
> every rule in `components.css`, because those rules resolve each token at the
> element rather than through a `:root` shorthand. See the note under
> [Borders](#borders) for what that means when you write your own CSS.

## Panel theme packs

Two optional theme packs ship as plain CSS. Import one after `tokens.css`, then
activate it on the document root or scope it to a container:

```css
@import '@marcomattes/epaper-components/tokens.css';
@import '@marcomattes/epaper-components/themes/mono-high-contrast.css';
@import '@marcomattes/epaper-components/base.css';
@import '@marcomattes/epaper-components/components.css';
```

```html
<html data-ink-theme="mono-high-contrast">
  <!-- application -->
</html>

<section class="ink-theme--kaleido ink-page">
  <!-- a Kaleido-scoped preview -->
</section>
```

`mono-high-contrast` increases border, focus and control-size tokens while
remaining strictly black and white. `kaleido` maps semantic accent, info,
success, warning and danger tokens to the five-color panel palette. Color is
always secondary: status components retain their icon, border-weight and hatch
cues so they remain meaningful on a one-bit panel.

Minified builds are available as
`themes/mono-high-contrast.min.css` and `themes/kaleido.min.css`.

## Token reference

All tokens are defined in `tokens.css` on `:root`.

### Type stack

| Token         | Default                           | Description               |
| ------------- | --------------------------------- | ------------------------- |
| `--ink-sans`  | `ui-sans-serif, -apple-system, …` | Primary sans-serif family |
| `--ink-serif` | `'Iowan Old Style', 'Charter', …` | Serif family              |
| `--ink-mono`  | `ui-monospace, 'SF Mono', …`      | Monospace family          |

### Type scale

| Token                | Default | Description      |
| -------------------- | ------- | ---------------- |
| `--ink-text-h1`      | `44px`  | Heading 1 size   |
| `--ink-text-h2`      | `32px`  | Heading 2 size   |
| `--ink-text-h3`      | `24px`  | Heading 3 size   |
| `--ink-text-h4`      | `20px`  | Heading 4 size   |
| `--ink-text-h5`      | `17px`  | Heading 5 size   |
| `--ink-text-h6`      | `15px`  | Heading 6 size   |
| `--ink-text-prose`   | `18px`  | Long-form prose  |
| `--ink-text-body`    | `16px`  | Body text        |
| `--ink-text-mono`    | `14px`  | Code / monospace |
| `--ink-text-small`   | `13px`  | Small text       |
| `--ink-text-caption` | `12px`  | Captions         |
| `--ink-text-label`   | `11px`  | Labels           |

### Line heights

| Token            | Default | Description     |
| ---------------- | ------- | --------------- |
| `--ink-lh-tight` | `1.15`  | Headings        |
| `--ink-lh-body`  | `1.55`  | Body text       |
| `--ink-lh-prose` | `1.6`   | Long-form prose |

### Tracking

| Token                  | Default    | Description              |
| ---------------------- | ---------- | ------------------------ |
| `--ink-tracking-tight` | `-0.015em` | Tight letter-spacing     |
| `--ink-tracking-mono`  | `0.16em`   | Monospace letter-spacing |
| `--ink-tracking-label` | `0.18em`   | Label letter-spacing     |
| `--ink-tracking-wide`  | `0.2em`    | Wide letter-spacing      |

### Color

| Token               | Default    | Description                 |
| ------------------- | ---------- | --------------------------- |
| `--ink-fg`          | `#000`     | Foreground (text, borders)  |
| `--ink-bg`          | `#fff`     | Background                  |
| `--ink-fg-inverted` | `#fff`     | Inverted foreground         |
| `--ink-bg-inverted` | `#000`     | Inverted background         |
| `--ink-accent`      | foreground | Progress and general accent |
| `--ink-info`        | foreground | Informational status        |
| `--ink-success`     | foreground | Success status              |
| `--ink-warning`     | foreground | Warning status              |
| `--ink-danger`      | foreground | Error/destructive status    |

The semantic colors default to `--ink-fg`, so the base theme remains strictly
monochrome. The Kaleido theme maps them to `--kaleido-red`,
`--kaleido-orange`, `--kaleido-green` and `--kaleido-blue`. They render as flat
fills or two-color hatch patterns, never blended gradients.

### Borders

| Token                       | Default                                              | Description               |
| --------------------------- | ---------------------------------------------------- | ------------------------- |
| `--ink-border-width`        | `2px`                                                | Standard border width     |
| `--ink-border-width-strong` | `4px`                                                | Heavy border width        |
| `--ink-border-width-hair`   | `1px`                                                | Hairline border width     |
| `--ink-border-width-error`  | `3px`                                                | Error state border width  |
| `--ink-border`              | `var(--ink-border-width) solid var(--ink-fg)`        | Standard border shorthand |
| `--ink-border-strong`       | `var(--ink-border-width-strong) solid var(--ink-fg)` | Heavy border shorthand    |
| `--ink-border-hair`         | `var(--ink-border-width-hair) solid var(--ink-fg)`   | Hairline border shorthand |

The three shorthands exist for consumer CSS. `components.css` deliberately does
**not** use them: a shorthand is resolved once, where it is declared, so a
scoped override — `.dark { --ink-fg: #fff }`, or a `--ink-border-width` set on
a single element — never reaches a rule that consumed `var(--ink-border)` from
`:root`. Every border in `components.css` is written out as
`var(--ink-border-width) solid var(--ink-fg)` so both halves resolve at the
element. Follow that in your own component CSS; use the shorthands in page-level
CSS, where there is nothing below to override them.

### Focus

| Token                | Default | Description          |
| -------------------- | ------- | -------------------- |
| `--ink-focus-width`  | `3px`   | Focus outline width  |
| `--ink-focus-offset` | `2px`   | Focus outline offset |

### Spacing (4 px base)

| Token           | Default | Description          |
| --------------- | ------- | -------------------- |
| `--ink-space-1` | `4px`   | Extra-small spacing  |
| `--ink-space-2` | `8px`   | Small spacing        |
| `--ink-space-3` | `12px`  | Medium-small spacing |
| `--ink-space-4` | `16px`  | Medium spacing       |
| `--ink-space-5` | `24px`  | Large spacing        |
| `--ink-space-6` | `32px`  | Extra-large spacing  |
| `--ink-space-7` | `48px`  | 2× large spacing     |
| `--ink-space-8` | `64px`  | 3× large spacing     |

### Control sizes

| Token                | Default | Description                     |
| -------------------- | ------- | ------------------------------- |
| `--ink-control-h-sm` | `36px`  | Small control height            |
| `--ink-control-h-md` | `44px`  | Medium control height (default) |
| `--ink-control-h-lg` | `48px`  | Large control height            |

### Patterns

| Token                  | Default                        | Description                  |
| ---------------------- | ------------------------------ | ---------------------------- |
| `--ink-hatch-disabled` | `repeating-linear-gradient(…)` | Disabled-state hatch overlay |
| `--ink-hatch-error`    | `repeating-linear-gradient(…)` | Error-state hatch overlay    |
| `--ink-hatch-cover`    | `repeating-linear-gradient(…)` | Cover hatch overlay          |

### Component-scoped properties

`<e-agenda>` reads three custom properties that are not global tokens, because
their values only mean something inside it. Each is declared on the
component's own root, so overriding one there — or on an ancestor — is enough.

| Token                  | Declared on          | Default | Description                                                                                                 |
| ---------------------- | -------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `--ink-agenda-track-h` | `.ink-agenda`        | `420px` | Height of one `<e-agenda>` day column. Entry blocks are positioned as percentages of it.                    |
| `--ink-agenda-axis-w`  | `.ink-agenda`        | `60px`  | Width of the hour axis beside the columns.                                                                  |
| `--ink-agenda-hours`   | `.ink-agenda__track` | `10`    | Number of visible hours, written by the component itself so the hour rules match the axis. Do not override. |

## Class names

EPaper exposes stable class names you may target with CSS:

| Class               | Element / role               |
| ------------------- | ---------------------------- |
| `.ink-btn`          | `<e-button>` rendered button |
| `.ink-btn--primary` | Primary variant modifier     |
| `.ink-control`      | All input-like form controls |
| `.ink-label`        | Form-item labels             |
| `.ink-hint`         | Helper text under controls   |
| `.ink-card`         | `<e-card>` container         |
| `.ink-dropdown`     | `<e-dropdown>` wrapper       |
| `.ink-select`       | `<e-select>` wrapper         |
| `.ink-cascader`     | `<e-cascader>` wrapper       |
| `.ink-datepicker`   | `<e-date-picker>` wrapper    |
| `.ink-tabs`         | `<e-tabs>` wrapper           |
| `.ink-agenda`       | `<e-agenda>` wrapper         |
| `.ink-event-log`    | `<e-event-log>` wrapper      |
| `.ink-price`        | `<e-price>` wrapper          |
| `.ink-barcode`      | `<e-barcode>` wrapper        |
| `.ink-rating`       | `<e-rating>` wrapper         |
| `.ink-slider`       | `<e-slider>` wrapper         |
| `.ink-pin`          | `<e-pin-input>` wrapper      |
| `.ink-signature`    | `<e-signature>` wrapper      |
| `.ink-keypad`       | `<e-keypad>` wrapper         |

These names are part of the public API. We will not rename them in a minor
release.

## What you should not theme

- Animations and transitions. The library is animation-free by design. Adding
  transitions back will cause ghost artifacts on e-paper panels.
- Hover states. There is no `:hover` rule in the components by design.
- Color-coded semantics. Use shape, weight, and position instead.

## Dark mode / inverted

EPaper does not ship a dark theme today. To invert globally, redefine the
foreground/background tokens. Inverted is suitable for OLED previews; it does
not improve e-paper readability.

```css
:root {
  --ink-bg: #000;
  --ink-fg: #fff;
}
```

## Adding your own component

Importing your own component will not break EPaper. Reuse `.ink-control` for
inputs you build yourself to match the focus and error layout shifts.
