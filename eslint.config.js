const angular = require('angular-eslint');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['**/playwright-report/**', 'dist/**', 'node_modules/**', '.angular/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.eslintRecommended, ...angular.configs.tsRecommended],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@angular-eslint/prefer-standalone': 'off',
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
  },
  {
    files: ['app/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@backend/*'] }],
    },
  },
  {
    files: ['backend/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@app/*'] }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['common/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@app/*', '@backend/*'] }],
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
