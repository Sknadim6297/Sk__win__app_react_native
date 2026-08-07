/**
 * Expo managed app — use babel-preset-expo (not @react-native/babel-preset alone).
 * Codegen warnings in Expo Go are expected and safe to ignore in dev.
 * Reanimated plugin must remain last.
 * Note: api.env() configures Babel's cache — do not also call api.cache(true).
 */
module.exports = function (api) {
  const isProd = api.env('production');
  const plugins = [];

  // Strip noisy logs from production JS bundles (keep error/warn for crash reports).
  if (isProd) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
