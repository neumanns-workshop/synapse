const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');
const webpack = require('webpack');

module.exports = async function(env, argv) {
  // Get the default Expo webpack config
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Customize aliases
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@screens': path.resolve(__dirname, 'src/screens'),
    '@context': path.resolve(__dirname, 'src/context'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@assets': path.resolve(__dirname, 'src/assets'),
    '@hooks': path.resolve(__dirname, 'src/hooks'),
    '@services': path.resolve(__dirname, 'src/services'),
    '@types': path.resolve(__dirname, 'src/types'),
    '@config': path.resolve(__dirname, 'src/config'),
    '@navigation': path.resolve(__dirname, 'src/navigation'),
    '@constants': path.resolve(__dirname, 'src/constants'),
    '@style': path.resolve(__dirname, 'src/style'),
    '@data': path.resolve(__dirname, 'src/data'),
    '@stripe/stripe-js': path.resolve(__dirname, 'node_modules/@stripe/stripe-js/lib/index.mjs'),
    '@react-native-vector-icons/material-design-icons': path.resolve(__dirname, 'node_modules/react-native-vector-icons/MaterialCommunityIcons.js'),
    'react-native-vector-icons/MaterialCommunityIcons': path.resolve(__dirname, 'node_modules/react-native-vector-icons/MaterialCommunityIcons.js'),
  };

  // Add font loading for MaterialCommunityIcons
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.ttf$/,
    loader: 'url-loader',
    include: path.resolve(__dirname, 'node_modules/react-native-vector-icons'),
  });

  // Customize fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer/"),
    "vm": require.resolve("vm-browserify")
  };

  // Ensure plugins array exists
  config.plugins = config.plugins || [];

  // Add ProvidePlugin for Buffer and process
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  // Instead of using Dotenv plugin, let's manually load environment variables
  // to avoid conflicts with Expo's DefinePlugin
  const dotenv = require('dotenv');
  const fs = require('fs');
  
  // Load .env file if it exists
  if (fs.existsSync('./.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('./.env'));
    
    // Find existing DefinePlugin and merge our env vars
    const definePlugin = config.plugins.find(plugin => 
      plugin.constructor.name === 'DefinePlugin'
    );
    
    if (definePlugin) {
      // Merge environment variables into existing DefinePlugin
      Object.keys(envConfig).forEach(key => {
        definePlugin.definitions[`process.env.${key}`] = JSON.stringify(envConfig[key]);
      });
    }
  }

  return config;
}; 