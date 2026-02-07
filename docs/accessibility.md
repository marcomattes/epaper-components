# Accessibility

epaper-components is designed for accessible E-Ink interfaces. This guide covers ARIA attributes, keyboard navigation, and E-Ink-specific considerations.

## ARIA Attributes by Component

| Component                        | ARIA attributes                                                                   | Notes                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Alert** (info/success/warning) | `role="status"`                                                                   | Non-urgent status messages. WC auto-sets this.                                                                                |
| **Alert** (error)                | `role="alert"`                                                                    | Urgent error notifications. WC auto-sets this.                                                                                |
| **Dialog**                       | `aria-labelledby="<title-id>"`                                                    | Points to `.epaper-dialog__title` element.                                                                                    |
| **Progress bar**                 | `role="progressbar"` `aria-valuenow` `aria-valuemin` `aria-valuemax` `aria-label` | All four attributes required for screen readers.                                                                              |
| **Toolbar**                      | `role="toolbar"` `aria-label`                                                     | Groups related actions; label describes purpose.                                                                              |
| **Divider**                      | `role="separator"`                                                                | WC auto-sets this. CSS-only: use `<hr>`.                                                                                      |
| **Error summary**                | `role="alert"`                                                                    | Already set in existing markup.                                                                                               |
| **Loader**                       | `role="status"` `aria-live="polite"`                                              | Already set in existing markup.                                                                                               |
| **Breadcrumb**                   | `aria-label="Breadcrumb"`                                                         | Already set on `<nav>` element.                                                                                               |
| **Pagination**                   | `aria-label="Pagination"`                                                         | Already set on `<nav>` element.                                                                                               |
| **Tabs**                         | Uses radio inputs                                                                 | CSS-only tabs use hidden radio inputs for state. No `role="tablist"` — screen readers interact with the radio group natively. |

## Form Accessibility Patterns

### Linking Errors to Inputs

Always connect error messages to their inputs using `aria-describedby`:

```html
<div class="eink-field">
  <label class="eink-label" for="email">Email</label>
  <input
    type="email"
    id="email"
    class="eink-input"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <span class="eink-error-message" id="email-error">
    Enter a valid email address.
  </span>
</div>
```

With Web Components, the `aria-describedby` attribute is automatically forwarded to the inner `<input>`:

```html
<eink-input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
></eink-input>
<span class="eink-error-message" id="email-error"> Enter a valid email address. </span>
```

### Multiple Descriptions

Link both help text and error messages by space-separating IDs:

```html
<input
  type="email"
  class="eink-input"
  aria-invalid="true"
  aria-describedby="email-help email-error"
/>
<span class="eink-help" id="email-help">We'll send your confirmation here.</span>
<span class="eink-error-message" id="email-error">Enter a valid email.</span>
```

### Required Fields

Use the `required` attribute (forwarded by WCs) and `.epaper-label--required` for visual indication:

```html
<label class="eink-label eink-label--required" for="name">Name</label>
<input type="text" id="name" class="eink-input" required />
```

### Error Summary

Place an error summary at the top of the form. Links should jump to the invalid fields:

```html
<div class="eink-error-summary" role="alert">
  <div class="eink-error-summary__title">There are 2 errors</div>
  <ul>
    <li><a href="#name">Name is required</a></li>
    <li><a href="#email">Enter a valid email</a></li>
  </ul>
</div>
```

## ARIA Forwarding in Web Components

All form Web Components forward ARIA attributes from the host element to the inner native control:

| WC Element        | Forwarded ARIA attributes                                                            |
| ----------------- | ------------------------------------------------------------------------------------ |
| `<eink-input>`    | `aria-invalid`, `aria-describedby`, `aria-label`, `aria-labelledby`, `aria-required` |
| `<eink-textarea>` | Same as input                                                                        |
| `<eink-select>`   | `aria-invalid`, `aria-describedby`, `aria-label`, `aria-labelledby`, `aria-required` |
| `<eink-checkbox>` | `aria-invalid`, `aria-describedby`, `aria-label`, `aria-labelledby`, `aria-required` |
| `<eink-radio>`    | Same as checkbox                                                                     |
| `<eink-button>`   | `aria-label`, `aria-pressed`, `aria-expanded`, `aria-haspopup`                       |

## Keyboard Navigation

### Focus Styles

All interactive elements use `:focus-visible` with a 3px solid outline. This is visible in all themes including high-contrast.

### Tab Order

Components follow the natural DOM order. No `tabindex` manipulation is used unless an element needs to be removed from the tab order (e.g., disabled pagination links use `tabindex="-1"`).

### Dialog

The native `<dialog>` element provides built-in focus trapping when opened with `.showModal()`. Press `Escape` to close.

### Accordion

Uses native `<details>` / `<summary>` elements. Keyboard accessible by default.

## Theme Accessibility

### High Contrast Mode

The `high-contrast` theme increases border widths and uses maximum black/white contrast:

```html
<html data-theme="high-contrast"></html>
```

All themes maintain WCAG AA contrast ratios for text. The high-contrast theme targets AAA.

### Inverted Mode

The `inverted` theme swaps foreground and background while preserving contrast ratios.

## E-Ink Specific Considerations

- **No hover-only affordances**: Most E-Ink devices lack hover capability. All interactive states are accessible via focus or explicit interaction.
- **No animations**: `prefers-reduced-motion: reduce` is always declared. E-Ink refresh rates (120-450ms) make motion disruptive.
- **System fonts**: Avoids FOUT/FOIT and full-page repaint on webfont loading.
- **Borders over fills**: Minimizes repaint area on partial E-Ink refreshes, while maintaining visual distinction for accessibility.

## CSS-Only Tabs Design Decision

epaper-components tabs use hidden radio inputs rather than `role="tablist"` / `role="tab"`. This is intentional:

- Radio inputs provide native keyboard navigation (arrow keys within the group).
- Screen readers announce the state naturally ("radio button, 1 of 3, checked").
- No JavaScript is required for state management.
- The trade-off is that screen readers announce "radio button" instead of "tab", but the interaction pattern is equivalent and fully accessible.
