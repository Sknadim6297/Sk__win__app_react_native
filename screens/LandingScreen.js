import React, { useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ScrollView,
  useWindowDimensions,
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
import { COLORS, FONTS, TYPO } from '../styles/theme';
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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const LandingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isAuthenticated, isAdmin } = useContext(AuthContext);

  const screenOpacity = useSharedValue(0);
  const logoY = useSharedValue(24);
  const contentY = useSharedValue(28);
  const footerY = useSharedValue(18);

  const layout = useMemo(() => {
    const short = height < 680;
    const veryShort = height < 600;
    const narrow = width < 380;
    const padX = clamp(width * 0.055, 14, 26);
    const logoSize = clamp(width * (narrow ? 0.42 : 0.38), 132, 196);
    return {
      short,
      veryShort,
      narrow,
      padX,
      logoSize,
      heroTop: short ? 4 : 10,
      sectionGap: veryShort ? 12 : short ? 16 : 22,
      featurePadV: short ? 10 : 14,
      taglineSize: short ? 13 : 15,
    };
  }, [width, height]);

  useEffect(() => {
    if (isAuthenticated) {
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={ONBOARDING.colors.background} translucent={false} />
      <BackgroundLayer />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (layout.short ? 6 : 12),
            paddingBottom: Math.max(insets.bottom, 14) + 8,
            paddingHorizontal: layout.padX,
            minHeight: height - insets.top - insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mainColumn}>
          <Animated.View style={[styles.heroSection, { paddingTop: layout.heroTop }, fadeStyle]}>
            <Animated.View style={[styles.logoWrap, logoStyle]}>
              <WarezoneLogo size={layout.logoSize} shape="squircle" backgroundColor="#050014" />
            </Animated.View>

            <Animated.View style={[styles.brandBlock, contentStyle]}>
              <Text style={[styles.brandTagline, { fontSize: layout.taglineSize }]}>{BRAND.motto}</Text>
            </Animated.View>
          </Animated.View>

          <Animated.View
            style={[
              styles.featuresSection,
              layout.narrow ? styles.featuresStack : styles.featuresRow,
              { marginTop: layout.sectionGap },
              contentStyle,
            ]}
          >
            {FEATURES.map((feature) => (
              <View
                key={feature.id}
                style={[
                  styles.featureCard,
                  layout.narrow ? styles.featureCardStack : styles.featureCardRow,
                  { paddingVertical: layout.featurePadV },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: `${feature.color}22` }]}>
                  <MaterialCommunityIcons name={feature.icon} size={22} color={feature.color} />
                </View>
                <Text
                  style={[styles.featureLabel, layout.narrow && styles.featureLabelStack]}
                  numberOfLines={2}
                >
                  {feature.label}
                </Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.ctaSection, { marginTop: layout.sectionGap }, contentStyle]}>
            <PrimaryButton label="GET STARTED" onPress={() => navigation.navigate('Auth', { mode: 'login' })} />
            <Text style={styles.ctaHint}>Join thousands of players worldwide</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.footer, layout.narrow && styles.footerStacked, footerStyle]}>
          <View style={[styles.footerCol, layout.narrow ? styles.footerCenter : styles.footerLeft]}>
            <Text style={[styles.footerPrompt, layout.narrow && styles.footerPromptCenter]}>
              {"Don't have an account?"}
            </Text>
            <Pressable onPress={() => navigation.navigate('Auth', { mode: 'register' })} hitSlop={12}>
              <Text style={styles.footerAction}>REGISTER</Text>
            </Pressable>
          </View>

          <View style={[styles.footerCol, layout.narrow ? styles.footerCenter : styles.footerRight]}>
            <Text
              style={[
                styles.footerPrompt,
                !layout.narrow && styles.footerPromptRight,
                layout.narrow && styles.footerPromptCenter,
              ]}
            >
              Already a user?
            </Text>
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
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  mainColumn: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
    maxWidth: 420,
  },
  brandTagline: {
    ...TYPO.body,
    color: ONBOARDING.colors.textSecondary || COLORS.gray,
    letterSpacing: 0.4,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresSection: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featuresStack: {
    flexDirection: 'column',
    gap: 8,
  },
  featureCard: {
    backgroundColor: ONBOARDING.colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    gap: 10,
  },
  featureCardRow: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    ...TYPO.label,
    fontFamily: FONTS.semiBold,
    color: ONBOARDING.colors.textPrimary,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  featureLabelStack: {
    flex: 1,
    textAlign: 'left',
    fontSize: 14,
  },
  ctaSection: {
    marginBottom: 8,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  ctaHint: {
    ...TYPO.caption,
    color: ONBOARDING.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 18,
    width: '100%',
    gap: 12,
  },
  footerStacked: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },
  footerCol: {
    flex: 1,
    gap: 6,
  },
  footerLeft: { alignItems: 'flex-start' },
  footerRight: { alignItems: 'flex-end' },
  footerCenter: { flex: 0, alignItems: 'center' },
  footerPrompt: {
    ...TYPO.caption,
    color: ONBOARDING.colors.textMuted,
  },
  footerPromptRight: { textAlign: 'right' },
  footerPromptCenter: { textAlign: 'center' },
  footerAction: {
    ...TYPO.button,
    color: ONBOARDING.colors.primary,
    letterSpacing: 0.8,
  },
});

export default LandingScreen;
