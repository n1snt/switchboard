// Flat ESLint config for the whole Switchboard workspace.
//
// This config is TypeScript, in keeping with the no-JavaScript-source rule.
// ESLint loads a .ts config via jiti, so it must be a workspace devDependency.
//
// Requires these workspace devDependencies (install when the workspace is
// initialized in M0):
//   eslint  jiti  typescript-eslint  eslint-config-prettier
//   eslint-plugin-react  eslint-plugin-react-hooks
//
// Rules here enforce the conventions in CLAUDE.md: strict TypeScript, no `any`,
// validate-at-the-boundary. Prettier owns formatting, so eslint-config-prettier
// disables any formatting rules that would conflict.

import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
    ],
  },

  // TypeScript, everywhere.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // CLAUDE.md: no `any`; use `unknown` and narrow.
      '@typescript-eslint/no-explicit-any': 'error',
      // Exported functions get explicit return types.
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': 'off', // the server and CLI log intentionally
    },
  },

  // React app only.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },

  // Test files may be looser.
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Keep Prettier last so it wins over any formatting rules above.
  prettier,
);
