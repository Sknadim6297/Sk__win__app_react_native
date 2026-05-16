import React, { useContext, useEffect } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AuthContext } from '../context/AuthContext';
import BackgroundLayer from '../components/onboarding/BackgroundLayer';
import MockupCard from '../components/onboarding/MockupCard';
import StepProgress from '../components/onboarding/StepProgress';
import { ONBOARDING } from '../styles/onboardingTheme';

export default function WelcomeOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useContext(AuthContext);

  const screenOpacity = useSharedValue(0);
  const mockupY = useSharedValue(20);
  const bottomY = useSharedValue(24);

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainApp');
      return;
    }
    screenOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    mockupY.value = withDelay(60, withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) }));
    bottomY.value = withDelay(180, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [bottomY, isAuthenticated, mockupY, navigation, screenOpacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const mockupStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: mockupY.value }],
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: bottomY.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={ONBOARDING.colors.background} />
      <BackgroundLayer />

      <Animated.View
        style={[
          styles.content,
          fadeStyle,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Animated.View style={[styles.mockupWrap, mockupStyle]}>
          <MockupCard />
        </Animated.View>

        <Animated.View style={[styles.copySection, bottomStyle]}>
          <Text style={styles.heading}>SELECT A GAME</Text>
          <Text style={styles.subheading}>
            Select the game you would like to enter a contest for
          </Text>
          <StepProgress />
        </Animated.View>

        <Animated.View style={[styles.footer, bottomStyle]}>
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ONBOARDING.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: ONBOARDING.layout.horizontalPadding,
  },
  mockupWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ONBOARDING.layout.height * 0.48,
  },
  copySection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  heading: {
    fontFamily: ONBOARDING.fonts.heading,
    fontSize: 26,
    lineHeight: 32,
    color: ONBOARDING.colors.textPrimary,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: ONBOARDING.fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: ONBOARDING.colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
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
  footerPromptRight: {
    textAlign: 'right',
  },
  footerPrompt: {
    fontFamily: ONBOARDING.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: ONBOARDING.colors.textMuted,
  },
  footerAction: {
    fontFamily: ONBOARDING.fonts.button,
    fontSize: 17,
    color: ONBOARDING.colors.primary,
    letterSpacing: 0.8,
  },
});
