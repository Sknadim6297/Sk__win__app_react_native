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
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../styles/theme';
import SKWinLogo from '../components/SKWinLogo';
import Toast from '../components/Toast';

const { width, height } = Dimensions.get('window');

const AuthScreen = ({ navigation }) => {
  const { login, register } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const handleAuth = async () => {
    if (isLogin) {
      if (!email || !password) {
        showToast('Please enter email and password', 'warning');
        return;
      }

      if (!email.includes('@')) {
        showToast('Please enter a valid email', 'warning');
        return;
      }
      
      const result = await login(email, password);
      if (result.success) {
        showToast('Welcome back!', 'success');
        setTimeout(() => {
          navigation.replace(result.user?.role === 'admin' ? 'AdminDashboard' : 'MainApp');
        }, 500);
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

      const result = await register(username, email, password);
      if (result.success) {
        showToast('Account created successfully!', 'success');
        setTimeout(() => {
          navigation.replace('MainApp');
        }, 500);
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
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} translucent={false} />
      
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <SKWinLogo size={width * 0.39} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Login to continue your journey' : 'Join the ultimate gaming platform'}
            </Text>

            {/* Form */}
            <View style={styles.form}>
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="account" size={20} color={COLORS.gray} />
                    <TextInput
                      style={styles.input}
                      placeholder="Username"
                      placeholderTextColor={COLORS.gray}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="email" size={20} color={COLORS.gray} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={COLORS.gray}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="lock" size={20} color={COLORS.gray} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={COLORS.gray}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <MaterialCommunityIcons 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color={COLORS.gray} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {!isLogin && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="lock-check" size={20} color={COLORS.gray} />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor={COLORS.gray}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}

              {/* Auth Button */}
              <TouchableOpacity
                style={styles.authButton}
                onPress={handleAuth}
                activeOpacity={0.9}
              >
                <Text style={styles.authButtonText}>
                  {isLogin ? 'Login' : 'Sign Up'}
                </Text>
                <MaterialCommunityIcons 
                  name={isLogin ? 'login' : 'account-plus'} 
                  size={20} 
                  color={COLORS.black} 
                />
              </TouchableOpacity>

              {/* Switch Mode */}
              <TouchableOpacity
                style={styles.switchButton}
                onPress={toggleAuthMode}
                activeOpacity={0.8}
              >
                <Text style={styles.switchText}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={styles.switchTextBold}>
                    {isLogin ? 'Sign Up' : 'Login'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: height * 0.06,
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: height * 0.03,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.038,
    color: COLORS.gray,
    marginBottom: height * 0.04,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: width * 0.04,
    color: COLORS.white,
    paddingVertical: 14,
  },
  authButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  authButtonText: {
    fontSize: width * 0.042,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: 0.5,
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: width * 0.036,
    color: COLORS.gray,
  },
  switchTextBold: {
    color: COLORS.accent,
    fontWeight: '700',
  },
});

export default AuthScreen;
