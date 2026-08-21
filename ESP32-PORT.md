# Native ESP32 Port — Plan

Working plan for reimplementing EPaper as firmware that drives an
electrophoretic panel directly from an ESP32, with no browser in the loop.

This document is a plan, not a specification of shipped behaviour. Nothing
in it is implemented yet. It is written in English to match the other root
documents (`OVERVIEW.md`, `THEMING.md`, `BROWSERSTACK.md`).

## 1. Premises

Four decisions were taken up front; everything below follows from them.

| Decision        | Choice                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| Target hardware | ESP32-S3 with PSRAM, large parallel panel (epdiy-class board)             |
| Strategy        | LVGL v9 as the layout/render/input foundation, EPaper API on top          |
| First scope     | Tiered core set, ~20 components                                           |
| Input           | Pluggable: capacitive touch, buttons/rotary encoder, **and** display-only |

The third input answer matters most. Because display-only is a supported
mode, input cannot be a hard dependency of the component layer — a
component must render correctly with no `lv_indev` registered at all. That
pushes input behind an interface from day one rather than as a later
retrofit.

## 2. What actually ports

The web library is three things stacked together. They port very
differently, and being honest about that is the difference between a
4-month project and an open-ended one.

**The design system ports almost perfectly.** `tokens.css` is a flat
`:root` block: 12 type sizes, 3 line heights, 4 tracking values, a
deliberately narrow colour set, 4 border widths, an 8-step 4px spacing
scale, 3 control heights. All of it is data, all of it can be generated
into a C header. This is the most valuable part of the library and the
cheapest to move.

**The refresh discipline ports conceptually, and gets better.** The
`patchText` / `patchAttr` / `patchBoolAttr` / `patchClassModifier` helpers
exist to keep the dirty rectangle small so the EPDC can pick a fast
waveform. In the browser that is an _indirect_ plea to a controller the
library cannot address. On the ESP32 the library **is** the controller: it
sees every invalidated rectangle and chooses the waveform itself. The
intent survives; the mechanism is replaced by something strictly more
capable. `refresh-budget.test.ts`'s budget concept (mutation count, element
churn, dirty-area ratio) becomes a firmware-level metric that can be
asserted in tests and read at runtime.

**The CSS does not port.** `components.css` is 3276 lines and is the single
largest risk in this project. It cannot be translated mechanically. It has
to be re-expressed as LVGL styles, component by component, by hand. The
good news is that the layout primitives line up: 52 `display: flex` rules
and 14 `display: grid` rules map onto `lv_obj_set_flex_flow` and
`lv_obj_set_grid_dsc_array` nearly 1:1, and the library uses no
`@media` queries at all. The bad news is that pseudo-elements (8 `::before`,
4 `::after`), 25 `transform` uses, and 3 `writing-mode` uses have no direct
LVGL equivalent and need per-case decisions — usually an extra child object
or a pre-rasterised asset.

Three of the hard rules translate cleanly and one needs restating:

- _No animations, no transitions_ — trivially satisfied, and enforced by
  config: a custom LVGL theme with no transitions, every style write with
  `LV_ANIM_OFF`, and `LV_DEF_REFR_PERIOD` raised far above LVGL's 30 ms
  default, which is meaningless on a panel with a 30–800 ms refresh.
- _No `:hover`_ — LVGL has no hover state for touch. `LV_STATE_FOCUSED`,
  `LV_STATE_CHECKED`, `LV_STATE_PRESSED` and `LV_STATE_DISABLED` cover
  exactly the cases the CSS already uses (`:focus-visible`,
  `[aria-checked]`, `[aria-selected]`, `[data-active]`).
- _Surgical updates only_ — becomes the setter contract in §4.2.
- _Use `esc()`_ has no embedded analogue: there is no HTML to inject into.
  The underlying concern — untrusted strings reaching the renderer — turns
  into buffer safety: bounded copies, no `sprintf` into fixed buffers, and
  UTF-8 validation before glyph lookup. Different failure mode, same
  discipline, and it should be written into the firmware's own review
  checklist rather than dropped.

## 3. Architecture

