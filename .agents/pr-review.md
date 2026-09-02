# PR review checklist — EPaper web-component library

This repo trades general web-dev conventions for a stricter set tuned to
e-paper displays (slow full-refresh waveforms, no animation, light DOM
only). A review that only checks "does it work" will pass changes that
violate those constraints. Read `AGENTS.md` at the repo root first — it is
the canonical source for every rule below and may have grown new ones since
this file was written.

This checklist is tool-agnostic: it's meant to be read by any coding agent
(Claude Code, GitHub Copilot, Codex, Cursor, a human) reviewing a diff or PR
in this repo, not just one specific tool.

## How to gather the diff

- Local, uncommitted or unpushed work: `git diff` / `git diff main...HEAD`.
- An open GitHub PR: fetch the actual diff and file contents (via the
  GitHub API, `gh pr diff`, or whatever PR-reading tool is available)
  rather than guessing from the PR description.
- Read full files around each hunk, not just the patch context — several of
  the checks below (missing cleanup call, missing JSDoc block) are easy to
  miss from a 3-line diff.

## Hard-rule checklist (from `AGENTS.md`)

Walk every changed `.ts` file in `packages/epaper-components/src/components/` against these. Cite
`file:line` for anything that fails.

1. **XSS via `esc()`** — every interpolated value written into `innerHTML`
   must go through `esc()` (or the `html` tagged template in `core/dom.ts`,
   which escapes automatically). Flag any `${...}` inside an `innerHTML`
   string literal that isn't wrapped in `esc()`, and any raw string
   concatenation building markup from attribute/property values.
2. **No `attachShadow`** — grep the diff for `attachShadow`. Any hit is an
   automatic fail; this library is light-DOM only.
3. **No animation** — reject any `transition`, `animation`, `@keyframes`,
   or CSS transition shorthand added to `packages/epaper-components/src/styles/*.css` or inline
   styles. `base.css` resets these globally; a new rule that reintroduces
   them breaks the e-paper guarantee even if it "looks smoother".
4. **No `:hover`** — reject new `:hover` selectors in CSS. The correct
   substitutes are `:focus-visible`, `[aria-selected]`, `[aria-checked]`,
   `[data-active]`.
5. **Form controls extend `BaseFormControl<T>`** — any new form-participant
   component must extend it and implement `serialize(v: T)` and
   `parse(s: string)`, not hand-roll `ElementInternals` wiring. Check that
   value resets go through the `resetValue()` hook rather than overriding
   `formResetCallback()` directly (see `packages/epaper-components/src/core/base-form-control.ts`).
6. **Global listeners use `onGlobal`/cleanup** — any `document.addEventListener`
   or `window.addEventListener` outside `core/dom.ts` itself is a leak risk.
   It must go through `onGlobal(this, target, type, fn)`, and
   `disconnectedCallback` must call `runCleanups(this)`. An anonymous
   `document.addEventListener` with no matching teardown is a bug, not a
   style nit — flag it as a correctness finding, not a suggestion.
7. **Surgical updates only** — after first render, updates must use
   `patchText` / `patchAttr` / `patchBoolAttr` / `patchClassModifier`
   (`core/dom.ts`), not `this.innerHTML = ...` reassignment. Re-check
   `attributeChangedCallback` and any reactive update path specifically;
   a full re-render there forces an unnecessary full EPDC waveform.
8. **JSDoc completeness** — every exported component class needs
   `@summary`, `@since`, `@attr` (one per observed attribute), `@fires`
   (one per dispatched event), `@slot`, `@example`. For `@since`, check
   `git tag` history rather than guessing — a new component should use the
   next unreleased version, not a version that's already shipped.
9. **Event detail shape** — new custom events should use `{ value: T }`
   and be named `e-change`, unless the component is one of the documented
   exceptions in `AGENTS.md` (`e-checkbox`/`e-toggle` → `{ checked }`,
   `e-upload` → `{ files }`, `e-meter` → `{ value, band }`, `e-dropdown` →
   `e-select`/`{ index }`, `e-float-button` → `e-select`/`{ index, value }`,
   `e-table` → `e-select`/`{ value: number[] }`, `e-button` → `e-click`/
   `{ originalEvent }`, `e-back-top` → `e-click`/`{ value: number }`,
   `e-form` → `e-submit`/`{ form }` and `e-invalid`/`{ controls, form }`,
   `e-calendar` → `e-month-change`/`{ year, month }`). A new component
   inventing a different shape without one of these being the actual
   component is worth a comment.
10. **`useDefineForClassFields` trap** — flag any class field assigned
    before `super()` runs, or any class-field initializer on a property
    that must exist pre-`super()` for a Custom Element.

