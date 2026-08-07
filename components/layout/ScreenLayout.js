import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../styles/theme';

const DEFAULT_BG = COLORS.background || COLORS.backgroundDark || '#0a0e17';

/**
 * Standard screen wrapper — keeps content below the status bar / notch on all devices.
 */
export default function ScreenLayout({
  children,
  style,
  edges = ['top'],
  backgroundColor = DEFAULT_BG,
  statusBarStyle = 'light-content',
  statusBarBackground,
}) {
  const barBg = statusBarBackground ?? backgroundColor;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor }, style]} edges={edges}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={barBg} translucent={false} />
      {children}
    </SafeAreaView>
  );
}

/** Full-screen modal wrapper with top + bottom safe area. */
export function ModalScreenLayout({
  children,
  style,
  backgroundColor = DEFAULT_BG,
  statusBarStyle = 'light-content',
}) {
  return (
    <ScreenLayout
      style={style}
      edges={['top', 'bottom']}
      backgroundColor={backgroundColor}
      statusBarStyle={statusBarStyle}
    >
      {children}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export { DEFAULT_BG as SCREEN_BG };
