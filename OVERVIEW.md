# EPaper — Project overview & insights

This file complements `README.md` (install / quick start), `THEMING.md` (CSS
tokens) and `CONTRIBUTING.md` (component authoring) with the **architectural
context and API rationale** that none of the three covers in isolation.
Audience: first-time users who want to understand _why_ the library looks
the way it does — and contributors who need to add components or assess
core changes.

---

## 1 · What EPaper is (and what it isn't)

EPaper is a **vanilla web component library** (83 component modules
registering 108 custom elements) built around a single hard constraint:
**every component must render cleanly on electrophoretic displays**. Every
other design decision follows from that constraint, not from taste.

**It is:**

- A set of custom elements (tag prefix `e-*`) that run directly in the
  browser without any build step (`<script type="module">`).
- An opinionated design system with **CSS custom properties** as its only
  theming surface (tokens under `--ink-*`).
- A **form-associated custom elements** library: every input, toggle, and
  picker participates natively in `<form>` submission via
  `ElementInternals`.
- Light DOM. **No Shadow DOM** — a deliberate choice so consumers can
  override styles with plain CSS.

**It is _not_:**

- ❗ **Lit-based.** Lit is a `devDependency` for Storybook templating
  only. Components extend `EpaperElement` — a thin `HTMLElement` subclass
  that stands in for it when there is no DOM, so every entry point imports
  in a bare Node process — or `BaseFormControl`, with zero Lit at runtime. Earlier versions listed `"lit"` as a
  `package.json` keyword; that has been removed.
- A reactivity framework. Most updates are explicit, surgical DOM mutations
  via the `patch*` helpers in `core/dom.ts`; components with structural
  content (`<e-table>` rows, `<e-calendar>`'s grid, `<e-select>`'s options)
  rebuild their own subtree on a relevant data change instead.
- An animation framework. Animations and transitions are globally
  forbidden inside `.ink-page` via `base.css`.

---

## 2 · Architecture stack

```
┌──────────────────────────────────────────────────────────────┐
│  src/index.ts            (barrel — registers every tag)      │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴────────────────────┐
        ▼                                           ▼
┌────────────────┐                          ┌────────────────┐
│ src/components │  83 modules / 108 tags   │  src/styles    │
│  *.ts          │  (1 file = 1+ component) │  tokens / base │
│                │                          │  components    │
└────────────────┘                          └────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  src/core/                                                   │
│  ├── dom.ts                — define(), EpaperElement,        │
│  │                           patch*, esc(), observeItems(),  │
│  │                           onGlobal(), addCleanup()        │
│  ├── base-form-control.ts  — abstract<T> form-associated     │
│  │                           class with serialize/parse      │
│  ├── icons.ts              — SVG icon registry               │
│  ├── i18n.ts               — string table, t(), label()      │
│  ├── format.ts             — Intl wrappers with fallbacks    │
│  ├── date.ts               — date utilities                  │
│  ├── tree.ts               — shared tree model               │
│  ├── data.ts               — JSON attribute parsing          │
│  ├── slug.ts               — id/anchor slugs                 │
│  └── types.ts              — shared event detail types       │
└──────────────────────────────────────────────────────────────┘
```

### Load-bearing patterns

1. **Self-registration.** Every component file ends with
   `define('e-foo', EFoo)`, so a side-effect import registers the tag.
   The `sideEffects` array in `package.json` is curated as a whitelist
   so bundlers tree-shake unused components.
2. **Patch instead of re-render.** `patchText`, `patchAttr`,
   `patchBoolAttr`, `patchClassModifier` only touch the DOM when the
   value actually differs. This keeps the dirty rectangle small so the
   EPDC can pick a partial-refresh waveform (DU/A2, 30–80 ms) instead
   of a full GC16 flash (200–800 ms).
3. **WeakMap-backed cleanup registry** (`addCleanup` / `runCleanups`).
   Components with global listeners (document/window) register them via
   `onGlobal(this, …)`; `disconnectedCallback` calls `runCleanups(this)`
   and prevents leaks across remounts.
4. **`BaseFormControl<T>`** turns form participation into a generic
   template. Subclasses provide `serialize(v: T)` (for
   `ElementInternals.setFormValue`) and `parse(s: string)` (for
   `formResetCallback` / `formStateRestoreCallback`). Validity
   pass-through is built in.

### CSS layer order

