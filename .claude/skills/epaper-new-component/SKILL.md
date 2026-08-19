---
name: epaper-new-component
description: >
  Scaffold a new Custom Element for the EPaper web-component library
  (marcomattes/epaper-components), fully wired per the project's
  conventions — component file, index.ts export, Storybook story, CSS,
  test-suite entry, and package.json exports entry. Use this whenever asked
  to add, create, or scaffold a new component, control, or element in this
  repo (e.g. "add an e-rating component", "create a new form control for
  star ratings"). A component added without this skill is likely to fail
  epaper-pr-review for missing wiring steps — use both together: this skill
  to build it, that one to check it.
---

# EPaper new component

The actual scaffolding walkthrough lives in **`.agents/new-component.md`**
at the repo root, not in this file — read it now and follow it step by
step. It's kept outside `.claude/` on purpose so the same walkthrough is
usable by other coding agents in this repo (GitHub Copilot reads it via
`.github/copilot-instructions.md`), not just Claude Code.

After scaffolding, run `npm run type-check` and `npm run lint:check`
locally, add a `CHANGELOG.md` entry under `[Unreleased]`, then use the
`epaper-pr-review` skill (or read `.agents/pr-review.md` directly) to catch
anything the scaffold missed.

If `.agents/new-component.md` and this file ever disagree,
`.agents/new-component.md` wins — update this stub to match, not the other
way around.
