// EPaper · ESLint flat config.
// Lints the runtime sources only; storybook/demo are excluded.
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
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
    files: ['packages/epaper-components/src/**/*.ts', 'apps/site/src/**/*.ts'],
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
