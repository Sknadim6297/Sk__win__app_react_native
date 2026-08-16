import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Share,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import AppHeader from '../components/navigation/AppHeader';
import { AuthContext } from '../context/AuthContext';
import { userService } from '../services/api';
import AppIcon from '../components/ui/AppIcon';
import { getApiOrigin } from '../utils/apiConfig';

function getDownloadPageUrl() {
  try {
    const origin = getApiOrigin();
    if (!origin || origin.includes('CONFIGURE_EXPO_PUBLIC_API_URL')) return '';
    return `${origin}/download`;
  } catch {
    return '';
  }
}

const ShareAppScreen = ({ navigation, route }) => {
  const isTab = route?.name === 'EarnTab';
  const { user } = useContext(AuthContext);
  const [referralCode, setReferralCode] = useState(user?.referralCode || '…');

  useEffect(() => {
    let mounted = true;
    const loadReferralCode = async () => {
      try {
        if (user?.referralCode) {
          setReferralCode(user.referralCode);
          return;
        }
        const profile = await userService.getProfile();
        if (mounted) {
          setReferralCode(profile?.referralCode || 'Not generated yet');
        }
      } catch {
        if (mounted && !user?.referralCode) setReferralCode('Unavailable');
      }
    };
    loadReferralCode();
    return () => {
      mounted = false;
    };
  }, [user?.referralCode]);

  const handleShare = async () => {
    try {
      const downloadUrl = getDownloadPageUrl();
      const linkLine = downloadUrl
        ? `\n\nDownload the app:\n${downloadUrl}`
        : '\n\nAsk me for the official download link.';
      await Share.share({
        message: `Join WAREZONE and play Free Fire tournaments for real rewards! Use my referral code ${referralCode} during signup.${linkLine}`,
        title: 'Download WAREZONE',
        url: downloadUrl || undefined,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCopyDownloadLink = async () => {
    const downloadUrl = getDownloadPageUrl();
    if (!downloadUrl) {
      Alert.alert('Unavailable', 'Download link is not configured yet.');
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(downloadUrl);
        Alert.alert('Copied', 'Download page link copied');
        return;
      }
      await Share.share({ message: downloadUrl, title: 'WAREZONE Download' });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralCode);
        Alert.alert('Copied', 'Referral code copied');
        return;
      }
      Alert.alert('Referral Code', referralCode);
    } catch {
      Alert.alert('Referral Code', referralCode);
    }
  };

  return (
    <SafeAreaView style={pageStyles.container} edges={isTab ? [] : ['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      {isTab ? (
        <AppHeader navigation={navigation} />
      ) : (
        <ScreenHeader title="My Referrals" onBack={() => navigation.goBack()} />
      )}

      <ScrollView contentContainerStyle={pageStyles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <AppIcon name="share-variant" size={40} light />
          <Text style={styles.heroTitle}>Invite friends</Text>
          <Text style={styles.heroSub}>
            Share WAREZONE and earn ₹25 bonus when they register with your code
          </Text>
        </View>

        <Text style={pageStyles.sectionTitle}>Your Referral Code</Text>
        <View style={pageStyles.card}>
          <View style={[pageStyles.row, pageStyles.rowLast]}>
            <Text style={styles.code} numberOfLines={1}>
              {referralCode}
            </Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode} activeOpacity={0.85}>
              <Ionicons name="copy-outline" size={18} color={COLORS.white} />
              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={pageStyles.sectionTitle}>App download link</Text>
        <View style={pageStyles.card}>
          <Text style={styles.linkText} numberOfLines={3}>
            {getDownloadPageUrl() || 'Not configured'}
          </Text>
          <TouchableOpacity
            style={[styles.copyBtn, { alignSelf: 'flex-start', marginTop: 12 }]}
            onPress={handleCopyDownloadLink}
            activeOpacity={0.85}
          >
            <Ionicons name="link-outline" size={18} color={COLORS.white} />
            <Text style={styles.copyText}>Copy link</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={pageStyles.primaryBtn} onPress={handleShare} activeOpacity={0.88}>
          <MaterialCommunityIcons name="share-variant" size={22} color={COLORS.white} />
          <Text style={pageStyles.primaryBtnText}>Share Now</Text>
        </TouchableOpacity>

        <View style={[pageStyles.card, { marginTop: 18 }]}>
          <View style={[pageStyles.row, pageStyles.rowLast, styles.infoRow]}>
            <MaterialCommunityIcons name="information-outline" size={20} color={PAGE.cyan} />
            <Text style={styles.infoText}>
              Up to 20% of any tournament entry fee can be paid from bonus balance. If your code is
              not generated yet, log in again once.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ShareAppScreen;

const styles = StyleSheet.create({
  heroCard: {
    ...pageStyles.heroCard,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    marginTop: 14,
    marginBottom: 8,
  },
  heroSub: {
    ...TEXT.body,
    color: PAGE.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  code: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: PAGE.cyan,
  },
  linkText: {
    ...TEXT.caption,
    color: PAGE.muted,
    lineHeight: 18,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PAGE.purple,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.white },
  infoRow: { alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, ...TEXT.caption, color: PAGE.muted, lineHeight: 18 },
});
