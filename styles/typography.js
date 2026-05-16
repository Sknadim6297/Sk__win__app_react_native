import { Dimensions, PixelRatio, StyleSheet } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 390;

/** Responsive font scaling (clamped for small/large phones). */
export function scaleFont(size) {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  const scaled = size * Math.min(Math.max(ratio, 0.92), 1.1);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
}

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.6,
};

export const FONTS = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semiBold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  display: 'Rajdhani-Bold',
  displayMedium: 'Rajdhani-Medium',
  displaySemiBold: 'Rajdhani-SemiBold',
};

/** Gaming-style icon sizes — use with MaterialCommunityIcons */
export const ICON = {
  xs: 18,
  sm: 22,
  md: 26,
  lg: 30,
  xl: 36,
  xxl: 44,
};

function lh(fontSize, multiplier = LINE_HEIGHT.normal) {
  return Math.round(fontSize * multiplier);
}

export const TYPO = {
  display: {
    fontFamily: FONTS.display,
    fontSize: scaleFont(32),
    lineHeight: lh(scaleFont(32), LINE_HEIGHT.tight),
    letterSpacing: 0.6,
  },
  h1: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(28),
    lineHeight: lh(scaleFont(28), LINE_HEIGHT.tight),
  },
  h2: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(22),
    lineHeight: lh(scaleFont(22), LINE_HEIGHT.tight),
  },
  h3: {
    fontFamily: FONTS.semiBold,
    fontSize: scaleFont(19),
    lineHeight: lh(scaleFont(19)),
  },
  bodyLg: {
    fontFamily: FONTS.regular,
    fontSize: scaleFont(17),
    lineHeight: lh(scaleFont(17), LINE_HEIGHT.relaxed),
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: scaleFont(16),
    lineHeight: lh(scaleFont(16), LINE_HEIGHT.relaxed),
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontSize: scaleFont(16),
    lineHeight: lh(scaleFont(16), LINE_HEIGHT.relaxed),
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: scaleFont(14),
    lineHeight: lh(scaleFont(14)),
  },
  labelSm: {
    fontFamily: FONTS.medium,
    fontSize: scaleFont(13),
    lineHeight: lh(scaleFont(13)),
  },
  caption: {
    fontFamily: FONTS.regular,
    fontSize: scaleFont(13),
    lineHeight: lh(scaleFont(13)),
  },
  overline: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(12),
    lineHeight: lh(scaleFont(12), LINE_HEIGHT.tight),
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(16),
    lineHeight: lh(scaleFont(16), LINE_HEIGHT.tight),
    letterSpacing: 0.6,
  },
  buttonSm: {
    fontFamily: FONTS.semiBold,
    fontSize: scaleFont(15),
    lineHeight: lh(scaleFont(15), LINE_HEIGHT.tight),
  },
  stat: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(30),
    lineHeight: lh(scaleFont(30), LINE_HEIGHT.tight),
  },
  tabLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: scaleFont(11),
    lineHeight: lh(scaleFont(11), LINE_HEIGHT.tight),
  },
};

/** Pre-built text styles for StyleSheet composition */
export const TEXT = StyleSheet.create({
  display: TYPO.display,
  h1: TYPO.h1,
  h2: TYPO.h2,
  h3: TYPO.h3,
  bodyLg: TYPO.bodyLg,
  body: TYPO.body,
  bodyMedium: TYPO.bodyMedium,
  label: TYPO.label,
  labelSm: TYPO.labelSm,
  caption: TYPO.caption,
  overline: TYPO.overline,
  button: TYPO.button,
  buttonSm: TYPO.buttonSm,
  stat: TYPO.stat,
  tabLabel: TYPO.tabLabel,
});

let typographyInitialized = false;

export const applyGlobalTypography = () => {
  if (typographyInitialized) return;
  typographyInitialized = true;

  const { Text, TextInput } = require('react-native');

  Text.defaultProps = Text.defaultProps || {};
  TextInput.defaultProps = TextInput.defaultProps || {};
  Text.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.allowFontScaling = false;
};
