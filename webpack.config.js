// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Shim des modules Node non disponibles dans le runtime web
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    fs: false,
    os: false,
    path: false,
    tty: false,
    // on pointe stream vers stream-browserify
    stream: require.resolve('stream-browserify'),
  };

  return config;
};
