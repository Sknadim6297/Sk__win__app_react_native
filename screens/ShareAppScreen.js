import React, { useContext, useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import AppHeader from '../components/navigation/AppHeader';
import { AuthContext } from '../context/AuthContext';
import { userService } from '../services/api';
import BrandCoin from '../components/ui/BrandCoin';
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

const STEPS = [
  { id: '1', icon: 'share-variant', title: 'Share your code', sub: 'Send the app link + code to friends' },
  { id: '2', icon: 'account-plus', title: 'Friend joins', sub: 'They register with your referral code' },
  { id: '3', icon: 'gift', title: 'You earn ₹25', sub: 'Bonus credited to your wallet' },
];

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
        if (mounted) setReferralCode(profile?.referralCode || 'Not generated yet');
      } catch {
        if (mounted && !user?.referralCode) setReferralCode('Unavailable');
      }
    };
    loadReferralCode();
    return () => {
      mounted = false;
    };
  }, [user?.referralCode]);

  const downloadUrl = getDownloadPageUrl();

  const handleShare = async () => {
    try {
      const linkLine = downloadUrl
        ? `\n\nDownload WAREZONE:\n${downloadUrl}`
        : '\n\nAsk me for the official download link.';
      await Share.share({
        message: `Join WAREZONE and play Free Fire tournaments for real rewards! Use my referral code ${referralCode} during signup.${linkLine}`,
        title: 'Refer & Earn — WAREZONE',
        url: downloadUrl || undefined,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const copyText = async (value, okMessage) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        Alert.alert('Copied', okMessage);
        return;
      }
      await Share.share({ message: value });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={pageStyles.container} edges={isTab ? [] : ['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      {isTab ? (
        <AppHeader navigation={navigation} />
      ) : (
        <ScreenHeader title="Refer & Earn" onBack={() => navigation.goBack()} />
      )}

      <ScrollView contentContainerStyle={pageStyles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1A2744', '#151D36', '#121B33']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <BrandCoin size={42} />
          </View>
          <Text style={styles.heroTitle}>Refer & Earn</Text>
          <Text style={styles.heroSub}>
            Invite friends to WAREZONE. When they register with your code, you get ₹25 bonus.
          </Text>
        </LinearGradient>

        <Text style={pageStyles.sectionTitle}>Your referral code</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>SHARE THIS CODE</Text>
          <Text style={styles.code} numberOfLines={1}>
            {referralCode}
          </Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => copyText(referralCode, 'Referral code copied')}
            activeOpacity={0.85}
          >
            <Ionicons name="copy-outline" size={18} color={COLORS.white} />
            <Text style={styles.copyText}>Copy code</Text>
          </TouchableOpacity>
        </View>

        <Text style={pageStyles.sectionTitle}>How it works</Text>
        <View style={pageStyles.card}>
          {STEPS.map((step, index) => (
            <View
              key={step.id}
              style={[pageStyles.row, index === STEPS.length - 1 && pageStyles.rowLast]}
            >
              <View style={styles.stepBadge}>
                <MaterialCommunityIcons name={step.icon} size={18} color={PAGE.cyan} />
              </View>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSub}>{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={pageStyles.sectionTitle}>App download link</Text>
        <View style={pageStyles.card}>
          <View style={[pageStyles.row, pageStyles.rowLast, styles.linkRow]}>
            <Text style={styles.linkText} numberOfLines={3}>
              {downloadUrl || 'Download link is not configured yet'}
            </Text>
          </View>
          {!!downloadUrl && (
            <TouchableOpacity
              style={[styles.copyBtn, styles.linkCopy]}
              onPress={() => copyText(downloadUrl, 'Download link copied')}
              activeOpacity={0.85}
            >
              <Ionicons name="link-outline" size={18} color={COLORS.white} />
              <Text style={styles.copyText}>Copy link</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={pageStyles.primaryBtn} onPress={handleShare} activeOpacity={0.88}>
          <MaterialCommunityIcons name="share-variant" size={22} color={COLORS.white} />
          <Text style={pageStyles.primaryBtnText}>Share now</Text>
        </TouchableOpacity>

        <View style={[pageStyles.card, { marginTop: 18 }]}>
          <View style={[pageStyles.row, pageStyles.rowLast, styles.infoRow]}>
            <MaterialCommunityIcons name="information-outline" size={20} color={PAGE.cyan} />
            <Text style={styles.infoText}>
              Up to 20% of a tournament entry fee can be paid from bonus. If your code is missing, log in again.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ShareAppScreen;

const styles = StyleSheet.create({
  hero: {
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    marginBottom: 8,
  },
  heroSub: {
    ...TEXT.body,
    color: PAGE.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeCard: {
    backgroundColor: PAGE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PAGE.borderAccent,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  codeLabel: {
    ...TEXT.overline,
    color: PAGE.cyan,
    marginBottom: 8,
  },
  code: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: 14,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PAGE.purple,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 209, 197, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: { flex: 1 },
  stepTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white },
  stepSub: { ...TEXT.caption, color: PAGE.muted, marginTop: 2 },
  linkRow: { alignItems: 'flex-start' },
  linkText: { flex: 1, ...TEXT.caption, color: PAGE.muted, lineHeight: 18 },
  linkCopy: { alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 16, marginTop: -4 },
  infoRow: { alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, ...TEXT.caption, color: PAGE.muted, lineHeight: 18 },
});
