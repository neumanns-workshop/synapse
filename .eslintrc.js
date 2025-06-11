module.exports = {
  root: true,
  ignorePatterns: ["scripts/", "check-duplicates.js", "test-*.js"],
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "react-native",
    "import",
    "jsx-a11y",
    "prettier",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "@react-native",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended",
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
    "react-native/react-native": true,
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
  rules: {
    // General ESLint rules
    "no-console": ["warn", { allow: ["warn", "error", "info"] }], // Allow console.warn, .error, .info
    "no-unused-vars": "off", // Turn off base no-unused-vars, use TypeScript version
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off", // Optional: turn off if too noisy
    "@typescript-eslint/no-explicit-any": "warn", // Warn on explicit any

    // React specific rules
    "react/prop-types": "off", // Not needed with TypeScript
    "react/react-in-jsx-scope": "off", // Not needed with new JSX transform (React 17+)

    // React Native specific rules (if not using plugin:react-native/all or @react-native/eslint-config)
    // 'react-native/no-unused-styles': 'warn',
    // 'react-native/split-platform-components': 'warn',
    // 'react-native/no-inline-styles': 'warn',
    // 'react-native/no-color-literals': 'warn',
    // 'react-native/no-raw-text': 'warn',

    // Import rules
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling", "index"],
        ],
        pathGroups: [
          {
            pattern: "react+(|-native)",
            group: "external",
            position: "before",
          },
        ],
        pathGroupsExcludedImportTypes: ["react"],
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "import/no-duplicates": "warn",
    // 'prettier/prettier': 'warn', // This line is usually not needed if using plugin:prettier/recommended
    // Add other rules as needed
  },
  overrides: [
    {
      files: ["*.js", "*.jsx"],
      rules: {
        "@typescript-eslint/no-var-requires": "off", // Allow require in JS files (e.g., config files)
      },
    },
    {
      // Test files can be more relaxed with certain rules
      files: ["**/*.test.{ts,tsx,js,jsx}", "**/__tests__/**/*.{ts,tsx,js,jsx}"],
      env: {
        jest: true, // Add jest globals
        node: true,
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off", // Allow require() in tests for dynamic imports
        "@typescript-eslint/no-empty-function": "off", // Allow empty functions as test props
        "@typescript-eslint/no-explicit-any": "off", // Allow any in tests for mocking
        "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions in tests
        "no-console": "off", // Allow console statements in tests
        "react/no-unstable-nested-components": "off", // Allow nested components in test renders
        "react-native/no-inline-styles": "off", // Allow inline styles in tests
        "@typescript-eslint/ban-ts-comment": "off", // Allow @ts-ignore in tests
        "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in tests
        "react/no-unescaped-entities": "off", // Allow unescaped entities in tests
        "no-undef": "off", // Turn off no-undef for tests since jest globals are injected
      },
    },
    {
      // Service files with singleton pattern
      files: ["**/services/**/*.ts", "**/stores/**/*.ts"],
      rules: {
        "@typescript-eslint/no-empty-function": "off", // Allow empty constructors for singletons
        "no-console": ["warn", { allow: ["warn", "error", "info", "log"] }], // More permissive console logging
      },
    },
    {
      // Debug and utility files can be more relaxed
      files: [
        "**/debug*.{ts,tsx}",
        "**/compressionDebug.ts",
        "**/performanceMonitor.ts",
        "**/logger.ts",
      ],
      rules: {
        "no-console": "off", // Allow console statements in debug files
        "@typescript-eslint/no-explicit-any": "off", // Allow any in debug utilities
        "@typescript-eslint/ban-ts-comment": "off", // Allow @ts-ignore in debug files
      },
    },
    {
      // Data compression utilities use bitwise operations
      files: ["**/dataCompression.ts", "**/SharingService.ts"],
      rules: {
        "no-bitwise": "off", // Allow bitwise operations for compression
        radix: "off", // Allow parseInt without radix in specific contexts
      },
    },
    {
      // React Native screens can have more relaxed styling rules
      files: ["**/screens/**/*.{ts,tsx}", "**/components/**/*.{ts,tsx}"],
      rules: {
        "react-native/no-inline-styles": "warn", // Warn instead of error for inline styles
        "react/no-unstable-nested-components": "warn", // Warn instead of error
        "react/no-unescaped-entities": "off", // Allow unescaped entities in UI
      },
    },
    {
      // Supabase functions are serverless and need different rules
      files: ["supabase/functions/**/*.ts"],
      rules: {
        "no-console": "off", // Allow console statements in serverless functions
        "@typescript-eslint/no-explicit-any": "warn", // Allow any but warn
      },
    },
  ],
};
