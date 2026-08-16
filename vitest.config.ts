import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
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
        plugins: [storybookTest({ configDir: '.storybook' })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    // Both projects above report into this one run, so every reporter below
    // sees the union of the `unit` and `storybook` results — there is no
    // per-project report to merge afterwards.
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
      include: ['src/components/**/*.ts', 'src/core/**/*.ts'],
      exclude: ['src/components/**/*.stories.ts'],
      // V8 collects per-project and merges before writing, so reports/coverage
      // /lcov.info already carries the combined `unit` + `storybook` result.
      // Keep this in sync with `sonar.coverage.exclusions`: any source file
      // outside this include set has no coverage data at all, and Sonar counts
      // such a file as 0% rather than as "not measured".
      //
      // Written even when a test fails, so a red CI run still uploads the
      // coverage it did produce instead of leaving Sonar with a stale number.
      reportOnFailure: true,
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
