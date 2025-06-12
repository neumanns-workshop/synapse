const createExpoWebpackConfigAsync = require("@expo/webpack-config");
const path = require("path");
const webpack = require("webpack");

module.exports = async function (env, argv) {
  // Get the default Expo webpack config
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add optimization for better bundle splitting
  config.optimization = {
    ...config.optimization,
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // Vendor chunk for external libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendor",
          chunks: "all",
          priority: 10,
        },
        // Data chunk for large JSON files
        data: {
          test: /[\\/]src[\\/]data[\\/].*\.json$/,
          name: "data",
          chunks: "all",
          priority: 20,
        },
        // Components chunk for modal and heavy components
        components: {
          test: /[\\/]src[\\/]components[\\/](.*Modal|StatsModal|GraphVisualization)\.tsx?$/,
          name: "components",
          chunks: "all",
          priority: 15,
        },
        // Services chunk
        services: {
          test: /[\\/]src[\\/]services[\\/]/,
          name: "services",
          chunks: "all",
          priority: 5,
        },
        // Common chunk for shared code
        common: {
          name: "common",
          minChunks: 2,
          chunks: "all",
          priority: 1,
        },
      },
    },
  };

  // Customize aliases
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    "@": path.resolve(__dirname, "src"),
    "@components": path.resolve(__dirname, "src/components"),
    "@screens": path.resolve(__dirname, "src/screens"),
    "@context": path.resolve(__dirname, "src/context"),
    "@utils": path.resolve(__dirname, "src/utils"),
    "@assets": path.resolve(__dirname, "src/assets"),
    "@hooks": path.resolve(__dirname, "src/hooks"),
    "@services": path.resolve(__dirname, "src/services"),
    "@types": path.resolve(__dirname, "src/types"),
    "@config": path.resolve(__dirname, "src/config"),
    "@navigation": path.resolve(__dirname, "src/navigation"),
    "@constants": path.resolve(__dirname, "src/constants"),
    "@style": path.resolve(__dirname, "src/style"),
    "@data": path.resolve(__dirname, "src/data"),
    "@stripe/stripe-js": path.resolve(
      __dirname,
      "node_modules/@stripe/stripe-js/lib/index.mjs",
    ),
    "@react-native-vector-icons/material-design-icons": path.resolve(
      __dirname,
      "node_modules/react-native-vector-icons/MaterialCommunityIcons.js",
    ),
    "react-native-vector-icons/MaterialCommunityIcons": path.resolve(
      __dirname,
      "node_modules/react-native-vector-icons/MaterialCommunityIcons.js",
    ),
  };

  // Add font loading for MaterialCommunityIcons
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.ttf$/,
    loader: "url-loader",
    include: path.resolve(__dirname, "node_modules/react-native-vector-icons"),
  });

  // Customize fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer/"),
    vm: require.resolve("vm-browserify"),
  };

  // Ensure plugins array exists
  config.plugins = config.plugins || [];

  // Add ProvidePlugin for Buffer and process
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  );

  // Load environment variables from both .env files and process.env
  const dotenv = require("dotenv");
  const fs = require("fs");

  // Collect all EXPO_PUBLIC_ environment variables
  const envVars = {};

  // First, load from .env file if it exists (for local development)
  if (fs.existsSync("./.env")) {
    const envConfig = dotenv.parse(fs.readFileSync("./.env"));
    Object.keys(envConfig).forEach((key) => {
      if (key.startsWith("EXPO_PUBLIC_")) {
        envVars[key] = envConfig[key];
      }
    });
  }

  // Then, load from process.env (for Netlify and other CI environments)
  // This will override .env file values if both exist
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith("EXPO_PUBLIC_")) {
      const value = process.env[key];
      // Only include non-empty, trimmed values
      if (value && typeof value === "string" && value.trim().length > 0) {
        envVars[key] = value.trim();
      }
    }
  });

  // Find existing DefinePlugin and merge our env vars
  const definePlugin = config.plugins.find(
    (plugin) => plugin.constructor.name === "DefinePlugin",
  );

  if (definePlugin) {
    // Merge environment variables into existing DefinePlugin
    Object.keys(envVars).forEach((key) => {
      definePlugin.definitions[`process.env.${key}`] = JSON.stringify(
        envVars[key],
      );
    });
  }

  // Add performance hints for production
  const mode = argv?.mode || env?.mode || process.env.NODE_ENV || "development";
  if (mode === "production") {
    config.performance = {
      hints: "warning",
      maxEntrypointSize: 512000, // 500KB
      maxAssetSize: 512000, // 500KB
    };
  }

  return config;
};
