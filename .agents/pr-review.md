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
   `e-upload` → `{ files }`, `e-dropdown` → `e-select`/`{ index }`,
   `e-button` → `e-click`/`{ originalEvent }`, `e-form` → `e-submit`/
   `{ form }`). A new component inventing a different shape without one of
   these being the actual component is worth a comment.
10. **`useDefineForClassFields` trap** — flag any class field assigned
    before `super()` runs, or any class-field initializer on a property
    that must exist pre-`super()` for a Custom Element.

## Wiring checklist for a new/renamed component

If the diff adds a component (`packages/epaper-components/src/components/<name>.ts`), confirm all of
the following are present in the same PR — a component that only has the
`.ts` file is incomplete, not just under-documented:

- [ ] Exported from `packages/epaper-components/src/index.ts`
- [ ] Storybook story in `packages/epaper-components/src/stories/<group>/<Name>.stories.ts`
- [ ] Styles added to `packages/epaper-components/src/styles/components.css` in the matching section
- [ ] Covered by one of the existing suites in `packages/epaper-components/src/components/__tests__/`
      (don't create a new suite file — extend an existing one)
- [ ] Sub-path entry added to `packages/epaper-components/package.json` `exports`, alphabetically

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
