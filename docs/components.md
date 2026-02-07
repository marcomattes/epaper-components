# Components

All components work CSS-only with no JavaScript required. Each component also has a matching **Web Component** for attribute-driven usage (see [Web Component equivalents](#web-component-equivalents) at the end).

## Layout

### Container

```html
<div class="epaper-container">Centered, max-width content</div>
<div class="epaper-container epaper-container--narrow">Narrow variant</div>
<div class="epaper-container epaper-container--wide">Wide variant</div>
```

### Stack (vertical spacing)

```html
<div class="epaper-stack">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
<!-- Variants: epaper-stack--sm, epaper-stack--lg -->
```

### Cluster (horizontal wrapping)

```html
<div class="epaper-cluster">
  <span>Tag 1</span>
  <span>Tag 2</span>
</div>
```

### Grid

```html
<div class="epaper-grid" style="--epaper-grid-min: 15rem;">
  <div>Cell</div>
  <div>Cell</div>
</div>
```

### Divider

```html
<hr class="epaper-divider" />
<hr class="epaper-divider epaper-divider--strong" />
```

### Page Header / Footer

```html
<header class="epaper-page-header">
  <h1>Site Title</h1>
</header>
<footer class="epaper-page-footer">
  <p>&copy; 2026</p>
</footer>
```

## Navigation

```html
<nav class="epaper-nav" aria-label="Main">
  <a href="/" aria-current="page">Home</a>
  <a href="/about">About</a>
</nav>
```

## Buttons

```html
<button class="epaper-btn epaper-btn--primary">Primary</button>
<button class="epaper-btn epaper-btn--secondary">Secondary</button>
<button class="epaper-btn epaper-btn--ghost">Ghost</button>
<button class="epaper-btn epaper-btn--sm">Small</button>
<button class="epaper-btn epaper-btn--lg">Large</button>
<button class="epaper-btn epaper-btn--primary" disabled>Disabled</button>
```

## Card

```html
<div class="epaper-card">
  <div class="epaper-card__header">Title</div>
  <div class="epaper-card__body">Content</div>
  <div class="epaper-card__footer">Footer</div>
</div>
<div class="epaper-card epaper-card--raised">Raised variant</div>
```

## Form Controls

### Field + Label

```html
<div class="epaper-field">
  <label class="epaper-label" for="name">Name</label>
  <input class="epaper-input" id="name" type="text" />
</div>
<div class="epaper-field epaper-field--inline">
  <label class="epaper-label epaper-label--required" for="email">Email</label>
  <input class="epaper-input" id="email" type="email" required />
</div>
```

### Text Input + Textarea

```html
<input class="epaper-input" type="text" />
<input class="epaper-input" type="text" disabled />
<input class="epaper-input" type="text" aria-invalid="true" />
<textarea class="epaper-textarea" rows="4"></textarea>
```

### Select

```html
<select class="epaper-select">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

### Checkbox

```html
<label> <input type="checkbox" class="epaper-checkbox" /> Accept terms </label>
<label> <input type="checkbox" class="epaper-checkbox" checked /> Pre-checked </label>
<label> <input type="checkbox" class="epaper-checkbox" disabled /> Disabled </label>
```

Implementation note: Uses `appearance: none` with direct `background-color` change on `:checked` (no pseudo-elements — they are unreliable on `<input>` elements).

### Radio

```html
<label>
  <input type="radio" class="epaper-radio" name="size" value="sm" /> Small
</label>
<label>
  <input type="radio" class="epaper-radio" name="size" value="md" checked /> Medium
</label>
```

Implementation note: Uses `appearance: none` with thick `border-width` on `:checked` to create a dot effect (no pseudo-elements).

### Help + Error

```html
<input class="epaper-input" aria-invalid="true" aria-describedby="help1 err1" />
<p class="epaper-help" id="help1">Helpful hint text</p>
<p class="epaper-error-message" id="err1">This field is required</p>
```

**Accessibility:** Link error and help text to their inputs using `aria-describedby`. Give each message a unique `id`. Multiple IDs can be space-separated.

### Error Summary

```html
<div class="epaper-error-summary">
  <h2>There are problems</h2>
  <ul>
    <li><a href="#field">Error description</a></li>
  </ul>
</div>
```

## Table

```html
<div class="epaper-table-wrap">
  <table class="epaper-table epaper-table--striped">
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

Variants: `--striped`, `--bordered`, `--compact`. Always wrap in `.epaper-table-wrap` for horizontal scroll on small screens.

## Dialog

```html
<dialog class="epaper-dialog" open aria-labelledby="dialog-title">
  <div class="epaper-dialog__title" id="dialog-title">Confirm</div>
  <div class="epaper-dialog__body">Are you sure?</div>
  <div class="epaper-dialog__actions">
    <button class="epaper-btn epaper-btn--primary">Yes</button>
    <button class="epaper-btn epaper-btn--secondary">No</button>
  </div>
</dialog>
```

**Accessibility:** Always add `aria-labelledby` pointing to an `id` on the `.epaper-dialog__title` element. Uses native `<dialog>` element which provides built-in focus trapping and Escape-to-close. Demo pages use the `open` attribute for CSS-only display.

### Opening with the polyfill

```html
<button data-dialog-target="confirm">Open</button>
<dialog id="confirm" class="epaper-dialog">
  <div class="epaper-dialog__title">Confirm</div>
  <div class="epaper-dialog__body">Are you sure?</div>
  <div class="epaper-dialog__actions">
    <button class="epaper-btn epaper-btn--secondary" data-dialog-close>Cancel</button>
    <button class="epaper-btn epaper-btn--primary">Yes</button>
  </div>
</dialog>
<script src="dist/epaper-ui.dialog.polyfill.js"></script>
```

The polyfill enables `data-dialog-target` (open by ID) and `data-dialog-close` (close current dialog) on browsers without native `<dialog>` support.

## Picture

```html
<figure class="epaper-picture">
  <img src="photo.jpg" alt="Description" />
  <figcaption>Caption text</figcaption>
</figure>
```

## Alerts

```html
<div class="epaper-alert epaper-alert--info" role="status">
  <div class="epaper-alert__title">Info</div>
  <div class="epaper-alert__body">Thin left rule; minimal repaint.</div>
</div>
<div class="epaper-alert epaper-alert--error" role="alert">
  <div class="epaper-alert__title">Error</div>
  <div class="epaper-alert__body">Error state uses role="alert".</div>
</div>
```

**Accessibility:** Use `role="status"` for info/success/warning alerts and `role="alert"` for errors. The `<epaper-alert>` Web Component sets the role automatically based on `variant`.

## Breadcrumb

```html
<nav class="epaper-breadcrumb" aria-label="Breadcrumb">
  <ol class="epaper-breadcrumb__list">
    <li class="epaper-breadcrumb__item"><a href="#">Home</a></li>
    <li class="epaper-breadcrumb__item"><a href="#">Library</a></li>
    <li class="epaper-breadcrumb__item" aria-current="page">Current</li>
  </ol>
</nav>
```

## Pagination

```html
<nav aria-label="Pagination" class="epaper-pagination">
  <ol class="epaper-pagination__list">
    <li>
      <a class="epaper-pagination__link" aria-disabled="true" href="#" tabindex="-1"
        >Prev</a
      >
    </li>
    <li><a class="epaper-pagination__link" aria-current="page" href="#">1</a></li>
    <li><a class="epaper-pagination__link" href="#">2</a></li>
    <li><a class="epaper-pagination__link" href="#">Next</a></li>
  </ol>
</nav>
```

## Tabs (CSS-only)

```html
<div class="epaper-tabs" style="--epaper-tabs-count:3">
  <input type="radio" class="epaper-tabs__input" name="t" id="t1" checked />
  <label class="epaper-tabs__tab" for="t1">One</label>
  <input type="radio" class="epaper-tabs__input" name="t" id="t2" />
  <label class="epaper-tabs__tab" for="t2">Two</label>
  <input type="radio" class="epaper-tabs__input" name="t" id="t3" />
  <label class="epaper-tabs__tab" for="t3">Three</label>
  <div class="epaper-tabs__panel">Panel one</div>
  <div class="epaper-tabs__panel">Panel two</div>
  <div class="epaper-tabs__panel">Panel three</div>
</div>
```

## List Group

```html
<ul class="epaper-list-group">
  <li class="epaper-list-group__item epaper-list-group__item--active">Active</li>
  <li class="epaper-list-group__item">Default</li>
  <li class="epaper-list-group__item">Disabled</li>
</ul>
```

## Tags

```html
<div class="epaper-tag-group">
  <span class="epaper-tag">Outline</span>
  <span class="epaper-tag epaper-tag--filled">Filled</span>
  <span class="epaper-tag epaper-tag--muted">Muted</span>
</div>
```

## Toolbar

```html
<div class="epaper-toolbar" role="toolbar" aria-label="Font settings">
  <div class="epaper-toolbar__group">
    <span class="epaper-toolbar__label">Font</span>
    <button class="epaper-btn epaper-btn--sm" aria-label="Decrease font size">-</button>
    <button class="epaper-btn epaper-btn--sm" aria-label="Increase font size">+</button>
  </div>
  <span class="epaper-toolbar__separator" aria-hidden="true"></span>
  <div class="epaper-toolbar__group">
    <button class="epaper-btn epaper-btn--sm">Aa</button>
    <button class="epaper-btn epaper-btn--sm">Mono</button>
  </div>
  <span class="epaper-toolbar__spacer"></span>
  <button class="epaper-btn epaper-btn--ghost epaper-btn--sm">Reset</button>
</div>
```

**Accessibility:** Add `role="toolbar"` and `aria-label` to the toolbar container. Buttons with icon-only content (like `-` / `+`) need `aria-label` for screen readers.

## Progress & Stat

```html
<div
  class="epaper-progress epaper-progress--labeled"
  role="progressbar"
  aria-valuenow="65"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Chapter progress"
>
  <div class="epaper-progress__label">Chapter</div>
  <div class="epaper-progress__track">
    <div class="epaper-progress__bar" style="width:65%"></div>
  </div>
  <div class="epaper-progress__label">65%</div>
</div>
```

**Accessibility:** Add `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label` to all progress bars.

```html
<div class="epaper-stat">
  <div class="epaper-stat__label">Reading time</div>
  <div class="epaper-stat__value">18m</div>
  <div class="epaper-stat__delta">+3m vs. yesterday</div>
</div>
```

## Description List

```html
<dl class="epaper-dl epaper-dl--horizontal epaper-dl--bordered">
  <dt class="epaper-dl__term">Display</dt>
  <dd class="epaper-dl__detail">E-Ink Carta 1200</dd>
  <dt class="epaper-dl__term">Density</dt>
  <dd class="epaper-dl__detail">300 PPI</dd>
</dl>
```

## Details / Accordion

```html
<details class="epaper-details">
  <summary class="epaper-details__summary">Keyboard shortcuts</summary>
  <div class="epaper-details__body">Use left/right arrows to flip pages.</div>
</details>
```

## Timeline

```html
<ol class="epaper-timeline">
  <li class="epaper-timeline__item epaper-timeline__item--active">
    <span class="epaper-timeline__time">Today</span>
    <div class="epaper-timeline__title">Firmware updated</div>
    <div class="epaper-timeline__body">Sharper rendering.</div>
  </li>
  <li class="epaper-timeline__item">
    <span class="epaper-timeline__time">Yesterday</span>
    <div class="epaper-timeline__title">New book added</div>
    <div class="epaper-timeline__body">"E-Ink Handbook"</div>
  </li>
</ol>
```

## Sidebar Layout

```html
<div class="epaper-with-sidebar">
  <main class="epaper-with-sidebar__main">Main content</main>
  <aside class="epaper-with-sidebar__sidebar">Sidebar content</aside>
</div>
```

## Utilities

```html
<p class="epaper-text-muted">Muted text</p>
<p class="epaper-text-sm">Small text</p>
<p class="epaper-text-lg">Large text</p>
<p class="epaper-text-center">Centered</p>
<p class="epaper-text-mono">Monospace</p>
<p class="epaper-text-serif">Serif</p>
<p class="epaper-text-bold">Bold</p>
<span class="epaper-badge">Badge</span>
<span class="epaper-sr-only">Screen reader only</span>
<div class="epaper-note">Callout note</div>
<div class="epaper-prose">Long-form content with vertical rhythm</div>
<div class="epaper-measure">Max line width (65ch)</div>
```

## Web Component Equivalents

Import and register all custom elements once:

```html
<script type="module">
  import { defineEinkElements } from "epaper-ui/dist/wc/index.js";
  defineEinkElements();
</script>
```

### Layout

```html
<epaper-container>Centered, max-width content</epaper-container>
<epaper-container width="wide">Wide variant</epaper-container>

<epaper-stack>
  <div>Item 1</div>
  <div>Item 2</div>
</epaper-stack>
<!-- gap="sm" or gap="lg" -->

<epaper-cluster>
  <span>Tag 1</span>
  <span>Tag 2</span>
</epaper-cluster>

<epaper-grid style="--epaper-grid-min: 15rem;">
  <div>Cell</div>
  <div>Cell</div>
</epaper-grid>

<epaper-divider></epaper-divider>
<epaper-divider strong></epaper-divider>

<epaper-page-header><h1>Site Title</h1></epaper-page-header>
<epaper-page-footer><p>&copy; 2026</p></epaper-page-footer>
```

### Card

```html
<epaper-card>
  <div class="epaper-card__header">Title</div>
  <div class="epaper-card__body">Content</div>
</epaper-card>
<epaper-card raised>Raised variant</epaper-card>
```

### Button

```html
<epaper-button variant="primary">Primary</epaper-button>
<epaper-button variant="secondary">Secondary</epaper-button>
<epaper-button variant="ghost">Ghost</epaper-button>
<epaper-button size="sm">Small</epaper-button>
<epaper-button disabled>Disabled</epaper-button>
```

### Alert

```html
<epaper-alert variant="info">
  <div class="epaper-alert__title">Info</div>
  <div class="epaper-alert__body">Information message.</div>
</epaper-alert>
<epaper-alert variant="warning">Warning message.</epaper-alert>
<epaper-alert variant="error">Error message.</epaper-alert>
```

### Tag & Badge

```html
<epaper-tag>Outline</epaper-tag>
<epaper-tag variant="filled">Filled</epaper-tag>
<epaper-tag variant="muted">Muted</epaper-tag>
<epaper-badge>Badge</epaper-badge>
```

### Form Controls

```html
<epaper-input type="text" name="username" placeholder="Enter name"></epaper-input>
<epaper-input type="email" required aria-invalid="true"></epaper-input>

<epaper-textarea name="bio" placeholder="About you"></epaper-textarea>

<epaper-select name="country">
  <option value="de">Germany</option>
  <option value="us">United States</option>
</epaper-select>

<epaper-checkbox name="agree">I accept the terms</epaper-checkbox>
<epaper-checkbox checked disabled>Pre-checked, disabled</epaper-checkbox>

<epaper-radio name="size" value="sm">Small</epaper-radio>
<epaper-radio name="size" value="md" checked>Medium</epaper-radio>
```

### Attribute Reference

| CSS class                   | Web Component        | Attribute             |
| --------------------------- | -------------------- | --------------------- |
| `.epaper-container--wide`   | `<epaper-container>` | `width="wide"`        |
| `.epaper-container--narrow` | `<epaper-container>` | `width="narrow"`      |
| `.epaper-stack--sm`         | `<epaper-stack>`     | `gap="sm"`            |
| `.epaper-stack--lg`         | `<epaper-stack>`     | `gap="lg"`            |
| `.epaper-divider--strong`   | `<epaper-divider>`   | `strong`              |
| `.epaper-card--raised`      | `<epaper-card>`      | `raised`              |
| `.epaper-alert--info`       | `<epaper-alert>`     | `variant="info"`      |
| `.epaper-alert--success`    | `<epaper-alert>`     | `variant="success"`   |
| `.epaper-alert--warning`    | `<epaper-alert>`     | `variant="warning"`   |
| `.epaper-alert--error`      | `<epaper-alert>`     | `variant="error"`     |
| `.epaper-tag--filled`       | `<epaper-tag>`       | `variant="filled"`    |
| `.epaper-tag--muted`        | `<epaper-tag>`       | `variant="muted"`     |
| `.epaper-btn--primary`      | `<epaper-button>`    | `variant="primary"`   |
| `.epaper-btn--secondary`    | `<epaper-button>`    | `variant="secondary"` |
| `.epaper-btn--ghost`        | `<epaper-button>`    | `variant="ghost"`     |
| `.epaper-btn--sm`           | `<epaper-button>`    | `size="sm"`           |
| `.epaper-btn--lg`           | `<epaper-button>`    | `size="lg"`           |
