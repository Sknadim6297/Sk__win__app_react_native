import React, { useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Easing,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';

const { width, height } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('MainApp');
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Floating animations for background elements
      Animated.loop(
        Animated.sequence([
          Animated.timing(float1, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(float1, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(float2, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(float2, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isAuthenticated]);

  const handleGetStarted = () => {
    navigation.navigate('Auth');
  };

  const float1Interpolate = float1.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 20],
  });

  const float2Interpolate = float2.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -20],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Animated Background Elements */}
      <Animated.View 
        style={[
          styles.floatingCircle1,
          { transform: [{ translateY: float1Interpolate }] }
        ]} 
      />
      <Animated.View 
        style={[
          styles.floatingCircle2,
          { transform: [{ translateY: float2Interpolate }] }
        ]} 
      />

      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideUpAnim }
              ],
            },
          ]}
        >
          <SKWinLogo size={width * 0.42} />
        </Animated.View>

        {/* Title Section */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <Text style={styles.title}>SK Win</Text>
          <Text style={styles.subtitle}>Free Fire Tournaments</Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Compete. Conquer. Win Big.</Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          style={[
            styles.featuresContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(slideUpAnim, 1.5) }],
            },
          ]}
        >
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="trophy-variant" size={24} color={COLORS.accent} />
              <Text style={styles.featureText}>Live Tournaments</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color={COLORS.success} />
              <Text style={styles.featureText}>Real Prizes</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.primary} />
              <Text style={styles.featureText}>Secure Payments</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="account-group" size={24} color={COLORS.accent} />
              <Text style={styles.featureText}>Pro Players</Text>
            </View>
          </View>
        </Animated.View>

        {/* Get Started Button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(slideUpAnim, 2) }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <MaterialCommunityIcons name="arrow-right" size={22} color={COLORS.black} />
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Join thousands of players worldwide
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  floatingCircle1: {
    position: 'absolute',
    top: height * 0.1,
    right: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: `${COLORS.primary}15`,
    opacity: 0.5,
  },
  floatingCircle2: {
    position: 'absolute',
    bottom: height * 0.15,
    left: -width * 0.25,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: `${COLORS.accent}12`,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: height * 0.06,
  },
  logoContainer: {
    marginBottom: height * 0.04,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: height * 0.05,
  },
  title: {
    fontSize: width * 0.14,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: width * 0.045,
    color: COLORS.gray,
    fontWeight: '500',
    marginBottom: 16,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginBottom: 16,
  },
  tagline: {
    fontSize: width * 0.042,
    color: COLORS.white,
    fontWeight: '600',
    opacity: 0.9,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: height * 0.05,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  featureItem: {
    flex: 1,
    backgroundColor: `${COLORS.lightGray}`,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: width * 0.032,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  getStartedButton: {
    backgroundColor: COLORS.accent,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: COLORS.black,
    fontSize: width * 0.045,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: width * 0.032,
    color: COLORS.gray,
    fontWeight: '500',
  },
});

export default LandingScreen;
