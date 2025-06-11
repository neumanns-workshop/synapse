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
    // Console statements - only error in production builds
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",

    // TypeScript specific
    "no-unused-vars": "off", // Use TypeScript version
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off", // Allow any types - sometimes necessary
    "@typescript-eslint/ban-ts-comment": "warn", // Allow with warning
    "@typescript-eslint/no-non-null-assertion": "warn", // Warn instead of error
    "@typescript-eslint/no-empty-function": "off", // Allow empty functions

    // React specific
    "react/prop-types": "off", // Not needed with TypeScript
    "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
    "react/no-unstable-nested-components": "off", // Common pattern in React Native
    "react/no-unescaped-entities": "warn", // Warn instead of error

    // React Native - turn off inline styles warning (very common pattern)
    "react-native/no-inline-styles": "off",

    // Bitwise operations - allow in compression/crypto utilities
    "no-bitwise": "off",

    // Radix - warn instead of error
    radix: "warn",

    // Import rules - more lenient
    "import/order": "off", // Turn off strict import ordering
    "import/no-duplicates": "warn",

    // Turn off shadow warnings (common in callbacks)
    "@typescript-eslint/no-shadow": "off",
  },
  overrides: [
    // JavaScript files (config files, scripts)
    {
      files: ["*.js", "*.jsx"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "no-console": "off",
      },
    },
    // Test files - very lenient rules
    {
      files: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*"],
      env: {
        jest: true,
      },
      rules: {
        // Allow everything in tests
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-shadow": "off",
        "no-console": "off",
        "react/no-unstable-nested-components": "off",
      },
    },
    // Service files and utilities - very lenient
    {
      files: [
        "src/services/**/*",
        "src/utils/**/*",
        "src/stores/**/*",
        "**/compression*",
        "**/performanceMonitor*",
        "**/webOptimizations*",
        "**/logger*",
      ],
      rules: {
        "no-console": "off", // Allow console in services
        "no-bitwise": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-non-null-assertion": "warn",
        "@typescript-eslint/no-unused-vars": "off", // More lenient for service files
      },
    },
    // Supabase Edge Functions - very lenient
    {
      files: ["supabase/functions/**/*"],
      env: {
        node: true,
        es2021: true,
      },
      rules: {
        "no-console": "off", // Console is logging in edge functions
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
    // Screen components - lenient for UI patterns
    {
      files: ["src/screens/**/*", "src/components/**/*"],
      rules: {
        "react-native/no-inline-styles": "off",
        "react/no-unstable-nested-components": "off",
        "@typescript-eslint/no-unused-vars": "warn", // Some unused vars are from destructuring
      },
    },
    // Web-specific files
    {
      files: ["src/index.web.js", "webpack.config.js", "metro.config.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "no-console": "off",
      },
    },
  ],
};