```
┌────────────────────────────────────────────────────────────┐
│ Application (examples: dashboard, form, reader)            │
├────────────────────────────────────────────────────────────┤
│ Component layer      ep_button, ep_input, ep_table …       │
│                      mirrors the e-* attribute/event API   │
├──────────────────────────────┬─────────────────────────────┤
│ ep_form_control              │ Generated assets            │
│ (serialize/parse/validity)   │ ep_tokens.h, fonts, icons   │
├──────────────────────────────┴─────────────────────────────┤
│ Style layer — tokens → lv_style_t, EPaper LVGL theme       │
├────────────────────────────────────────────────────────────┤
│ LVGL v9   layout (flex/grid) · text · invalidation · focus │
├──────────────────────────────┬─────────────────────────────┤
│ Refresh manager              │ Input HAL                   │
│ dirty rects → waveform mode  │ touch / encoder / none      │
├──────────────────────────────┴─────────────────────────────┤
│ Panel HAL — epdiy, SPI drivers                             │
└────────────────────────────────────────────────────────────┘
```

### 3.1 Refresh manager

The heart of the port, and the piece with no upstream equivalent to borrow.
LVGL's `flush_cb` hands over an `lv_area_t` per flush; that rectangle is the
input to a waveform decision:

- small rectangle, text-only content, monochrome → **A2** or **DU** (fast,
  accumulates ghosting)
- large rectangle, or content with grey levels → **GC16**
- after _N_ consecutive partial refreshes (default 12, configurable) →
  forced **GC16** full flash to clear accumulated ghosting
- idle for _T_ seconds with no pending work → opportunistic full clear

The manager also coalesces: several setter calls inside one application
"commit" produce one flush, not one per property. It exposes counters
(partial vs. full refreshes, cumulative dirty-area ratio, mutations per
commit) that host tests assert against, the same way `refresh-budget.test.ts`
asserts today.

Exact epdiy mode constants and update entry points must be confirmed
against the pinned epdiy version — treat the mode names above as the
policy, not as the API.

### 3.2 Input HAL

One interface, three implementations, selected by Kconfig:

- **touch** — GT911 / FT5x06 behind `LV_INDEV_TYPE_POINTER`
- **encoder/buttons** — `LV_INDEV_TYPE_ENCODER` driving LVGL's focus group.
  This is the mode the library's design is already best suited to: it never
  relied on hover, and every interactive state it draws is a focus,
  checked, or active state.
- **none** — no `lv_indev` registered. Interactive components still render
  and can be driven programmatically; they simply never receive input.

Components must not call into input directly. Anything focus-related goes
through LVGL's group API so the encoder mode works for free.

### 3.3 Fonts

There are no system fonts on an ESP32, so `ui-sans-serif` and friends have
to become concrete typefaces. Pick OFL-licensed faces (MIT project, no
licence friction) and generate LVGL bitmap fonts with `lv_font_conv` at
**1 bpp** — no anti-aliasing, which matches what the README already says
about panels having no sub-pixel AA.

The type scale needs 12 distinct sizes (11, 12, 13, 14, 15, 16, 17, 18, 20,
24, 32, 44 px). Generating all three families at all 12 sizes is wasteful, so:

| Family | Sizes                                     | Rough flash |
| ------ | ----------------------------------------- | ----------- |
| Sans   | all 12                                    | ~160 KB     |
| Serif  | 17, 18, 24, 32, 44 (prose + display only) | ~120 KB     |
| Mono   | 13, 14, 16                                | ~35 KB      |

≈ 300 KB of flash for a Latin-1 subset (~200 glyphs). Comfortable on 8/16 MB
flash. Exact figures depend on the chosen typeface and subset and must be
measured, not assumed. Applications needing more coverage (Cyrillic, Greek)
regenerate with a wider subset.

### 3.4 Icons

`core/icons.ts` is 24×24 stroke-2 SVG path data. Some paths use elliptical
arcs (`search`, `heart`, `star`), so an on-device path interpreter would
need a full arc implementation for no benefit. Rasterise at build time with
a real SVG renderer at the sizes actually used, and emit LVGL image
descriptors. Crisper on a 1 bpp panel and no runtime cost.

## 4. Keeping the two implementations honest

### 4.1 One source of truth, exported

Add one script to this repo — `packages/epaper-components/scripts/gen-design-spec.mjs`
— that emits a `design-spec.json` containing:

- every token from `tokens.css` (parse the `:root` block)
- every component, attribute, event and slot from the Custom Elements
  Manifest (359 `@attr` and 45 `@fires` entries across the library today)
- the `ICONS` path map

Ship it in the package `files` array. The firmware repo pins a version of
the npm package and generates `ep_tokens.h`, the icon assets, and an **API
conformance report** from it. That report — implemented / missing / extra
attributes and events per component — becomes a CI gate on the firmware
side, so the C API cannot silently drift from the web API.

This is the mechanism that makes the port maintainable. Without it, the two
implementations diverge within two releases.

