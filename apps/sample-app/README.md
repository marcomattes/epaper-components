# Sample app / claim validation

Not shipped, not a demo — this directory exists to keep the top-level
`README.md` honest. Every claim it makes about runtime behaviour (selective
vs. barrel registration, compound child-element registration, light DOM,
token overrides, disabled animations, `ElementInternals`, required
validation, typed events, native submit/reset, repeated `FormData` entries)
is exercised here against the *built* `dist/` output in a real Chromium
instance, plus a strict-TypeScript compile of the documented tag-map and
typed-listener patterns.

```sh
npm run build                        # dist/ must exist first
npm run validate:sample-app          # runtime checks, Playwright + Chromium
npm run validate:sample-app:types    # strict-TS compile of README's TS snippets
```

- `validate.mjs` — the runtime checks. Serves the repo root over HTTP and
  drives `fixtures/*.html` with Playwright, asserting against `dist/`
  directly (not `src/`), because that's what a consumer actually gets.
- `types-check.ts` / `tsconfig.json` — compiles README's tag-map inference
  and typed-`e-change`-listener examples under the project's own `strict`
  compiler options, against `dist/*.d.ts`.
- `fixtures/` — minimal static HTML pages, one per scenario, written the same
  way a consumer without a bundler would write them.

If a check here fails, either the library regressed or `README.md` no longer
describes it accurately — fix whichever one is wrong before merging.
