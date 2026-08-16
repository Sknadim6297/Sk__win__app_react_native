import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FONTS } from '../../styles/theme';

const BAR_BG = '#0B1224';
const ICON_COLOR = '#FFFFFF';

const TABS = [
  { name: 'EarnTab', label: 'Earn', icon: 'gift' },
  { name: 'LeaderboardTab', label: 'Leaderboard', icon: 'trophy' },
  { name: 'HomeTab', label: 'Home', icon: 'home' },
  { name: 'MenuTab', label: 'Menu', icon: 'dots-horizontal-circle-outline' },
];

export default function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 10);

  return (
    <View style={[styles.shell, { paddingBottom: bottomInset }]}>
      <View style={styles.row}>
        {TABS.map((tab) => {
          const route = state.routes.find((r) => r.name === tab.name);
          if (!route) return null;
          const index = state.routes.findIndex((r) => r.name === tab.name);
          const focused = state.index === index;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={tab.label === 'Earn' ? 'Refer and Earn' : tab.label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.85}
              style={styles.item}
            >
              <MaterialCommunityIcons name={tab.icon} size={26} color={ICON_COLOR} />
              <Text style={styles.label}>{tab.label}</Text>
              <View style={[styles.underline, focused ? styles.underlineOn : styles.underlineOff]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: BAR_BG,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    minHeight: 58,
  },
  label: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  underline: {
    marginTop: 5,
    height: 3,
    borderRadius: 2,
    width: 36,
  },
  underlineOn: {
    backgroundColor: '#FFFFFF',
  },
  underlineOff: {
    backgroundColor: 'transparent',
  },
});
