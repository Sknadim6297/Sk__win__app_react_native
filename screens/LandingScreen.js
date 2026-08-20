import React, { useContext, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, TYPO } from '../styles/theme';
import { ONBOARDING } from '../styles/onboardingTheme';
import { BRAND } from '../constants/branding';
import WarezoneLogo from '../components/WarezoneLogo';
import BackgroundLayer from '../components/onboarding/BackgroundLayer';
import PrimaryButton from '../components/auth/PrimaryButton';

const FEATURES = [
  { id: 'tournaments', icon: 'trophy-variant', label: 'Live Tournaments', color: COLORS.primary },
  { id: 'prizes', icon: 'cash-multiple', label: 'Real Prizes', color: COLORS.success },
  { id: 'secure', icon: 'shield-check', label: 'Secure Play', color: COLORS.purple },
];

const LandingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isAdmin } = useContext(AuthContext);

  const screenOpacity = useSharedValue(0);
  const logoY = useSharedValue(28);
  const contentY = useSharedValue(32);
  const footerY = useSharedValue(20);

  useEffect(() => {
    if (isAuthenticated) {
      // Admin must never be sent to MainApp (missing in admin stack → blank web screen)
      navigation.replace(isAdmin() ? 'AdminDashboard' : 'MainApp');
      return;
    }

    screenOpacity.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    logoY.value = withDelay(80, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    contentY.value = withDelay(160, withTiming(0, { duration: 580, easing: Easing.out(Easing.cubic) }));
    footerY.value = withDelay(260, withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
  }, [contentY, footerY, isAdmin, isAuthenticated, logoY, navigation, screenOpacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: footerY.value }],
  }));

  const logoSize = Math.min(ONBOARDING.layout.width * 0.55, 220);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={ONBOARDING.colors.background} translucent={false} />
      <BackgroundLayer />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View style={[styles.heroSection, fadeStyle]}>
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <View style={[styles.logoGlow, { width: logoSize + 36, height: logoSize + 36, borderRadius: (logoSize + 36) / 2 }]} />
            <WarezoneLogo size={logoSize} rounded backgroundColor="transparent" />
          </Animated.View>

          <Animated.View style={[styles.brandBlock, contentStyle]}>
            <Text style={styles.brandTagline}>{BRAND.motto}</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.featuresSection, contentStyle]}>
          {FEATURES.map((feature) => (
            <View key={feature.id} style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: `${feature.color}22` }]}>
                <MaterialCommunityIcons name={feature.icon} size={22} color={feature.color} />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={[styles.ctaSection, contentStyle]}>
          <PrimaryButton label="GET STARTED" onPress={() => navigation.navigate('Auth', { mode: 'login' })} />
          <Text style={styles.ctaHint}>Join thousands of players worldwide</Text>
        </Animated.View>

        <Animated.View style={[styles.footer, footerStyle]}>
          <View style={[styles.footerCol, styles.footerLeft]}>
            <Text style={styles.footerPrompt}>{"Don't have an account?"}</Text>
            <Pressable onPress={() => navigation.navigate('Auth', { mode: 'register' })} hitSlop={12}>
              <Text style={styles.footerAction}>REGISTER</Text>
            </Pressable>
          </View>

          <View style={[styles.footerCol, styles.footerRight]}>
            <Text style={[styles.footerPrompt, styles.footerPromptRight]}>Already a user?</Text>
            <Pressable onPress={() => navigation.navigate('Auth', { mode: 'login' })} hitSlop={12}>
              <Text style={styles.footerAction}>LOGIN</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ONBOARDING.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: ONBOARDING.layout.horizontalPadding,
    justifyContent: 'space-between',
    minHeight: ONBOARDING.layout.height * 0.92,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: ONBOARDING.layout.height * 0.02,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoGlow: {
    position: 'absolute',
    backgroundColor: ONBOARDING.colors.purpleGlow,
  },
  brandBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  brandTagline: {
    ...TYPO.bodyLg,
    color: ONBOARDING.colors.textSecondary || COLORS.gray,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
  },
  featuresSection: {
    gap: 10,
    marginTop: 28,
    marginBottom: 8,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ONBOARDING.colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    ...TYPO.bodyMedium,
    color: ONBOARDING.colors.textPrimary,
    flex: 1,
  },
  ctaSection: {
    marginTop: 20,
    marginBottom: 8,
  },
  ctaHint: {
    ...TYPO.caption,
    color: ONBOARDING.colors.textMuted,
    textAlign: 'center',
    marginTop: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 16,
    width: '100%',
  },
  footerCol: {
    width: '48%',
    gap: 8,
  },
  footerLeft: {
    alignItems: 'flex-start',
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerPrompt: {
    ...TYPO.caption,
    color: ONBOARDING.colors.textMuted,
  },
  footerPromptRight: {
    textAlign: 'right',
  },
  footerAction: {
    ...TYPO.button,
    color: ONBOARDING.colors.primary,
    letterSpacing: 0.8,
  },
});

export default LandingScreen;
