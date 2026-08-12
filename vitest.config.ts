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
    reporters: ['default', 'junit', 'json', 'html'],
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
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
