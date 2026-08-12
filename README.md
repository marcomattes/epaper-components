# EPaper

[![npm version](https://img.shields.io/npm/v/@marcomattes/epaper-components.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@marcomattes/epaper-components)
[![npm downloads](https://img.shields.io/npm/dm/@marcomattes/epaper-components.svg?style=flat-square&logo=npm)](https://www.npmjs.com/package/@marcomattes/epaper-components)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@marcomattes/epaper-components?style=flat-square&label=gzip)](https://bundlephobia.com/package/@marcomattes/epaper-components)
[![CI](https://img.shields.io/github/actions/workflow/status/marcomattes/epaper-components/ci.yml?branch=main&style=flat-square&logo=github&label=CI)](https://github.com/marcomattes/epaper-components/actions/workflows/ci.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fepaper-components.dev&style=flat-square&label=epaper-components.dev)](https://epaper-components.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Custom Elements Manifest](https://img.shields.io/badge/CEM-1.0-blueviolet?style=flat-square)](https://github.com/webcomponents/custom-elements-manifest)
[![License: MIT](https://img.shields.io/npm/l/@marcomattes/epaper-components.svg?style=flat-square)](./LICENSE)
[![Provenance](https://img.shields.io/badge/npm-provenance-success?style=flat-square&logo=npm)](https://docs.npmjs.com/generating-provenance-statements)

> **[🎨 Site](https://epaper-components.dev/)** ·
> **[📚 Storybook](https://epaper-components.dev/storybook/)**

E-Paper-first web component library. Plain custom elements, design tokens, no
framework. Strict TypeScript, light DOM, no animations.

## Why

EPaper is built for grayscale e-paper panels. That single constraint drives every
decision in the library:

- **No animations, no transitions** — they ghost on EPDs.
- **No `:hover`** — there is no hover on e-paper touch surfaces; focus is the
  state cue.
- **High-contrast, square-cap, 2px stroke** — typography- and rule-driven, not
  shadow- or color-driven.
- **Light DOM, not Shadow DOM** — consumers can use the components from
  framework-free HTML, override styles with plain CSS, and benefit from native
  forms.
- **Form-associated controls** — every input, checkbox, toggle, select, picker
  and group submits like its native counterpart.

## E-paper design highlights

Every line in this section is a deliberate engineering decision driven by how
electrophoretic display controllers (EPDCs) actually paint pixels. None of it
is aesthetic preference.

### Motion is forbidden, not discouraged

E-paper panels use a multi-step waveform per pixel transition. Anything that
would tween produces visible ghosting that survives several full refreshes.
The reset enforces this globally:

```css
/* src/styles/base.css */
.ink-page,
.ink-page *,
.ink-page *::before,
.ink-page *::after {
  transition: none !important;
  animation: none !important;
}
```

Verified zero `@keyframes` and zero non-test `requestAnimationFrame` in the
source tree. State changes are applied as immediate DOM mutations inside event
handlers — there is no animation frame pipeline to keep in sync.

### State without color, opacity, or hover

There is no `:hover` rule anywhere in the library. Interaction state is encoded
in three primitives that survive 1-bit rendering:

| State    | Encoding                                                     |
| -------- | ------------------------------------------------------------ |
| Focus    | 3px solid `--ink-fg` outline + 2px offset (`:focus-visible`) |
| Pressed  | Foreground/background **inversion** on `:active`             |
| Selected | `[aria-selected]` / `[aria-checked]` + flat fill flip        |
| Disabled | Diagonal hatch fill via `--ink-hatch-disabled`               |
| Error    | 3px border + `--ink-hatch-error` fill                        |

Opacity and greys are never used for state because partial-tone pixels dither
unpredictably between refreshes. Disabled is a hatched repeating-linear-gradient
defined once in [src/styles/tokens.css](src/styles/tokens.css) and reused
across every control:

```css
--ink-hatch-disabled: repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 4px);
--ink-hatch-error: repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 5px);
--ink-hatch-cover: repeating-linear-gradient(45deg, #fff 0 2px, #000 2px 6px);
```

Selection inverts instead of tinting (`background: var(--ink-fg); color: var(--ink-bg)`).

### Surgical DOM updates, not re-renders

The EPDC tracks dirty rectangles. Replacing a subtree triggers a full panel
refresh (~200–800 ms with visible flash); mutating a single attribute or
text node triggers a fast partial refresh (~30–80 ms).

Components never re-render. They render once on `connectedCallback` (gated by a
`_wired` flag to prevent double-init), then mutate through four typed patch
helpers in [src/core/dom.ts](src/core/dom.ts) that **early-return when the
value is unchanged**:

```ts
patchText(node, value); // textContent, only on diff
patchAttr(el, name, value); // setAttribute / removeAttribute, only on diff
patchBoolAttr(el, name, on); // boolean attribute toggle, only on diff
patchClassModifier(el, prefix, mod); // BEM-style modifier swap, only on diff
```

This means an `attributeChangedCallback` that wires through `patchAttr` is a
no-op when the framework above re-asserts the same value — keeping the panel
quiet under reactive frameworks.

### Light DOM by contract

Zero `attachShadow` calls in `src/`. Every component renders into the light
tree via `this.innerHTML = …` (with `esc()` for any user input). Three reasons,
all e-paper-specific:

1. **Native form participation.** Form-associated custom elements need
   `<form>` to see the `name`/`value` — Shadow DOM blocks the FormData walk
   without `delegatesFocus` gymnastics.
2. **Restricted runtimes.** Many e-paper kiosks ship with stripped browser
   builds where Shadow DOM is buggy or disabled.
3. **CSS auditability.** The whole rendered tree is inspectable and overridable
   with plain selectors — no `::part` choreography for integrators.

### Form-associated everything

Thirteen interactive components extend `BaseFormControl`
([src/core/base-form-control.ts](src/core/base-form-control.ts)), which sets
`static formAssociated = true` and wires `ElementInternals` so the component
participates in `FormData`, `form.reset()`, and constraint validation without
JavaScript glue:

> `<e-input>`, `<e-textarea>`, `<e-checkbox>`, `<e-checkbox-group>`,
> `<e-radio-group>`, `<e-toggle>`, `<e-select>`, `<e-cascader>`,
> `<e-tree-select>`, `<e-input-number>`, `<e-date-picker>`, `<e-time-picker>`,
> `<e-upload>`.

`<e-button>` is form-associated separately so it can submit/reset its parent
form natively. This is what makes the library viable for plain-HTML kiosk
deployments with no JS framework.

### Stroke geometry tuned for low-DPI panels

E-paper modules typically run at 150–300 ppi without sub-pixel anti-aliasing.
1px lines blur into the substrate. The token contract enforces minimum
weights:

```css
--ink-border-width: 2px; /* default */
--ink-border-width-strong: 4px; /* emphasis */
--ink-border-width-hair: 1px; /* only for inert dividers */
--ink-border-width-error: 3px; /* validation */
--ink-focus-width: 3px; /* focus ring */
```

All 40+ icons in [src/core/icons.ts](src/core/icons.ts) render as
`stroke-width="2" fill="none" stroke-linecap="square" stroke-linejoin="miter"`.
The file header reads: _"Fills dither poorly under 32px on Kaleido — never use
them here."_ Square caps prevent rounded endpoint artifacts that ghost on the
next refresh.

### Touch targets sized for finger + stylus on reflective glass

```css
--ink-control-h-sm: 36px;
--ink-control-h-md: 44px; /* default */
--ink-control-h-lg: 48px;
```

44px is the iOS HIG floor; on a 300 ppi e-paper that's ≈3.7 mm of physical
glass — the practical minimum given that capacitive layers on e-paper are
typically less precise than on OLED.

### Kaleido as a first-class palette, not a brand color

Kaleido is the production color e-paper panel family. The library exposes its native
five-color gamut as flat tokens, never as gradients or alpha overlays:

```css
--kaleido-red: #d11a1a;
--kaleido-orange: #e26a1b;
--kaleido-yellow: #e8c81c;
--kaleido-green: #1f8a3b;
--kaleido-blue: #1e4fb8;
```

`<e-kaleido>` ([src/components/kaleido.ts](src/components/kaleido.ts)) is a
diagnostic component that paints those colors next to a Bayer-8 dithered
preview, so designers can see what a swatch will actually look like on
hardware before shipping.

### Typography contract

| Role        | Stack         | Line-height    | Why                                                 |
| ----------- | ------------- | -------------- | --------------------------------------------------- |
| Long prose  | `--ink-serif` | `1.6`          | Serifs scan better on reflective grayscale.         |
| Body / UI   | `--ink-sans`  | `1.55`         | Generous over the web norm of ~1.3 — slow scanning. |
| Data / code | `--ink-mono`  | `1.55`         | Tabular alignment for forms and tables.             |
| Headings    | `--ink-sans`  | `1.15` (tight) | Density when used in toolbars and headers.          |

### What this rules out

If you need any of the following, this library is the wrong choice — and that
is by design:

- Skeleton loaders, shimmer states, progress spinners (motion).
- Hover-driven menus or tooltips (no hover input on e-paper).
- Drop shadows, gradient buttons, glassmorphism (dither-hostile).
- Color-coded status (only ~5 stable colors on Kaleido; none on Carta).
- 60 fps interactivity (the panel cannot deliver it).

## Install

```sh
npm install @marcomattes/epaper-components
```

## Quick start

EPaper ships **three CSS layers** — tokens, base reset, components. They are
intentionally separate so consumers can swap tokens or skip the base reset.
For static HTML, the easiest path is the pre-built combined bundle:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <!-- One file, minified, ~5 KB gzip — tokens + base + components combined. -->
    <link
      rel="stylesheet"
      href="node_modules/@marcomattes/epaper-components/dist/styles/epaper.min.css"
    />
    <script type="module">
      // Register only the components you use:
      import '@marcomattes/epaper-components/button';
      import '@marcomattes/epaper-components/input';
      import '@marcomattes/epaper-components/form';
    </script>
  </head>
  <body class="ink-page">
    <e-form>
      <e-form-item label="Name">
        <e-input name="name" required></e-input>
      </e-form-item>
      <e-button variant="primary">Save</e-button>
    </e-form>
  </body>
</html>
```

In a bundler-friendly project, import the layers individually so unused tokens
can still be overridden via plain CSS:

```ts
import '@marcomattes/epaper-components/styles/tokens.css';
import '@marcomattes/epaper-components/styles/base.css';
import '@marcomattes/epaper-components/styles/components.css';

import '@marcomattes/epaper-components/button';
import '@marcomattes/epaper-components/input';
import '@marcomattes/epaper-components/select';
```

To pull every component (~42 KB gzip across all chunks), import the barrel:

```ts
import '@marcomattes/epaper-components';
```

## Stylesheets

Two distributions of the same three layers ship in the package:

| Subpath                                             | Resolves to                      | When to use                         |
| --------------------------------------------------- | -------------------------------- | ----------------------------------- |
| `@marcomattes/epaper-components/tokens.css`         | `src/styles/tokens.css` (source) | Bundlers (Vite, Rollup, webpack 5). |
| `@marcomattes/epaper-components/base.css`           | `src/styles/base.css` (source)   | Bundlers.                           |
| `@marcomattes/epaper-components/components.css`     | `src/styles/components.css`      | Bundlers.                           |
| `@marcomattes/epaper-components/styles.min.css`     | `dist/styles/epaper.min.css`     | Combined, minified bundle.          |
| `@marcomattes/epaper-components/tokens.min.css`     | `dist/styles/tokens.min.css`     | Standalone minified token layer.    |
| `@marcomattes/epaper-components/base.min.css`       | `dist/styles/base.min.css`       | Standalone minified reset.          |
| `@marcomattes/epaper-components/components.min.css` | `dist/styles/components.min.css` | Standalone minified component CSS.  |

The minified files are produced by [`cssnano`](https://cssnano.github.io/cssnano/)
(see [scripts/build-css.mjs](scripts/build-css.mjs)) during `npm run build`.
Each `*.min.css` ships with a sibling `*.min.css.map` source map for in-browser
debugging. Consumers of the source `*.css` files keep full readability and can
benefit from PostCSS pipelines in their own build.

Approximate sizes (April 2026):

| File                 |     raw |   gzip |
| -------------------- | ------: | -----: |
| `tokens.min.css`     |  1.7 KB | 0.7 KB |
| `base.min.css`       |  1.5 KB | 0.6 KB |
| `components.min.css` | 28.6 KB | 4.6 KB |
| `epaper.min.css`     | 31.7 KB | 5.4 KB |

## Subpath imports & tree-shaking

Every component is shipped as a separate ES module under
`@marcomattes/epaper-components/<tag>`. The barrel entry (`import '@marcomattes/epaper-components'`)
registers everything. The `sideEffects` allowlist in `package.json` is scoped
to the component modules and the public CSS files — so importing one component
subpath only ships that component (plus its shared core chunks) in modern
bundlers (Vite, Rollup, esbuild, webpack 5).

| Goal               | Import                                                           |
| ------------------ | ---------------------------------------------------------------- |
| Just one component | `import '@marcomattes/epaper-components/button';`                |
| Type imports only  | `import type { EButton } from '@marcomattes/epaper-components';` |
| Whole library      | `import '@marcomattes/epaper-components';`                       |

The CSS files are listed as having side effects (they apply globally), so they
will never be tree-shaken away.

## Forms

Every interactive control is a [form-associated custom
element](https://web.dev/articles/more-capable-form-controls). Give the control
a `name` attribute and it participates in `<form>` submission, `FormData`,
reset, and constraint validation.

```html
<form id="profile">
  <e-input name="email" type="email" required></e-input>
  <e-checkbox name="newsletter" label="Subscribe"></e-checkbox>
  <e-toggle name="dark-mode"></e-toggle>
  <e-select name="region">
    <e-option value="eu" label="Europe"></e-option>
    <e-option value="us" label="USA"></e-option>
  </e-select>
  <e-radio-group name="size">
    <e-radio value="s" label="S"></e-radio>
    <e-radio value="m" label="M"></e-radio>
  </e-radio-group>
  <e-checkbox-group name="topics" value="a,b">
    <e-cbox-option value="a" label="A"></e-cbox-option>
    <e-cbox-option value="b" label="B"></e-cbox-option>
  </e-checkbox-group>
  <e-date-picker name="birthday"></e-date-picker>
  <e-time-picker name="alarm"></e-time-picker>
  <button type="submit">Submit</button>
</form>

<script type="module">
  import '@marcomattes/epaper-components';
  document.getElementById('profile').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    console.log(data);
  });
</script>
```

Form controls also expose the standard `value`, `validity`, `validationMessage`,
`willValidate`, `checkValidity()` and `reportValidity()` members via
[`ElementInternals`](https://developer.mozilla.org/docs/Web/API/ElementInternals).

## Events

Every component fires `e-` prefixed `CustomEvent`s with typed `detail`
payloads. Common shapes:

| Detail shape           | Used by                                |
| ---------------------- | -------------------------------------- |
| `{ value: string }`    | `e-input`, `e-textarea`, `e-select`, … |
| `{ value: string[] }`  | `e-cascader`, `e-checkbox-group`       |
| `{ value: number }`    | `e-pagination`, `e-input-number`       |
| `{ checked: boolean }` | `e-checkbox`, `e-toggle`               |
| `{ originalEvent }`    | `e-button` (click), `e-link`           |

The `EChangeDetail<T>` helper type is exported from the package for typed
listeners:

```ts
import type { EChangeDetail } from '@marcomattes/epaper-components';

el.addEventListener('e-change', (e: CustomEvent<EChangeDetail<string>>) => {
  console.log(e.detail.value);
});
```

## Theming

EPaper uses CSS custom properties as its public theming surface. See
[THEMING.md](./THEMING.md).

## TypeScript & IDE integration

- **TypeScript:** Importing the package augments `HTMLElementTagNameMap`, so
  `document.querySelector('e-button')` is correctly typed as `EButton`.
- **VS Code:** `dist/vscode.html-custom-data.json` provides tag and attribute
  autocompletion in plain HTML files; it is auto-loaded via the package's
  `contributes.html.customData` entry.
- **WebStorm:** `dist/web-types.json` provides the same in JetBrains IDEs via
  the `web-types` field.
- **Custom Elements Manifest:** `dist/custom-elements.json` follows the
  [CEM 1.0 schema](https://github.com/webcomponents/custom-elements-manifest).

## Browser support

Targets modern evergreen browsers (Chrome / Edge / Safari / Firefox last 2
versions). Form-associated custom elements require Safari 16.4+ /
Chrome 77+ / Firefox 98+. No polyfill is shipped.

## Framework integration

EPaper components are plain custom elements, so any framework that can render
HTML can use them. The snippets below show idiomatic integration in the four
most common stacks. Note: nothing about the library is framework-aware — these
are conventions for each framework, not features of EPaper.

### React 19+

React 19 supports custom elements natively, including custom event listeners
declared as JSX props. Side-effect-import the components you need and add a
type augmentation if you use TSX:

```tsx
import '@marcomattes/epaper-components/button';
import '@marcomattes/epaper-components/input';

export function Profile() {
  return (
    <e-form onsubmit={(e) => e.preventDefault()}>
      <e-input
        name="email"
        type="email"
        required
        on-e-change={(e: CustomEvent<{ value: string }>) => console.log(e.detail.value)}
      />
      <e-button variant="primary">Save</e-button>
    </e-form>
  );
}
```

For React 18 and earlier, attach listeners via `useRef` + `addEventListener`
because synthetic events do not bridge to custom elements:

```tsx
const ref = useRef<HTMLElement>(null);
useEffect(() => {
  const el = ref.current;
  const onChange = (e: Event) => console.log((e as CustomEvent).detail.value);
  el?.addEventListener('e-change', onChange);
  return () => el?.removeEventListener('e-change', onChange);
}, []);
return <e-input ref={ref} name="email" />;
```

### Vue 3

Tell Vue to leave the `e-*` tags alone, then bind events with the `@` shorthand:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('e-'),
        },
      },
    }),
  ],
};
```

```vue
<script setup lang="ts">
import '@marcomattes/epaper-components/select';
const onChange = (e: CustomEvent<{ value: string }>) => console.log(e.detail.value);
</script>

<template>
  <e-select name="region" @e-change="onChange">
    <e-option value="eu" label="Europe" />
    <e-option value="us" label="USA" />
  </e-select>
</template>
```

### Angular 17+

Add `CUSTOM_ELEMENTS_SCHEMA` once and bind events with the standard `(eventName)`
syntax — Angular accepts kebab-case event names as-is:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@marcomattes/epaper-components/checkbox';

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: ` <e-checkbox name="agree" (e-change)="onChange($event)"></e-checkbox> `,
})
export class AgreeFormComponent {
  onChange(e: CustomEvent<{ checked: boolean }>) {
    console.log(e.detail.checked);
  }
}
```

### Svelte 5

No configuration required — Svelte recognises any tag containing a hyphen as
a custom element:

```svelte
<script lang="ts">
  import '@marcomattes/epaper-components/toggle';
  function onChange(e: CustomEvent<{ checked: boolean }>) {
    console.log(e.detail.checked);
  }
</script>

<e-toggle name="dark" on:e-change={onChange} />
```

### TypeScript JSX augmentation

If your framework uses TSX (React, Solid, Preact), augment `JSX.IntrinsicElements`
once so the `e-*` tags type-check. The shipped `dist/elements.d.ts` already
augments `HTMLElementTagNameMap` for `document.createElement`/`querySelector`;
the JSX side is per-framework and lives in your own project:

```ts
// src/types/epaper-jsx.d.ts
import type { EButton, EInput } from '@marcomattes/epaper-components';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'e-button': React.DetailedHTMLProps<React.HTMLAttributes<EButton>, EButton>;
      'e-input': React.DetailedHTMLProps<React.HTMLAttributes<EInput>, EInput>;
    }
  }
}
```

## Status

**Stable. V1.0.0 is the first stable release.** Component attributes,
events, slots and exported classes are now part of the public API and follow
[Semantic Versioning](https://semver.org/). Breaking changes require a major
version bump and an entry in [`CHANGELOG.md`](./CHANGELOG.md). Known V1.0
limitations (test coverage breadth, keyboard navigation in compound pickers)
are tracked in the changelog under "Known limitations".

## Repository

```
src/
  core/        # Cross-cutting helpers: dom, icons, base-form-control, types.
  components/  # One web component per file. Each calls define(...) at module scope.
  styles/      # tokens.css, base.css, components.css. Public CSS surface.
  stories/     # Storybook documentation; not shipped.
  demo/        # Demo HTML wiring; not shipped.
```

### Companion docs

| File                                   | Audience             | Purpose                                                                                                                   |
| -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`OVERVIEW.md`](./OVERVIEW.md)         | Users + contributors | Architecture deep-dive, API conventions, event-detail contract, framework-integration cheatsheet, V1.0 known limitations. |
| [`THEMING.md`](./THEMING.md)           | Users                | CSS custom-property registry and override patterns.                                                                       |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Contributors         | Component-author conventions and PR checklist.                                                                            |
| [`CHANGELOG.md`](./CHANGELOG.md)       | Everyone             | Version history, migrations, and known limitations.                                                                       |
| [`CLAUDE.md`](./CLAUDE.md)             | AI agents            | Working guide for Claude Code and similar tools.                                                                          |

## Development

```sh
npm install
npm run dev               # Vite playground (src/demo) on http://localhost:8085
npm run storybook         # Storybook on :6006
npm run test              # Vitest in watch mode (browser/Chromium via Playwright)
npm run test:ci           # Vitest single run, CI-friendly
npm run test:coverage     # Watch mode + v8 coverage report
npm run test:coverage:ci  # Single run + v8 coverage report
npm run test-storybook    # Run Storybook a11y/interaction tests
npm run build             # ES bundles + d.ts + minified CSS + CEM + tag map
npm run build-storybook   # Static Storybook for hosting
npm run analyze           # Re-emit custom-elements.json + elements.d.ts
npm run lint              # ESLint
npm run lint:check        # ESLint with --max-warnings=0 (CI gate)
npm run type-check        # tsc --noEmit
npm run format            # Prettier write
npm run format:check      # Prettier check (CI gate)
npm run size              # size-limit budget check on dist/
npm run size:why          # size-limit with bundle-analyzer
```

### Build pipeline

`npm run build` runs four stages, in order:

1. **`vite build`** — emits per-component ES modules to `dist/components/*.js`,
   the barrel `dist/index.js`, and shared chunks under `dist/chunks/` with
   source maps.
2. **`node scripts/build-css.mjs`** — copies `src/styles/*.css` to
   `dist/styles/`, runs them through `cssnano`, and writes `*.min.css` plus
   `*.min.css.map`. Also concatenates the three layers into a combined
   `dist/styles/epaper.min.css` for HTML consumers.
3. **`tsc -p tsconfig.build.json`** — emits `.d.ts` files alongside the JS
   bundle into `dist/`.
4. **`cem analyze` + `node scripts/gen-tag-map.mjs`** — produces
   `dist/custom-elements.json`, `dist/web-types.json`,
   `dist/vscode.html-custom-data.json`, `dist/vscode.css-custom-data.json` and
   `dist/elements.d.ts` (the `HTMLElementTagNameMap` augmentation).

## Contributing

Pull requests are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and
ensure `npm run lint:check`, `npm run type-check`, `npm run test:ci` and
`npm run build` all succeed locally. The CI pipeline runs the same checks plus
bundle-size budgets and CodeQL on every PR.

## Releasing

Releases are tag-driven. Push a tag like `v1.2.3` matching `package.json`’s
version and the release workflow will:

1. Re-run the full quality gate (lint, tests, coverage, build, bundle-size).
2. Publish to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements) via OIDC — no token required.
3. Create a GitHub Release with auto-generated notes.
4. Trigger a Pages redeploy with the new docs.

## License

ISC. See [LICENSE](./LICENSE).
