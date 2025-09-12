module.exports = {
  hooks: {
    // Pre-commit hooks - Run quality checks before commit
    'pre-commit': [
      'lint-staged',
      'npm run type-check',
      'npm run test:changed'
    ].join(' && '),
    
    // Commit message validation
    'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS',
    
    // Pre-push hooks - Run full test suite before push
    'pre-push': [
      'npm run test',
      'npm run build',
      'npm run security:check'
    ].join(' && '),
    
    // Post-merge hooks - Update dependencies and run checks
    'post-merge': [
      'npm ci',
      'npm run type-check',
      'npm run lint'
    ].join(' && ')
  }
};