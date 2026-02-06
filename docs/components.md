# Components

All components work CSS-only with no JavaScript required. Each component also has a matching **Web Component** for attribute-driven usage (see [Web Component equivalents](#web-component-equivalents) at the end).

## Layout

### Container

```html
<div class="eink-container">Centered, max-width content</div>
<div class="eink-container eink-container--narrow">Narrow variant</div>
<div class="eink-container eink-container--wide">Wide variant</div>
```

### Stack (vertical spacing)

```html
<div class="eink-stack">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
<!-- Variants: eink-stack--sm, eink-stack--lg -->
```

### Cluster (horizontal wrapping)

```html
<div class="eink-cluster">
  <span>Tag 1</span>
  <span>Tag 2</span>
</div>
```

### Grid

```html
<div class="eink-grid" style="--eink-grid-min: 15rem;">
  <div>Cell</div>
  <div>Cell</div>
</div>
```

### Divider

```html
<hr class="eink-divider" />
<hr class="eink-divider eink-divider--strong" />
```

### Page Header / Footer

```html
<header class="eink-page-header">
  <h1>Site Title</h1>
</header>
<footer class="eink-page-footer">
  <p>&copy; 2026</p>
</footer>
```

## Navigation

```html
<nav class="eink-nav" aria-label="Main">
  <a href="/" aria-current="page">Home</a>
  <a href="/about">About</a>
</nav>
```

## Buttons

```html
<button class="eink-btn eink-btn--primary">Primary</button>
<button class="eink-btn eink-btn--secondary">Secondary</button>
<button class="eink-btn eink-btn--ghost">Ghost</button>
<button class="eink-btn eink-btn--sm">Small</button>
<button class="eink-btn eink-btn--lg">Large</button>
<button class="eink-btn eink-btn--primary" disabled>Disabled</button>
```

## Card

```html
<div class="eink-card">
  <div class="eink-card__header">Title</div>
  <div class="eink-card__body">Content</div>
  <div class="eink-card__footer">Footer</div>
</div>
<div class="eink-card eink-card--raised">Raised variant</div>
```

## Form Controls

### Field + Label

```html
<div class="eink-field">
  <label class="eink-label" for="name">Name</label>
  <input class="eink-input" id="name" type="text" />
</div>
<div class="eink-field eink-field--inline">
  <label class="eink-label eink-label--required" for="email">Email</label>
  <input class="eink-input" id="email" type="email" required />
</div>
```

### Text Input + Textarea

```html
<input class="eink-input" type="text" />
<input class="eink-input" type="text" disabled />
<input class="eink-input" type="text" aria-invalid="true" />
<textarea class="eink-textarea" rows="4"></textarea>
```

### Select

```html
<select class="eink-select">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

### Checkbox

```html
<label> <input type="checkbox" class="eink-checkbox" /> Accept terms </label>
<label> <input type="checkbox" class="eink-checkbox" checked /> Pre-checked </label>
<label> <input type="checkbox" class="eink-checkbox" disabled /> Disabled </label>
```

Implementation note: Uses `appearance: none` with direct `background-color` change on `:checked` (no pseudo-elements — they are unreliable on `<input>` elements).

### Radio

```html
<label> <input type="radio" class="eink-radio" name="size" value="sm" /> Small </label>
<label>
  <input type="radio" class="eink-radio" name="size" value="md" checked /> Medium
</label>
```

Implementation note: Uses `appearance: none` with thick `border-width` on `:checked` to create a dot effect (no pseudo-elements).

### Help + Error

```html
<p class="eink-help">Helpful hint text</p>
<p class="eink-error-message">This field is required</p>
```

### Error Summary

```html
<div class="eink-error-summary">
  <h2>There are problems</h2>
  <ul>
    <li><a href="#field">Error description</a></li>
  </ul>
</div>
```

## Table

```html
<div class="eink-table-wrap">
  <table class="eink-table eink-table--striped">
    <thead>
      <tr>
        <th>Name</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Row 1</td>
        <td>Data</td>
      </tr>
      <tr>
        <td>Row 2</td>
        <td>Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

Variants: `--striped`, `--bordered`, `--compact`. Always wrap in `.eink-table-wrap` for horizontal scroll on small screens.

## Dialog

```html
<dialog class="eink-dialog" open>
  <div class="eink-dialog__title">Confirm</div>
  <div class="eink-dialog__body">Are you sure?</div>
  <div class="eink-dialog__actions">
    <button class="eink-btn eink-btn--primary">Yes</button>
    <button class="eink-btn eink-btn--secondary">No</button>
  </div>
</dialog>
```

Uses native `<dialog>` element. Demo pages use the `open` attribute for CSS-only display.

### Opening with the polyfill

```html
<button data-dialog-target="confirm">Open</button>
<dialog id="confirm" class="eink-dialog">
  <div class="eink-dialog__title">Confirm</div>
  <div class="eink-dialog__body">Are you sure?</div>
  <div class="eink-dialog__actions">
    <button class="eink-btn eink-btn--secondary" data-dialog-close>Cancel</button>
    <button class="eink-btn eink-btn--primary">Yes</button>
  </div>
</dialog>
<script src="dist/eink-ui.dialog.polyfill.js"></script>
```

The polyfill enables `data-dialog-target` (open by ID) and `data-dialog-close` (close current dialog) on browsers without native `<dialog>` support.

## Picture

```html
<figure class="eink-picture">
  <img src="photo.jpg" alt="Description" />
  <figcaption>Caption text</figcaption>
</figure>
```

## Alerts

```html
<div class="eink-alert eink-alert--info">
  <div class="eink-alert__title">Info</div>
  <div class="eink-alert__body">Thin left rule; minimal repaint.</div>
</div>
<div class="eink-alert eink-alert--warning">
  <div class="eink-alert__title">Warning</div>
  <div class="eink-alert__body">Dashed border reads well on low DPI.</div>
</div>
```

## Breadcrumb

```html
<nav class="eink-breadcrumb" aria-label="Breadcrumb">
  <ol class="eink-breadcrumb__list">
    <li class="eink-breadcrumb__item"><a href="#">Home</a></li>
    <li class="eink-breadcrumb__item"><a href="#">Library</a></li>
    <li class="eink-breadcrumb__item" aria-current="page">Current</li>
  </ol>
</nav>
```

## Pagination

```html
<nav aria-label="Pagination" class="eink-pagination">
  <ol class="eink-pagination__list">
    <li>
      <a class="eink-pagination__link" aria-disabled="true" href="#" tabindex="-1"
        >Prev</a
      >
    </li>
    <li><a class="eink-pagination__link" aria-current="page" href="#">1</a></li>
    <li><a class="eink-pagination__link" href="#">2</a></li>
    <li><a class="eink-pagination__link" href="#">Next</a></li>
  </ol>
</nav>
```

## Tabs (CSS-only)

```html
<div class="eink-tabs" style="--eink-tabs-count:3">
  <input type="radio" class="eink-tabs__input" name="t" id="t1" checked />
  <label class="eink-tabs__tab" for="t1">One</label>
  <input type="radio" class="eink-tabs__input" name="t" id="t2" />
  <label class="eink-tabs__tab" for="t2">Two</label>
  <input type="radio" class="eink-tabs__input" name="t" id="t3" />
  <label class="eink-tabs__tab" for="t3">Three</label>
  <div class="eink-tabs__panel">Panel one</div>
  <div class="eink-tabs__panel">Panel two</div>
  <div class="eink-tabs__panel">Panel three</div>
</div>
```

## List Group

```html
<ul class="eink-list-group">
  <li class="eink-list-group__item eink-list-group__item--active">Active</li>
  <li class="eink-list-group__item">Default</li>
  <li class="eink-list-group__item">Disabled</li>
</ul>
```

## Tags

```html
<div class="eink-tag-group">
  <span class="eink-tag">Outline</span>
  <span class="eink-tag eink-tag--filled">Filled</span>
  <span class="eink-tag eink-tag--muted">Muted</span>
</div>
```

## Toolbar

```html
<div class="eink-toolbar">
  <div class="eink-toolbar__group">
    <span class="eink-toolbar__label">Font</span>
    <button class="eink-btn eink-btn--sm">-</button>
    <button class="eink-btn eink-btn--sm">+</button>
  </div>
  <span class="eink-toolbar__separator" aria-hidden="true"></span>
  <div class="eink-toolbar__group">
    <button class="eink-btn eink-btn--sm">Aa</button>
    <button class="eink-btn eink-btn--sm">Mono</button>
  </div>
  <span class="eink-toolbar__spacer"></span>
  <button class="eink-btn eink-btn--ghost eink-btn--sm">Reset</button>
</div>
```

## Progress & Stat

```html
<div class="eink-progress eink-progress--labeled">
  <div class="eink-progress__label">Chapter</div>
  <div class="eink-progress__track">
    <div class="eink-progress__bar" style="width:65%"></div>
  </div>
  <div class="eink-progress__label">65%</div>
</div>

<div class="eink-stat">
  <div class="eink-stat__label">Reading time</div>
  <div class="eink-stat__value">18m</div>
  <div class="eink-stat__delta">+3m vs. yesterday</div>
</div>
```

## Description List

```html
<dl class="eink-dl eink-dl--horizontal eink-dl--bordered">
  <dt class="eink-dl__term">Display</dt>
  <dd class="eink-dl__detail">E-Ink Carta 1200</dd>
  <dt class="eink-dl__term">Density</dt>
  <dd class="eink-dl__detail">300 PPI</dd>
</dl>
```

## Details / Accordion

```html
<details class="eink-details">
  <summary class="eink-details__summary">Keyboard shortcuts</summary>
  <div class="eink-details__body">Use left/right arrows to flip pages.</div>
</details>
```

## Timeline

```html
<ol class="eink-timeline">
  <li class="eink-timeline__item eink-timeline__item--active">
    <span class="eink-timeline__time">Today</span>
    <div class="eink-timeline__title">Firmware updated</div>
    <div class="eink-timeline__body">Sharper rendering.</div>
  </li>
  <li class="eink-timeline__item">
    <span class="eink-timeline__time">Yesterday</span>
    <div class="eink-timeline__title">New book added</div>
    <div class="eink-timeline__body">"E-Ink Handbook"</div>
  </li>
</ol>
```

## Sidebar Layout

```html
<div class="eink-with-sidebar">
  <main class="eink-with-sidebar__main">Main content</main>
  <aside class="eink-with-sidebar__sidebar">Sidebar content</aside>
</div>
```

## Utilities

```html
<p class="eink-text-muted">Muted text</p>
<p class="eink-text-sm">Small text</p>
<p class="eink-text-lg">Large text</p>
<p class="eink-text-center">Centered</p>
<p class="eink-text-mono">Monospace</p>
<p class="eink-text-serif">Serif</p>
<p class="eink-text-bold">Bold</p>
<span class="eink-badge">Badge</span>
<span class="eink-sr-only">Screen reader only</span>
<div class="eink-note">Callout note</div>
<div class="eink-prose">Long-form content with vertical rhythm</div>
<div class="eink-measure">Max line width (65ch)</div>
```

## Web Component Equivalents

Import and register all custom elements once:

```html
<script type="module">
  import { defineEinkElements } from "eink-ui/dist/wc/index.js";
  defineEinkElements();
</script>
```

### Layout

```html
<eink-container>Centered, max-width content</eink-container>
<eink-container width="wide">Wide variant</eink-container>

<eink-stack>
  <div>Item 1</div>
  <div>Item 2</div>
</eink-stack>
<!-- gap="sm" or gap="lg" -->

<eink-cluster>
  <span>Tag 1</span>
  <span>Tag 2</span>
</eink-cluster>

<eink-grid style="--eink-grid-min: 15rem;">
  <div>Cell</div>
  <div>Cell</div>
</eink-grid>

<eink-divider></eink-divider>
<eink-divider strong></eink-divider>

<eink-page-header><h1>Site Title</h1></eink-page-header>
<eink-page-footer><p>&copy; 2026</p></eink-page-footer>
```

### Card

```html
<eink-card>
  <div class="eink-card__header">Title</div>
  <div class="eink-card__body">Content</div>
</eink-card>
<eink-card raised>Raised variant</eink-card>
```

### Button

```html
<eink-button variant="primary">Primary</eink-button>
<eink-button variant="secondary">Secondary</eink-button>
<eink-button variant="ghost">Ghost</eink-button>
<eink-button size="sm">Small</eink-button>
<eink-button disabled>Disabled</eink-button>
```

### Alert

```html
<eink-alert variant="info">
  <div class="eink-alert__title">Info</div>
  <div class="eink-alert__body">Information message.</div>
</eink-alert>
<eink-alert variant="warning">Warning message.</eink-alert>
<eink-alert variant="error">Error message.</eink-alert>
```

### Tag & Badge

```html
<eink-tag>Outline</eink-tag>
<eink-tag variant="filled">Filled</eink-tag>
<eink-tag variant="muted">Muted</eink-tag>
<eink-badge>Badge</eink-badge>
```

### Form Controls

```html
<eink-input type="text" name="username" placeholder="Enter name"></eink-input>
<eink-input type="email" required aria-invalid="true"></eink-input>

<eink-textarea name="bio" placeholder="About you"></eink-textarea>

<eink-select name="country">
  <option value="de">Germany</option>
  <option value="us">United States</option>
</eink-select>

<eink-checkbox name="agree">I accept the terms</eink-checkbox>
<eink-checkbox checked disabled>Pre-checked, disabled</eink-checkbox>

<eink-radio name="size" value="sm">Small</eink-radio>
<eink-radio name="size" value="md" checked>Medium</eink-radio>
```

### Attribute Reference

| CSS class                 | Web Component      | Attribute             |
| ------------------------- | ------------------ | --------------------- |
| `.eink-container--wide`   | `<eink-container>` | `width="wide"`        |
| `.eink-container--narrow` | `<eink-container>` | `width="narrow"`      |
| `.eink-stack--sm`         | `<eink-stack>`     | `gap="sm"`            |
| `.eink-stack--lg`         | `<eink-stack>`     | `gap="lg"`            |
| `.eink-divider--strong`   | `<eink-divider>`   | `strong`              |
| `.eink-card--raised`      | `<eink-card>`      | `raised`              |
| `.eink-alert--info`       | `<eink-alert>`     | `variant="info"`      |
| `.eink-alert--success`    | `<eink-alert>`     | `variant="success"`   |
| `.eink-alert--warning`    | `<eink-alert>`     | `variant="warning"`   |
| `.eink-alert--error`      | `<eink-alert>`     | `variant="error"`     |
| `.eink-tag--filled`       | `<eink-tag>`       | `variant="filled"`    |
| `.eink-tag--muted`        | `<eink-tag>`       | `variant="muted"`     |
| `.eink-btn--primary`      | `<eink-button>`    | `variant="primary"`   |
| `.eink-btn--secondary`    | `<eink-button>`    | `variant="secondary"` |
| `.eink-btn--ghost`        | `<eink-button>`    | `variant="ghost"`     |
| `.eink-btn--sm`           | `<eink-button>`    | `size="sm"`           |
| `.eink-btn--lg`           | `<eink-button>`    | `size="lg"`           |
