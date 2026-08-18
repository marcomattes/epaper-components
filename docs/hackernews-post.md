# Hacker News submission draft

Working draft for a Show HN submission. Not shipped (`package.json` `files`
does not include `docs/`).

---

## Submission

**Title**

```
Show HN: EPaper – Web components for electrophoretic displays
```

**URL**

```
https://github.com/marcomattes/epaper-components
```

Submit the repository, not `epaper-components.dev`. A landing page with
badge rows reads as a product launch; a README that opens with hardware
constraints reads as engineering. The site belongs in the first comment.

---

## First comment (post immediately after submitting)

I build UIs for electrophoretic panels — e-readers, shelf labels, kiosk
displays — and kept re-deriving the same rules on every project, so I put them
in a library.

The constraint everything follows from: the display controller drives pixels
through a multi-step waveform over a dirty rectangle instead of refreshing a
matrix at a fixed frame rate. A full-panel refresh is roughly 200–800 ms and
visibly flashes. A partial refresh of a small region is roughly 30–80 ms.
Intermediate pixel states persist as ghosting until something later clears
them. So a technique that costs nothing on an emissive display can cost a
visible flash here.

What that turned into:

- **No transitions or animations at all.** The base reset disables both inside
  `.ink-page`, and the source tree has no `@keyframes`. Intermediate states
  ghost for several refresh cycles.
- **No `:hover` rule anywhere.** Capacitive layers on these panels report
  contact, not proximity, so there is no hover state to bind to.
- **No opacity or mid-grey for state changes.** Partial tones dither
  inconsistently between refreshes, so the same disabled control can render
  differently after a redraw. Disabled is a diagonal hatch fill, selected
  inverts foreground and background, focus is a 3px outline. All of it
  survives 1-bit rendering.
- **Surgical DOM updates after the first render.** Components render once in
  `connectedCallback`, then mutate through `patchText` / `patchAttr` /
  `patchBoolAttr` helpers that compare and early-return when nothing changed.
  Replacing a subtree marks a large rect dirty and usually forces the full
  refresh. The useful side effect: when a reactive framework re-asserts an
  attribute it already set, the panel does not redraw.
- **A test suite for that.** `refresh-budget.test.ts` mounts a component, runs
  one interaction, and asserts mutation count, element churn and dirty-area
  ratio against a per-scenario budget. A regression fails CI instead of
  showing up as a flash on the device three weeks later.
- **Light DOM only, no shadow roots.** Thirteen controls are form-associated
  custom elements wired through `ElementInternals`, so a plain `<form>` gets
  `FormData`, `reset()` and constraint validation with no glue JavaScript —
  which matters for kiosks that ship no framework. E-paper devices also tend
  to run stripped or old browser builds where Shadow DOM support is patchy.

Vanilla custom elements, zero runtime dependencies, 95 registered elements
across 70 modules, 36 KB brotli for the whole barrel and 909 B for a single
button, MIT.

The limit worth stating up front: refresh budgets are measured in a browser
(Vitest with Playwright), and no browser DOM API can observe what the display
controller actually decides to do. The dirty-area numbers are a proxy for panel
behaviour, not a measurement of it. Ghosting and waveform selection still need
checking on real hardware. If you have a panel and something behaves badly on
it, that is the feedback I want most.

Site and Storybook: https://epaper-components.dev/

---

## Optional paragraph — LLM disclosure

Include this if you want to preempt the accusation rather than answer it in
the thread. Tradeoff: it is honest and defuses a "this is AI slop" flag, but
it also hands a certain kind of commenter their opening. My read is that
disclosing is the better bet, because the repo's commit history makes it
discoverable anyway and being caught not saying it is much worse than saying
it.

> Disclosure, since the commit history makes it obvious: a lot of this was
> written with an LLM in the loop against a spec I wrote and reviewed. The
> hardware constraints, the budgets and the API decisions are mine. Ask me
> about any specific line and I will tell you why it is there.

---

## Why the previous submissions were probably flagged

Ranked by how likely each one is to be the actual cause.

1. **The post read as a launch, not as a thing to look at.** Badge walls,
   feature counts and "introducing" framing are the fastest flag on HN. The
   fix is the whole shape above: lead with the hardware constraint, let the
   feature list be a consequence of it.
2. **Same URL, resubmitted.** HN's software downweights repeat submissions of
   a link, and manual reposts of a link that already got flagged attract more
   flags. Do not resubmit by hand a fourth time — see the next section.
3. **No author comment, or a comment posted an hour late.** A Show HN with no
   context from its author gets read as a drive-by promo. The comment needs to
   be up within a minute or two of the submission, while the post is still on
   /newest.
4. **Superlatives in the title.** Anything like "blazing fast", "the first",
   "modern", "ultimate", version numbers, or an emoji. The title should be
   boring enough that it could have been written by someone who does not
   care whether you succeed.
5. **A cold account.** An account whose entire history is submissions of its
   own project gets treated as a promo account, and can end up rate-limited or
   showdead without any single post being the problem. Comment substantively
   on other people's threads for a while before submitting again.
6. **Suspected AI-generated content.** The current HN mood flags this hard,
   and a very polished README plus an agent-authored commit log is exactly the
   pattern people look for. Handled by the disclosure paragraph above.

## What to actually do next

1. **Check whether your posts are dead or just buried.** Turn on `showdead`
   in your HN profile and look at your submissions. Dead means flagged or
   auto-killed; merely low-ranked means nobody saw it.
2. **Email hn@ycombinator.com.** One short, unentitled message: your username,
   links to the submissions, and the question of whether the account is
   affected by a filter. Ask if they would be willing to re-up a submission.
   The moderators do this routinely for legitimate Show HNs that got buried,
   and it is the single highest-leverage step available. Do not argue about
   the flags — ask what to fix.
3. **Wait for their answer before resubmitting.** If the account is filtered,
   another submission just confirms the pattern.
4. **Then post Tuesday–Thursday, around 08:00–10:00 US Eastern**, which is
   when /newest is watched most and a post has the longest runway.
5. **Do not ask anyone to upvote.** Voting rings are detected reliably and
   turn a buried post into a banned account.
6. **Stay in the thread for the first few hours.** Answer the hardware
   questions concretely, concede the things the library genuinely does not do,
   and do not argue with the first dismissive comment. Answered criticism is
   what keeps a Show HN alive.

## Read before submitting

- Show HN rules: https://news.ycombinator.com/showhn.html
- Guidelines: https://news.ycombinator.com/newsguidelines.html