`tokens.css` (custom properties) → `base.css` (reset, `.ink-page` scope,
no-motion reset) → `components.css` (BEM-style `.ink-*` classes, one
section per component). The three layers ship separately and as a
combined `dist/styles/epaper.min.css`.

---

## 3 · API conventions

### Naming

| Layer                  | Convention                              |
| ---------------------- | --------------------------------------- |
| Custom element tag     | `e-<kebab-case>` (e.g. `e-date-picker`) |
| Class name             | `E<PascalCase>` (e.g. `EDatePicker`)    |
| Attribute              | `kebab-case` (e.g. `default-value`)     |
| Property (on instance) | `camelCase` (e.g. `defaultValue`)       |
| Event name             | `e-<verb>` (all `CustomEvent`s)         |
| CSS custom property    | `--ink-<area>-<role>` (e.g. `--ink-fg`) |
| CSS class              | `ink-<component>` / `ink-<comp>--<mod>` |

### Event detail contract

The default `e-change` payload is `{ value: T }`. The exceptions below
are **intentional** — each follows the native HTML semantic type for
its underlying control. They are not bugs to be unified away.

| Event            | Fires on                                          | `detail` shape                                         |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `e-change`       | Form-control commit (default)                     | `{ value: T }`                                         |
|                  | …semantic exceptions:                             |                                                        |
|                  | `<e-checkbox>`, `<e-toggle>`                      | `{ checked: boolean }`                                 |
|                  | `<e-upload>`                                      | `{ files: File[] }`                                    |
|                  | `<e-meter>`                                       | `{ value: number, band: 'low'\|'normal'\|'high' }`     |
| `e-input`        | Live edit (before `e-change`)                     | `{ value: string }`                                    |
| `e-click`        | Button activation                                 | `{ originalEvent: MouseEvent }`                        |
|                  | `<e-back-top>` (scroll position, not a DOM event) | `{ value: number }`                                    |
| `e-select`       | Dropdown item activation (positional)             | `{ index: number }`                                    |
|                  | `<e-float-button>` (positional + value)           | `{ index: number, value: string }`                     |
|                  | `<e-table>` (row selection)                       | `{ value: number[] }`                                  |
| `e-open`         | Overlay opened                                    | `{ value: true }`                                      |
| `e-close`        | Overlay closed                                    | `{ value: false }`, `<e-dialog>` adds `reason`         |
|                  | `<e-tag>`, `<e-alert>` dismissed                  | `{ value: string }`                                    |
| `e-submit`       | Form submission                                   | `{ form: HTMLFormElement }`                            |
| `e-invalid`      | Submission blocked by constraint validation       | `{ controls: HTMLElement[], form: HTMLFormElement }`   |
| `e-error`        | Malformed JSON attribute                          | `{ error: Error, source: string }`                     |
|                  | Image source failed                               | `{ value: string }`                                    |
| `e-month-change` | `<e-calendar>` moved to another month             | `{ year: number, month: number }` (`month` zero-based) |

README.md carries the full table, including which components fire each one.

The library exports an `EChangeDetail<T>` type alias for the common
shape:

`'e-change'` is not a key of `HTMLElementEventMap`, so `addEventListener`
resolves to its untyped overload and `strict` mode rejects a listener declared
to take `CustomEvent<…>`. Type the parameter as `Event` and narrow in the body:

```ts
import type { EChangeDetail } from '@marcomattes/epaper-components';

el.addEventListener('e-change', (e: Event) => {
  const { value } = (e as CustomEvent<EChangeDetail<string>>).detail;
  console.log(value);
});
```

### Form participation

Form controls behave like native ones:

```html
<form>
  <e-input name="email" required></e-input>
  <e-checkbox name="agree" required></e-checkbox>
  <e-upload name="avatar" max-files="1"></e-upload>
  <button type="submit">Send</button>
</form>
```

- `name` attribute → becomes part of the `FormData`.
- `required` / `disabled` → respected during submit.
- `formResetCallback` (Reset button) → re-applies `default-value`.
- `formStateRestoreCallback` → BFCache and autofill restore.

> **Validation note.** All 18 `BaseFormControl` subclasses participate in
> constraint validation through `ElementInternals`. Text and number controls
> mirror the validity flags of their native inner control; selection, boolean
> and file controls report `valueMissing` from their component-level
> `required` attribute.

---

## 4 · Building your own components

EPaper exports its building blocks as sub-path imports — your
components can extend them:

