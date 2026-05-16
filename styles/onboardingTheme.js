import { Dimensions } from 'react-native';
import { COLORS, FONTS } from './theme';

const { width, height } = Dimensions.get('window');

export const ONBOARDING = {
  colors: {
    background: COLORS.backgroundDark,
    backgroundSoft: COLORS.backgroundDarkSoft,
    surface: COLORS.surfaceDark,
    primary: COLORS.primary,
    primaryLight: COLORS.primaryBright,
    purple: COLORS.purple,
    purpleGlow: COLORS.purpleGlow,
    textPrimary: COLORS.white,
    textSecondary: COLORS.gray,
    textMuted: '#B8C5D9',
    mockupBezel: '#1E293B',
    mockupScreenDark: '#050508',
    particleOrange: 'rgba(255, 107, 0, 0.5)',
    particlePurple: 'rgba(124, 92, 255, 0.45)',
  },
  layout: {
    width,
    height,
    mockupWidth: Math.min(width * 0.58, 240),
    mockupHeight: Math.min(height * 0.48, 420),
    horizontalPadding: Math.max(22, width * 0.06),
  },
  fonts: {
    heading: FONTS.display,
    body: FONTS.regular,
    button: FONTS.bold,
  },
};
