module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true,
        absoluteRuntime: false
      }],
      ['module-resolver', {
        root: ['./src'],
        extensions: [
          '.ios.ts',
          '.android.ts',
          '.ts',
          '.ios.tsx',
          '.android.tsx',
          '.tsx',
          '.jsx',
          '.js',
          '.json',
        ],
        alias: {
          '@babel/runtime': './node_modules/@babel/runtime',
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@context': './src/context',
          '@utils': './src/utils',
          '@assets': './src/assets',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@types': './src/types',
          '@data': './src/data'
        },
      }],
      'react-native-reanimated/plugin',
    ],
  };
}; 