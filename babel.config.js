/**
 * Expo managed app — use babel-preset-expo (not @react-native/babel-preset alone).
 * Codegen warnings in Expo Go are expected and safe to ignore in dev.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
