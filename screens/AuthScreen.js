import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
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
import GoogleSignInBridge from '../components/auth/GoogleSignInBridge';
import OrDivider from '../components/auth/OrDivider';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { isGoogleSignInConfigured, GOOGLE_SIGNIN_COMING_SOON } from '../utils/googleConfig';

function digitsOnlyPhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

export default function AuthScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { login, register, loginWithGoogle } = useContext(AuthContext);
  const initialLogin = route.params?.mode !== 'register';
  const [isLogin, setIsLogin] = useState(initialLogin);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

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

  const resetFields = () => {
    setFirstName('');
    setLastName('');
    setUsername('');
    setPhone('');
    setEmail('');
    setLoginId('');
    setPassword('');
    setReferralCode('');
    setShowPassword(false);
  };

  const handleAuth = async () => {
    if (submitting) return;

    if (isLogin) {
      if (!loginId.trim() || !password) {
        showToast('Please enter username / phone / email and password', 'warning');
        return;
      }
      setSubmitting(true);
      const result = await login(loginId.trim(), password);
      setSubmitting(false);
      if (result.success) {
        const isAdminUser = result.user?.role === 'admin' || result.role === 'admin';
        showToast(isAdminUser ? 'Welcome, Admin!' : 'Welcome back!', 'success');
      } else {
        showToast(result.error || 'Invalid credentials', 'error');
      }
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !username.trim() || !phone.trim() || !email.trim() || !password) {
      showToast('Please fill all required fields', 'warning');
      return;
    }
    if (username.trim().length < 3) {
      showToast('Username must be at least 3 characters', 'warning');
      return;
    }
    if (digitsOnlyPhone(phone).length !== 10) {
      showToast('Enter a valid 10-digit mobile number', 'warning');
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

    setSubmitting(true);
    const result = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      phone: digitsOnlyPhone(phone),
      email: email.trim(),
      password,
      referralCode: referralCode.trim(),
    });
    setSubmitting(false);

    if (result.success) {
      const referralText = result.referralApplied ? ' Referral bonus applied.' : '';
      if (result.autoLogin) {
        showToast(`Account created!${referralText}`, 'success');
      } else {
        showToast(`Registration successful.${referralText} Please login.`, 'success');
        setIsLogin(true);
        setLoginId(email.trim());
        setPassword('');
        setReferralCode('');
      }
    } else {
      showToast(result.error || 'Registration failed', 'error');
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    resetFields();
  };

  const onGoogleToken = useCallback(
    async (idToken) => {
      try {
        const result = await loginWithGoogle(idToken);
        if (result.success) {
          const isAdminUser = result.user?.role === 'admin' || result.role === 'admin';
          showToast(
            isAdminUser
              ? 'Welcome, Admin!'
              : result.isNewUser
                ? 'Welcome to WAREZONE!'
                : 'Signed in with Google',
            'success'
          );
        } else {
          showToast(result.error || 'Google sign-in failed', 'error');
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle]
  );

  const onGoogleError = useCallback((message) => {
    setGoogleLoading(false);
    if (message && !/cancel/i.test(message)) {
      showToast(message, 'warning');
    }
  }, []);

  const googleConfigured = isGoogleSignInConfigured();

  const handleGoogleLogin = () => {
    if (submitting || googleLoading) return;
    if (GOOGLE_SIGNIN_COMING_SOON) {
      showToast('Google Sign-In is coming soon', 'warning');
      return;
    }
    showToast(
      'Google Sign-In not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env and restart Expo (npx expo start -c).',
      'warning'
    );
  };

  const handleForgotPassword = () => {
    setForgotVisible(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} translucent={false} />
      <AuthBackground />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      <ForgotPasswordModal
        visible={forgotVisible}
        onClose={() => setForgotVisible(false)}
        initialEmail={isLogin ? loginId : email}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' || Platform.OS === 'web' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + (Platform.OS === 'web' ? 96 : 28),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, animatedContent]}>
            <Text style={styles.welcomeLine}>Welcome to,</Text>
            <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>

            {isLogin ? (
              <AuthTextField
                icon="account-outline"
                placeholder="Username / Phone / Email"
                value={loginId}
                onChangeText={setLoginId}
                keyboardType="email-address"
              />
            ) : (
              <>
                <AuthTextField
                  icon="account-outline"
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
                <AuthTextField
                  icon="account-outline"
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
                <AuthTextField
                  icon="at"
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                />
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <View style={styles.phoneField}>
                    <TextInput
                      style={[styles.phoneInput, Platform.OS === 'web' && styles.phoneInputWeb]}
                      placeholder="Mobile Number"
                      placeholderTextColor="rgba(148, 163, 184, 0.65)"
                      value={phone}
                      onChangeText={(v) => setPhone(digitsOnlyPhone(v))}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
                <AuthTextField
                  icon="email-outline"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              </>
            )}

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
              <AuthTextField
                icon="gift-outline"
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
              />
            )}

            {isLogin && (
              <TouchableOpacity style={styles.forgotWrap} onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {!isLogin && (
              <Text style={styles.legalText}>
                By Registering, I agree to ours{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => navigation.navigate('TermsAndConditions')}
                >
                  Terms and Conditions
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  Privacy policy
                </Text>
              </Text>
            )}

            <PrimaryButton
              label={submitting ? 'PLEASE WAIT...' : isLogin ? 'LOGIN' : 'SIGN UP'}
              onPress={handleAuth}
              disabled={submitting}
            />

            <OrDivider label={isLogin ? 'or Login' : 'or Sign Up with'} />
            {GOOGLE_SIGNIN_COMING_SOON ? (
              <GoogleLoginButton
                comingSoon
                onPress={handleGoogleLogin}
                disabled={submitting}
              />
            ) : googleConfigured ? (
              <GoogleSignInBridge
                onToken={onGoogleToken}
                onError={onGoogleError}
                disabled={submitting}
                loading={googleLoading}
                onLoadingChange={setGoogleLoading}
              />
            ) : (
              <GoogleLoginButton
                onPress={handleGoogleLogin}
                disabled={submitting || googleLoading}
                loading={googleLoading}
              />
            )}

            <TouchableOpacity style={styles.switchRow} onPress={toggleAuthMode} activeOpacity={0.8}>
              <Text style={styles.switchMuted}>
                {isLogin ? "Don't have an account? " : 'Already have a account? '}
              </Text>
              <Text style={styles.switchBold}>{isLogin ? 'Sign Up' : 'Login'}</Text>
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  countryCode: {
    width: 64,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    ...TYPO.bodyMedium,
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  phoneField: {
    flex: 1,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  phoneInput: {
    ...TYPO.body,
    color: COLORS.white,
    paddingVertical: 14,
  },
  phoneInputWeb: {
    fontSize: 16,
    outlineStyle: 'none',
  },
  legalText: {
    ...TYPO.caption,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  legalLink: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 4,
    paddingVertical: 4,
  },
  forgotText: {
    ...TYPO.label,
    color: COLORS.purple,
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
