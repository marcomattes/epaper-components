// EPaper · ESLint flat config.
// Lints the runtime sources only; storybook/demo are excluded.
import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// `defineConfig`/`globalIgnores` from eslint/config rather than
// `tseslint.config()`: typescript-eslint deprecated its own wrapper in favour
// of the one ESLint now ships, and the two are otherwise interchangeable.
export default defineConfig([
  globalIgnores([
    'dist/**',
    'reports/**',
    'storybook-static/**',
    'src/demo/**',
    'src/stories/**',
    'scripts/**',
    'node_modules/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
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
]);
