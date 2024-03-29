module.exports = {
  extends: ['../.eslintrc.js'],
  rules: {
    'no-restricted-imports': ['error', { patterns: ['@app/*'] }],
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
