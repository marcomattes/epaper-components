import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'node:path';

const playwrightExecutable = process.env['PLAYWRIGHT_EXECUTABLE_PATH'];
const browserProvider = () =>
  playwright(
    playwrightExecutable ? { launchOptions: { executablePath: playwrightExecutable } } : {},
  );

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/epaper-components/src/**/*.{test,spec}.ts'],
          // `__ssr__` belongs to the project below: those tests assert what
          // happens with no DOM, which a browser cannot demonstrate.
          exclude: ['**/node_modules/**', '**/dist/**', '**/__ssr__/**'],
          browser: {
            enabled: true,
            headless: true,
            provider: browserProvider(),
            instances: [{ browser: 'chromium' }],
            expect: {
              toMatchScreenshot: {
                // Keep visual baselines beside the harness and make the
                // browser/platform part explicit. The latter prevents macOS
                // developer screenshots from being compared on Linux CI.
                resolveScreenshotPath: ({
                  arg,
                  browserName,
                  ext,
                  platform,
                  root,
                  testFileDirectory,
                }) =>
                  resolve(
                    root,
                    testFileDirectory,
                    '__screenshots__',
                    `${arg}-${browserName}-${platform}${ext}`,
                  ),
              },
            },
          },
        },
      },
      {
        // The one project that does not run in a browser. The library has to
        // import on a server — a framework's SSR pass evaluates every module
        // it pulls in, including from a `'use client'` file — and the code
        // paths that make that work (`EpaperElement`'s stand-in, `define()`
        // skipping registration) are unreachable where a DOM exists. Node is
        // the only environment that can execute them, so it is the only one
        // that can cover them.
        //
        // `scripts/ssr-import-test.mjs` makes the same assertion against the
        // built `dist/`, which this cannot: it runs on the sources, before a
        // build, and reports into the same coverage run as the browser suites.
        test: {
          name: 'ssr',
          environment: 'node',
          include: ['packages/epaper-components/src/**/__ssr__/**/*.test.ts'],
        },
      },
      {
        plugins: [storybookTest({ configDir: 'apps/storybook/.storybook' })],
        test: {
          name: 'storybook',
          // Load-bearing, and the reason this project used to run nothing.
          //
          // The Storybook plugin sets the Vite root to its config directory's
          // parent — `apps/storybook/` — but the stories live in another
          // workspace, so the globs it derives (correctly, relative to the
          // config directory) pointed outside the repository once resolved
          // against that root. Vitest reported "No test files found" for the
          // project and the run carried on green: the accessibility gate over
          // all 84 story files was covering nothing at all.
          //
          // `dir` is what Vitest scans for test files, and the plugin reads it
          // first when deciding what to make the globs relative to, so setting
          // it here lines both up on the repository root. A project-level
          // `root` cannot do this — the plugin's own `config()` hook wins.
          dir: import.meta.dirname,
          browser: {
            enabled: true,
            headless: true,
            provider: browserProvider(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    // All three projects above report into this one run, so every reporter
    // below sees the union of the `unit`, `storybook` and `ssr` results —
    // there is no per-project report to merge afterwards.
    reporters: [
      'default',
      'junit',
      'json',
      'html',
      // Sonar cannot read JUnit XML for JavaScript/TypeScript; it wants its own
      // Generic Test Execution format. This reporter emits exactly that, keyed
      // by `sonar.testExecutionReportPaths` in sonar-project.properties.
      ['vitest-sonar-reporter', { outputFile: 'reports/test/sonar.xml', silent: true }],
    ],
    outputFile: {
      junit: 'reports/test/junit.xml',
      json: 'reports/test/results.json',
      html: 'reports/test/index.html',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary', 'json'],
      reportsDirectory: 'reports/coverage',
      include: [
        'packages/epaper-components/src/components/**/*.ts',
        'packages/epaper-components/src/core/**/*.ts',
      ],
      // `core/types.ts` is type-only and compiles to an empty module, so V8
      // scores it 0% and drags the ratio down over code that cannot exist at
      // runtime. It is excluded on the Sonar side for the same reason.
      exclude: [
        'packages/epaper-components/src/components/**/*.stories.ts',
        'packages/epaper-components/src/core/types.ts',
      ],
      // V8 collects per-project and merges before writing, so reports/coverage
      // /lcov.info already carries the combined `unit` + `storybook` + `ssr`
      // result.
      // Keep this in sync with `sonar.coverage.exclusions`: any source file
      // outside this include set has no coverage data at all, and Sonar counts
      // such a file as 0% rather than as "not measured".
      //
      // Written even when a test fails, so a red CI run still uploads the
      // coverage it did produce instead of leaving Sonar with a stale number.
      reportOnFailure: true,
      // A regression floor, not a target. These sit just below what the suite
      // actually measures (99.86 / 100 / 98.83 / 93.70), so they catch a drop
      // without failing on noise. Raise them as the real numbers rise.
      //
      // The ratchet is Sonar's quality gate on *new* code, which demands a high
      // bar of every line a pull request touches without holding the whole
      // legacy tree to it.
      thresholds: {
        lines: 99,
        functions: 100,
        statements: 98,
        branches: 92,
      },
    },
  },
});
