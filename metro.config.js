// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Optimize file watching for better performance
config.watchFolders = [__dirname];

// Add file ignoring to reduce the number of files Metro watches
config.resolver = config.resolver || {};
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/.*/,  // Nested node_modules
  /\.git\/.*/,                           // Git files
  /web-build\/.*/,                       // Build output
  /\.expo\/.*/,                          // Expo cache
  /docs\/.*/,                            // Documentation
  /scripts\/.*/,                         // Scripts
  /database\/.*/,                        // Database files
  /supabase\/.*/,                        // Supabase files
  /__mocks__\/.*/,                       // Test mocks
  /\.github\/.*/,                        // GitHub files
  /coverage\/.*/,                        // Test coverage
];

// Add explicit resolver configuration
config.resolver = {
  ...config.resolver,
  sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  assetExts: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
  extraNodeModules: {
    ...(config.resolver.extraNodeModules || {}),
    '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
  },
  // Enable more detailed error reporting
  enableGlobalPackages: true,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  // Combine with other block list patterns
  blockList: [
    ...config.resolver.blockList,
    /old\/.*/,  // Legacy exclusion
  ],
};

// Add transformer configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Remove detailed logging to reduce overhead

module.exports = config; 