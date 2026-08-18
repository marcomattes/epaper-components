# Roadmap — v1.2

Status: proposal. Written against `main` at v1.1.0.

This document plans **one** release. It is deliberately narrow: a single
leading theme, two pull requests, no new custom elements, no breaking
changes. Everything considered and _not_ taken is listed under
[Deferred](#deferred-to-v13) with the reason, so the next planning round
starts from a record rather than from memory.

---

## Theme: refresh becomes a runtime concern

### The gap

V1.0 and V1.1 made component _internals_ refresh-friendly: `patchText`,
`patchAttr`, `patchBoolAttr` and `patchClassModifier` mutate only what
changed, and the refresh-budget suite enforces that no component replaces
its own subtree.

What does not exist yet is the layer above the individual component:

- **Nothing coordinates updates across components.** Every
  `attributeChangedCallback` (69 of them) patches synchronously and
  independently. A host that sets three attributes on one element, or one
  attribute on five elements, produces that many separate write bursts.
  On a panel that repaints per animation frame, those are separate partial
  refreshes over separate dirty rectangles.
- **Nothing tracks ghosting.** `README.md` explains DU/A2 versus GC16 at
  length, but no runtime value anywhere in the library counts partial
  updates or expresses when a full refresh is due.
- **Consumers cannot measure their own pages.** The measurement model that
  makes this library's claims testable — mutation count, element churn,
  root replacements, retained-node ratio, dirty-area ratio — exists only as
  a private helper inside `src/components/__tests__/refresh-budget.test.ts`.
  An application built on EPaper has no way to hold _its_ screens to the
  same budgets.

The first two are why the third matters: without a public measurement
model, a refresh API is unfalsifiable.

### Why this theme and not another

It is the only candidate on the list that no other component library can
copy without adopting the whole e-paper premise. Slider, Drawer and Tooltip
are catch-up work. `noUncheckedIndexedAccess` is hygiene. A refresh runtime
is the thing the library is _for_.

---

## Lane A — `src/core/refresh.ts` (PR 1)

New core module, exported as the `./core/refresh` subpath alongside the
existing `./core/dom`, `./core/icons` and `./core/base-form-control`.

### A1 · Coalescing scheduler

```ts
export function scheduleUpdate(host: object, key: string, fn: () => void): void;
export function batch<T>(fn: () => T): T;
export function flushUpdates(): void;
```

**Sync by default, coalescing on request.** Outside a batch,
`scheduleUpdate` invokes `fn` synchronously — identical timing to today,
for every existing caller and every existing test. Inside `batch()`, calls
dedupe per `(host, key)` and flush once when the outermost batch returns.

```js
batch(() => {
  board.setAttribute('data', next);
  marker.setAttribute('value', '12');
  updated.setAttribute('now', stamp);
}); // one write pass, one dirty rectangle
```

This is the whole design constraint of the module. An async default would
change the timing of 69 `attributeChangedCallback` implementations at once
and break a large part of the reactivity suite for no benefit to anyone not
batching.

### A2 · Ghosting and full-refresh accounting

```ts
export function markRefresh(area?: number): void;
export function refreshStats(): { partials: number; accumulatedArea: number; sinceFull: number };
export function configureRefresh(o: { partialsBeforeFull?: number; areaBeforeFull?: number }): void;
export function requestFullRefresh(reason?: string): void;
// window event: 'e-full-refresh', detail: { reason, stats }
```

**What this cannot do, stated plainly in the docs:** the library cannot
command an EPDC waveform. No web API exposes one. What it _can_ do is count
partial updates, apply a configurable policy, and emit `e-full-refresh` so
the host — firmware wrapper, kiosk shell, Kindle/Onyx bridge — triggers
whatever full-repaint mechanism it actually has.

This release deliberately ships **no** DOM trick that "usually" forces a
full repaint. Those are device-specific, and CI cannot prove a panel
flashed. Counting and signalling are verifiable; commanding is not.

### A3 · `./testing` subpath — the measurement model, promoted

Move `measureRefresh()` out of the test file into a shipped subpath so
consumers can budget their own screens.

Two defects to fix _before_ it becomes public API. Both are tolerable in a
private helper and not tolerable in a documented one:

1. **`dirtyAreaRatio` unions all dirty elements into a single bounding
   box.** Two small updates at opposite corners of a status board report a
   ratio near 1.0 — indistinguishable from a full repaint. Replace with the
   summed area of merged rectangles.
2. **`retainedNodeRatio` only measures elements present before the
   action.** A component that adds fifty nodes and removes none still
   scores a perfect 1.0. Surface `addedElements` as its own term; the value
   is already computed inside `elementChurn` and simply not reported.

`./testing` must not be reachable from `dist/index.js`. See
[Risks](#risks).

### A4 · Budget coverage

11 of 70 components carry a refresh budget today. Rewrite the scenario list
as a table so adding one costs a row, and raise coverage to roughly 25,
prioritising the components a dashboard updates on a timer: `statistic`,
`badge-count`, `tag`, `progress` variants, `list`, `timeline`, `steps`,
`skeleton`, `avatar`, `alert`, `calendar`, `tree`, `pagination`,
`description-list`.

---

## Lane B — Adoption, aliases, doc corrections (PR 2)

### B1 · Adopt `batch()`

`batch()` is primarily **host-facing**: the win is in application code that
updates several elements per tick. Internal adoption is limited to the
components that already perform multi-region updates in one pass —
`e-tabs` (activation touches two subtrees, budgeted at 10 mutations),
`e-select`, `e-table`, `e-form`.

### B2 · Event-detail aliases — deprecations staged for 2.0

Add a `value` key alongside the legacy key, keep the legacy key, mark it
`@deprecated — removed in 2.0`:

| Element                   | Today         | v1.2                          |
| ------------------------- | ------------- | ----------------------------- |
| `e-checkbox`, `e-toggle`  | `{ checked }` | `{ checked, value: checked }` |
| `e-upload`                | `{ files }`   | `{ files, value: files }`     |
| `e-dropdown` (`e-select`) | `{ index }`   | `{ index, value }`            |

`e-button`'s `{ originalEvent }` and `e-form`'s `{ form }` carry no value
and get no alias — aliasing them would invent a meaning rather than
normalise one.

### B3 · Correct two stale "known limitation" entries

Both `CHANGELOG.md` and `OVERVIEW.md` §7 currently mislead:

- **`<e-masonry>` "does not observe child mutations or container resizes;
  pages embedding it must trigger reflow manually."** This is false.
  `masonry.ts` sets `column-count` and `column-gap` and nothing else; the
  layout is CSS columns with `break-inside: avoid`, and the browser
  reflows on child insertion with no JavaScript involved. The component's
  own JSDoc already says so ("without observers or JavaScript layout
  reads"). Delete the entry — there is no code to fix.
- **"Keyboard navigation in compound pickers — implemented in V1.0."** An
  entry in a limitations list that says it is not a limitation. Delete.

### B4 · Documentation

- `README.md`: new "Refresh control" section, between "E-paper data
  display" and "TypeScript and IDE integration".
- `OVERVIEW.md` §7: rewritten against the actual v1.2 state.
- `CHANGELOG.md`: under `[Unreleased]`.
- `CONTRIBUTING.md` / `CLAUDE.md`: one rule added — new components with a
  timer-driven or host-driven update path get a refresh budget.

---

## Deferred to v1.3

Considered, deliberately not in this release.

1. **`noUncheckedIndexedAccess`** — roughly 90 latent index accesses across
   pickers, calendar and story helpers. A repo-wide `tsconfig` flip is its
   own theme with zero overlap with refresh; folding it in turns a two-PR
   release into a six-PR one.
2. **Validation-API unification** — `<e-upload>` calls
   `internals.setValidity()`; `<e-input>` and `<e-textarea>` only carry a
   visual `error` attribute. This is a forms theme. It is also potentially
   behaviour-changing for anyone relying on the current permissive submit,
   which makes it a poor passenger on someone else's release.
3. **Per-component test coverage** — partly served by A4. The remainder,
   particularly display-only components, is its own effort.
4. **Central i18n/locale module** — `calendar` and `date-picker` resolve
   locale as `this.lang || document.documentElement.lang || undefined`,
   while `last-updated` reads a `locale` attribute defaulting to `'en'`.
   Three components, two contracts, and a German page silently rendering
   English relative timestamps. A real bug surface, and a real v1.3 theme.
5. **New components** — Slider, Drawer, Tooltip, Rate, Combobox, Barcode,
   Gauge, page-turn view. Breadth is not this release's problem.

---

## Risks

1. **Sync-by-default is load-bearing.** If `scheduleUpdate` ever acquires
   an async default, the timing of every `attributeChangedCallback`
   changes at once. Guard it with an explicit test asserting synchronous
   application outside `batch()`, not just with a convention.
2. **Barrel size.** The budget is 40 KB. `core/refresh.ts` must stay
   tree-shakeable, and `./testing` must be unreachable from
   `dist/index.js` — otherwise measurement code ships to every consumer
   who imports the barrel. Add a `size-limit` entry for both.
3. **`e-full-refresh` is a contract CI cannot fully verify.** Counters,
   thresholds and event emission are testable. Whether a panel actually
   flashed is not. Document it as a host-integration API and resist
   wording that implies hardware control.
4. **Public measurement invites bug reports about the measurement.**
   Promoting `measureRefresh()` means its approximations become a support
   surface. A3's two fixes are the minimum entry price.

---

## Sequence

| PR  | Contents       | Gate                                                     |
| --- | -------------- | -------------------------------------------------------- |
| 1   | A1, A2, A3, A4 | `type-check`, `lint:check`, `test:ci`, `size`            |
| 2   | B1, B2, B3, B4 | as above, plus `validate:sample-app` for the new subpath |

Release as **1.2.0**: additive only, no removals, deprecations documented
but not enforced.

---

## Open questions

1. **`<e-kaleido>`** — keep as-is (the standing decision), or mark it
   deprecated for 2.0 now that a deprecation lane exists in this release?
2. **Refresh policy scope** — global via `configureRefresh()` only, or also
   per-element via a `data-refresh-policy` attribute? Global is smaller and
   matches how a panel actually behaves; per-element is more flexible and
   more code.
3. **`./testing` subpath** — ship it, or keep the measurement model
   internal and only grow the in-repo budget suite? Shipping it is the
   stronger claim and the larger commitment.
