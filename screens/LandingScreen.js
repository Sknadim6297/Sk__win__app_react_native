import React, { useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/theme';

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
      navigation.replace('Home');
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
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Logo with pulse animation */}
        <Animated.View
          style={{
            transform: [{ 
              scale: Animated.multiply(scaleAnim, pulseAnim)
            }],
          }}
        >
          <View style={[styles.logoContainer, styles.glowEffect]}>
            <MaterialCommunityIcons name="trophy-award" size={40} color={COLORS.white} />
          </View>
        </Animated.View>

        {/* App Name */}
        <Animated.Text 
          style={[
            styles.appName,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          SK Win
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text 
          style={[
            styles.tagline,
            { opacity: fadeAnim }
          ]}
        >
          Join. Play. Win.
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text 
          style={[
            styles.subtitle,
            { opacity: fadeAnim }
          ]}
        >
          Free Fire Tournament Platform
        </Animated.Text>

        {/* Get Started Button with slide animation */}
        <Animated.View 
          style={{ 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          <TouchableOpacity
            style={[globalStyles.button, styles.getStartedButton]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text style={globalStyles.buttonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={22} color={COLORS.white} style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 10,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 24,
    color: COLORS.accent,
    marginBottom: 10,
    fontWeight: '600',
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  glowEffect: {
    shadowColor: COLORS.lightBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 50,
  },
  getStartedButton: {
    marginTop: 20,
    elevation: 5,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});

export default LandingScreen;
