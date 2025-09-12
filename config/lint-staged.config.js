module.exports = {
  // TypeScript files
  '*.{ts,tsx}': [
    'eslint --fix --config config/eslint/.eslintrc.js',
    'prettier --write --config config/prettier/.prettierrc.js',
    'tsc --noEmit --project config/typescript/tsconfig.strict.json',
    'npm run test:related --'
  ],
  
  // JavaScript files (if any)
  '*.{js,jsx}': [
    'eslint --fix --config config/eslint/.eslintrc.js',
    'prettier --write --config config/prettier/.prettierrc.js'
  ],
  
  // JSON files
  '*.json': [
    'prettier --write --config config/prettier/.prettierrc.js'
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write --config config/prettier/.prettierrc.js',
    'markdownlint --fix'
  ],
  
  // YAML files
  '*.{yml,yaml}': [
    'prettier --write --config config/prettier/.prettierrc.js',
    'yamllint'
  ],
  
  // CSS/SCSS files
  '*.{css,scss,less}': [
    'stylelint --fix',
    'prettier --write --config config/prettier/.prettierrc.js'
  ],
  
  // Package.json security check
  'package.json': [
    'npm audit --audit-level=moderate',
    'snyk test'
  ],
  
  // Dockerfile linting
  'Dockerfile*': [
    'hadolint'
  ],
  
  // Shell scripts
  '*.sh': [
    'shellcheck',
    'shfmt -w'
  ]
};