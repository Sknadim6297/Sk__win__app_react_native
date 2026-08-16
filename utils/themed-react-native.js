/**
 * Themed react-native wrapper — DM Sans base + readable default size.
 * Default font is applied first so style fontFamily (FONTS.bold, etc.) can override.
 *
 * Must proxy ALL react-native exports (ownKeys + descriptors). Otherwise Metro/Babel
 * interop copies only Text/TextInput and APIs like Keyboard.dismiss crash.
 */
const RN = require('react-native');
const React = require('react');

const APP_FONT = 'DMSans_700Bold';
const BASE_TEXT = {
  fontFamily: APP_FONT,
  fontWeight: 'normal',
  fontSize: 14,
  lineHeight: 21,
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
  if (Component) {
    Object.getOwnPropertyNames(Component).forEach((key) => {
      if (['prototype', 'length', 'name', 'arguments', 'caller'].includes(key)) return;
      if (key in Wrapped) return;
      try {
        const desc = Object.getOwnPropertyDescriptor(Component, key);
        if (desc) Object.defineProperty(Wrapped, key, desc);
      } catch {
        /* ignore non-configurable */
      }
    });
  }
  return Wrapped;
}

const Text = wrapWithFont(RN.Text);
const TextInput = wrapWithFont(RN.TextInput);

const KeyboardFallback = {
  dismiss() {},
  addListener() {
    return { remove() {} };
  },
  removeListener() {},
  removeAllListeners() {},
};

const overrides = {
  Text,
  TextInput,
  Keyboard: RN.Keyboard || KeyboardFallback,
};

module.exports = new Proxy(overrides, {
  get(target, prop) {
    if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
    if (prop === 'Keyboard') return RN.Keyboard || KeyboardFallback;
    return RN[prop];
  },
  has(target, prop) {
    return prop in target || prop in RN;
  },
  ownKeys() {
    return [...new Set([...Reflect.ownKeys(overrides), ...Reflect.ownKeys(RN)])];
  },
  getOwnPropertyDescriptor(target, prop) {
    if (Object.prototype.hasOwnProperty.call(target, prop)) {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: target[prop],
      };
    }
    const desc = Object.getOwnPropertyDescriptor(RN, prop);
    if (desc) return { ...desc, configurable: true };
    if (prop in RN || prop === 'Keyboard') {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: prop === 'Keyboard' ? RN.Keyboard || KeyboardFallback : RN[prop],
      };
    }
    return undefined;
  },
});
