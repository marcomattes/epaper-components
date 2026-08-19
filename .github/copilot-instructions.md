# Copilot instructions

@AGENTS.md

## Reviewing a pull request or diff in this repo

Read `.agents/pr-review.md` before reviewing any change here — it has this
repo's e-paper-specific hard rules (no Shadow DOM, no animation/`:hover`,
`esc()` escaping, `BaseFormControl` contract, listener cleanup, surgical DOM
patching) and the component wiring checklist that generic review misses.

## Adding a new component

Read `.agents/new-component.md` before scaffolding a new Custom Element —
it lists every wiring step a component needs beyond the `.ts` file itself
(barrel export, Storybook story, CSS, test-suite entry, `package.json`
`exports`).
