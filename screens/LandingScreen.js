import React, { useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Easing,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';

const LandingScreen = ({ navigation }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Check if user is already logged in
    if (isAuthenticated) {
      navigation.replace('MainApp');
    } else {
      // Start animations sequence
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.elastic(1.2),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous pulse animation for logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      {/* Top Gradient Background */}
      <View style={styles.topDecoration}>
        <View style={styles.glowCircle} />
      </View>

      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              transform: [{ 
                scale: Animated.multiply(scaleAnim, pulseAnim)
              }],
            }
          ]}
        >
          <View style={styles.logoBg}>
            <SKWinLogo size={90} />
          </View>
        </Animated.View>

        {/* Main Title */}
        <Animated.Text 
          style={[
            styles.mainTitle,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          SK Win
        </Animated.Text>

        <Animated.Text 
          style={[
            styles.subtitle,
            { opacity: fadeAnim }
          ]}
        >
          Free Fire Tournaments
        </Animated.Text>

        {/* Features Section - Compact */}
        <Animated.View 
          style={[
            styles.featuresContainer,
            { opacity: fadeAnim }
          ]}
        >
          <View style={styles.featureCard}>
            <MaterialCommunityIcons name="trophy" size={20} color={COLORS.accent} />
            <Text style={styles.featureTitle}>Tournaments</Text>
          </View>

          <View style={styles.featureCard}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color={COLORS.accent} />
            <Text style={styles.featureTitle}>Rewards</Text>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="people" size={20} color={COLORS.accent} />
            <Text style={styles.featureTitle}>Community</Text>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text 
          style={[
            styles.tagline,
            { opacity: fadeAnim }
          ]}
        >
          Join. Play. Win.
        </Animated.Text>

        {/* Get Started Button */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom Decoration */}
      <View style={styles.bottomDecoration}>
        <View style={styles.glowCircle2} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    minHeight: '100%',
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  topDecoration: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    opacity: 0.1,
  },
  glowCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: COLORS.primary,
  },
  glowCircle2: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: COLORS.accent,
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 200,
    height: 200,
    opacity: 0.08,
  },
  logoSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  logoBg: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(208, 94, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary}40`,
  },
  mainTitle: {
    fontSize: 52,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '500',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 30,
    gap: 12,
  },
  featureCard: {
    backgroundColor: `${COLORS.lightGray}99`,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 30,
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  getStartedButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default LandingScreen;
