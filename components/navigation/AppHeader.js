import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../../styles/theme';
import { BRAND } from '../../constants/branding';
import { useAppHeaderData } from '../../hooks/useAppHeaderData';
import { getRootNavigation } from '../../utils/walletFlow';
import BrandCoin from '../ui/BrandCoin';
import BrandBell from '../ui/BrandBell';
import DefaultAvatar from '../ui/DefaultAvatar';

const formatBalance = (value) => {
  const n = Number(value) || 0;
  if (n >= 100000) return Math.round(n).toLocaleString('en-IN');
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export default function AppHeader({ navigation, style }) {
  const insets = useSafeAreaInsets();
  const { profilePhoto, walletBalance, notificationBadgeCount } = useAppHeaderData();

  const openNotifications = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) parent.navigate('Notifications');
    else navigation.navigate('Notifications');
  };

  const openWallet = () => {
    const root = getRootNavigation(navigation);
    if (root?.navigate) root.navigate('MyWallet');
    else navigation.navigate('MyWallet');
  };

  const openMenu = () => {
    const root = getRootNavigation(navigation);
    if (root?.navigate) {
      root.navigate('MainApp', { screen: 'MenuTab' });
      return;
    }
    if (navigation.navigate) {
      navigation.navigate('MainApp', { screen: 'MenuTab' });
    }
  };

  return (
    <LinearGradient
      colors={['#1A2744', '#0B1224', '#070B16']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.bar, { paddingTop: Math.max(insets.top, 8) }, style]}
    >
      <TouchableOpacity style={styles.left} activeOpacity={0.85} onPress={openMenu}>
        <DefaultAvatar uri={profilePhoto} size={46} style={styles.avatarRing} />
        <Text style={styles.brand} numberOfLines={1}>
          {BRAND.name}
        </Text>
      </TouchableOpacity>

      <View style={styles.right}>
        <TouchableOpacity style={styles.coinWrap} onPress={openWallet} activeOpacity={0.88}>
          <View style={styles.coinBox}>
            <Text style={styles.coinValue} numberOfLines={1}>
              {formatBalance(walletBalance)}
            </Text>
          </View>
          <View style={styles.coinImageWrap}>
            <BrandCoin size={38} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bellBtn}
          onPress={openNotifications}
          activeOpacity={0.88}
          accessibilityLabel="Notifications"
        >
          <BrandBell size={26} />
          {notificationBadgeCount > 0 ? (
            <View style={[styles.badge, notificationBadgeCount > 9 && styles.badgeWide]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {notificationBadgeCount > 99 ? '99+' : String(notificationBadgeCount)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  avatarRing: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  brand: {
    flex: 1,
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingLeft: 18,
  },
  coinImageWrap: {
    position: 'absolute',
    left: 0,
    zIndex: 2,
  },
  coinBox: {
    minWidth: 52,
    height: 30,
    backgroundColor: '#1C2438',
    borderRadius: 8,
    paddingLeft: 24,
    paddingRight: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  coinValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    maxWidth: 72,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 5,
      },
      android: { elevation: 6 },
    }),
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeWide: {
    minWidth: 22,
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