11. **Child-driven components stay reactive** — if a component reads entries
    from child data carriers, it must register `observeItems()` from
    `core/dom.ts` instead of reading them once in `connectedCallback`, and
    must pass `isOutput` so the observer ignores its own rendered subtree.
    A `querySelectorAll` over child carriers that only ever runs at connect
    time is the bug this rule exists for: the component silently ignores
    every later edit. Check the sync path is surgical, not a
    `replaceChildren`.

12. **No hard-coded locale output** — reject `toFixed()` on a value that is
    rendered, a hand-rolled relative-time string, hard-coded weekday or
    month names, and English label literals in rendered markup. These go
    through `core/format.ts` (`formatNumber`, `formatDate`,
    `formatRelativeTime`, `weekdayLabels`, `monthLabel`) and `core/i18n.ts`
    (`t`, `label`). Also check that the English default did not shift: the
    deep suites pin it, and a changed default is a breaking change for
    every existing page.

13. **A state a user must perceive has a non-colour cue** — a new
    `aria-invalid`, `aria-disabled` or status treatment needs a rule that
    changes border, fill or symbol, not just a colour. On a greyscale panel
    a colour-only state is invisible, which is how the composite controls
    ended up reporting `aria-invalid` that nothing rendered. Check that the
    anchor the component actually marks is the one the CSS targets.

14. **Nothing touches a DOM global at module scope** — a component class must
    read `extends EpaperElement` (from `core/dom.ts`), never
    `extends HTMLElement`, and no top-level statement may reference
    `document`, `window`, `customElements` or `navigator`. All of those are
    evaluated the moment the module loads, and a server render (Next.js,
    Nuxt, Astro) has none of them — one slip throws `ReferenceError` for the
    barrel and every subpath alike, including from a `'use client'` file,
    because those still run through the framework's SSR pass. ESLint catches
    the `extends` case; the rest is a read of the diff's top level.
    `HTMLElement` as a type annotation or generic constraint is fine.

## Wiring checklist for a new/renamed component

If the diff adds a component (`packages/epaper-components/src/components/<name>/<name>.ts`), confirm all of
the following are present in the same PR — a component that only has the
`.ts` file is incomplete, not just under-documented:

- [ ] Exported from `packages/epaper-components/src/index.ts`
- [ ] Storybook story in `packages/epaper-components/src/stories/<group>/<Name>.stories.ts`
- [ ] Styles added to `packages/epaper-components/src/styles/components.css` in the matching section
- [ ] Covered by one of the existing suites in `packages/epaper-components/src/components/__tests__/`
      (don't create a new suite file — extend an existing one)
- [ ] Sub-path entry added to `packages/epaper-components/package.json` `exports`, alphabetically
- [ ] A visual baseline exists for the new story. `screenshots.test.ts`
      compares every story against a committed PNG, so a new one without a
      baseline fails CI. It has to come from the **Update visual baselines**
      workflow — a baseline rendered on any other Chromium build is off by a
      few pixels. A hand-generated PNG in the diff is a finding, not a nit.

See `.agents/new-component.md` for the full scaffolding walkthrough.

## Files that should not change without the author explicitly calling it out

`packages/epaper-components/package.json` `version`/`exports`, anything under `packages/epaper-components/dist/`,
`.github/workflows/release.yml`, and
`packages/epaper-components/custom-elements-manifest.config.mjs`. A diff touching any of these
deserves a direct question to the author, not a silent pass — see
`AGENTS.md` § "Files NOT to touch without asking" for why each one is
sensitive.

## Process / CI checklist

- `CHANGELOG.md` has a new entry under `[Unreleased]` for any user-visible
  change, in Keep a Changelog format.
- The PR body satisfies `.github/pull_request_template.md` (scoped diff,
  demo/story/docs updated, `npm run format:check` / `type-check` / `build`
  all pass — don't take the checkboxes on faith, actually run them locally
  or check the CI run if you can).
- `npm run lint:check` is `--max-warnings=0` — a new `eslint-disable`
  without a comment explaining why is a finding, not nitpicking.

## Reporting findings

- For a local/self-review, report findings inline, most-severe first
  (correctness/leak/security issues before style).
- For an actual GitHub PR, post a proper review (grouped, line-anchored
  comments where the tooling supports it) rather than one large comment.
  Only push fixes for small/local asks yourself — larger design-level
  findings belong in the review as a comment for the author to decide, not
  an unrequested refactor.
- Don't invent violations. If a rule doesn't apply to the diff (e.g. no
  form controls touched), skip it silently rather than padding the report.