```ts
import { BaseFormControl } from '@marcomattes/epaper-components/core/base-form-control';
import { define, esc, patchText, onGlobal } from '@marcomattes/epaper-components/core/dom';

export class MyRating extends BaseFormControl<number> {
  static formAssociated = true;
  static observedAttributes = ['max'];

  protected serialize(v: number) {
    return String(v);
  }
  protected parse(s: string) {
    return Number(s) || 0;
  }

  connectedCallback() {
    this.innerHTML = `<output class="ink-rating">${esc(String(this.value))}</output>`;
  }
}
define('my-rating', MyRating);
```

Conventions from `CONTRIBUTING.md` (XSS escaping with `esc()`,
`onGlobal` cleanup, JSDoc for CEM, light DOM, no motion) apply 1:1 to
your own components.

---

## 5 · Testing model

| Test suite                             | Verifies                                                         | Tests |
| -------------------------------------- | ---------------------------------------------------------------- | ----- |
| `__tests__/structural-deep.test.ts`    | Layout, form, list and page-structure components end to end      | 393   |
| `__tests__/data-media-deep.test.ts`    | Table, media, code and chart components                          | 273   |
| `__tests__/form-pickers-deep.test.ts`  | Date, time, cascader, tree-select and upload pickers             | 216   |
| `__tests__/security.test.ts`           | XSS injection through every `esc()` path                         | 202   |
| `__tests__/display-deep.test.ts`       | Read-only display components and their formatters                | 178   |
| `__tests__/overlays-nav-deep.test.ts`  | Dialogs, popovers, menus, tabs and the rest of the nav surface   | 169   |
| `__tests__/form-controls-deep.test.ts` | Text, number, boolean and choice controls                        | 163   |
| `__tests__/form-association.test.ts`   | `FormData`, reset/restore and constraint validity                | 147   |
| `__tests__/data-display.test.ts`       | Data-driven rendering from JSON attributes                       | 129   |
| `__tests__/screenshots.test.ts`        | Pixel visual regression, one story per story module              | 80    |
| `__tests__/new-components.test.ts`     | The components added in this major                               | 59    |
| `__tests__/reactivity.test.ts`         | `attributeChangedCallback` updates after mount                   | 55    |
| `__tests__/cleanup.test.ts`            | The `onGlobal` / `runCleanups` memory-leak pattern               | 28    |
| `__tests__/refresh-budget.test.ts`     | Mutation, node-churn and dirty-area budgets                      | 14    |
| `__tests__/theme-packs.test.ts`        | The shipped theme packs against the token registry               | 6     |
| `core/dom.test.ts`                     | `patch*`, `observeItems`, cleanup registry, `cloneItemBody`      | 98    |
| `core/tree.test.ts`                    | Shared tree model: checking, expansion, keyboard traversal       | 77    |
| `core/base-form-control.test.ts`       | The form-associated base, including the paths no component hits  | 63    |
| `core/format.test.ts`                  | `Intl` wrappers and their non-`Intl` fallbacks                   | 48    |
| `core/i18n.test.ts`                    | String-table resolution, overrides and interpolation             | 20    |
| `core/date.test.ts`                    | `parseYMD`, `ymd`, `pad2`                                        | 16    |
| `core/__ssr__/dom.test.ts`             | Importing every entry point with no DOM globals present          | 4     |
| Storybook + `@storybook/addon-a11y`    | axe-core (WCAG 2A + 2AA + best practice) over all 84 story files | 361   |

Visual regression, keyboard navigation and refresh budgets run in CI. Physical
panel ghosting and waveform selection remain hardware checks because browser
DOM APIs cannot observe the EPDC's final refresh decision.

---

## 6 · Build & distribution

| Artefact                             | Path                                           | Purpose                                       |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| ESM bundle (barrel)                  | `dist/index.js`                                | `import { EButton }` from package root        |
| ESM bundle (per component)           | `dist/components/<name>.js`                    | Sub-path import for tree-shaking              |
| TypeScript declarations              | `dist/**/*.d.ts`                               | Strict types for consumers                    |
| `HTMLElementTagNameMap` augmentation | `dist/elements.d.ts`                           | `document.createElement('e-button')` is typed |
| Custom Elements Manifest             | `dist/custom-elements.json`                    | IDE integration, Storybook                    |
| VS Code Custom Data                  | `dist/vscode.html-custom-data.json`            | HTML autocomplete                             |
| WebStorm/IntelliJ Web-Types          | `dist/web-types.json`                          | JetBrains autocomplete                        |
| CSS layers                           | `dist/styles/{tokens,base,components}.min.css` | Includes `.map` files                         |
| Panel themes                         | `dist/styles/themes/*.min.css`                 | Optional mono-high-contrast / Kaleido packs   |
| Combined CSS bundle                  | `dist/styles/epaper.min.css`                   | Single-file drop-in                           |

