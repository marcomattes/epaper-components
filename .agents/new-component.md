# Adding a new component — EPaper web-component library

This checklist is tool-agnostic: it's meant to be read by any coding agent
(Claude Code, GitHub Copilot, Codex, Cursor, a human) scaffolding a new
Custom Element in this repo, not just one specific tool.

Every component in this repo needs five things wired together, not just a
`.ts` file. Missing one of them doesn't fail the build — it silently
produces a component nothing can import, style, or test. Do all five steps
in the same change.

First check whether the component is a **form control** (participates in
`<form>`, has a value users can submit — text/number/choice inputs, toggles,
selects) or a **display/action component** (buttons, cards, badges,
dropdowns that don't submit a form value). That decision determines which
base class to extend.

## 1. Component file — `packages/epaper-components/src/components/<name>.ts`

Non-form component, extend `HTMLElement` directly:

```ts
import { define, esc } from '../core/dom';

/**
 * @summary Short description.
 * @since v1.0.1
 * @attr {string} [foo] - Description.
 * @fires {CustomEvent<{value: string}>} e-change - Description.
 * @slot - Default slot description.
 * @example <e-foo></e-foo>
 */
export class EFoo extends HTMLElement {
  static observedAttributes = ['foo'];
  private _wired = false;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    this.innerHTML = `<span class="ink-foo">${esc(this.getAttribute('foo') ?? '')}</span>`;
  }

  attributeChangedCallback(_n: string, _o: string | null, _v: string | null) {
    if (!this._wired) return;
    // surgical patch only — patchText/patchAttr/patchBoolAttr/patchClassModifier
    // from ../core/dom, never innerHTML reassignment after first render
  }
}

define('e-foo', EFoo);
```

Form control, extend `BaseFormControl<T>` instead — implement `serialize(v: T)`
(the string handed to `ElementInternals.setFormValue`) and `parse(s: string)`
(used by reset/state-restore); override `resetValue()`, not
`formResetCallback()`, if you need custom reset behavior. Look at
`packages/epaper-components/src/components/input.ts` for the canonical minimal example before writing
a new one from scratch.

For any global (`document`/`window`) listener — dropdown outside-click,
calendar-grid keyboard nav, popover dismiss — register it with
`onGlobal(this, target, type, fn)` from `core/dom.ts`, and call
`runCleanups(this)` in `disconnectedCallback`. Skipping this leaks a
listener on every re-mount.

Pick the version for `@since` by checking actual tag history
(`git tag --sort=-v:refname | head`) — use the next unreleased version, not
a guess.

## 2. Export — `packages/epaper-components/src/index.ts`

Add the barrel export as a side-effect import so registration happens on
library import. Match the existing import style/ordering in that file
exactly (it's grouped, not alphabetical-by-accident).

## 3. Storybook story — `packages/epaper-components/src/stories/<group>/<Name>.stories.ts`

Pick the group by what the component *is*, not where you'd guess:
`composite/`, `display/`, `inputs/`, `layout/`, `navigation/`,
`primitives/`, `typography/`. Open a sibling story in the same group and
copy its structure — args, argTypes, and the Lit `html` template tag (the
only place Lit appears at runtime, and only in Storybook).

## 4. Styles — `packages/epaper-components/src/styles/components.css`

Find the section for the component's group (the file is organized to
mirror the stories groups) and add the rule block there, not at the end of
the file. Remember the two absolute constraints: no `transition`/
`animation`/`@keyframes`, no `:hover`. Use `:focus-visible`,
`[aria-selected]`, `[aria-checked]`, or `[data-active]` for interactive
states instead.

## 5. Tests — `packages/epaper-components/src/components/__tests__/*.test.ts`

Don't create a new suite file. Add cases to whichever existing suite fits:
`cleanup` (listener/cleanup contract), `form-association` (form controls
only), `reactivity` (attribute → render patching), `security` (`esc()`
coverage — mandatory if the component interpolates any user-controlled
string), `data-display`, or `new-components` (general smoke coverage for
anything not covered by a more specific suite).

## 6. `packages/epaper-components/package.json` exports entry

Add a sub-path entry alphabetically among the existing `exports` entries so
`import '@marcomattes/epaper-components/foo'` resolves. This file (`packages/epaper-components/package.json`) is
otherwise on the "don't touch without asking" list in `AGENTS.md` — this
one addition is the expected exception when adding a component, not a
license to change anything else in it.

## Event detail contract

Default to `{ value: T }` on an `e-change` event unless the component is a
close match for one of the documented exceptions (`e-checkbox`/`e-toggle`
→ `{ checked }`, `e-upload` → `{ files }`, `e-dropdown` → `e-select`/
`{ index }`, `e-button` → `e-click`/`{ originalEvent }`, `e-form` →
`e-submit`/`{ form }`). Don't invent a new shape without a concrete reason
— check `AGENTS.md` first, it's a V1.0 contract other components and
consumers rely on.

## Before handing this off for review

Run `npm run type-check` and `npm run lint:check` locally — both must be
clean (lint is `--max-warnings=0`). Then add a `CHANGELOG.md` entry under
`[Unreleased]`. At that point `.agents/pr-review.md` is the right checklist
to run next, to catch anything this scaffold missed.
