// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure project root is the only watch folder if needed
config.watchFolders = [__dirname];

// Custom source extensions can be merged if necessary, but getDefaultConfig is usually sufficient.
// If you need to add specific extensions not covered by default:
// config.resolver.sourceExts = Array.from(new Set([...
//   ...config.resolver.sourceExts,
//   'your_custom_ext' 
// ]));
// For now, let's rely on getDefaultConfig for sourceExts unless issues persist for specific files.

// The following are often not needed if getDefaultConfig is working correctly
// config.resolver.disableHierarchicalLookup = true; 
// config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Keep this if it was specifically added to solve a babel runtime issue
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}), // Preserve any existing extraNodeModules
  '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
};

module.exports = config; 