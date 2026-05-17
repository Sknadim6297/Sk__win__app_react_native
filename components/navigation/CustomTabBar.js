import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../ui/AppIcon';
import { COLORS, FONTS } from '../../styles/theme';

/** Matches Home screen accents (periwinkle tiles + cyan highlights) */
const HOME_THEME = {
  barBg: COLORS.backgroundDark,
  line: 'rgba(255, 255, 255, 0.1)',
  homeFill: '#5E69C1',
  homeRing: 'rgba(0, 229, 255, 0.45)',
  homeRingFocused: '#00E5FF',
  activeBg: 'rgba(0, 229, 255, 0.1)',
  activeBorder: 'rgba(0, 229, 255, 0.32)',
  activeDot: '#00E5FF',
  labelMuted: COLORS.grayDim,
  labelActive: '#FFFFFF',
  shellBorder: '#121A21',
};

const TAB_CONFIG = {
  WalletTab: { label: 'Wallet', icon: 'wallet' },
  HomeTab: { label: 'Home', icon: 'home-variant', center: true },
  AccountTab: { label: 'Account', icon: 'user-settings' },
};

export default function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 12);

  const walletRoute = state.routes.find((r) => r.name === 'WalletTab');
  const homeRoute = state.routes.find((r) => r.name === 'HomeTab');
  const accountRoute = state.routes.find((r) => r.name === 'AccountTab');

  const walletIndex = state.routes.findIndex((r) => r.name === 'WalletTab');
  const homeIndex = state.routes.findIndex((r) => r.name === 'HomeTab');
  const accountIndex = state.routes.findIndex((r) => r.name === 'AccountTab');

  const navigateTab = (route, index) => {
    if (!route) return;
    const focused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  const renderSideTab = (route, index, config) => {
    if (!route) return null;
    const focused = state.index === index;

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={config.label}
        onPress={() => navigateTab(route, index)}
        activeOpacity={0.85}
        style={styles.sideCol}
        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      >
        <View style={[styles.sideIcon, focused && styles.sideIconFocused]}>
          <AppIcon
            name={config.icon}
            size={30}
            {...(focused ? { accent: '00E5FF' } : { muted: true })}
          />
        </View>
        <Text style={[styles.sideLabel, focused && styles.sideLabelFocused]}>{config.label}</Text>
        <View style={focused ? styles.activeDot : styles.dotPlaceholder} />
      </TouchableOpacity>
    );
  };

  const homeFocused = state.index === homeIndex;

  return (
    <View style={[styles.shell, { paddingBottom: bottomInset }]}>
      <View style={styles.topLine} />
      <View style={styles.contentWrap}>
      <View style={styles.barTrack} pointerEvents="box-none">
        {homeRoute ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={homeFocused ? { selected: true } : {}}
            accessibilityLabel="Home"
            onPress={() => navigateTab(homeRoute, homeIndex)}
            activeOpacity={0.92}
            style={styles.homeTouch}
          >
            <View style={[styles.homeOuter, homeFocused && styles.homeOuterFocused]}>
              <View style={styles.homeInner}>
                <AppIcon name="home-variant" size={36} light />
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sideRow} pointerEvents="box-none">
          {renderSideTab(walletRoute, walletIndex, TAB_CONFIG.WalletTab)}
          <View style={styles.centerSpacer} pointerEvents="none" />
          {renderSideTab(accountRoute, accountIndex, TAB_CONFIG.AccountTab)}
        </View>
      </View>
      </View>
    </View>
  );
}

const HOME_SIZE = 76;
const HOME_INNER = 64;

const styles = StyleSheet.create({
  shell: {
    backgroundColor: HOME_THEME.barBg,
    borderTopWidth: 1,
    borderTopColor: HOME_THEME.shellBorder,
  },
  topLine: {
    height: 1,
    backgroundColor: HOME_THEME.line,
    width: '100%',
  },
  contentWrap: {
    paddingTop: 20,
  },
  barTrack: {
    height: 76,
    position: 'relative',
    paddingHorizontal: 20,
  },
  sideRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 2,
  },
  centerSpacer: {
    width: HOME_SIZE + 16,
  },
  sideCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  sideIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sideIconFocused: {
    backgroundColor: HOME_THEME.activeBg,
    borderWidth: 1,
    borderColor: HOME_THEME.activeBorder,
  },
  sideLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: HOME_THEME.labelMuted,
    letterSpacing: 0.35,
  },
  sideLabelFocused: {
    color: HOME_THEME.labelActive,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: HOME_THEME.activeDot,
    marginTop: 5,
  },
  dotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 5,
    opacity: 0,
  },
  homeTouch: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 10,
    width: HOME_SIZE,
    height: HOME_SIZE,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeOuter: {
    width: HOME_SIZE,
    height: HOME_SIZE,
    borderRadius: HOME_SIZE / 2,
    backgroundColor: '#121A21',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: HOME_THEME.homeRing,
  },
  homeOuterFocused: {
    borderColor: HOME_THEME.homeRingFocused,
    backgroundColor: '#151D2B',
  },
  homeInner: {
    width: HOME_INNER,
    height: HOME_INNER,
    borderRadius: HOME_INNER / 2,
    backgroundColor: HOME_THEME.homeFill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#5E69C1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },
});
