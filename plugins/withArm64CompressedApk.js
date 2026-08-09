/**
 * Expo config plugin: force Android release APK to ship arm64-v8a only
 * and ensure native libs are compressed (legacy packaging).
 *
 * Writes gradle.properties only — avoids abiFilters injection that can
 * produce successful Gradle builds with no APK artifact for EAS upload.
 */
const {
  withGradleProperties,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const PLUGIN_NAME = 'withArm64CompressedApk';

function withArm64GradleProperties(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;

    const setProp = (key, value) => {
      const idx = props.findIndex((p) => p.type === 'property' && p.key === key);
      if (idx >= 0) {
        props[idx].value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    setProp('reactNativeArchitectures', 'arm64-v8a');
    setProp('expo.useLegacyPackaging', 'true');
    setProp('hermesEnabled', 'true');
    setProp('android.enableMinifyInReleaseBuilds', 'true');
    setProp('android.enableShrinkResourcesInReleaseBuilds', 'true');
    setProp('android.enablePngCrunchInReleaseBuilds', 'true');

    return cfg;
  });
}

function withArm64CompressedApk(config) {
  return withArm64GradleProperties(config);
}

module.exports = createRunOncePlugin(withArm64CompressedApk, PLUGIN_NAME, '1.1.0');
