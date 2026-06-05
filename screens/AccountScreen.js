import React, { useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AuthContext } from '../context/AuthContext';
import { COLORS, FONTS } from '../styles/theme';
import { userService } from '../services/api';
import SKWinLogo from '../components/SKWinLogo';
import AppIcon from '../components/ui/AppIcon';
import AppHeader from '../components/navigation/AppHeader';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const PUSH_PREF_KEY = 'pushNotificationsEnabled';

const ACCOUNT_THEME = {
  bg: '#000000',
  card: '#1A1235',
  cardBorder: 'rgba(255, 255, 255, 0.06)',
  accent: '#40E0D0',
  walletPill: '#4A2D8A',
  kycGreen: '#22C55E',
  muted: '#9CA3AF',
};

const MENU_ITEMS = [
  { id: 'push', title: 'Push Notification', icon: 'bell', type: 'toggle' },
  { id: 'profile', title: 'My Profile', icon: 'account', screen: 'AccountProfile' },
  { id: 'wallet', title: 'My Wallet', icon: 'wallet', screen: 'MyWallet' },
  { id: 'matches', title: 'My Matches', icon: 'gamepad-variant', screen: 'History' },
  { id: 'order', title: 'My Order', icon: 'order', screen: 'MyWallet' },
  { id: 'statistics', title: 'My Statistics', icon: 'statistics', screen: 'MyStatistics' },
  { id: 'rewards', title: 'My Rewards', icon: 'gift', screen: 'MyWallet' },
  { id: 'referrals', title: 'My Referrals', icon: 'users', screen: 'ShareApp' },
  { id: 'announcement', title: 'Announcement', icon: 'flag', screen: 'ImportantUpdates' },
  { id: 'tutorial', title: 'App Tutorial', icon: 'help-circle', screen: 'FAQ' },
  { id: 'about', title: 'About us', icon: 'information', screen: 'AboutUs' },
  { id: 'support', title: 'Customer Support', icon: 'headset', screen: 'SupportTickets' },
  { id: 'share', title: 'Share App', icon: 'share-variant', screen: 'ShareApp' },
  { id: 'terms', title: 'Terms & Conditions', icon: 'file-document', screen: 'TermsAndConditions' },
  { id: 'language', title: 'Change Language', icon: 'globe', action: 'language' },
  { id: 'logout', title: 'Logout', icon: 'power', action: 'logout' },
];

const AccountScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadAccountData();
      loadPushPreference();
    }, [])
  );

  const loadPushPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(PUSH_PREF_KEY);
      if (saved !== null) {
        setPushEnabled(saved === 'true');
      }
    } catch {
      /* keep default */
    }
  };

  const loadAccountData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const profileData = await userService.getProfile();
      setUserData(profileData);
    } catch (error) {
      console.log('Error loading account data:', error.message);
      Alert.alert('Error', 'Failed to load account data. Please refresh.');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAccountData(true);
  }, []);

  const handlePushToggle = async (value) => {
    setPushEnabled(value);
    try {
      await AsyncStorage.setItem(PUSH_PREF_KEY, String(value));
    } catch {
      /* non-critical */
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleMenuPress = (item) => {
    if (item.action === 'logout') {
      handleLogout();
      return;
    }
    if (item.action === 'language') {
      Alert.alert('Change Language', 'Language selection coming soon.');
      return;
    }
    if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  const displayName = userData?.username || userData?.name || user?.username || 'Player';
  const matchesPlayed = userData?.tournament?.participatedCount ?? 0;
  const totalKilled = userData?.gameStats?.totalKills ?? 0;
  const amountWon = userData?.tournament?.earnings ?? userData?.wallet?.totalWinnings ?? 0;
  const isKycVerified = Boolean(userData?.verified);
  const appVersion = Constants.expoConfig?.version?.split('.')[0] || '1';
  const profilePhoto = userData?.profilePhoto ? resolveMediaUrl(userData.profilePhoto) : '';

  const renderAvatar = (size, rounded = true) => {
    if (profilePhoto) {
      return (
        <Image
          source={{ uri: profilePhoto }}
          style={{
            width: size,
            height: size,
            borderRadius: rounded ? size / 2 : 0,
          }}
          resizeMode="cover"
        />
      );
    }
    return <SKWinLogo size={size} rounded={rounded} backgroundColor="transparent" />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={ACCOUNT_THEME.bg} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCOUNT_THEME.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ACCOUNT_THEME.accent}
            />
          }
        >
          <AppHeader navigation={navigation} style={styles.appHeader} />

          {/* Main profile */}
          <View style={styles.profileSection}>
            <View style={styles.mainAvatarWrap}>{renderAvatar(108)}</View>
            <Text style={styles.mainUsername}>{displayName}</Text>
            <Text style={[styles.kycStatus, isKycVerified ? styles.kycVerified : styles.kycPending]}>
              {isKycVerified ? 'Kyc Verified' : 'Kyc Not Verified'}
            </Text>
          </View>

          {/* Stats card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{matchesPlayed}</Text>
              <Text style={styles.statLabel}>Matches Played</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalKilled}</Text>
              <Text style={styles.statLabel}>Total Killed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.amountRow}>
                <AppIcon name="coins" size={18} />
                <Text style={styles.statValue}>{amountWon}</Text>
              </View>
              <Text style={styles.statLabel}>Amount Won</Text>
            </View>
          </View>

          {/* Menu list */}
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuButton, item.id === 'logout' && styles.logoutButton]}
                onPress={() => handleMenuPress(item)}
                activeOpacity={item.type === 'toggle' ? 1 : 0.85}
                disabled={item.type === 'toggle'}
              >
                <View style={styles.menuLeft}>
                  <AppIcon name={item.icon} size={24} light />
                  <Text style={styles.menuTitle}>{item.title}</Text>
                </View>

                {item.type === 'toggle' ? (
                  <Switch
                    value={pushEnabled}
                    onValueChange={handlePushToggle}
                    trackColor={{ false: '#3A3058', true: '#2563EB' }}
                    thumbColor={COLORS.white}
                    ios_backgroundColor="#3A3058"
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.versionText}>Version : {appVersion}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACCOUNT_THEME.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  appHeader: {
    marginBottom: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  mainAvatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: ACCOUNT_THEME.card,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainUsername: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginBottom: 6,
  },
  kycStatus: {
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  kycVerified: {
    color: ACCOUNT_THEME.kycGreen,
  },
  kycPending: {
    color: ACCOUNT_THEME.muted,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: ACCOUNT_THEME.card,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ACCOUNT_THEME.cardBorder,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statDivider: {
    width: 1,
    height: '70%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: ACCOUNT_THEME.muted,
    textAlign: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  menuList: {
    gap: 10,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ACCOUNT_THEME.card,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: ACCOUNT_THEME.cardBorder,
  },
  logoutButton: {
    marginTop: 4,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  versionText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 8,
    opacity: 0.85,
  },
});

export default AccountScreen;
