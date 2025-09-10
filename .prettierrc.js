module.exports = {
  // Core formatting options
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  requirePragma: false,
  insertPragma: false,
  proseWrap: 'preserve',
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  endOfLine: 'lf',
  embeddedLanguageFormatting: 'auto',
  
  // Plugin-specific options
  tailwindConfig: './tailwind.config.js',
  tailwindFunctions: ['clsx', 'cn', 'cva'],
  
  // Override formatting for specific file types
  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: ['*.md', '*.mdx'],
      options: {
        printWidth: 80,
        proseWrap: 'always',
        semi: false,
        trailingComma: 'none',
      },
    },
    {
      files: ['*.html'],
      options: {
        printWidth: 120,
      },
    },
    {
      files: ['*.css', '*.scss', '*.less'],
      options: {
        printWidth: 120,
        singleQuote: false,
      },
    },
    {
      files: ['*.sql'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        useTabs: false,
        keywordCase: 'upper',
        identifierCase: 'lower',
        functionCase: 'upper',
      },
    },
    {
      files: ['package.json'],
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: ['*.test.{js,ts,jsx,tsx}', '*.spec.{js,ts,jsx,tsx}'],
      options: {
        printWidth: 120, // Allow longer lines in tests for readability
      },
    },
  ],
};