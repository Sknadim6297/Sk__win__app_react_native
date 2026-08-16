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

/**
 * DM Sans — bold UI font on every screen.
 * Use named families instead of fontWeight on Android custom fonts.
 */
export const FONT_FAMILY = 'DMSans_700Bold';

export const FONTS = {
  regular: 'DMSans_700Bold',
  medium: 'DMSans_700Bold',
  semiBold: 'DMSans_800ExtraBold',
  bold: 'DMSans_800ExtraBold',
  display: 'DMSans_800ExtraBold',
  displayMedium: 'DMSans_700Bold',
  displaySemiBold: 'DMSans_800ExtraBold',
};

/** Icons8 display sizes — 24px default, 28px for important actions */
export const ICON = {
  xs: 20,
  sm: 22,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 40,
};

function lh(fontSize, multiplier = LINE_HEIGHT.normal) {
  return Math.round(fontSize * multiplier);
}

export const TYPO = {
  display: {
    fontFamily: FONTS.display,
    fontSize: scaleFont(26),
    lineHeight: lh(scaleFont(26), LINE_HEIGHT.tight),
    letterSpacing: 0.2,
  },
  h1: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(24),
    lineHeight: lh(scaleFont(24), LINE_HEIGHT.tight),
  },
  h2: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(20),
    lineHeight: lh(scaleFont(20), LINE_HEIGHT.tight),
  },
  h3: {
    fontFamily: FONTS.semiBold,
    fontSize: scaleFont(17),
    lineHeight: lh(scaleFont(17)),
  },
  bodyLg: {
    fontFamily: FONTS.regular,
    fontSize: scaleFont(15),
    lineHeight: lh(scaleFont(15), LINE_HEIGHT.relaxed),
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: scaleFont(14),
    lineHeight: lh(scaleFont(14), LINE_HEIGHT.relaxed),
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontSize: scaleFont(14),
    lineHeight: lh(scaleFont(14), LINE_HEIGHT.relaxed),
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
    fontSize: scaleFont(15),
    lineHeight: lh(scaleFont(15), LINE_HEIGHT.tight),
    letterSpacing: 0.2,
  },
  buttonSm: {
    fontFamily: FONTS.semiBold,
    fontSize: scaleFont(15),
    lineHeight: lh(scaleFont(15), LINE_HEIGHT.tight),
  },
  stat: {
    fontFamily: FONTS.bold,
    fontSize: scaleFont(26),
    lineHeight: lh(scaleFont(26), LINE_HEIGHT.tight),
  },
  tabLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: scaleFont(11),
    lineHeight: lh(scaleFont(11), LINE_HEIGHT.tight),
  },
  fontRegular: FONTS.regular,
  fontMedium: FONTS.medium,
  fontSemiBold: FONTS.semiBold,
  fontBold: FONTS.bold,
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