`npm pack --dry-run` shows what is actually published — recommended
before any release. The `files` whitelist in `package.json` ships only
`dist/`, `src/styles/`, and the markdown docs.

---

## 7 · Known limitations

These are intentional trade-offs, tracked in `CHANGELOG.md` under
"Known limitations".

1. **`<e-kaleido>`** is a hardware-fingerprint visualisation tool
   kept in the public API for demo purposes; it is not a
   general-purpose layout primitive.
2. **`tsconfig` is missing `noUncheckedIndexedAccess`.** Enabling it
   surfaces a long tail of latent index-access cases in pickers, calendar and
   stories. They are runtime-safe by construction but deserve precise
   typing rather than blanket non-null assertions.
3. **Test coverage is thematic, not per-component.** The suites in §5 are
   organised by concern rather than by component, so a given component's
   behaviour is spread across several files. Display-only components lean on
   the Storybook a11y addon (axe-core), the visual baselines and the
   refresh-budget suite for regression coverage.
4. **The visual baselines are browser-build specific.** `__screenshots__/`
   holds `-chromium-linux` PNGs recorded by CI's pinned Playwright Chromium.
   Text antialiasing differs between Chromium builds, so a local run on a
   different revision reports diffs that CI does not see. Regenerate baselines
   only from the pinned revision.

---

## 8 · Browser support

| Browser           | Minimum version | Reason                                                |
| ----------------- | --------------- | ----------------------------------------------------- |
| Chrome            | 77+             | `attachInternals` and form-associated custom elements |
| Edge              | 79+             | First Chromium Edge; same engine floor as Chrome      |
| Firefox           | 98+             | `attachInternals` since 98                            |
| Safari            | 16.4+           | `formAssociated` and `ElementInternals` support       |
| Node (build only) | 20+             | LTS through 2026, ES2022 features used in build chain |

No polyfills are shipped. Consumers targeting older browsers should
load
[`element-internals-polyfill`](https://www.npmjs.com/package/element-internals-polyfill)
before any component import.

---

## 9 · Framework integration (cheatsheet)

For full snippets see the README's "Framework integration" section.
Quick references:

### React 19+

```tsx
import '@marcomattes/epaper-components/button';
import { useEffect, useRef } from 'react';

function Demo() {
  const btn = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = btn.current;
    const onClick = (e: Event) => console.log((e as CustomEvent).detail);
    el?.addEventListener('e-click', onClick);
    return () => el?.removeEventListener('e-click', onClick);
  }, []);
  return (
    <e-button ref={btn} variant="primary">
      Hi
    </e-button>
  );
}
```

For TSX, augment `JSX.IntrinsicElements`. The shipped `dist/elements.d.ts`
is a starting point.

### Vue 3

```vue
<e-input name="email" @e-change="onChange" />
```

In `vite.config.ts`:
`compilerOptions.isCustomElement = (tag) => tag.startsWith('e-')`.

### Angular 17+

```ts
@NgModule({ schemas: [CUSTOM_ELEMENTS_SCHEMA] })
```

Plus listeners via `(e-change)="…"` (Angular accepts kebab-case events).

### Svelte 5

No configuration needed — Svelte detects custom elements automatically.
`on:e-change={fn}` is enough.

---

## 10 · Where do I find …?

| Question                                         | File                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| How do I install?                                | `README.md` § "Quick start"                            |
| Which CSS variables exist?                       | `THEMING.md` + `src/styles/tokens.css`                 |
| How do I write my own component?                 | `CONTRIBUTING.md` § "Component conventions" + § 4 here |
| What does `patchAttr` / `patchClassModifier` do? | `src/core/dom.ts` (inline JSDoc)                       |
| What does `BaseFormControl` look like?           | `src/core/base-form-control.ts`                        |
| Which component fires which event?               | § 3 here, or `dist/custom-elements.json`               |
| Known limitations?                               | § 7 here, also `CHANGELOG.md`                          |
| Browser support?                                 | § 8 here                                               |
| React / Vue / Angular setup?                     | § 9 here, full snippets in `README.md`                 |
| Working with Claude Code in this repo?           | `AGENTS.md`                                            |