### 4.2 The setter contract

Every `ep_*_set_*` function compares before it writes and returns early when
the value is unchanged, invalidating only the sub-area it actually touched.
This is `patchText` / `patchAttr` as a C convention, and it is what keeps the
refresh manager's dirty rectangles small. It belongs in the firmware
contributing guide as a hard rule, with tests that assert zero invalidation
for a no-op set.

### 4.3 Testing

| Layer          | How                                                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logic          | Host build (ESP-IDF `linux` target or plain CMake + Unity). Attribute parsing, serialize/parse round-trips, validity state machine, refresh policy transitions. Transcribed from the existing Vitest suites, which already encode the intended behaviour. |
| Visual parity  | Render the same component in headless Chromium at exact panel pixel dimensions, threshold to 1 bpp → reference PNG. Render the C equivalent in the LVGL Linux simulator → candidate PNG. Pixel-diff with a tolerance budget.                              |
| Refresh budget | Assert partial/full ratio and dirty-area ratio per scenario, mirroring `refresh-budget.test.ts`.                                                                                                                                                          |
| Size           | Flash and RAM per component against a budget file, the analogue of the `size-limit` entries here.                                                                                                                                                         |
| Hardware       | Waveform timing and ghosting behaviour on real glass. Manual or a self-hosted runner; not gateable in hosted CI.                                                                                                                                          |

Pixel-perfect parity is explicitly **not** the goal — different text
rasterisers will never agree glyph for glyph. Propose ≤2% differing pixels
with no structural offset greater than 2px, then tune once real numbers
exist.

## 5. Budgets

For an 800×480 panel on ESP32-S3 with 8 MB PSRAM:

| Item                                  | Size    | Where         |
| ------------------------------------- | ------- | ------------- |
| Framebuffer, 4 bpp                    | ~187 KB | PSRAM         |
| Previous-frame buffer (diffing)       | ~187 KB | PSRAM         |
| LVGL draw buffer, partial ~1/8 screen | ~47 KB  | internal DRAM |
| Component tree, ~300 objects          | ~60 KB  | either        |
| Fonts + icons                         | ~300 KB | flash         |

Roughly 450 KB PSRAM and 100 KB DRAM — comfortable against 8 MB / 512 KB.
The same code on a classic ESP32 with a small SPI panel at 1 bpp
(296×128 = 4.6 KB) is arithmetically fine, which is worth preserving as a
constraint even though it is not the primary target.

## 6. Component tiers

**Tier 1 — first scope (20).** button, text, title, card, list, divider,
badge, tag, icon, progress, meter, statistic, input, checkbox, toggle,
select, alert, table, layout, grid.

Combined API surface: 105 attributes and 10 events. `input` alone
carries 23 attributes and is the single largest Tier-1 item.

**Tier 2 — dashboard-native, strong candidates for promotion (25).**
sparkline, status-board, change-marker, last-updated, qrcode, badge-count,
chip, empty, result, skeleton, timeline, steps, description-list,
breadcrumb, segmented, space, flex, radio-group, checkbox-group,
input-number, textarea, link, ribbon, card-image, avatar.

`card-image` looks image-dependent but is not — its `cover` attribute takes
text or the hatch pattern, so it ports as a plain layout component.
`avatar` ports as its initials variant; the `src` variant waits on the same
raster decoding work as `image`.

Worth flagging: `sparkline`, `status-board`, `change-marker`,
`last-updated` and `qrcode` are arguably _more_ useful on an ESP32 status
display than several Tier-1 picks, and `qrcode` is pure computation with no
layout complexity. If the first real application is a dashboard rather than
a form, promoting these ahead of `select` and `table` would be reasonable.

**Tier 3 — later, needs a layer/overlay model (14).** dialog, popover,
dropdown, menu, tabs, collapse, pagination, tree, tree-select, cascader,
date-picker, time-picker, calendar, form.

**Not planned (11).** `affix`, `anchor`, `back-top`, `float-button` (scroll-position
dependent, and a fixed panel has no long scroll), `splitter` (drag-driven),
`masonry` (layout cost without payoff), `watermark` (tiled overlay, no
purpose here), `kaleido` (canvas-based demo tool), `upload` (no file picker),
`image` (needs a PNG/JPEG decoder plus dithering — revisit as a standalone
piece of work), `diff`.

The four groups account for all 70 components; nothing is left unclassified.

## 7. Phases

Estimates assume one developer working steadily. They are estimates.

