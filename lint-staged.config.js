module.exports = {
  // Run ESLint on JS/TS files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // Run Prettier on other files
  '*.{json,md,yml,yaml}': [
    'prettier --write',
  ],
  
  // Run type check on TypeScript files
  '*.{ts,tsx}': () => 'tsc --noEmit',
  
  // Lint package.json
  'package.json': [
    'npm audit --audit-level moderate',
  ],
}