module.exports = {
    env: {
      node: true,
      es2021: true
    },
    extends: ['eslint:recommended'],
    parserOptions: {
      ecmaVersion: 'latest'
    },
    rules: {
      'semi': ['error', 'always'],
      'no-console': 'off',
      'no-unused-vars': 'warn'
    }
  };