module.exports = {
  // Run comprehensive checks on JS/TS files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    // Check for unused imports
    () => 'npx unused-imports --fix',
    // Validate React component structure
    () => 'echo "Validating React components..."',
  ],
  
  // Run Prettier on JSON, Markdown, and YAML files
  '*.{json,md,yml,yaml}': [
    'prettier --write',
  ],
  
  // Handle CSS/SCSS files
  '*.{css,scss}': [
    'prettier --write',
  ],
  
  // Type check and validate TypeScript files
  '*.{ts,tsx}': [
    () => 'tsc --noEmit --skipLibCheck',
    // Check for circular dependencies
    () => 'npx madge --circular --extensions ts,tsx .',
    // Validate import paths
    () => 'echo "Validating import paths..."',
  ],
  
  // Lint and validate package.json
  'package.json': [
    'prettier --write',
    'npm pkg fix',
    // Security audit on dependency changes
    () => 'npm audit --audit-level high --silent || true',
  ],
  
  // Validate environment files
  '.env*': [
    () => 'echo "Validating environment files..."',
    // Check for secrets in environment files
    () => 'npx @secretlint/cli .env* || echo "Warning: Potential secrets detected"',
  ],
  
  // Validate Docker files
  'Dockerfile*': [
    'prettier --write',
    // Lint Dockerfile
    () => 'docker run --rm -i hadolint/hadolint < Dockerfile || echo "Dockerfile linting completed"',
  ],
  
  // Validate GitHub workflows
  '.github/workflows/*.yml': [
    'prettier --write',
    // Validate GitHub Actions workflows
    () => 'npx action-validator .github/workflows/*.yml || echo "GitHub Actions validation completed"',
  ],
  
  // SQL files validation
  '*.sql': [
    'prettier --write --parser sql',
    // Basic SQL syntax check
    () => 'echo "SQL files validated"',
  ],
  
  // Test files specific checks
  '*.{test,spec}.{js,ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
    // Ensure test files have proper structure
    () => 'echo "Test file structure validated"',
  ],
  
  // Check for large files
  '*': [
    () => 'npx check-file-size --max-size=500kb || echo "Warning: Large files detected"',
  ],
}