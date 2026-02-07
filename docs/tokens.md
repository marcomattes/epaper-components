# Tokens & Themes

## Token Layers

epaper-components uses a two-layer token system: **primitives** (fixed values) and **semantic tokens** (theme-dependent aliases).

### Primitives (on `:root`, theme-independent)

| Category     | Tokens                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| Grayscale    | `--epaper-color-gray-{50,100,200,300,400,500,600,700,800,900}`, `--epaper-color-black`, `--epaper-color-white` |
| Spacing      | `--epaper-space-{0..8}` (0, 0.25rem .. 4rem, base 4px)                                                         |
| Typography   | `--epaper-font-{sans,serif,mono}`, `--epaper-text-{xs,sm,base,lg,xl,2xl,3xl,4xl}`                              |
| Line heights | `--epaper-leading-{tight,normal,relaxed}`                                                                      |
| Font weights | `--epaper-weight-{normal,medium,bold}`                                                                         |
| Borders      | `--epaper-border-{thin,medium,thick}` (1px, 2px, 3px), `--epaper-radius-{sm,md}`                               |
| Measure      | `--epaper-measure` (65ch), `--epaper-measure-{narrow,wide}`                                                    |
| Focus        | `--epaper-focus-width` (3px), `--epaper-focus-offset` (2px)                                                    |

### Semantic Tokens (theme-dependent)

These are overridden by each `[data-theme]`:

| Token                      | Purpose                     |
| -------------------------- | --------------------------- |
| `--epaper-fg`              | Primary foreground (text)   |
| `--epaper-fg-muted`        | Secondary text              |
| `--epaper-fg-subtle`       | Tertiary text, placeholders |
| `--epaper-bg`              | Page background             |
| `--epaper-bg-subtle`       | Slightly off-background     |
| `--epaper-bg-muted`        | Muted background            |
| `--epaper-border-color`    | Default border              |
| `--epaper-border-strong`   | Emphasized border           |
| `--epaper-surface`         | Card/panel background       |
| `--epaper-focus-color`     | Focus ring color            |
| `--epaper-error-fg`        | Error text                  |
| `--epaper-error-border`    | Error border                |
| `--epaper-error-bg`        | Error background            |
| `--epaper-disabled-fg`     | Disabled text               |
| `--epaper-disabled-bg`     | Disabled background         |
| `--epaper-disabled-border` | Disabled border             |
| `--epaper-mark-bg`         | `<mark>` highlight          |
| `--epaper-selection-bg`    | Text selection              |
| `--epaper-table-stripe`    | Striped table row           |

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
  --epaper-space-4: 1.25rem; /* Increase base spacing */
  --epaper-text-base: 1.125rem; /* Bump base font size */
  --epaper-measure: 60ch; /* Narrower line width */
}
```

Because all epaper-components selectors use `:where()` (specificity 0-0-0), a simple class selector in your stylesheet will override any epaper-components rule without `!important`.
