import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/theme';

const AuthScreen = ({ navigation }) => {
  const { login, register } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoogleAuth = async () => {
    // Mock Google auth - in production, integrate with Google OAuth
    const result = await login('google_user', 'google_auth');
    if (result.success) {
      navigation.replace(result.isAdmin ? 'AdminDashboard' : 'Home');
    } else {
      Alert.alert('Authentication Failed', 'Please try again');
    }
  };

  const handleEmailAuth = async () => {
    if (isLogin) {
      // Email Login
      if (!email || !password) {
        Alert.alert('⚠️ Missing Fields', 'Please enter email and password');
        return;
      }
      
      const result = await login(email, password);
      if (result.success) {
        // Redirect to admin panel if admin, otherwise home
        navigation.replace(result.isAdmin ? 'AdminDashboard' : 'Home');
      } else {
        Alert.alert('❌ Login Failed', 'Invalid credentials');
      }
    } else {
      // Email Register
      if (!username || !email || !password || !confirmPassword) {
        Alert.alert('⚠️ Missing Fields', 'Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('⚠️ Password Mismatch', 'Passwords do not match');
        return;
      }

      if (password.length < 6) {
        Alert.alert('⚠️ Weak Password', 'Password must be at least 6 characters');
        return;
      }

      const result = await register(username, email, password);
      if (result.success) {
        navigation.replace('Home');
      } else {
        Alert.alert('❌ Registration Failed', result.error);
      }
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    
    // Re-trigger animation
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            }
          ]}
        >
          {/* Logo */}
          <View style={[styles.logoContainer, styles.logoGlow]}>
            <Text style={styles.logoText}>SK</Text>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            {isLogin ? (
              <Ionicons name="game-controller" size={40} color={COLORS.accent} />
            ) : (
              <MaterialCommunityIcons name="trophy" size={40} color={COLORS.accent} />
            )}
            <Text style={styles.title}>
              {isLogin ? 'ENTER ARENA' : 'JOIN TOURNAMENT'}
            </Text>
          </View>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Login to start your winning streak'
              : 'Register and dominate the battlefield'}
          </Text>

          {/* Tab Buttons */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
            >
              <Ionicons 
                name="log-in" 
                size={18} 
                color={isLogin ? COLORS.white : COLORS.gray} 
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.tabText, isLogin && styles.activeTabText]}
              >
                LOGIN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
            >
              <MaterialCommunityIcons 
                name="account-plus" 
                size={18} 
                color={!isLogin ? COLORS.white : COLORS.gray} 
                style={{ marginRight: 6 }}
              />
              <Text
                style={[styles.tabText, !isLogin && styles.activeTabText]}
              >
                REGISTER
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <Animated.View 
            style={[
              styles.form,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Google Sign In Button - Available for both Login and Register */}
            <TouchableOpacity
              style={[styles.googleButton, styles.glowButton]}
              onPress={handleGoogleAuth}
              activeOpacity={0.8}
            >
              <View style={styles.googleIconContainer}>
                <AntDesign name="google" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.googleButtonText}>
                {isLogin ? 'Sign in with Google' : 'Register with Google'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email/Password Form */}
            <View style={styles.gameCard}>
              {!isLogin && (
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Ionicons name="person" size={16} color={COLORS.accent} />
                    <Text style={styles.inputLabel}>USERNAME</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.gamingInput}
                      placeholder="Enter your gamer tag"
                      placeholderTextColor={COLORS.gray}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <MaterialCommunityIcons name="email" size={16} color={COLORS.accent} />
                  <Text style={styles.inputLabel}>EMAIL</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.gamingInput}
                    placeholder="your.email@example.com"
                    placeholderTextColor={COLORS.gray}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Ionicons name="lock-closed" size={16} color={COLORS.accent} />
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.gamingInput}
                    placeholder="Enter secure password"
                    placeholderTextColor={COLORS.gray}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {!isLogin && (
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                    <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.gamingInput}
                      placeholder="Confirm your password"
                      placeholderTextColor={COLORS.gray}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.authButton, styles.glowButton]}
                onPress={handleEmailAuth}
                activeOpacity={0.8}
              >
                {isLogin ? (
                  <Ionicons name="flash" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                ) : (
                  <MaterialCommunityIcons name="rocket-launch" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                )}
                <Text style={styles.authButtonText}>
                  {isLogin ? 'LOGIN NOW' : 'CREATE ACCOUNT'}
                </Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.termsContainer}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.gray} />
                <Text style={styles.termsText}>
                  By registering, you agree to our Terms & Privacy Policy
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={toggleAuthMode} style={styles.switchButton}>
              <View style={styles.switchContent}>
                {isLogin ? (
                  <>
                    <MaterialCommunityIcons name="gamepad-variant" size={18} color={COLORS.accent} />
                    <Text style={styles.switchText}>New player? CREATE ACCOUNT</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome5 name="user-shield" size={16} color={COLORS.accent} />
                    <Text style={styles.switchText}>Already a warrior? LOGIN HERE</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
    minHeight: '100%',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 10,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
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
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.accent,
    marginBottom: 25,
    textAlign: 'center',
    paddingHorizontal: 10,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    borderRadius: 30,
    padding: 4,
    marginBottom: 25,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 26,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  activeTabText: {
    color: COLORS.white,
  },
  form: {
    width: '100%',
    maxWidth: 350,
  },
  googleButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  googleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  googleButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  dividerText: {
    color: COLORS.primary,
    paddingHorizontal: 15,
    fontSize: 14,
    fontWeight: 'bold',
  },
  gameCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  gamingInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 15,
    color: COLORS.white,
  },
  authButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  authButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  glowButton: {
    shadowColor: COLORS.lightBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  switchButton: {
    marginTop: 25,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.darkGray,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingHorizontal: 20,
  },
  termsText: {
    color: COLORS.gray,
    fontSize: 11,
    marginLeft: 6,
    lineHeight: 16,
    flex: 1,
  },
  logoGlow: {
    shadowColor: COLORS.lightBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
  },
});

export default AuthScreen;
