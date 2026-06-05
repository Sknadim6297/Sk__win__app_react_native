import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppIcon from '../ui/AppIcon';
import SKWinLogo from '../SKWinLogo';
import { COLORS, FONTS } from '../../styles/theme';
import { useAppHeaderData } from '../../hooks/useAppHeaderData';

const HEADER_THEME = {
  card: '#1A1235',
  accent: '#40E0D0',
  walletPill: '#4A2D8A',
};

export default function AppHeader({ navigation, style }) {
  const { displayName, subtitle, profilePhoto, walletBalance, supportBadgeCount } =
    useAppHeaderData();

  const renderAvatar = () => {
    if (profilePhoto) {
      return (
        <Image
          source={{ uri: profilePhoto }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      );
    }
    return <SKWinLogo size={40} rounded backgroundColor="transparent" />;
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.profileSection}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AccountTab')}
      >
        <View style={styles.avatarWrap}>{renderAvatar()}</View>
        <View style={styles.nameBlock}>
          <Text style={styles.username} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
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
          <AppIcon name="headset" size={28} light />
          {supportBadgeCount > 0 && (
            <View style={styles.supportBadge}>
              <Text style={styles.supportBadgeText}>
                {supportBadgeCount > 99 ? '99' : supportBadgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.walletPill}
          onPress={() => navigation.navigate('WalletTab')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="wallet-outline" size={20} color={COLORS.white} />
          <Text style={styles.walletText}>{walletBalance.toFixed(2)}</Text>
          <View style={styles.walletDivider} />
          <MaterialCommunityIcons name="plus" size={18} color={COLORS.white} />
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
    paddingTop: 4,
    marginBottom: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: HEADER_THEME.card,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  nameBlock: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: HEADER_THEME.accent,
    marginTop: 2,
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
  supportBadge: {
    position: 'absolute',
    top: 0,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#050A12',
  },
  supportBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.white,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HEADER_THEME.walletPill,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    minHeight: 40,
  },
  walletText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    minWidth: 36,
    textAlign: 'center',
  },
  walletDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});
