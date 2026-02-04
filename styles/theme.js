import { StyleSheet } from 'react-native';

export const COLORS = {
  background: '#0a0e27',
  primary: '#D05E00',
  secondary: '#E07B1A',
  accent: '#e5e900',
  lightBlue: '#f5f542',
  darkBlue: '#2C5F8F',
  white: '#ffffff',
  black: '#000000',
  gray: '#A0A8B8',
  lightGray: '#1a1f38',
  darkGray: '#131829',
  success: '#4CAF50',
  error: '#EF5350',
  green: '#22C55E',
  red: '#EF4444',
  orange: '#F59E0B',
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
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
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  googleButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 200,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.gray,
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});
