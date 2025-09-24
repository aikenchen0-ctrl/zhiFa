module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    'vitest-globals/env': true
  },
  extends: [
    'eslint:recommended',
    'plugin:vitest-globals/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'vitest-globals'
  ],
  rules: {
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    'no-console': 'off', // Allow console in this debug-focused project
    'prefer-const': 'warn',
    'no-var': 'error'
  },
  globals: {
    'PIXI': 'readonly',
    '__DEV__': 'readonly',
    '__MOBILE_DEBUG__': 'readonly',
    '__VERSION__': 'readonly'
  },
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    'coverage/**'
  ]
};