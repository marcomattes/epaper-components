# Tokens & Themes

## Token Layers

eink-ui uses a two-layer token system: **primitives** (fixed values) and **semantic tokens** (theme-dependent aliases).

### Primitives (on `:root`, theme-independent)

| Category     | Tokens                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Grayscale    | `--eink-color-gray-{50,100,200,300,400,500,600,700,800,900}`, `--eink-color-black`, `--eink-color-white` |
| Spacing      | `--eink-space-{0..8}` (0, 0.25rem .. 4rem, base 4px)                                                     |
| Typography   | `--eink-font-{sans,serif,mono}`, `--eink-text-{xs,sm,base,lg,xl,2xl,3xl,4xl}`                            |
| Line heights | `--eink-leading-{tight,normal,relaxed}`                                                                  |
| Font weights | `--eink-weight-{normal,medium,bold}`                                                                     |
| Borders      | `--eink-border-{thin,medium,thick}` (1px, 2px, 3px), `--eink-radius-{sm,md}`                             |
| Measure      | `--eink-measure` (65ch), `--eink-measure-{narrow,wide}`                                                  |
| Focus        | `--eink-focus-width` (3px), `--eink-focus-offset` (2px)                                                  |

### Semantic Tokens (theme-dependent)

These are overridden by each `[data-theme]`:

| Token                    | Purpose                     |
| ------------------------ | --------------------------- |
| `--eink-fg`              | Primary foreground (text)   |
| `--eink-fg-muted`        | Secondary text              |
| `--eink-fg-subtle`       | Tertiary text, placeholders |
| `--eink-bg`              | Page background             |
| `--eink-bg-subtle`       | Slightly off-background     |
| `--eink-bg-muted`        | Muted background            |
| `--eink-border-color`    | Default border              |
| `--eink-border-strong`   | Emphasized border           |
| `--eink-surface`         | Card/panel background       |
| `--eink-focus-color`     | Focus ring color            |
| `--eink-error-fg`        | Error text                  |
| `--eink-error-border`    | Error border                |
| `--eink-error-bg`        | Error background            |
| `--eink-disabled-fg`     | Disabled text               |
| `--eink-disabled-bg`     | Disabled background         |
| `--eink-disabled-border` | Disabled border             |
| `--eink-mark-bg`         | `<mark>` highlight          |
| `--eink-selection-bg`    | Text selection              |
| `--eink-table-stripe`    | Striped table row           |

## Themes

### Default

Dark text (`gray-900`) on white background. Borders are `gray-300`. The standard E-Ink reading experience.

### Inverted

Light text (`gray-100`) on dark background (`gray-900`). Useful for dark-mode E-Ink devices or header/footer sections.

### High-Contrast

Pure black (`#000`) on pure white (`#fff`). All borders are pure black. Maximum contrast for low-quality or aging E-Ink panels.

## Applying Themes

### Page-level

```html
<html data-theme="default"></html>
```

### Scoped (section-level)

Themes can be nested. A `[data-theme]` on any element overrides the parent theme for all descendants:

```html
<html data-theme="default">
  <body>
    <header data-theme="inverted">
      <!-- Inverted header -->
    </header>
    <main>
      <!-- Default main content -->
      <aside data-theme="high-contrast">
        <!-- High-contrast sidebar -->
      </aside>
    </main>
  </body>
</html>
```

## Customization

Since all tokens are CSS custom properties, you can override any token in your own stylesheet:

```css
:root {
  --eink-space-4: 1.25rem; /* Increase base spacing */
  --eink-text-base: 1.125rem; /* Bump base font size */
  --eink-measure: 60ch; /* Narrower line width */
}
```

Because all eink-ui selectors use `:where()` (specificity 0-0-0), a simple class selector in your stylesheet will override any eink-ui rule without `!important`.
