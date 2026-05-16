import { StyleSheet } from 'react-native';
import { FONTS, TYPO, TEXT, ICON, scaleFont } from './typography';

export { FONTS, TYPO, TEXT, ICON, scaleFont };

export const COLORS = {
  primary: '#FF6B00',
  primaryBright: '#FF8A00',
  primaryDark: '#E55A00',

  green: '#22C55E',
  greenLight: '#4ADE80',
  greenSoft: '#DCFCE7',
  purpleGlow: 'rgba(139, 92, 246, 0.22)',
  purpleSoft: 'rgba(167, 139, 250, 0.14)',

  backgroundLight: '#FFFFFF',
  backgroundSoft: '#F8FAFC',
  backgroundMint: '#F0FDF4',
  textDark: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  borderLight: '#E2E8F0',
  borderFocus: '#22C55E',
  glass: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.95)',
  cardShadow: 'rgba(255, 107, 0, 0.14)',

  backgroundDark: '#050510',
  backgroundDarkSoft: '#0A0E21',
  surfaceDark: '#12162B',
  purple: '#7B61FF',
  purpleDark: '#6C5CE7',
  borderDark: 'rgba(255, 255, 255, 0.14)',
  borderDarkFocus: 'rgba(123, 97, 255, 0.75)',

  background: '#0a0e27',
  secondary: '#FF8A00',
  accent: '#FF6B00',
  lightBlue: '#f5f542',
  darkBlue: '#2C5F8F',
  white: '#ffffff',
  black: '#000000',
  /** Brighter muted text for dark UI readability */
  gray: '#B8C5D9',
  grayDim: '#8B9BB5',
  lightGray: '#1a1f38',
  darkGray: '#131829',
  success: '#22C55E',
  error: '#EF4444',
  red: '#EF4444',
  orange: '#FF6B00',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    minHeight: 52,
  },
  googleButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 200,
    minHeight: 52,
  },
  buttonText: {
    ...TYPO.button,
    color: COLORS.white,
  },
  input: {
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...TYPO.body,
    color: COLORS.textDark,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  title: {
    ...TYPO.h1,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  subtitle: {
    ...TYPO.body,
    color: COLORS.textSecondary,
    marginBottom: 30,
  },
});
