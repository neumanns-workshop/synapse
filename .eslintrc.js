module.exports = {
  root: true,
  ignorePatterns: [
    "scripts/",
    "check-duplicates.js",
    "test-*.js",
    "web-build/",
    "node_modules/",
  ],
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
    // Core TypeScript Rules
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
        args: "after-used",
      },
    ],
    "@typescript-eslint/no-var-requires": "warn", // Warn instead of error
    "@typescript-eslint/no-empty-function": "warn", // Warn instead of error
    "@typescript-eslint/no-non-null-assertion": "warn", // Warn instead of error
    "@typescript-eslint/no-shadow": "warn", // Warn instead of error

    // Console and debugging
    "no-console": "off", // Allow console statements in development

    // React specific
    "react/prop-types": "off",
    "react/display-name": "off", // Allow anonymous components
    "react/no-children-prop": "warn", // Warn instead of error
    "react/no-unescaped-entities": "warn", // Warn instead of error
    "react/no-unstable-nested-components": "warn", // Warn instead of error

    // React Native specific
    "react-native/no-inline-styles": "warn", // Warn instead of error

    // Import organization
    "import/order": "warn", // Warn instead of error

    // Disable overly strict rules
    "prefer-const": "warn",
    "no-unused-vars": "off", // Use TypeScript version instead
    "no-undef": "off", // TypeScript handles this

    // Import organization and other rules
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
      // All TypeScript and JavaScript files can use require in certain contexts
      files: ["*.ts", "*.tsx", "*.js", "*.jsx"],
      rules: {
        "@typescript-eslint/no-var-requires": "warn", // Warn instead of error for require statements
        "@typescript-eslint/no-empty-function": "warn", // Warn instead of error for empty functions
      },
    },
    {
      // Test files can be more relaxed with certain rules
      files: [
        "**/*.test.{ts,tsx,js,jsx}",
        "**/__tests__/**/*.{ts,tsx,js,jsx}",
        "**/test/**/*.{ts,tsx,js,jsx}",
        "**/__mocks__/**/*.{ts,tsx,js,jsx}",
      ],
      env: {
        jest: true, // Add jest globals
        node: true,
      },
      rules: {
        "@typescript-eslint/no-var-requires": "off", // Allow require() in tests for dynamic imports
        "@typescript-eslint/no-empty-function": "off", // Allow empty functions as test props
        "@typescript-eslint/no-explicit-any": "off", // Allow any in tests for mocking
        "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions in tests
        "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in tests
        "@typescript-eslint/no-shadow": "off", // Allow variable shadowing in tests
        "no-console": "off", // Allow console statements in tests
        "react/no-unstable-nested-components": "off", // Allow nested components in test renders
        "react-native/no-inline-styles": "off", // Allow inline styles in tests
        "@typescript-eslint/ban-ts-comment": "off", // Allow @ts-ignore in tests
        "react/no-unescaped-entities": "off", // Allow unescaped entities in tests
        "no-undef": "off", // Turn off no-undef for tests since jest globals are injected
        "import/order": "off", // Don't enforce import order in tests
        "react-hooks/exhaustive-deps": "off", // Allow missing dependencies in test hooks
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
        "react/display-name": "off", // Allow anonymous components in screens/components
        "react/no-children-prop": "off", // Allow children as props in React Native
      },
    },
    {
      // Supabase functions are serverless and need different rules
      files: ["**/supabase/functions/**/*.ts"],
      rules: {
        "@typescript-eslint/no-unused-vars": "off", // Allow unused vars in Supabase functions
        "@typescript-eslint/no-explicit-any": "off", // Allow any in Supabase functions
        "no-console": "off", // Allow console in serverless functions
      },
    },
    {
      // React Native screens and components often need inline styles for prototyping
      files: ["**/screens/**/*.{ts,tsx}", "**/components/**/*.{ts,tsx}"],
      rules: {
        "react-native/no-inline-styles": "off", // Allow inline styles in development
        "react/no-unstable-nested-components": "off", // Allow nested components in screens/components
        "@typescript-eslint/no-shadow": "off", // Allow variable shadowing in complex components
      },
    },
  ],
};
