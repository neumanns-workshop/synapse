const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Use custom entry point for web
  if (env.platform === 'web') {
    // Override default entry points with our custom handler
    config.entry = {
      app: [path.resolve(__dirname, 'src/index.web.js')]
    };
  }

  // Customize the config before returning it.
  config.resolve.alias = {
    ...config.resolve.alias,
    '@': path.resolve(__dirname, 'src'),
    '@components': path.resolve(__dirname, 'src/components'),
    '@screens': path.resolve(__dirname, 'src/screens'),
    '@context': path.resolve(__dirname, 'src/context'),
    '@utils': path.resolve(__dirname, 'src/utils'),
    '@assets': path.resolve(__dirname, 'src/assets'),
    '@hooks': path.resolve(__dirname, 'src/hooks'),
    '@services': path.resolve(__dirname, 'src/services'),
    '@types': path.resolve(__dirname, 'src/types'),
    '@data': path.resolve(__dirname, 'src/data'),
  };

  return config;
}; 