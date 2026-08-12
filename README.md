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

> **[Site](https://epaper-components.dev/)** ·
> **[Storybook](https://epaper-components.dev/storybook/)**

EPaper is a component library of plain custom elements for user interfaces that
run on electrophoretic displays. It ships 82 registered elements, a three-layer
CSS token system, strict TypeScript types and a Custom Elements Manifest. There
is no framework dependency and no runtime dependency at all; components extend
`HTMLElement` or a shared `BaseFormControl` base class and render into the light
DOM.

## Design constraints

Electrophoretic display controllers (EPDCs) drive pixels through a multi-step
waveform rather than refreshing a backlit matrix at a fixed frame rate. Full
panel refreshes take roughly 200–800 ms and are visible as a flash, partial
refreshes of a dirty rectangle take roughly 30–80 ms, and intermediate pixel
states persist as ghosting until a subsequent refresh clears them. Panels are
reflective, typically run at 150–300 ppi without sub-pixel anti-aliasing, and
render either in grayscale (Carta) or in a five-color gamut (Kaleido).

Those properties rule out a number of techniques that are unremarkable on
emissive displays, and the library is designed around that rather than around a
visual style. The sections below document each decision together with the
hardware behaviour it follows from.

### Animations and transitions

CSS transitions and animations produce intermediate pixel states that the
waveform cannot resolve cleanly, so they leave ghosting that survives several
refresh cycles. Both are therefore disabled globally in the base reset:

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

The source tree contains no `@keyframes` rules, and state changes are applied as
direct DOM mutations inside event handlers rather than through an animation
pipeline. Two components use `requestAnimationFrame`, both to coalesce
high-frequency input into a single write per frame rather than to animate
anything: `<e-splitter>` batches pointer-drag updates, and `<e-anchor>` batches
scroll-position updates. Without that coalescing each pointer or scroll event
would trigger its own partial refresh.

### Interaction states

Capacitive touch layers on e-paper hardware report contact, not proximity, so
there is no hover state to style; the library contains no `:hover` rule.
Opacity values and mid-tone greys are also avoided for state changes, because
partial-tone pixels dither inconsistently between refreshes and the same element
can end up rendering differently after a redraw. Interaction state is encoded in
primitives that survive 1-bit rendering:

| State    | Encoding                                                     |
| -------- | ------------------------------------------------------------ |
| Focus    | 3px solid `--ink-fg` outline + 2px offset (`:focus-visible`) |
| Pressed  | Foreground/background inversion on `:active`                 |
| Selected | `[aria-selected]` / `[aria-checked]` + flat fill flip        |
| Disabled | Diagonal hatch fill via `--ink-hatch-disabled`               |
| Error    | 3px border + `--ink-hatch-error` fill                        |

The hatch patterns are defined once in
[src/styles/tokens.css](src/styles/tokens.css) and reused across every control,
so a disabled control reads as disabled at any refresh depth:

```css
--ink-hatch-disabled: repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 4px);
--ink-hatch-error: repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 5px);
--ink-hatch-cover: repeating-linear-gradient(45deg, #fff 0 2px, #000 2px 6px);
```

Selection inverts the two ink colors (`background: var(--ink-fg); color: var(--ink-bg)`)
instead of tinting, for the same reason.

### DOM updates

Because the EPDC tracks dirty rectangles, the cost of an update scales with the
area that changed. Replacing a subtree marks a large region dirty and typically
forces a full refresh; mutating a single attribute or text node stays within a
partial refresh.

Components therefore render once in `connectedCallback`, guarded by a `_wired`
flag against double initialisation, and afterwards mutate through four typed
patch helpers in [src/core/dom.ts](src/core/dom.ts). Each helper compares the
incoming value against the current one and returns early when they match:

```ts
patchText(node, value); // textContent, only on diff
patchAttr(el, name, value); // setAttribute / removeAttribute, only on diff
patchBoolAttr(el, name, on); // boolean attribute toggle, only on diff
patchClassModifier(el, prefix, mod); // BEM-style modifier swap, only on diff
```

The practical effect is that an `attributeChangedCallback` routed through
`patchAttr` costs nothing when a framework re-asserts a value it already set,
which is a common pattern in reactive renderers and would otherwise cause a
refresh per render pass.

### Light DOM

No component calls `attachShadow`; everything renders into the light tree via
`this.innerHTML`, with `esc()` applied to interpolated values. There are three
reasons, and all of them are specific to the deployment targets this library
expects:

1. **Native form participation.** Form-associated custom elements need the
   `<form>` to reach `name` and `value`. Shadow DOM complicates the `FormData`
   walk and requires additional focus-delegation handling.
2. **Restricted runtimes.** E-paper kiosks and readers frequently ship stripped
   or outdated browser builds in which Shadow DOM support is incomplete.
3. **Overridable styling.** The rendered tree is inspectable and can be
   restyled with ordinary selectors, without exposing a `::part` surface for
   every internal node.

### Form-associated controls

Thirteen interactive components extend `BaseFormControl`
([src/core/base-form-control.ts](src/core/base-form-control.ts)), which sets
`static formAssociated = true` and wires `ElementInternals` so that the control
participates in `FormData`, `form.reset()` and constraint validation without
additional JavaScript:

> `<e-input>`, `<e-textarea>`, `<e-checkbox>`, `<e-checkbox-group>`,
> `<e-radio-group>`, `<e-toggle>`, `<e-select>`, `<e-cascader>`,
> `<e-tree-select>`, `<e-input-number>`, `<e-date-picker>`, `<e-time-picker>`,
> `<e-upload>`.

`<e-button>` is form-associated separately so that it can submit or reset its
parent form natively. Together this allows a form to be built and submitted from
plain HTML, which matters for kiosk deployments that ship no application
framework.

### Stroke weights and icon geometry

At 150–300 ppi without sub-pixel anti-aliasing, 1px strokes lose contrast
against the reflective substrate and can disappear entirely after a partial
refresh. The token layer sets minimum weights accordingly:

```css
--ink-border-width: 2px; /* default */
--ink-border-width-strong: 4px; /* emphasis */
--ink-border-width-hair: 1px; /* only for inert dividers */
--ink-border-width-error: 3px; /* validation */
--ink-focus-width: 3px; /* focus ring */
```

The 41 icons in [src/core/icons.ts](src/core/icons.ts) are rendered as stroked
paths with `stroke-width="2" fill="none" stroke-linecap="square" stroke-linejoin="miter"`.
Filled shapes are avoided below 32px because they dither visibly on Kaleido
panels, and square caps avoid the rounded endpoint artifacts that remain
visible into the next refresh.

### Touch target sizes

```css
--ink-control-h-sm: 36px;
--ink-control-h-md: 44px; /* default */
--ink-control-h-lg: 48px;
```

The 44px default follows the iOS Human Interface Guidelines minimum, which at
300 ppi corresponds to about 3.7 mm of physical glass. Capacitive layers
laminated onto e-paper modules generally resolve touch less precisely than those
on OLED panels, so the larger default is a reasonable baseline rather than a
generous one.

### Color on Kaleido panels

Kaleido is the color e-paper panel family currently in production. Its native
gamut is exposed as flat tokens, without gradients or alpha compositing, since
both would be resolved through dithering:

```css
--kaleido-red: #d11a1a;
--kaleido-orange: #e26a1b;
--kaleido-yellow: #e8c81c;
--kaleido-green: #1f8a3b;
--kaleido-blue: #1e4fb8;
```

`<e-kaleido>` ([src/components/kaleido.ts](src/components/kaleido.ts)) is a
diagnostic component that renders those colors alongside a Bayer-8 dithered
preview, so a swatch can be evaluated against its likely hardware rendering
before it ships.

### Typography

| Role        | Stack         | Line-height    | Rationale                                            |
| ----------- | ------------- | -------------- | ---------------------------------------------------- |
| Long prose  | `--ink-serif` | `1.6`          | Serifs remain legible on reflective grayscale.       |
| Body / UI   | `--ink-sans`  | `1.55`         | Above the web norm of ~1.3, since reading is slower. |
| Data / code | `--ink-mono`  | `1.55`         | Tabular alignment in forms and tables.               |
| Headings    | `--ink-sans`  | `1.15` (tight) | Density in toolbars and headers.                     |

### Where this library is not a good fit

The constraints above exclude several common UI patterns. If a project needs any
of the following, a conventional component library is the better choice:

- Skeleton loaders, shimmer effects or progress spinners, all of which depend on
  motion.
- Hover-driven menus and tooltips, which have no input equivalent on e-paper.
- Drop shadows, gradients and translucency, which dither unpredictably.
- Color-coded status indicators, since Carta is grayscale and Kaleido provides
  roughly five reliably distinguishable colors.
- Interaction at 60 fps, which the panel hardware cannot deliver.

## Install

```sh
npm install @marcomattes/epaper-components
```

Unreleased work is published continuously from `main` under the `dev` dist-tag.
It is useful for verifying a fix before it appears in a release, and is not
intended for production:

```sh
npm install @marcomattes/epaper-components@dev
```

## Quick start

The library ships three CSS layers — tokens, base reset and component styles.
They are separate so that consumers can replace the token layer or skip the
reset. For static HTML the combined bundle is the shortest path; the path below
assumes `node_modules` is reachable from the document, so in a served
application either copy the file into the public directory or point the tag at
your own asset path.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <!-- Combined and minified: tokens + base + components, ~7 KB gzip. -->
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

In a project with a bundler, import the layers individually so that tokens
remain overridable through plain CSS:

```ts
import '@marcomattes/epaper-components/styles/tokens.css';
import '@marcomattes/epaper-components/styles/base.css';
import '@marcomattes/epaper-components/styles/components.css';

import '@marcomattes/epaper-components/button';
import '@marcomattes/epaper-components/input';
import '@marcomattes/epaper-components/select';
```

Importing the barrel registers every component at once:

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
(see [scripts/build-css.mjs](scripts/build-css.mjs)) during `npm run build`, and
each one ships with a sibling `*.min.css.map`. Importing the unminified sources
keeps them readable and allows them to pass through a consumer's own PostCSS
pipeline.

Sizes as of the 1.0.1 build:

| File                 |     raw |   gzip |
| -------------------- | ------: | -----: |
| `tokens.min.css`     |  1.6 KB | 0.7 KB |
| `base.min.css`       |  1.4 KB | 0.6 KB |
| `components.min.css` | 40.5 KB | 6.3 KB |
| `epaper.min.css`     | 43.5 KB | 7.0 KB |

## Subpath imports and bundle size

Every component is shipped as a separate ES module under
`@marcomattes/epaper-components/<tag>`, and the barrel entry registers all of
them. The `sideEffects` allowlist in `package.json` covers the component modules
and the public CSS files, so importing a single subpath pulls in that component
plus its shared core chunks and nothing else, in Vite, Rollup, esbuild and
webpack 5.

| Goal               | Import                                                           |
| ------------------ | ---------------------------------------------------------------- |
| Just one component | `import '@marcomattes/epaper-components/button';`                |
| Type imports only  | `import type { EButton } from '@marcomattes/epaper-components';` |
| Whole library      | `import '@marcomattes/epaper-components';`                       |

Bundling the full library through esbuild produces about 31.6 KB brotli, or
roughly 46 KB gzip; `npm run size` enforces a 40 KB brotli budget on the barrel
and separate budgets on `<e-button>` (6 KB, currently 909 B) and `<e-input>`
(8 KB, currently 1.43 KB). The CSS files are declared as having side effects,
since they apply globally, and are never tree-shaken.

## Forms

Every interactive control is a [form-associated custom
element](https://web.dev/articles/more-capable-form-controls). Giving a control
a `name` attribute is enough for it to participate in submission, `FormData`,
reset and constraint validation.

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
`willValidate`, `checkValidity()` and `reportValidity()` members through
[`ElementInternals`](https://developer.mozilla.org/docs/Web/API/ElementInternals).

## Events

Components communicate through `CustomEvent`s with an `e-` prefix and a typed
`detail` payload. The default is an `e-change` event carrying `{ value: T }`;
the following contracts differ from that default and are stable API:

| Event      | Detail                             | Fired by                                                                 |
| ---------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `e-change` | `{ value: string }`                | `e-input`, `e-textarea`, `e-select`, `e-date-picker`, `e-tree-select`, … |
| `e-change` | `{ value: string[] }`              | `e-cascader`, `e-checkbox-group`                                         |
| `e-change` | `{ value: number }`                | `e-pagination`, `e-input-number`                                         |
| `e-change` | `{ checked: boolean }`             | `e-checkbox`, `e-toggle`                                                 |
| `e-change` | `{ files: File[] }`                | `e-upload`                                                               |
| `e-click`  | `{ originalEvent: MouseEvent }`    | `e-button`                                                               |
| `e-select` | `{ index: number }`                | `e-dropdown`                                                             |
| `e-submit` | `{ form: HTMLFormElement }`        | `e-form` (the native submit is `preventDefault`-ed)                      |
| `e-error`  | `{ error: Error, source: string }` | `e-cascader`, `e-tree-select` on malformed JSON attributes               |

The complete per-component list, including slots and attributes, is generated
into `dist/custom-elements.json`. For typed listeners the package exports an
`EChangeDetail<T>` helper:

```ts
import type { EChangeDetail } from '@marcomattes/epaper-components';

el.addEventListener('e-change', (e: CustomEvent<EChangeDetail<string>>) => {
  console.log(e.detail.value);
});
```

## Theming

CSS custom properties are the public theming surface; the registry is documented
in [THEMING.md](./THEMING.md).

## TypeScript and IDE integration

- **TypeScript:** importing the package augments `HTMLElementTagNameMap`, so
  `document.querySelector('e-button')` is typed as `EButton`.
- **VS Code:** `dist/vscode.html-custom-data.json` provides tag and attribute
  completion in plain HTML and is loaded automatically through the package's
  `contributes.html.customData` entry.
- **WebStorm:** `dist/web-types.json` provides the same in JetBrains IDEs via the
  `web-types` field.
- **Custom Elements Manifest:** `dist/custom-elements.json` follows the
  [CEM 1.0 schema](https://github.com/webcomponents/custom-elements-manifest).

## Browser support

The library targets current evergreen browsers (Chrome, Edge, Safari and Firefox,
last two versions). Form-associated custom elements require Safari 16.4+,
Chrome 77+ or Firefox 98+. No polyfill is bundled.

## Framework integration

The components are plain custom elements, so any framework that renders HTML can
use them. The examples below are per-framework conventions; nothing in the
library is framework-aware.

The one detail worth knowing in advance concerns events. Custom events with
hyphenated names are not covered by the event systems of React or Vue's JSX
transform, so in those environments listeners are attached imperatively. Vue
templates, Angular templates and Svelte have syntax for it.

### React

React 19 supports custom elements in the sense that it sets primitive props as
attributes and non-primitive props as properties. It does not register listeners
for custom events, and there is no `on-<event>` prop convention, so a prop like
`on-e-change` would be assigned as a property of that name and never fire.
`onSubmit` is a React synthetic event bound to the native `submit` event and
will not observe `e-submit` either. Attach `e-*` listeners through a ref, in
React 19 as well as in earlier versions:

```tsx
import { useEffect, useRef } from 'react';
import '@marcomattes/epaper-components/input';

export function EmailField() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onChange = (e: Event) => console.log((e as CustomEvent<{ value: string }>).detail.value);
    el.addEventListener('e-change', onChange);
    return () => el.removeEventListener('e-change', onChange);
  }, []);

  return <e-input ref={ref} name="email" type="email" required />;
}
```

Attributes, on the other hand, work as written: `name`, `type` and `required`
above are passed through to the element.

### Vue 3

Vue needs to be told which tags to leave alone, after which the `@` shorthand
binds custom events directly:

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

Angular requires `CUSTOM_ELEMENTS_SCHEMA` once per component and accepts
hyphenated event names in its standard binding syntax:

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

Svelte treats any hyphenated tag as a custom element, so no configuration is
needed. Event binding uses the `on:` directive; it is deprecated in Svelte 5 in
favour of `onclick`-style properties, but remains the only syntax that can
express a hyphenated event name such as `e-change`:

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

The shipped `dist/elements.d.ts` augments `HTMLElementTagNameMap`, which covers
`document.createElement` and `document.querySelector`. JSX typing is
framework-specific and belongs in the consuming project:

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

The 1.0 line is stable. Component attributes, events, slots and exported classes
are public API and follow [Semantic Versioning](https://semver.org/); breaking
changes require a major version and an entry in
[`CHANGELOG.md`](./CHANGELOG.md), which also documents the known limitations of
the current release.

## Repository

```
src/
  core/        # Cross-cutting helpers: dom, icons, base-form-control, types.
  components/  # One web component per file. Each calls define(...) at module scope.
  styles/      # tokens.css, base.css, components.css. Public CSS surface.
  stories/     # Storybook documentation; not shipped.
  site/        # Source of epaper-components.dev; not shipped.
  demo/        # Demo HTML wiring; not shipped.
```

### Companion docs

| File                                   | Audience             | Purpose                                                                                                                   |
| -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [`OVERVIEW.md`](./OVERVIEW.md)         | Users + contributors | Architecture deep-dive, API conventions, event-detail contract, framework-integration cheatsheet, V1.0 known limitations. |
| [`THEMING.md`](./THEMING.md)           | Users                | CSS custom-property registry and override patterns.                                                                       |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Contributors         | Component-author conventions, release process and PR checklist.                                                           |
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

`npm run build` runs four stages in order:

1. **`vite build`** emits per-component ES modules to `dist/components/*.js`, the
   barrel `dist/index.js` and shared chunks under `dist/chunks/`, each with a
   source map.
2. **`node scripts/build-css.mjs`** copies `src/styles/*.css` to `dist/styles/`,
   runs them through `cssnano`, writes `*.min.css` plus `*.min.css.map`, and
   concatenates the three layers into `dist/styles/epaper.min.css`.
3. **`tsc -p tsconfig.build.json`** emits the `.d.ts` files into `dist/`.
4. **`cem analyze` and `node scripts/gen-tag-map.mjs`** produce
   `dist/custom-elements.json`, `dist/web-types.json`,
   `dist/vscode.html-custom-data.json`, `dist/vscode.css-custom-data.json` and
   `dist/elements.d.ts`, which carries the `HTMLElementTagNameMap` augmentation.

## Contributing

Pull requests are welcome; see [CONTRIBUTING.md](./CONTRIBUTING.md) for the
component-author conventions. Before opening one, confirm that
`npm run lint:check`, `npm run type-check`, `npm run test:ci` and `npm run build`
pass locally. CI runs the same checks plus Prettier and the size-limit budgets on
every pull request and on every push to `main`. CodeQL analysis runs alongside
it through GitHub's code scanning default setup, which is configured in the
repository settings rather than as a workflow file.

## Releasing

Releases are handled by `.github/workflows/release.yml`, which serves two npm
channels.

Every push to `main` that passes CI publishes a `<next-patch>-dev.<build>`
version under the `dev` dist-tag. The version is written inside the job and is
never committed, so `package.json` on `main` always reflects the last release.

A pushed tag matching `v<package.json version>` triggers the release path: the
workflow re-runs the full gate (Prettier, ESLint, `tsc`, the browser test suite,
build and size-limit), publishes to npm with
[provenance](https://docs.npmjs.com/generating-provenance-statements) through
OIDC trusted publishing, and creates a GitHub Release whose notes are the
matching `CHANGELOG.md` section, with the packed tarball attached. Tags carrying
a prerelease part, such as `v1.1.0-rc.1`, are published under the `next` dist-tag
instead of `latest`.

The public site and Storybook are deployed separately, by
`.github/workflows/deploy.yml`, on every push to `main`.

## License

MIT. See [LICENSE](./LICENSE).
