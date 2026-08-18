# BrowserStack component test cycle

BrowserStack is the cross-browser compatibility gate for the complete component
library. The local Vitest projects remain responsible for unit, interaction,
accessibility, and pixel-baseline testing. BrowserStack verifies that the built
Storybook and every component story work in real remote browser engines.

## What the cycle checks

For every Storybook entry tagged `test`, the runner:

1. loads the isolated story through BrowserStack Local;
2. waits for Storybook, fonts, and two render frames;
3. fails on page exceptions, console errors, Storybook render errors, or a
   zero-sized render root;
4. waits for every rendered `e-*` element to be registered and verifies that
   it was upgraded from `HTMLElement`;
5. retries one failed load once and captures a screenshot if it still fails;
6. verifies after the suite that every tag registered by
   `src/components/*.ts` appeared in at least one story, except those listed in
   `CONSUMED_BY_PARENT` in `scripts/browserstack-test.mjs` — child elements like
   `<e-menu-item>` that their parent reads as a data source and replaces with its
   own markup, so they never reach the rendered DOM. That list is itself checked:
   an entry that is no longer a registered element aborts the run, so a rename
   cannot quietly shrink the gate;
7. publishes JSON, JUnit XML, and failure screenshots under
   `reports/browserstack/<platform>/` and marks the BrowserStack session
   passed or failed.

The GitHub Actions matrix runs the entire suite on:

- Chrome latest on Windows 11;
- Edge latest on Windows 11;
- Playwright WebKit on macOS Tahoe.

Two further platforms are defined and runnable locally, but are held out of the
CI matrix for reasons recorded next to `matrix.platform` in
`.github/workflows/browserstack.yml`:

- Playwright Firefox on Windows 11 — held out over undiagnosed Gecko rendering
  failures;
- Playwright WebKit with an iPhone 15 context (`mobile-webkit`) — held out over
  BrowserStack parallel-session contention, which starves it of a session
  before any story runs. `webkit` covers the same engine.

## Where the matrix is defined

Two files own the remote matrix, and both are read at runtime:

- `.github/workflows/browserstack.yml` — the `matrix.platform` keys and the
  build/project metadata passed to the BrowserStack Actions;
- `scripts/browserstack-test.mjs` — the capabilities and Playwright context each
  key resolves to.

The root `browserstack.yml` is the `browserstack-node-sdk` config. The runner
connects to BrowserStack's Playwright CDP endpoint directly and assembles its own
capabilities, so **that file is not read by CI or by `npm run test:browserstack`**.
It exists so an SDK-driven local invocation lands on the same platforms, and it
mirrors the two files above — update those first, then reflect the change there.
`mobile-webkit` has no entry in it: Playwright device emulation is a browser
context option, not a BrowserStack platform.

## GitHub setup

Create these repository Actions secrets:

- `BROWSERSTACK_USERNAME`
- `BROWSERSTACK_ACCESS_KEY`

`.github/workflows/ci.yml` calls `.github/workflows/browserstack.yml` after the
local quality, test, and build stages for every pull request and every push to
`main`. Fork pull requests do not receive repository secrets, so the workflow
reports a notice and skips the remote matrix for those runs. It never uses
`pull_request_target` and therefore never exposes BrowserStack credentials to
untrusted fork code.

Each matrix job builds a static Storybook, starts an isolated BrowserStack Local
tunnel, runs all stories in one remote session, and retries that complete remote
test once if it fails. Setup and build failures are not retried. The job stops
the tunnel even on failure and uploads the reports for 14 days. The official
BrowserStack Actions are pinned to an immutable commit.

## Run locally

Build and serve Storybook:

```sh
npm ci
npm run build-storybook
npm run browserstack:serve
```

Start a BrowserStack Local connection in another terminal, then run one target:

```sh
export BROWSERSTACK_USERNAME='<username>'
export BROWSERSTACK_ACCESS_KEY='<access-key>'
export BROWSERSTACK_LOCAL_IDENTIFIER='<local-tunnel-identifier>'
npm run test:browserstack -- --platform=chrome
```

Supported platform keys are `chrome`, `edge`, `firefox`, `webkit`, and
`mobile-webkit`.

To test a publicly reachable Storybook without a local tunnel:

```sh
export BROWSERSTACK_LOCAL=false
export BROWSERSTACK_INDEX_URL='https://example.test/storybook'
export BROWSERSTACK_BASE_URL='https://example.test/storybook'
npm run test:browserstack -- --platform=webkit
```

Optional controls:

- `BROWSERSTACK_STORY_TIMEOUT` — timeout per story in milliseconds; default
  `30000`.
- `BROWSERSTACK_STORY_RETRIES` — retries after the first attempt; default `1`.
- `BROWSERSTACK_BUILD_NAME` and `BROWSERSTACK_PROJECT_NAME` — dashboard
  grouping overrides.
