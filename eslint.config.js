import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const tsBase = {
  languageOptions: { parser: tsparser, parserOptions: { project: true } },
  plugins: { '@typescript-eslint': tseslint },
  rules: {
    ...tseslint.configs['strict'].rules,
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.config.*',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.d.ts',
    ],
  },
  { ...tsBase, files: ['apps/api/**/*.ts', 'apps/worker/**/*.ts', 'packages/**/*.ts'] },
  {
    ...tsBase,
    files: ['apps/client/**/*.{ts,tsx}'],
    languageOptions: {
      ...tsBase.languageOptions,
      globals: globals.browser,
    },
    plugins: { ...tsBase.plugins, react: reactPlugin, 'react-hooks': reactHooks },
    rules: { ...tsBase.rules, ...reactHooks.configs.recommended.rules },
    settings: { react: { version: 'detect' } },
  },
];
