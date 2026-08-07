import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppIcon from '../ui/AppIcon';
import SKWinLogo from '../SKWinLogo';
import { COLORS, FONTS } from '../../styles/theme';
import { useAppHeaderData } from '../../hooks/useAppHeaderData';

const formatBalance = (value) => {
  const n = Number(value) || 0;
  if (n >= 100000) return Math.round(n).toLocaleString('en-IN');
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export default function AppHeader({ navigation, style }) {
  const { displayName, profilePhoto, walletBalance, supportBadgeCount } = useAppHeaderData();

  const renderAvatar = () => {
    if (profilePhoto) {
      return <Image source={{ uri: profilePhoto }} style={styles.avatarImage} resizeMode="cover" />;
    }
    return <SKWinLogo size={34} rounded backgroundColor="transparent" />;
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.profileSection}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AccountTab')}
      >
        <View style={styles.avatar}>{renderAvatar()}</View>
        <View style={styles.nameBlock}>
          <Text style={styles.greeting} numberOfLines={1}>
            Hi,
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => navigation.navigate('SupportTickets')}
          hitSlop={8}
          activeOpacity={0.85}
        >
          <AppIcon name="headset" size={24} light />
          {supportBadgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {supportBadgeCount > 99 ? '99' : supportBadgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.walletPill}
          onPress={() => navigation.navigate('WalletTab')}
          activeOpacity={0.88}
        >
          <MaterialCommunityIcons name="wallet-outline" size={18} color={COLORS.white} />
          <Text
            style={styles.walletText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatBalance(walletBalance)}
          </Text>
          <MaterialCommunityIcons name="plus" size={16} color="#FBBF24" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    marginBottom: 14,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151D36',
  },
  avatarImage: {
    width: 42,
    height: 42,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  username: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supportBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5B39A8',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 7,
    minHeight: 40,
  },
  walletText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    maxWidth: 72,
  },
});