| Phase                       | Work                                                                                                                                                                                                         | Exit criteria                                                                                                         | Est. |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---- |
| **0 — Spike**               | epdiy + LVGL v9 bring-up on an S3 board. Token codegen. Refresh manager v0. `ep_button` and `ep_text` on real glass.                                                                                         | A button renders with correct token metrics; a measured partial refresh under 100 ms; a forced GC16 after N partials. | 2 wk |
| **1 — Foundation**          | Panel HAL, refresh manager with metrics, input HAL (all three modes), font pipeline, icon pipeline, style/token layer, `ep_obj` base with attribute/event plumbing, host test harness, LVGL simulator in CI. | Simulator builds in CI; visual-parity harness runs end to end on the two spike components.                            | 4 wk |
| **2 — Tier 1 static**       | text, title, card, list, divider, badge, tag, icon, layout, grid, progress, meter, statistic, alert.                                                                                                         | Parity harness green for all 14; conformance report shows no missing attributes.                                      | 3 wk |
| **3 — Tier 1 interactive**  | button, input, checkbox, toggle, select, table, plus `ep_form_control` (serialize/parse/validity) and focus-group navigation.                                                                                | Transcribed form-association tests green in all three input modes, including display-only.                            | 4 wk |
| **4 — Hardening & release** | Deep-sleep state restore, conformance gate, size budgets, docs, three examples, ESP-IDF Component Registry publish.                                                                                          | Registry package installs clean into a fresh project and runs an example.                                             | 3 wk |

≈ 16 weeks to a released Tier-1 library. Tier 2 follows as incremental
additions against a foundation that no longer moves.

One mapping worth calling out for Phase 4: the web library's
`formStateRestoreCallback` and BFCache handling have a direct embedded
analogue in restoring UI state across deep sleep from NVS or RTC memory.
The `BaseFormControl` serialize/parse contract is exactly the right shape
for it — same abstraction, different backing store.

## 8. Repository strategy

**Recommendation: a separate `epaper-esp32` repository**, consuming
`design-spec.json` from a pinned version of the npm package.

The argument is about blast radius rather than preference. This monorepo's
CI is tightly tuned — `coverage.include` in `vitest.config.ts` and
`sonar.coverage.exclusions` in `sonar-project.properties` are documented as
one setting maintained in two files, and `release.yml` is bound to npm
Trusted Publishing by filename. Dropping a C/C++ tree with its own
toolchain, its own coverage story and a 3–5 minute ESP-IDF build into that
arrangement creates friction on every unrelated PR, for the sake of sharing
exactly one artifact — which §4.1 already shares properly.

The counter-argument is real and should be weighed: a monorepo makes token
changes atomic, and `firmware/` would sit outside both the `packages/*` and
`apps/*` workspace globs, so npm would ignore it. If the design spec turns
out to churn heavily in early phases, revisit this. The cost of moving one
direction to the other later is low; the decision does not need to be
permanent.

Either way, this repo gains only `gen-design-spec.mjs` and a `design-spec.json`
entry in `files`.

## 9. Risks

| Risk                                                                 | Severity | Mitigation                                                                                                                                           |
| -------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Re-expressing 3276 lines of CSS as LVGL styles                       | High     | Per-component, behind the parity harness. Budget it explicitly rather than treating it as incidental to each component.                              |
| Pseudo-elements, `transform`, `writing-mode` have no LVGL equivalent | Medium   | 40 occurrences total. Audit them in Phase 1 and decide each case (extra child object vs. pre-rasterised asset) before Phase 2 depends on the answer. |
| Font memory and quality at 44px on 1 bpp                             | Medium   | Settle in Phase 0 on real glass. Sizes above ~32px may want 2 bpp despite the general no-AA rule.                                                    |
| epdiy API drift                                                      | Low      | Pin a version; isolate all of it behind the panel HAL.                                                                                               |
| Design spec and C API diverge                                        | Medium   | The conformance report in §4.1, gated in CI. This is the whole reason it exists.                                                                     |
| Scope creep from Tier 2/3                                            | Medium   | Tiers are in this document precisely so promotion is a visible decision.                                                                             |

## 10. Open questions

1. Which concrete typefaces for sans / serif / mono?
2. Which board and panel for Phase 0? The epdiy variant chosen fixes the
   HAL's first implementation.
3. Is deep-sleep state restore a Phase 4 requirement or a Phase 1 design
   input? It affects how component state is stored from the start, so it is
   cheaper to answer early.
4. Should the firmware carry the `e-` naming (`ep_button` vs `e_button`)?
   Cosmetic, but it should be settled before 20 components exist.
