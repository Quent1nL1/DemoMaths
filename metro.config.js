// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),

  // modules Node à ignorer complètement
  fs: require.resolve('empty-module'),
  os: require.resolve('empty-module'),
  path: require.resolve('empty-module'),
  tty: require.resolve('empty-module'),

  // on redirige stream et util vers leurs polyfills
  stream: require.resolve('stream-browserify'),
  util:   require.resolve('util/'),

  // **nouveau** : shim pour expo/dom/global
  'expo/dom/global': require.resolve('empty-module'),
};

module.exports = config;
