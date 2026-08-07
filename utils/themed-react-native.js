/**
 * Themed react-native wrapper — DM Sans base + readable default size.
 * Default font is applied first so style fontFamily (FONTS.bold, etc.) can override.
 */
const RN = require('react-native');
const React = require('react');

const APP_FONT = 'DMSans_400Regular';
const BASE_TEXT = {
  fontFamily: APP_FONT,
  fontWeight: 'normal',
  fontSize: 16,
  lineHeight: 24,
};

function wrapWithFont(Component) {
  const Wrapped = React.forwardRef(function ThemedTextComponent({ style, ...props }, ref) {
    const extra = Array.isArray(style) ? style : style ? [style] : [];
    return React.createElement(Component, {
      ref,
      style: [BASE_TEXT, ...extra],
      ...props,
    });
  });
  Wrapped.displayName = Component.displayName || Component.name || 'Themed';
  return Wrapped;
}

const Text = wrapWithFont(RN.Text);
const TextInput = wrapWithFont(RN.TextInput);

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
