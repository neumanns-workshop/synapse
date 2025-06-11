module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxRuntime: "classic", // Force classic JSX transform
        },
      ],
    ],
    plugins: [
      [
        "@babel/plugin-transform-runtime",
        {
          helpers: true,
          regenerator: true,
          absoluteRuntime: false,
          version: "^7.0.0",
        },
      ],
      [
        "module-resolver",
        {
          root: ["./src"],
          extensions: [
            ".ios.ts",
            ".android.ts",
            ".ts",
            ".ios.tsx",
            ".android.tsx",
            ".tsx",
            ".jsx",
            ".js",
            ".json",
          ],
          alias: {
            "@babel/runtime": "./node_modules/@babel/runtime",
            "@": "./src",
            "@components": "./src/components",
            "@screens": "./src/screens",
            "@context": "./src/context",
            "@utils": "./src/utils",
            "@assets": "./src/assets",
            "@hooks": "./src/hooks",
            "@services": "./src/services",
            "@types": "./src/types",
            "@data": "./src/data",
          },
          // resolvePath: Custom resolution handled by default
        },
      ],
      "react-native-reanimated/plugin",
      "@babel/plugin-proposal-export-namespace-from",
      "@babel/plugin-proposal-nullish-coalescing-operator",
      "@babel/plugin-proposal-optional-chaining",
    ],
  };
};
