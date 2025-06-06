// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure project root is the only watch folder
config.watchFolders = [__dirname];

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
  // Exclude the old directory from being watched
  blockList: [/old\/.*/],
};

// Add transformer configuration
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Enable more detailed logging
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      console.log(`[Metro] Request: ${req.url}`);
      return middleware(req, res, next);
    };
  },
};

module.exports = config; 