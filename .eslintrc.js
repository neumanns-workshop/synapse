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
  ],
};
