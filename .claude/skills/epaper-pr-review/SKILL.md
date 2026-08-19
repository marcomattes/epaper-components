---
name: epaper-pr-review
description: >
  Repo-specific code review checklist for the EPaper web-component library
  (marcomattes/epaper-components). Use this whenever reviewing a diff, a
  branch, an open GitHub pull request, or your own changes before pushing in
  this repo — it checks the project's hard rules (esc() escaping, no Shadow
  DOM, no animations/:hover, BaseFormControl contract, onGlobal cleanup,
  surgical DOM patching, required JSDoc, event-detail conventions) that
  generic review misses because they're specific to e-paper displays. Trigger
  this proactively for phrases like "review this PR", "review my changes",
  "check this diff", "is this ready to push", or when about to call
  create_pull_request / pull_request_review_write against this repo — don't
  wait to be asked for a "repo-specific" review by name.
---

# EPaper PR review

The actual checklist lives in **`.agents/pr-review.md`** at the repo root,
not in this file — read it now. It's kept outside `.claude/` on purpose so
the same checklist is usable by other coding agents in this repo (GitHub
Copilot reads it via `.github/copilot-instructions.md`), not just Claude
Code. This file only adds the Claude-Code-specific mechanics for acting on
it.

## Gathering the diff

- Local, uncommitted or unpushed work: `git diff` / `git diff main...HEAD`.
- An open GitHub PR: use `mcp__github__pull_request_read` (methods `get_diff`,
  `get_files`) and `get_file_contents` rather than guessing from the PR
  description — read full files around each hunk, not just patch context.

## Reporting findings

- For a local/self-review, report findings inline as text, most-severe
  first.
- For an actual GitHub PR, use `pull_request_review_write` (method
  `create`) + `add_comment_to_pending_review` for line-anchored comments,
  then `submit_pending`. Per this repo's PR-driving rules: only push fixes
  for small/local asks yourself; larger design-level findings go in the
  review as a comment, not as an unrequested refactor.
- Don't invent violations against rules that don't apply to the diff.

If `.agents/pr-review.md` and this file ever disagree, `.agents/pr-review.md`
wins — update this stub to match, not the other way around.
