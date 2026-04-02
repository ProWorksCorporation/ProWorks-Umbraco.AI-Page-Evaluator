// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base ESLint recommended rules.
  eslint.configs.recommended,

  // TypeScript type-checked rules (constitution Principle I + II enforcement).
  ...tseslint.configs.recommendedTypeChecked,

  // Parser and project options for type-aware linting.
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Custom rule overrides.
  {
    rules: {
      // Enforce explicit return types on public API surfaces.
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      // Ban `any` usage (constitution Principle I: NON-NEGOTIABLE).
      '@typescript-eslint/no-explicit-any': 'error',
      // Ban `@ts-ignore` without a comment (constitution Principle I).
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
    },
  },

  // Files to ignore.
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'vite.config.ts',
      'eslint.config.js',
      'playwright.config.ts',
      'tests/e2e/**',
    ],
  },
);
