import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
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
import { AuthContext } from '../context/AuthContext';
import { COLORS, TYPO, FONTS } from '../styles/theme';
import Toast from '../components/Toast';
import AuthBackground from '../components/auth/AuthBackground';
import AuthTextField from '../components/auth/AuthTextField';
import PrimaryButton from '../components/auth/PrimaryButton';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import OrDivider from '../components/auth/OrDivider';

export default function AuthScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { login, register } = useContext(AuthContext);
  const initialLogin = route.params?.mode !== 'register';
  const [isLogin, setIsLogin] = useState(initialLogin);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const [submitting, setSubmitting] = useState(false);

  const screenOpacity = useSharedValue(0);
  const contentY = useSharedValue(24);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
    contentY.value = withDelay(60, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [contentY, screenOpacity]);

  useEffect(() => {
    if (route.params?.mode === 'register') setIsLogin(false);
    else if (route.params?.mode === 'login') setIsLogin(true);
  }, [route.params?.mode]);

  const animatedContent = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const showToast = (message, type = 'error') => setToast({ visible: true, message, type });
  const hideToast = () => setToast({ visible: false, message: '', type: 'error' });

  const handleAuth = async () => {
    if (submitting) return;

    if (isLogin) {
      if (!email || !password) {
        showToast('Please enter email and password', 'warning');
        return;
      }
      if (!email.includes('@')) {
        showToast('Please enter a valid email', 'warning');
        return;
      }
      setSubmitting(true);
      const result = await login(email, password);
      setSubmitting(false);
      if (result.success) {
        const isAdminUser = result.user?.role === 'admin' || result.role === 'admin';
        if (__DEV__) {
          console.log('[AuthScreen] login success', {
            role: result.user?.role,
            isAdmin: isAdminUser,
          });
        }
        showToast(isAdminUser ? 'Welcome, Admin!' : 'Welcome back!', 'success');
      } else {
        showToast(result.error || 'Invalid credentials', 'error');
      }
    } else {
      if (!username || !email || !password || !confirmPassword) {
        showToast('Please fill all fields', 'warning');
        return;
      }
      if (username.length < 3) {
        showToast('Username must be at least 3 characters', 'warning');
        return;
      }
      if (!email.includes('@')) {
        showToast('Please enter a valid email', 'warning');
        return;
      }
      if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'warning');
        return;
      }
      setSubmitting(true);
      const result = await register(username, email, password, referralCode);
      setSubmitting(false);
      if (result.success) {
        const referralText = result.referralApplied ? ' Referral bonus applied.' : '';
        if (result.autoLogin) {
          showToast(`Account created!${referralText}`, 'success');
        } else {
          showToast(`Registration successful.${referralText} Please login.`, 'success');
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
          setReferralCode('');
        }
      } else {
        showToast(result.error || 'Registration failed', 'error');
      }
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setReferralCode('');
  };

  const handleGoogleLogin = () => showToast('Google sign-in coming soon', 'warning');
  const handleForgotPassword = () => showToast('Password reset coming soon', 'warning');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} />
      <AuthBackground />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, animatedContent]}>
            <Text style={styles.welcomeLine}>Welcome to,</Text>
            <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>

            {!isLogin && (
              <AuthTextField
                icon="account-outline"
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
              />
            )}

            <AuthTextField
              icon="at"
              placeholder="Email/Mobile No/Username"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <AuthTextField
              icon="lock-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightLabel={showPassword ? 'Hide' : 'Show'}
              onRightPress={() => setShowPassword(!showPassword)}
            />

            {!isLogin && (
              <>
                <AuthTextField
                  icon="lock-check-outline"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
                <AuthTextField
                  icon="gift-outline"
                  placeholder="Promo Code (Optional)"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters"
                />
              </>
            )}

            {isLogin && (
              <TouchableOpacity style={styles.forgotWrap} onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <PrimaryButton
              label={submitting ? 'PLEASE WAIT...' : isLogin ? 'LOGIN' : 'SIGN UP'}
              onPress={handleAuth}
              disabled={submitting}
            />

            <OrDivider label={isLogin ? 'or Login' : 'or SignUp'} />
            <GoogleLoginButton onPress={handleGoogleLogin} />

            <TouchableOpacity style={styles.switchRow} onPress={toggleAuthMode} activeOpacity={0.8}>
              <Text style={styles.switchMuted}>
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <Text style={styles.switchBold}>{isLogin ? 'Sign Up' : 'LOGIN'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 26,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  welcomeLine: {
    ...TYPO.h3,
    color: COLORS.white,
    marginBottom: 4,
  },
  title: {
    ...TYPO.display,
    color: COLORS.white,
    marginBottom: 28,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 4,
    paddingVertical: 4,
  },
  forgotText: {
    ...TYPO.label,
    color: COLORS.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 28,
    paddingVertical: 8,
  },
  switchMuted: {
    ...TYPO.body,
    color: COLORS.gray,
  },
  switchBold: {
    ...TYPO.bodyMedium,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
});
