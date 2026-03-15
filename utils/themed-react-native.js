/**
 * Themed react-native wrapper.
 * Re-exports everything from react-native but overrides Text and TextInput
 * to always prepend the global app font (Orbitron) so no individual screen
 * needs to specify fontFamily.
 *
 * This file is excluded from Metro's redirect loop (see metro.config.js).
 */
const RN = require('react-native');
const React = require('react');

// Font constant is inlined here to avoid a require cycle:
// themed-react-native → styles/theme → (react-native redirect) → themed-react-native
const ORBITRON = 'Orbitron-Regular';

function wrapWithFont(Component) {
  const Wrapped = React.forwardRef(function ThemedTextComponent(
    { style, ...props },
    ref,
  ) {
    const base = [{ fontFamily: ORBITRON, fontWeight: 'normal', letterSpacing: 0.2 }];
    const extra = Array.isArray(style) ? style : style ? [style] : [];
    return React.createElement(Component, {
      ref,
      style: [...extra, ...base],
      ...props,
    });
  });
  Wrapped.displayName = Component.displayName || Component.name || 'Themed';
  return Wrapped;
}

const Text = wrapWithFont(RN.Text);
const TextInput = wrapWithFont(RN.TextInput);

// Use a Proxy instead of { ...RN, Text, TextInput } spread.
// Spreading forces all of react-native's lazy property getters to evaluate
// immediately, including deprecated APIs (PushNotificationIOS, Clipboard, etc.)
// that try to access native modules unavailable in Expo Go — causing
// "Invariant Violation: native module doesn't exist" at startup.
const overrides = { Text, TextInput };
module.exports = new Proxy(overrides, {
  get(target, key) {
    if (Object.prototype.hasOwnProperty.call(target, key)) return target[key];
    return RN[key];
  },
  has(target, key) {
    return key in target || key in RN;
  },
});
