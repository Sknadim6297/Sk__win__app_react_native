import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS, FONTS, TEXT } from '../styles/theme';
import { PAGE, pageStyles } from '../styles/pageTheme';
import ScreenHeader from '../components/navigation/ScreenHeader';
import { userService } from '../services/api';
import SKWinLogo from '../components/SKWinLogo';

const EditProfileScreen = ({ navigation }) => {
  const { updateUser } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [userId, setUserId] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getProfile();
      setName(data.name || '');
      setEmail(data.email || '');
      setGameUsername(data.gameUsername || '');
      setUserId('#' + (data._id?.slice(-8) || ''));
      if (data.dateOfBirth) {
        const date = new Date(data.dateOfBirth);
        setDateOfBirth(date.toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (gameUsername.trim() && gameUsername.trim().length < 3) {
      Alert.alert('Error', 'Game username must be at least 3 characters');
      return;
    }

    setSaving(true);
    try {
      const updateData = { name: name.trim() };
      if (gameUsername.trim()) updateData.gameUsername = gameUsername.trim();
      if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);

      const response = await userService.updateProfile(updateData);

      if (response.success || response.user) {
        await updateUser({
          name: name.trim(),
          gameUsername: gameUsername.trim(),
        });
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters long');
      return;
    }
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasNumber || !hasSpecialChar) {
      Alert.alert('Error', 'Password must contain at least 1 number and 1 special character');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert('Error', 'New password cannot be the same as old password');
      return;
    }

    setSaving(true);
    try {
      const response = await userService.changePassword({ oldPassword, newPassword });
      if (response.success) {
        Alert.alert('Success', 'Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', response.message || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={pageStyles.container} edges={['top']}>
        <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />
        <View style={pageStyles.centered}>
          <ActivityIndicator size="large" color={PAGE.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={pageStyles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={PAGE.bg} />
      <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={pageStyles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <SKWinLogo size={96} rounded backgroundColor="transparent" />
          </View>
          <Text style={styles.heroName}>{name || 'Player'}</Text>
          <Text style={styles.heroId}>{userId || '—'}</Text>
        </View>

        <Text style={pageStyles.sectionTitle}>Personal Information</Text>
        <View style={pageStyles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={PAGE.mutedDim}
              editable={!saving}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Game Username</Text>
            <TextInput
              style={styles.input}
              value={gameUsername}
              onChangeText={setGameUsername}
              placeholder="Enter game username"
              placeholderTextColor={PAGE.mutedDim}
              editable={!saving}
            />
            <Text style={styles.hint}>Min 3 characters · used in tournaments</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={PAGE.mutedDim}
              editable={!saving}
            />
            <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>User ID</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={userId} editable={false} />
          </View>
          <View style={[styles.field, styles.fieldLast]}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />
            <Text style={styles.hint}>Email cannot be changed</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[pageStyles.primaryBtn, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color={COLORS.white} />
              <Text style={pageStyles.primaryBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[pageStyles.sectionTitle, { marginTop: 28 }]}>Change Password</Text>
        <View style={pageStyles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Old Password *</Text>
            <TextInput
              style={styles.input}
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Enter old password"
              placeholderTextColor={PAGE.mutedDim}
              secureTextEntry
              editable={!saving}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>New Password *</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={PAGE.mutedDim}
              secureTextEntry
              editable={!saving}
            />
            <Text style={styles.hint}>Min 8 chars · 1 number · 1 special character</Text>
          </View>
          <View style={[styles.field, styles.fieldLast]}>
            <Text style={styles.label}>Confirm New Password *</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={PAGE.mutedDim}
              secureTextEntry
              editable={!saving}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.passwordBtn, saving && styles.disabled]}
          onPress={handleChangePassword}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <MaterialCommunityIcons name="lock-reset" size={20} color={COLORS.white} />
              <Text style={pageStyles.primaryBtnText}>Change Password</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  heroCard: {
    ...pageStyles.heroCard,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    backgroundColor: PAGE.cardAlt,
    borderWidth: 2,
    borderColor: PAGE.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroName: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white },
  heroId: { ...TEXT.caption, color: PAGE.cyan, marginTop: 6 },
  field: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  fieldLast: { paddingBottom: 16 },
  label: {
    ...TEXT.label,
    color: PAGE.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 11,
  },
  input: {
    backgroundColor: PAGE.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: PAGE.border,
  },
  inputDisabled: {
    opacity: 0.65,
    backgroundColor: PAGE.card,
  },
  hint: { ...TEXT.caption, color: PAGE.mutedDim, marginTop: 6 },
  passwordBtn: {
    ...pageStyles.secondaryBtn,
    backgroundColor: '#EF4444',
  },
  disabled: { opacity: 0.7 },
});
