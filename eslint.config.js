import eslint from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginImport from 'eslint-plugin-import';

const ignorePattern = '^_';

export default [
  eslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'ESNext',
        projectService: {
          allowDefaultProject: ['*.js', '.github/renovate-config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: { rules: pluginImport.rules },
    },
    rules: {
      'class-methods-use-this': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-await-in-loop': 'off',
      'no-tabs': 'error',
      'no-underscore-dangle': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: ignorePattern,
          varsIgnorePattern: ignorePattern,
          caughtErrorsIgnorePattern: ignorePattern,
        },
      ],
      'import/extensions': 'off',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'parent', 'sibling', 'index'],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
        },
      ],
      'import/first': 'off',
      'import/no-unresolved': 'off',
      quotes: ['error', 'single'],
      curly: ['error', 'all'],
      'import/prefer-default-export': 'off',
      semi: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        'ForInStatement',
        'LabeledStatement',
        'WithStatement',
      ],
      'prefer-arrow-callback': 'error',
      'func-style': ['error', 'expression', { allowArrowFunctions: true }],
      'arrow-body-style': 'error',
      'max-len': ['error', { code: 120 }],
      'newline-before-return': 'error',
      // "function-call-argument-newline": ["error", "always"],
      'newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],
    },
  },
  {
    ignores: [
      '.DS_Store',
      'node_modules/',
      'tmp/',
      'coverage/',
      '.vscode/',
      '.env*',
    ],
  },
];
