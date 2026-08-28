// EPaper · ESLint flat config.
// Lints the runtime sources only; storybook/demo are excluded.
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import noUnescapedInnerHtml from './packages/epaper-components/scripts/eslint-rules/no-unescaped-innerhtml.mjs';

// `defineConfig`/`globalIgnores` from eslint/config rather than
// `tseslint.config()`: typescript-eslint deprecated its own wrapper in favour
// of the one ESLint now ships, and the two are otherwise interchangeable.
export default defineConfig([
  globalIgnores([
    'packages/epaper-components/dist/**',
    'dist-site/**',
    'reports/**',
    'storybook-static/**',
    'packages/epaper-components/src/demo/**',
    'packages/epaper-components/src/stories/**',
    'packages/*/scripts/**',
    'apps/*/scripts/**',
    'node_modules/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: [
      'packages/epaper-components/src/**/*.ts',
      'apps/site/src/**/*.ts',
      'apps/bookstore/src/**/*.ts',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // The library is intentionally side-effectful at module scope (custom
      // element registration via define()). Keep these light.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    // SonarCloud gates every pull request, and its JS/TS analyser is built on
    // these same two rule sets. Running the ones it reports here means a
    // finding shows up in `npm run lint:check` — before the push — instead of
    // as a comment on the pull request after CI has already spent a cycle.
    //
    // Deliberately a hand-picked list rather than either plugin's recommended
    // preset: the presets carry hundreds of rules whose findings nothing is
    // gating on, and turning them all on at once would bury the ones that are.
    // Add a rule here when Sonar reports it, not before.
    files: [
      'packages/epaper-components/src/**/*.ts',
      'apps/site/src/**/*.ts',
      'apps/bookstore/src/**/*.ts',
    ],
    plugins: { sonarjs, unicorn },
    rules: {
      // A regex whose runtime is super-linear in its input is a denial of
      // service waiting for a long attribute value.
      'sonarjs/slow-regex': 'error',
      'sonarjs/super-linear-regex': 'error',
      'sonarjs/concise-regex': 'error',
      'unicorn/better-regex': 'error',
      // Sonar's threshold, stated here so the limit is visible where it binds.
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-nested-template-literals': 'error',
      'unicorn/no-nested-ternary': 'error',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-at': 'error',
    },
  },
  {
    // `prefer-readonly` needs types, and type-aware linting is scoped to the
    // library sources so the whole repo does not pay for a program build on
    // every lint run.
    files: ['packages/epaper-components/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/prefer-readonly': 'error',
    },
  },
  {
    // Mechanical enforcement of the esc() contract (CLAUDE.md hard rule #1).
    // Scoped to components rather than all of src/ — core/dom.ts is where
    // `esc`/`html` themselves live, and stories/demo don't render untrusted
    // input.
    files: ['packages/epaper-components/src/components/**/*.ts'],
    plugins: {
      local: { rules: { 'no-unescaped-innerhtml': noUnescapedInnerHtml } },
    },
    rules: {
      'local/no-unescaped-innerhtml': 'error',
    },
  },
]);
